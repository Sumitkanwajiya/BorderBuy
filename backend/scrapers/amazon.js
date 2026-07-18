/**
 * Scrapes product details from Amazon India (amazon.in) or Amazon US (amazon.com)
 * Optimized for maximum speed, minimal IPC roundtrips, and zero fixed wait times.
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<{title: string, price: string, image: string}>}
 */
async function scrapeAmazon(page, url) {
  const startTime = Date.now();
  console.log(`[AmazonScraper] Starting scrape for URL: ${url}`);

  // Set standard headers to bypass bot blocks
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  });

  // Direct navigation - Bypasses redundant homepage pre-landing on initial request
  const startNav = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  const navDuration = Date.now() - startNav;
  console.log(`[AmazonScraper] Page navigation completed in ${navDuration}ms.`);

  // Wait for product details elements or captcha input
  const startWait = Date.now();
  await page.waitForSelector('#productTitle, #ppd, #centerCol, input#captchacharacters, #captchacharacters', { timeout: 3000 }).catch(() => {});
  const waitDuration = Date.now() - startWait;
  console.log(`[AmazonScraper] Wait selector completed in ${waitDuration}ms.`);

  // Helper function to update location zip codes
  const setAmazonLocation = async (targetPage, targetUrl) => {
    const zipStart = Date.now();
    try {
      const isUS = targetUrl.includes('amazon.com');
      const zipCode = isUS ? '10001' : '400001';
      
      console.log(`[AmazonScraper] Price missing. Updating ZIP location to ${zipCode} to reveal local product availability...`);
      
      const locationBtn = await targetPage.$('#nav-global-location-popover-link');
      if (!locationBtn) return;
      
      await locationBtn.click();
      await targetPage.waitForSelector('#GLUXZipUpdateInput', { timeout: 3000 });

      // Fast typing delay
      await targetPage.type('#GLUXZipUpdateInput', zipCode, { delay: 10 });
      
      // Submit ZIP input
      await targetPage.click('#GLUXZipUpdate');
      await targetPage.waitForSelector('input[name="glowDoneButton"], #GLUXConfirmClose', { timeout: 2500 }).catch(() => {});

      // Click Continue/Done button inside popover
      await targetPage.evaluate(() => {
        const clickables = Array.from(document.querySelectorAll('input, button, span, a, div'));
        const btn = clickables.find(el => {
          const txt = (el.textContent || '').trim().toLowerCase() || (el.value || '').trim().toLowerCase() || '';
          const matches = txt === 'continue' || txt === 'done' || el.name === 'glowDoneButton' || el.id === 'GLUXConfirmClose';
          return matches && el.offsetParent !== null;
        });
        if (btn) btn.click();
      });
      
      // Wait for page to reload navigation state
      await targetPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 6000 }).catch(() => {});
      await targetPage.waitForSelector('#productTitle, #ppd, #centerCol', { timeout: 3000 }).catch(() => {});
      
      console.log(`[AmazonScraper] Geolocation self-healing completed in ${Date.now() - zipStart}ms.`);
    } catch (err) {
      console.warn('[AmazonScraper] Geolocation self-healing failed:', err.message);
    }
  };

  // Helper to run a unified DOM evaluation containing Title, Price, Image, and Captcha checks
  const runUnifiedDOMQuery = async (targetPage) => {
    const startEval = Date.now();
    const result = await targetPage.evaluate(() => {
      // 1. Check for CAPTCHA challenges
      const hasCaptcha = !!(
        document.querySelector('input#captchacharacters') || 
        document.querySelector('#captchacharacters') || 
        document.querySelector('form[action*="/captcha"]')
      );
      if (hasCaptcha) {
        return { isCaptcha: true };
      }

      // 2. Extract Title
      const titleEl = document.querySelector('#productTitle');
      const titleStr = titleEl ? titleEl.textContent.trim() : '';

      // 3. Extract Price (prioritize active DOM selectors inside product containers for dynamic variant prices)
      let priceStr = '';

      // 3.1 Try target DOM elements within strict container boundaries
      const mainContainer = document.querySelector('#ppd') || 
                            document.querySelector('#centerCol') || 
                            document.querySelector('#rightCol') || 
                            document.querySelector('#buyBoxAccordion') ||
                            document.querySelector('#combinedBuyBox_feature_div') ||
                            document.querySelector('#dp-container') ||
                            document;

      const priceSelectors = [
        '#corePriceDisplay_desktop_feature_div .a-price-whole',
        '#corePrice_feature_div .a-price-whole',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '#priceblock_saleprice',
        '.a-price .a-price-whole',
        '.a-color-price',
        'span.a-price .a-offscreen'
      ];

      for (const selector of priceSelectors) {
        const elements = Array.from(mainContainer.querySelectorAll(selector));
        for (const el of elements) {
          // Refined filter checking HTML classes, data parameters, and computed styles (line-through)
          const isStrikeThrough = el.closest('.a-text-price') || 
                                 el.closest('.basisPrice') || 
                                 el.closest('del') || 
                                 el.closest('strike') ||
                                 el.classList.contains('a-text-price') ||
                                 el.getAttribute('data-a-strike') === 'true' ||
                                 window.getComputedStyle(el).textDecoration.includes('line-through') ||
                                 (el.parentElement && window.getComputedStyle(el.parentElement).textDecoration.includes('line-through'));
          
          if (!isStrikeThrough) {
            const text = el.textContent.trim();
            if (text) {
              priceStr = text;
              break;
            }
          }
        }
        if (priceStr) break;
      }

      // 3.2 Try itemprop price tag fallback
      if (!priceStr) {
        const itempropPrice = document.querySelector('meta[itemprop="price"]') || 
                              document.querySelector('[itemprop="price"]');
        if (itempropPrice) {
          const val = (itempropPrice.getAttribute('content') || itempropPrice.textContent || '').trim();
          if (val && val !== '0') priceStr = val;
        }
      }

      // 3.3 Try JSON-LD Product schema price fallback (fast loop parsing)
      if (!priceStr) {
        const jsonLdTags = document.querySelectorAll('script[type="application/ld+json"]');
        for (const tag of jsonLdTags) {
          try {
            const data = JSON.parse(tag.textContent);
            const schemas = Array.isArray(data) ? data : [data];
            for (const schema of schemas) {
              if (schema && (schema['@type'] === 'Product' || schema['@type'] === 'http://schema.org/Product')) {
                if (schema.offers && schema.offers.price) {
                  const val = String(schema.offers.price).trim();
                  if (val && val !== '0') {
                    priceStr = val;
                    break;
                  }
                }
              }
            }
          } catch (e) {}
          if (priceStr) break;
        }
      }

      // 3.4 Try OpenGraph price meta tags fallback
      if (!priceStr) {
        const ogPrice = document.querySelector('meta[property="product:price:amount"]') || 
                        document.querySelector('meta[property="og:price:amount"]');
        if (ogPrice && ogPrice.getAttribute('content')) {
          const val = ogPrice.getAttribute('content').trim();
          if (val && val !== '0') priceStr = val;
        }
      }

      // 4. Extract Product Image URL
      let imgUrl = '';
      const imgSelectors = [
        '#landingImage',
        '#imgBlkFront',
        '#main-image',
        '#img-canvas img',
        '#booksHeaderGlideImages img'
      ];

      for (const selector of imgSelectors) {
        const img = document.querySelector(selector);
        if (img) {
          const dynamicImgStr = img.getAttribute('data-a-dynamic-image');
          if (dynamicImgStr) {
            try {
              const urls = Object.keys(JSON.parse(dynamicImgStr));
              if (urls.length > 0) {
                imgUrl = urls[urls.length - 1];
                break;
              }
            } catch (e) {}
          }
          
          const src = img.getAttribute('src');
          if (src && !src.startsWith('data:')) {
            imgUrl = src;
            break;
          }
        }
      }

      if (!imgUrl) {
        const metaImg = document.querySelector('meta[property="og:image"]');
        if (metaImg) imgUrl = metaImg.getAttribute('content');
      }

      return {
        isCaptcha: false,
        title: titleStr,
        price: priceStr,
        image: imgUrl
      };
    });

    console.log(`[AmazonScraper] DOM evaluation query completed in ${Date.now() - startEval}ms.`);
    return result;
  };

  // Run initial DOM evaluation
  const startEval = Date.now();
  let product = await runUnifiedDOMQuery(page);
  let evalDuration = Date.now() - startEval;

  // Throw if blocked by CAPTCHA challenge
  if (product.isCaptcha) {
    throw new Error('Scraping blocked by Amazon CAPTCHA. Please try again later.');
  }

  // Trigger self-healing location flow if price is hidden geographically
  if (!product.price) {
    await setAmazonLocation(page, url);
    // Query DOM once more after geolocation reload
    const startEval2 = Date.now();
    product = await runUnifiedDOMQuery(page);
    evalDuration += (Date.now() - startEval2);
  }

  // Enforce title presence
  if (!product.title) {
    throw new Error('Product title not found on Amazon. The URL might be invalid or access was restricted.');
  }

  // Clean price: Extract numeric part
  let cleanedPrice = '';
  if (product.price) {
    let priceVal = product.price;
    if (priceVal.includes('-')) {
      priceVal = priceVal.split('-')[0];
    } else if (priceVal.toLowerCase().includes('to')) {
      priceVal = priceVal.toLowerCase().split('to')[0];
    }

    cleanedPrice = priceVal.replace(/[^\d.]/g, '');
    if (cleanedPrice.includes('.')) {
      const parts = cleanedPrice.split('.');
      if (parts[1] === '00' || parts[1] === '') {
        cleanedPrice = parts[0];
      }
    }
  }

  // Enforce price presence
  if (!cleanedPrice || cleanedPrice === '0' || parseFloat(cleanedPrice) === 0) {
    throw new Error('Product price not found. The item might be out of stock, currently unavailable, or restricted in this region.');
  }

  console.log(`[AmazonScraper] Scrape successfully finished in ${Date.now() - startTime}ms. Title: "${product.title}"`);

  return {
    title: product.title,
    price: cleanedPrice,
    image: product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    timings: {
      navigation: navDuration,
      wait: waitDuration,
      evaluate: evalDuration
    }
  };
}

module.exports = scrapeAmazon;
