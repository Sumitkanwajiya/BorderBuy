const priceResolver = require('./resolvers/priceResolver');

/**
 * Scrapes product details from Myntra (myntra.com)
 * Optimized for minimal browser evaluations and scoped DOM lookups.
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<{title: string, price: string, image: string}>}
 */
const scrapeMyntra = async (page, url) => {
  const startTime = Date.now();
  console.log(`[MyntraScraper] Starting scrape for URL: ${url}`);

  // Set headers to bypass bot block checks
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.myntra.com/',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  });

  // Navigate to product detail page with Referer
  const startNav = Date.now();
  const response = await page.goto(url, { 
    waitUntil: 'domcontentloaded', 
    timeout: 25000,
    referer: 'https://www.myntra.com/'
  });
  const navDuration = Date.now() - startNav;
  console.log(`[MyntraScraper] Page navigation completed in ${navDuration}ms.`);
  
  if (!response || (response.status() !== 200 && response.status() !== 304)) {
    throw new Error(`Failed to load Myntra page. Status code: ${response ? response.status() : 'unknown'}.`);
  }

  // Wait for product details elements to load
  const startWait = Date.now();
  await page.waitForSelector('.pdp-title, .pdp-name, .pdp-price', { timeout: 3000 }).catch(() => {});
  const waitDuration = Date.now() - startWait;
  console.log(`[MyntraScraper] Wait selector completed in ${waitDuration}ms.`);

  const startEval = Date.now();
  const product = await page.evaluate(() => {
    // 1. Extract Title
    const brandEl = document.querySelector('.pdp-title');
    const nameEl = document.querySelector('.pdp-name');
    const brand = brandEl ? brandEl.textContent.trim() : '';
    const name = nameEl ? nameEl.textContent.trim() : '';
    const titleStr = brand && name ? `${brand} - ${name}` : brand || name || '';

    // 2. Extract Price
    let priceStr = '';
    const priceSelectors = [
      '.pdp-price', 
      '.pdp-discount', 
      '.pdp-selling-price',
      'span[class*="price"]'
    ];

    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent.trim();
        if (text) {
          priceStr = text;
          break;
        }
      }
    }

    // Scoped Rupee symbol search (excludes strike-through classes and expensive wildcard lookups)
    if (!priceStr) {
      const rupeeTags = document.querySelectorAll('.pdp-selling-price, .pdp-price, span, div');
      for (const el of rupeeTags) {
        if (el.children.length === 0 && (el.textContent.includes('₹') || el.textContent.includes('Rs.')) && el.textContent.length < 15) {
          priceStr = el.textContent.trim();
          break;
        }
      }
    }

    // 3. Extract Image URL
    let imgUrl = '';
    const img = document.querySelector('img[src*="myntassets.com"]') || 
                document.querySelector('.image-grid-image') || 
                document.querySelector('.pdp-image-container img');
    if (img && img.src && img.src.startsWith('http')) {
      imgUrl = img.src;
    }

    return {
      title: titleStr,
      price: priceStr,
      image: imgUrl
    };
  });

  const evalDuration = Date.now() - startEval;
  console.log(`[MyntraScraper] DOM evaluation query completed in ${evalDuration}ms.`);

  if (!product.title) {
    throw new Error('Product title not found on Myntra. The page format may have changed or the link is invalid.');
  }

  // Resolve selling price via centralized resolver
  const price = await priceResolver(page);

  console.log(`[MyntraScraper] Scrape successfully finished in ${Date.now() - startTime}ms. Title: "${product.title}"`);

  return {
    title: product.title,
    price: price,
    image: product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    timings: {
      navigation: navDuration,
      wait: waitDuration,
      evaluate: evalDuration
    }
  };
};

module.exports = scrapeMyntra;
