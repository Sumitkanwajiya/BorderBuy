const priceResolver = require('./resolvers/priceResolver');

/**
 * Fallback generic scraper that extracts product details using OpenGraph tags,
 * Twitter cards, schema microdata, or standard HTML elements.
 * Optimized to run all DOM evaluations in a single page.evaluate call.
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<{title: string, price: string, image: string}>}
 */
async function scrapeGeneric(page, url) {
  const startTime = Date.now();
  console.log(`[GenericScraper] Starting scrape for URL: ${url}`);
  
  // Navigate directly
  const startNav = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  const navDuration = Date.now() - startNav;
  console.log(`[GenericScraper] Page navigation completed in ${navDuration}ms.`);
  
  // Wait briefly for page details
  const startWait = Date.now();
  await page.waitForSelector('meta[property="og:title"], h1, body', { timeout: 2000 }).catch(() => {});
  const waitDuration = Date.now() - startWait;
  console.log(`[GenericScraper] Wait selector completed in ${waitDuration}ms.`);

  const startEval = Date.now();
  const product = await page.evaluate(() => {
    // 1. Title extraction
    let title = '';
    const titleSelectors = [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]'
    ];
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        title = el.getAttribute('content');
        if (title) break;
      }
    }
    if (!title) {
      title = document.title ? document.title.trim() : '';
    }
    if (!title) {
      const h1 = document.querySelector('h1');
      title = h1 ? h1.textContent.trim() : '';
    }

    // 2. Image extraction
    let image = '';
    const imageSelectors = [
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
      'meta[name="twitter:image"]',
      'link[rel="image_src"]'
    ];
    for (const selector of imageSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        image = el.getAttribute('content') || el.getAttribute('href');
        if (image) break;
      }
    }

    // 3. Price extraction
    let price = '';
    const priceSelectors = [
      'meta[property="og:price:amount"]',
      'meta[property="product:price:amount"]',
      'meta[name="twitter:label1"]',
      'meta[itemprop="price"]'
    ];
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        price = el.getAttribute('content');
        if (price) break;
      }
    }

    // Fallback selectors for price if meta tags fail
    if (!price) {
      const priceClasses = [
        '.price', '.product-price', '.current-price', 
        '[class*="price"]', '[id*="price"]'
      ];
      for (const cls of priceClasses) {
        const el = document.querySelector(cls);
        if (el) {
          const text = el.textContent.trim();
          if (text && /\d/.test(text)) {
            price = text;
            break;
          }
        }
      }
    }

    return { title, price, image };
  });

  const evalDuration = Date.now() - startEval;
  console.log(`[GenericScraper] DOM evaluation query completed in ${evalDuration}ms.`);

  // Resolve selling price via centralized resolver
  const price = await priceResolver(page);

  console.log(`[GenericScraper] Scrape successfully finished in ${Date.now() - startTime}ms. Title: "${product.title}"`);

  return {
    title: product.title || 'Unknown Product',
    price: price,
    image: product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    timings: {
      navigation: navDuration,
      wait: waitDuration,
      evaluate: evalDuration
    }
  };
}

module.exports = scrapeGeneric;
