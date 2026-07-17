const scrapeMeesho = async (page, url) => {
  console.log('Scraping Meesho URL:', url);

  // Set headers to bypass bot block checks
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.meesho.com/',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  });

  // Navigate to Meesho homepage first to get cookies
  let alreadyPrelanded = false;
  if (page.prelandedDomains && page.prelandedDomains.has('meesho')) {
    alreadyPrelanded = true;
  }

  if (!alreadyPrelanded) {
    try {
      console.log('Pre-landing on Meesho homepage...');
      await page.goto('https://www.meesho.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
      if (page.prelandedDomains) {
        page.prelandedDomains.add('meesho');
      }
    } catch (err) {
      console.warn('Pre-landing on Meesho failed, navigating directly...');
    }
  } else {
    console.log('Meesho already pre-landed in this context. Skipping...');
  }

  // Navigate to product detail page with Referer
  let response;
  try {
    response = await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 45000,
      referer: 'https://www.meesho.com/'
    });
  } catch (err) {
    throw new Error(`Failed to connect to Meesho: ${err.message}. Please check your internet connection.`);
  }
  
  const status = response ? response.status() : 0;
  if (status === 403) {
    throw new Error('Meesho returned Status 403 (Access Denied). Meesho strictly blocks all traffic originating from outside India (including Nepal). To access Meesho products, please connect to an Indian VPN or proxy and try again.');
  } else if (!response || (status !== 200 && status !== 304)) {
    throw new Error(`Failed to load Meesho page. Status code: ${status || 'unknown'}. Meesho anti-bot protection might be blocking this request.`);
  }

  // Wait for product details elements instead of hard timeout
  await page.waitForSelector('span[class*="CardProductTitle"], h3, h4, p[class*="ProductTitle"]', { timeout: 3500 }).catch(() => {});

  // Attempt to extract title
  const title = await page.evaluate(() => {
    // Meesho titles are in h3, h4 or class names matching Title
    const titleEl = document.querySelector('span[class*="CardProductTitle"]') || 
                    document.querySelector('h3') || 
                    document.querySelector('h4') || 
                    document.querySelector('p[class*="ProductTitle"]');
    return titleEl ? titleEl.textContent.trim() : '';
  });

  if (!title) {
    throw new Error('Product title not found on Meesho. The page format may have changed or the link is invalid.');
  }

  // Attempt to extract price
  const price = await page.evaluate(() => {
    const priceEl = document.querySelector('h5[class*="CardProductPrice"]') || 
                    document.querySelector('h4[class*="Price"]') || 
                    document.querySelector('h2[class*="Price"]') || 
                    document.querySelector('h2') || 
                    document.querySelector('h3');
    
    return priceEl ? priceEl.textContent.trim() : '';
  });

  // Clean price: Extract numeric part
  let cleanedPrice = '';
  if (price) {
    cleanedPrice = price.replace(/[^\d.]/g, '');
    if (cleanedPrice.includes('.')) {
      const parts = cleanedPrice.split('.');
      if (parts[1] === '00' || parts[1] === '') {
        cleanedPrice = parts[0];
      }
    }
  }

  // Enforce price presence
  if (!cleanedPrice || cleanedPrice === '0') {
    throw new Error('Product price not found on Meesho. The item might be out of stock or currently unavailable.');
  }

  // Attempt to extract image URL
  const image = await page.evaluate(() => {
    const img = document.querySelector('img[class*="CardProductImage"]') || 
                document.querySelector('img[src*="meesho.com"]') || 
                document.querySelector('.product-image-container img') ||
                document.querySelector('img');
    return img && img.src && img.src.startsWith('http') ? img.src : '';
  });

  return {
    title,
    price: cleanedPrice,
    image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' // Fallback
  };
};

module.exports = scrapeMeesho;
