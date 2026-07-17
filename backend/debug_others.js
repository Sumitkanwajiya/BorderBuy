const { chromium } = require('playwright');
const path = require('path');

async function debug() {
  console.log('Launching browser with Chrome channel...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();

  // Stealth
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // Set realistic headers
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.flipkart.com/',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  });

  const url = 'https://www.flipkart.com/nothing-phone-4b-black-128-gb/p/itm939608b40adbb?pid=MOBHZMBDHVTPQTWY&param=2001&BU=Mobile&pageUID=1784030199897';
  console.log('Navigating to Flipkart homepage first...');
  try {
    await page.goto('https://www.flipkart.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('Navigating to product URL...');
    const res = await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000,
      referer: 'https://www.flipkart.com/'
    });
    console.log('Status:', res.status());
    await page.waitForTimeout(3000);
    
    // Extract info
    const data = await page.evaluate(() => {
      // Find title: Flipkart product titles are in h1 span or class .Bua1g3 / .yhB1nd
      const titleEl = document.querySelector('h1 span') || document.querySelector('h1') || document.querySelector('.yhB1nd') || document.querySelector('.Bua1g3');
      const title = titleEl ? titleEl.textContent.trim() : 'NOT FOUND';

      // Find price: contains ₹
      const priceSelectors = ['.Nx9zhl', '._30jeq3', '._16Jk6d', '.dyC4S1', '.UOC0FD'];
      let price = 'NOT FOUND';
      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          price = el.textContent.trim();
          break;
        }
      }

      if (price === 'NOT FOUND') {
        const rupeeEls = Array.from(document.querySelectorAll('*'))
          .filter(el => el.children.length === 0 && el.textContent.includes('₹') && el.textContent.length < 15)
          .map(el => el.textContent.trim());
        price = rupeeEls.length > 0 ? rupeeEls[0] : 'NOT FOUND';
      }

      // Find image
      const img = document.querySelector('img._396cs4') || 
                  document.querySelector('img._0DkuPH') || 
                  document.querySelector('.DByoR4 img') ||
                  document.querySelector('img[src*="flipkart.com/image"]') ||
                  document.querySelector('img');
      const image = img ? img.src : 'NOT FOUND';

      // Print all classes of elements containing rupee
      const rupeeClasses = Array.from(document.querySelectorAll('*'))
        .filter(el => el.children.length === 0 && el.textContent.includes('₹'))
        .map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.trim() }))
        .slice(0, 5);

      return { title, price, image, rupeeClasses };
    });
    
    console.log('Data:', data);
    await page.screenshot({ path: path.join(__dirname, 'flipkart_test.png') });
    console.log('Screenshot saved.');
    
  } catch (err) {
    console.error('Failed:', err.message);
  }

  await browser.close();
}

debug();
