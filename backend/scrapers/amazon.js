const { chromium } = require('playwright');

/**
 * Scrapes product details from Amazon India (amazon.in)
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<{title: string, price: string, image: string}>}
 */
async function scrapeAmazon(page, url) {
  // Set realistic request headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  });

  // Pre-land on homepage to acquire session cookies
  let alreadyPrelanded = false;
  if (page.prelandedDomains && page.prelandedDomains.has('amazon')) {
    alreadyPrelanded = true;
  }

  if (!alreadyPrelanded) {
    try {
      const homepage = new URL(url).origin;
      console.log(`Pre-landing on Amazon homepage: ${homepage} for session cookies...`);
      await page.goto(homepage, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#nav-logo, body', { timeout: 5000 }).catch(() => {});
      if (page.prelandedDomains) {
        page.prelandedDomains.add('amazon');
      }
    } catch (err) {
      console.warn('Pre-landing homepage navigation failed, proceeding directly to product:', err.message);
    }
  } else {
    console.log('Amazon already pre-landed in this context. Skipping...');
  }

  console.log(`Navigating to Amazon URL: ${url}`);
  
  // Navigate with a generous timeout and wait for load/domcontentloaded
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Wait for product details elements rather than a hard timeout
  await page.waitForSelector('#productTitle, #ppd, #centerCol', { timeout: 3500 }).catch(() => {});

  // Check if we hit a robot/captcha challenge page
  const pageContent = await page.content();
  if (pageContent.includes('Type the characters you see in this image') || 
      pageContent.includes('Robot Check') || 
      pageContent.includes('continue shopping')) {
    throw new Error('Scraping blocked by Amazon CAPTCHA. Please try again later.');
  }

  // Attempt to extract title
  const title = await page.evaluate(() => {
    const titleEl = document.querySelector('#productTitle');
    return titleEl ? titleEl.textContent.trim() : '';
  });

  if (!title) {
    throw new Error('Product title not found. The URL might be invalid or access was restricted.');
  }

  // Helper function to extract price from page DOM
  const getPriceFromDOM = async (targetPage) => {
    return targetPage.evaluate(() => {
      // Search only within the main product details container to avoid recommended/sponsored items
      const mainContainer = document.querySelector('#ppd') || 
                            document.querySelector('#centerCol') || 
                            document.querySelector('#rightCol') || 
                            document;

      // Amazon price selectors in order of specificity
      const selectors = [
        '#corePriceDisplay_desktop_feature_div .a-price-whole',
        '#corePrice_feature_div .a-price-whole',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '#priceblock_saleprice',
        '.a-price .a-price-whole',
        '.a-color-price',
        'span.a-price .a-offscreen'
      ];

      for (const selector of selectors) {
        const elements = Array.from(mainContainer.querySelectorAll(selector));
        for (const el of elements) {
          // Exclude strike-through, crossed-out basis prices (original M.R.P. / list price)
          const isStrikeThrough = el.closest('.a-text-price') || 
                                 el.closest('.basisPrice') || 
                                 el.closest('del') || 
                                 el.closest('strike') ||
                                 el.classList.contains('a-text-price') ||
                                 el.getAttribute('data-a-strike') === 'true';
          
          if (!isStrikeThrough) {
            const text = el.textContent.trim();
            if (text) return text;
          }
        }
      }

      // Try finding by microdata or schema tags
      const priceMeta = document.querySelector('meta[property="product:price:amount"]');
      if (priceMeta) return priceMeta.getAttribute('content');

      return '';
    });
  };

  // Helper to change Amazon delivery ZIP code to reveal prices
  const setAmazonLocation = async (targetPage, targetUrl) => {
    try {
      const isUS = targetUrl.includes('amazon.com');
      const zipCode = isUS ? '10001' : '400001';
      
      console.log(`Price not found on initial load. Attempting location self-healing (ZIP: ${zipCode})...`);
      
      const locationBtn = await targetPage.$('#nav-global-location-popover-link');
      if (!locationBtn) return;
      
      await locationBtn.click();
      await targetPage.waitForSelector('#GLUXZipUpdateInput', { timeout: 4000 });
      await targetPage.waitForTimeout(200);

      // Type zip code human-like to bypass bot check
      await targetPage.type('#GLUXZipUpdateInput', zipCode, { delay: 50 });
      await targetPage.waitForTimeout(200);

      await targetPage.click('#GLUXZipUpdate');
      await targetPage.waitForSelector('input[name="glowDoneButton"], #GLUXConfirmClose, #GLUXZipUpdateInput', { timeout: 3000 }).catch(() => {});
      await targetPage.waitForTimeout(300);

      // Click Continue/Done using page.evaluate to find the actual interactive element
      const clickResult = await targetPage.evaluate(() => {
        const clickables = Array.from(document.querySelectorAll('input, button'));
        let btn = clickables.find(el => {
          const txt = (el.textContent || '').trim().toLowerCase() || (el.value || '').trim().toLowerCase() || '';
          const matches = txt === 'continue' || txt === 'done' || el.name === 'glowDoneButton' || el.id === 'GLUXConfirmClose';
          return matches && el.offsetParent !== null;
        });

        // Fallback to check any element if input/button is not found
        if (!btn) {
          const allElements = Array.from(document.querySelectorAll('span, a, div'));
          btn = allElements.find(el => {
            const txt = (el.textContent || '').trim().toLowerCase() || (el.value || '').trim().toLowerCase() || '';
            const matches = txt === 'continue' || txt === 'done';
            return matches && el.offsetParent !== null;
          });
        }

        if (btn) {
          btn.click();
          return `clicked: ${btn.tagName} - ${btn.value || btn.textContent}`;
        }
        return 'no button found';
      });
      
      console.log('Location update popover click result:', clickResult);
      
      // Wait for reload
      await targetPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
      await targetPage.waitForSelector('#corePriceDisplay_desktop_feature_div, #productTitle, body', { timeout: 3000 }).catch(() => {});
      console.log(`Delivery location successfully updated to ZIP: ${zipCode}`);
    } catch (err) {
      console.warn('Location self-healing failed:', err.message);
    }
  };

  // Attempt to extract price
  let rawPrice = await getPriceFromDOM(page);

  // Self-heal location if price is missing (geographically hidden)
  if (!rawPrice) {
    await setAmazonLocation(page, url);
    rawPrice = await getPriceFromDOM(page);
  }

  // Clean price: Extract numeric part
  let cleanedPrice = '';
  if (rawPrice) {
    let priceStr = rawPrice;
    // If it's a range (e.g. "₹499 - ₹999" or "₹499 to ₹999"), take the first price in the range
    if (priceStr.includes('-')) {
      priceStr = priceStr.split('-')[0];
    } else if (priceStr.toLowerCase().includes('to')) {
      priceStr = priceStr.toLowerCase().split('to')[0];
    }

    // Remove currency symbol, spaces, commas, and trailing dot/cents
    cleanedPrice = priceStr.replace(/[^\d.]/g, '');
    
    // If there is a decimal point and it's followed by .00, remove it for clean integer
    if (cleanedPrice.includes('.')) {
      const parts = cleanedPrice.split('.');
      if (parts[1] === '00' || parts[1] === '') {
        cleanedPrice = parts[0];
      }
    }
  }

  // Enforce that price must be found and non-zero
  if (!cleanedPrice || cleanedPrice === '0' || parseFloat(cleanedPrice) === 0) {
    throw new Error('Product price not found. The item might be out of stock, currently unavailable, or restricted in this region.');
  }

  // Attempt to extract image URL
  const image = await page.evaluate(() => {
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
        // Amazon landing image often uses data-a-dynamic-image which contains multiple resolutions.
        // We can parse the JSON keys to find the largest image or just use src.
        const dynamicImgStr = img.getAttribute('data-a-dynamic-image');
        if (dynamicImgStr) {
          try {
            const urls = Object.keys(JSON.parse(dynamicImgStr));
            if (urls.length > 0) {
              // Return the last one (usually highest resolution) or first
              return urls[urls.length - 1];
            }
          } catch (e) {
            // Ignore JSON parse error and fallback to src
          }
        }
        
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:')) return src;
      }
    }

    // Fallback: search meta tags
    const metaImg = document.querySelector('meta[property="og:image"]');
    if (metaImg) return metaImg.getAttribute('content');

    return '';
  });

  return {
    title,
    price: cleanedPrice || '0', // fallback if price not found
    image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' // fallback placeholder
  };
}

module.exports = scrapeAmazon;
