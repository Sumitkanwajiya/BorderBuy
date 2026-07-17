const scrapeFlipkart = async (page, url) => {
  console.log('Scraping Flipkart URL:', url);

  // Set Referer to bypass bot block checks
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.flipkart.com/',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  });

  // Navigate to product detail page
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  
  if (!response || response.status() !== 200) {
    throw new Error(`Failed to load Flipkart page. Status code: ${response ? response.status() : 'unknown'}. Flipkart anti-bot protection might be blocking this request.`);
  }

  // Wait for the title or price element to load
  await page.waitForSelector('h1, .yhB1nd, .Bua1g3, .Nx9zhl, ._30jeq3', { timeout: 3500 }).catch(() => {});

  // Extract page content check
  const pageContent = await page.content();
  if (pageContent.includes('Something went wrong') && pageContent.includes('E002')) {
    throw new Error('Flipkart returned an E002 connection error. Flipkart is currently blocking automated access from this server environment.');
  }

  // Attempt to extract title
  const title = await page.evaluate(() => {
    const titleEl = document.querySelector('h1 span') || 
                    document.querySelector('h1') || 
                    document.querySelector('.yhB1nd') || 
                    document.querySelector('.Bua1g3');
    return titleEl ? titleEl.textContent.trim() : '';
  });

  if (!title) {
    throw new Error('Product title not found on Flipkart. The page format may have changed or the link is invalid.');
  }

  // Attempt to extract price
  const price = await page.evaluate(() => {
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
        const text = el.textContent.trim();
        if (text) return text;
      }
    }

    // Fallback: search for elements with Rupee symbol
    const rupeeEls = Array.from(document.querySelectorAll('*'))
      .filter(el => el.children.length === 0 && el.textContent.includes('₹') && el.textContent.length < 15)
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
    throw new Error('Product price not found on Flipkart. The item might be out of stock or currently unavailable.');
  }

  // Attempt to extract image URL
  const image = await page.evaluate(() => {
    // 1. Try og:image meta tags first (extremely robust and bypasses DOM class changes)
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && ogImg.getAttribute('content')) {
      return ogImg.getAttribute('content');
    }

    const twitterImg = document.querySelector('meta[name="twitter:image"]');
    if (twitterImg && twitterImg.getAttribute('content')) {
      return twitterImg.getAttribute('content');
    }

    // 2. Try target image selectors in the gallery
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
      if (img && img.src && img.src.startsWith('http')) return img.src;
    }

    // 3. Fallback: match any image with alt text matching product title
    const h1Text = (document.querySelector('h1')?.textContent || '').trim().toLowerCase();
    if (h1Text) {
      const matchedImg = Array.from(document.querySelectorAll('img')).find(img => {
        const alt = (img.getAttribute('alt') || '').toLowerCase();
        return alt && (alt.includes(h1Text) || h1Text.includes(alt)) && img.src && img.src.startsWith('http');
      });
      if (matchedImg) return matchedImg.src;
    }

    // 4. Fallback to first high-res product image on the page
    const imgs = Array.from(document.querySelectorAll('img'))
      .map(img => img.src)
      .filter(src => src && (src.includes('imagedoc') || src.includes('flipkart.com/image')));
    return imgs.length > 0 ? imgs[0] : '';
  });

  return {
    title,
    price: cleanedPrice,
    image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' // Fallback watch placeholder if all fails
  };
};

module.exports = scrapeFlipkart;
