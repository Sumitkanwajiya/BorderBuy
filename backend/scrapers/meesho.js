const priceResolver = require('./resolvers/priceResolver');

/**
 * Scrapes product details from Meesho (meesho.com)
 * Optimized for direct navigation first, consolidated evaluate query, and logging metrics.
 * @param {import('playwright').Page} page
 * @param {string} url
 * @returns {Promise<{title: string, price: string, image: string}>}
 */
const scrapeMeesho = async (page, url) => {
  const startTime = Date.now();
  console.log(`[MeeshoScraper] Starting scrape for URL: ${url}`);

  // Set headers to bypass bot block checks
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.meesho.com/',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  });

  // Direct page navigation - Bypasses redundant homepage pre-landing on initial request
  const startNav = Date.now();
  let response;
  try {
    response = await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 25000,
      referer: 'https://www.meesho.com/'
    });
  } catch (err) {
    throw new Error(`Failed to connect to Meesho: ${err.message}. Please check your internet connection.`);
  }
  const navDuration = Date.now() - startNav;
  console.log(`[MeeshoScraper] Direct page navigation completed in ${navDuration}ms.`);

  let status = response ? response.status() : 0;

  // Geolocation / Bot block self-healing: if direct navigation gets restricted (e.g. 403/400)
  if (status === 403 || status === 400 || !response) {
    console.log(`[MeeshoScraper] Direct navigation returned ${status}. Attempting cookie self-healing pre-landing...`);
    try {
      await page.goto('https://www.meesho.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('body', { timeout: 3000 }).catch(() => {});
      
      // Retry direct product load
      response = await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 20000,
        referer: 'https://www.meesho.com/'
      });
      status = response ? response.status() : 0;
    } catch (err) {
      console.warn('[MeeshoScraper] Geolocation self-healing pre-landing failed:', err.message);
    }
  }
  
  if (status === 403) {
    throw new Error('Meesho returned Status 403 (Access Denied). Meesho strictly blocks all traffic originating from outside India (including Nepal). To access Meesho products, please connect to an Indian VPN or proxy and try again.');
  } else if (!response || (status !== 200 && status !== 304)) {
    throw new Error(`Failed to load Meesho page. Status code: ${status || 'unknown'}.`);
  }

  // Wait for product details elements
  const startWait = Date.now();
  await page.waitForSelector('span[class*="CardProductTitle"], h3, h4, p[class*="ProductTitle"]', { timeout: 3000 }).catch(() => {});
  const waitDuration = Date.now() - startWait;
  console.log(`[MeeshoScraper] Wait selector completed in ${waitDuration}ms.`);

  const startEval = Date.now();
  const product = await page.evaluate(() => {
    // 1. Extract Title
    const titleEl = document.querySelector('span[class*="CardProductTitle"]') || 
                    document.querySelector('h3') || 
                    document.querySelector('h4') || 
                    document.querySelector('p[class*="ProductTitle"]');
    const titleStr = titleEl ? titleEl.textContent.trim() : '';

    // 2. Extract Price
    const priceEl = document.querySelector('h5[class*="CardProductPrice"]') || 
                    document.querySelector('h4[class*="Price"]') || 
                    document.querySelector('h2[class*="Price"]') || 
                    document.querySelector('h2') || 
                    document.querySelector('h3');
    const priceStr = priceEl ? priceEl.textContent.trim() : '';

    // 3. Extract Image URL
    const img = document.querySelector('img[class*="CardProductImage"]') || 
                document.querySelector('img[src*="meesho.com"]') || 
                document.querySelector('.product-image-container img') ||
                document.querySelector('img');
    const imgUrl = img && img.src && img.src.startsWith('http') ? img.src : '';

    return {
      title: titleStr,
      price: priceStr,
      image: imgUrl
    };
  });

  const evalDuration = Date.now() - startEval;
  console.log(`[MeeshoScraper] DOM evaluation query completed in ${evalDuration}ms.`);

  if (!product.title) {
    throw new Error('Product title not found on Meesho. The page format may have changed or the link is invalid.');
  }

  // Resolve selling price via centralized resolver
  const price = await priceResolver(page);

  console.log(`[MeeshoScraper] Scrape successfully finished in ${Date.now() - startTime}ms. Title: "${product.title}"`);

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

module.exports = scrapeMeesho;
