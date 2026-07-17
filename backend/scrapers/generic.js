/**
 * Fallback generic scraper that extracts product details using OpenGraph tags,
 * Twitter cards, schema microdata, or standard HTML elements.
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<{title: string, price: string, image: string}>}
 */
async function scrapeGeneric(page, url) {
  console.log(`Navigating to generic URL: ${url}`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // Wait briefly for page to populate
  await page.waitForSelector('meta[property="og:title"], h1, body', { timeout: 2000 }).catch(() => {});

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
      'meta[name="twitter:label1"]', // Sometimes price is stored here
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

  // Clean the price string to numeric-only digits and decimals
  let cleanedPrice = '0';
  if (product.price) {
    const matched = product.price.replace(/[^\d.]/g, '');
    if (matched) {
      cleanedPrice = matched;
      if (cleanedPrice.includes('.')) {
        const parts = cleanedPrice.split('.');
        if (parts[1] === '00' || parts[1] === '') {
          cleanedPrice = parts[0];
        }
      }
    }
  }

  return {
    title: product.title || 'Unknown Product',
    price: cleanedPrice,
    image: product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
  };
}

module.exports = scrapeGeneric;
