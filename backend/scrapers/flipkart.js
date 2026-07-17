/**
 * Scrapes product details from Flipkart (flipkart.com)
 * Optimized for minimal IPC roundtrips, fast error checking, and scoped DOM queries.
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<{title: string, price: string, image: string}>}
 */
const scrapeFlipkart = async (page, url) => {
  const startTime = Date.now();
  console.log(`[FlipkartScraper] Starting scrape for URL: ${url}`);

  // Set Referer and headers to bypass bot blocks
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.flipkart.com/',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  });

  // Direct page navigation
  const startNav = Date.now();
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  const navDuration = Date.now() - startNav;
  console.log(`[FlipkartScraper] Page navigation completed in ${navDuration}ms.`);
  
  if (!response || response.status() !== 200) {
    throw new Error(`Failed to load Flipkart page. Status code: ${response ? response.status() : 'unknown'}.`);
  }

  // Wait for details elements or error elements
  const startWait = Date.now();
  await page.waitForSelector('h1, .yhB1nd, .Bua1g3, .Nx9zhl, ._30jeq3, body', { timeout: 3000 }).catch(() => {});
  const waitDuration = Date.now() - startWait;
  console.log(`[FlipkartScraper] Wait selector completed in ${waitDuration}ms.`);

  const startEval = Date.now();
  const product = await page.evaluate(() => {
    // 1. Check for connection / block errors without full HTML serialization
    const bodyText = document.body ? document.body.textContent : '';
    const hasError = bodyText.includes('Something went wrong') && bodyText.includes('E002');
    if (hasError) {
      return { isBlocked: true };
    }

    // 2. Extract Title
    const titleEl = document.querySelector('h1 span') || 
                    document.querySelector('h1') || 
                    document.querySelector('.yhB1nd') || 
                    document.querySelector('.Bua1g3');
    const titleStr = titleEl ? titleEl.textContent.trim() : '';

    // 3. Extract Price (prioritize metadata and structured schema markup)
    let priceStr = '';
    const itempropPrice = document.querySelector('meta[itemprop="price"]');
    if (itempropPrice && itempropPrice.getAttribute('content')) {
      const val = itempropPrice.getAttribute('content').trim();
      if (val && val !== '0') priceStr = val;
    }

    if (!priceStr) {
      const ogPrice = document.querySelector('meta[property="product:price:amount"]');
      if (ogPrice && ogPrice.getAttribute('content')) {
        const val = ogPrice.getAttribute('content').trim();
        if (val && val !== '0') priceStr = val;
      }
    }

    // JSON-LD Product Offer check (Optimized loop with fast return)
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

    // Scoped DOM selector checks
    if (!priceStr) {
      const priceSelectors = [
        '.Nx9zhl', 
        '._30jeq3', 
        '._16Jk6d', 
        '.dyC4S1', 
        '.UOC0FD',
        'div[class*="price"]'
      ];

      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const isStrike = el.classList.contains('_3I9_R3') || 
                           el.classList.contains('y3Z5D1') || 
                           window.getComputedStyle(el).textDecoration.includes('line-through');
          if (!isStrike) {
            const text = el.textContent.trim();
            if (text) {
              priceStr = text;
              break;
            }
          }
        }
      }
    }

    // Scoped Rupee symbol search (Avoids heavy wildcard querySelectorAll('*') scan)
    if (!priceStr) {
      const targetContainers = document.querySelectorAll('.a-price, .price-box, span, div');
      for (const el of targetContainers) {
        if (el.children.length === 0 && (el.textContent.includes('₹') || el.textContent.includes('Rs.')) && el.textContent.length < 15) {
          const isStrike = el.classList.contains('_3I9_R3') || 
                           el.classList.contains('y3Z5D1') || 
                           window.getComputedStyle(el).textDecoration.includes('line-through');
          if (!isStrike) {
            priceStr = el.textContent.trim();
            break;
          }
        }
      }
    }

    // 4. Extract Product Image
    let imgUrl = '';
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && ogImg.getAttribute('content')) {
      imgUrl = ogImg.getAttribute('content');
    }

    if (!imgUrl) {
      const twitterImg = document.querySelector('meta[name="twitter:image"]');
      if (twitterImg && twitterImg.getAttribute('content')) {
        imgUrl = twitterImg.getAttribute('content');
      }
    }

    if (!imgUrl) {
      const imgSelectors = [
        'img._396cs4', 
        'img._0DkuPH', 
        'img._2r_l1x',
        '.DByoR4 img',
        'img[src*="flipkart.com/image"]',
        'img[src*="/image/"]'
      ];

      for (const selector of imgSelectors) {
        const img = document.querySelector(selector);
        if (img && img.src && img.src.startsWith('http')) {
          imgUrl = img.src;
          break;
        }
      }
    }

    return {
      isBlocked: false,
      title: titleStr,
      price: priceStr,
      image: imgUrl
    };
  });

  const evalDuration = Date.now() - startEval;
  console.log(`[FlipkartScraper] DOM evaluation query completed in ${evalDuration}ms.`);

  if (product.isBlocked) {
    throw new Error('Flipkart returned an E002 connection error. Automated access is currently restricted.');
  }

  if (!product.title) {
    throw new Error('Product title not found on Flipkart. The page format may have changed or the link is invalid.');
  }

  // Clean price: Extract numeric part
  let cleanedPrice = '';
  if (product.price) {
    cleanedPrice = product.price.replace(/[^\d.]/g, '');
    if (cleanedPrice.includes('.')) {
      const parts = cleanedPrice.split('.');
      if (parts[1] === '00' || parts[1] === '') {
        cleanedPrice = parts[0];
      }
    }
  }

  // Enforce price presence
  if (!cleanedPrice || cleanedPrice === '0') {
    throw new Error('Product price not found on Flipkart. The item might be out of stock or currently unavailable.');
  }

  console.log(`[FlipkartScraper] Scrape successfully finished in ${Date.now() - startTime}ms. Title: "${product.title}"`);

  return {
    title: product.title,
    price: cleanedPrice,
    image: product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
  };
};

module.exports = scrapeFlipkart;
