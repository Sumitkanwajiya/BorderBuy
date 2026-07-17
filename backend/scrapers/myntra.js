const scrapeMyntra = async (page, url) => {
  console.log('Scraping Myntra URL:', url);

  // Set headers to bypass bot block checks
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.myntra.com/',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  });

  // Navigate to product detail page with Referer
  const response = await page.goto(url, { 
    waitUntil: 'domcontentloaded', 
    timeout: 45000,
    referer: 'https://www.myntra.com/'
  });
  
  if (!response || (response.status() !== 200 && response.status() !== 304)) {
    throw new Error(`Failed to load Myntra page. Status code: ${response ? response.status() : 'unknown'}. Myntra anti-bot protection might be blocking this request.`);
  }

  // Wait for product details elements to load
  await page.waitForSelector('.pdp-title, .pdp-name, .pdp-price', { timeout: 3500 }).catch(() => {});

  // Attempt to extract title
  const title = await page.evaluate(() => {
    const brandEl = document.querySelector('.pdp-title');
    const nameEl = document.querySelector('.pdp-name');
    const brand = brandEl ? brandEl.textContent.trim() : '';
    const name = nameEl ? nameEl.textContent.trim() : '';
    
    return brand && name ? `${brand} - ${name}` : brand || name || '';
  });

  if (!title) {
    throw new Error('Product title not found on Myntra. The page format may have changed or the link is invalid.');
  }

  // Attempt to extract price
  const price = await page.evaluate(() => {
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
        if (text) return text;
      }
    }

    // Fallback: search for elements with Rupee symbol
    const rupeeEls = Array.from(document.querySelectorAll('*'))
      .filter(el => el.children.length === 0 && (el.textContent.includes('₹') || el.textContent.includes('Rs.')) && el.textContent.length < 15)
      .map(el => el.textContent.trim());
    return rupeeEls.length > 0 ? rupeeEls[0] : '';
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
    throw new Error('Product price not found on Myntra. The item might be out of stock or currently unavailable.');
  }

  // Attempt to extract image URL
  const image = await page.evaluate(() => {
    const img = document.querySelector('img[src*="myntassets.com"]') || 
                document.querySelector('.image-grid-image') || 
                document.querySelector('.pdp-image-container img');
    return img && img.src && img.src.startsWith('http') ? img.src : '';
  });

  return {
    title,
    price: cleanedPrice,
    image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' // Fallback
  };
};

module.exports = scrapeMyntra;
