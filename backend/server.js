require('dotenv').config();

// Suppress verbose log details in terminal (enable by setting DEBUG=true in env)
if (process.env.DEBUG !== 'true') {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
}

const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const { getScraper } = require('./scrapers');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Latency & load optimization variables
let browser = null;
let sharedContext = null;
let contextUseCount = 0;
const prelandedDomains = new Set();

const SCRAPE_CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

// Periodic cleanup of expired cache entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of SCRAPE_CACHE.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      SCRAPE_CACHE.delete(key);
    }
  }
}, 5 * 60 * 1000);

async function getBrowserContext() {
  if (!browser || !browser.isConnected()) {
    console.log('Launching persistent Playwright browser...');
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ];
    try {
      browser = await chromium.launch({
        headless: true,
        channel: 'chrome',
        args: launchArgs
      });
    } catch (err) {
      console.warn('Google Chrome channel not found, falling back to default Chromium...');
      browser = await chromium.launch({
        headless: true,
        args: launchArgs
      });
    }
    sharedContext = null;
  }

  // Recycle context to prevent memory leak and cookie bloat
  if (sharedContext && contextUseCount >= 50) {
    console.log('Recycling shared browser context...');
    try {
      await sharedContext.close();
    } catch (err) {
      console.error('Error closing context during recycling:', err.message);
    }
    sharedContext = null;
  }

  if (!sharedContext) {
    console.log('Creating new shared browser context...');
    sharedContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    // Enable stealth mode to bypass robot detection
    await sharedContext.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    contextUseCount = 0;
    prelandedDomains.clear();
  }

  contextUseCount++;
  return { context: sharedContext, prelandedDomains };
}

/**
 * Helper to validate if a URL is safe to prevent SSRF vulnerabilities.
 * @param {string} urlStr 
 * @returns {boolean}
 */
function isSafeUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    
    // 1. Protocol check: Allow only HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    
    // 2. Host check: Ensure hostname exists and is not a loopback address or private IP
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) {
      return false;
    }

    // Direct loopback matches
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '0.0.0.0') {
      return false;
    }

    // AWS/Azure/GCP metadata address
    if (hostname === '169.254.169.254') {
      return false;
    }

    // IP address checks for private/local subnets (e.g. 10.x.x.x, 172.16.x.x, 192.168.x.x)
    const privateIpPattern = /^(?:10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)$/;
    if (privateIpPattern.test(hostname)) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

// Main scraping endpoint
app.post('/api/fetch-product', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Product URL is required' });
  }

  // SSRF Protection: Validate URL and ensure it's a safe HTTP/HTTPS URL
  if (!isSafeUrl(url)) {
    return res.status(400).json({ error: 'Invalid or unsafe URL format. Only public HTTP/HTTPS URLs are allowed.' });
  }

  // Check cache
  const cached = SCRAPE_CACHE.get(url);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`Cache hit for URL: ${url}`);
    return res.json(cached.data);
  }

  let page;
  try {
    // Resolve which scraper to use
    const scrape = getScraper(url);

    const { context, prelandedDomains } = await getBrowserContext();
    page = await context.newPage();
    page.prelandedDomains = prelandedDomains;

    // Block heavy media types to speed up loading
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'font', 'media'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Call the matching scraper
    const product = await scrape(page, url);

    console.log('Successfully scraped product:', product.title);

    // Final safety validation: Ensure we have a valid, non-zero price
    if (!product.price || product.price === '0' || parseFloat(product.price) === 0) {
      throw new Error('Product price not found. The item might be out of stock, currently unavailable, or this marketplace is not fully supported yet.');
    }

    // Save to cache
    SCRAPE_CACHE.set(url, {
      data: product,
      timestamp: Date.now()
    });

    // Return structured product details
    return res.json(product);

  } catch (error) {
    console.error('Error during scraping operation:', error.message);
    // If it's a browser connection error or crash, close/null browser & context to force recreation
    if (error.message.includes('browser has been closed') || error.message.includes('Target closed')) {
      if (browser) {
        browser.close().catch(() => {});
        browser = null;
      }
      sharedContext = null;
    }
    return res.status(500).json({
      error: error.message || 'Failed to fetch product details. Please check the URL and try again.'
    });
  } finally {
    if (page) {
      console.log('Closing page...');
      await page.close().catch(err => console.error('Error closing page:', err.message));
    }
  }
});

// Serve static assets in production mode if the frontend build directory exists
const path = require('path');
const fs = require('fs');
const distPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Clean up browser instance on exit
const cleanExit = async () => {
  if (browser) {
    console.log('Closing browser on server exit...');
    await browser.close().catch(() => {});
  }
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
