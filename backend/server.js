require('dotenv').config();
const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, 'pw-browsers');

// Suppress verbose log details in terminal (enable by setting DEBUG=true in env)
if (process.env.DEBUG !== 'true') {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
}

const express = require('express');
const cors = require('cors');
const { getScraper } = require('./scrapers');

const scraperService = require('./services/scraperService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Scraper Health check API endpoint
app.get('/api/health', (req, res) => {
  return res.json(scraperService.getHealthStatus());
});

// Main scraping endpoint
app.post('/api/fetch-product', async (req, res) => {
  const { url, bypassCache, checkout, forceRefresh } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Product URL is required' });
  }

  // SSRF Protection: Validate URL and ensure it's a safe HTTP/HTTPS URL
  if (!isSafeUrl(url)) {
    return res.status(400).json({ error: 'Invalid or unsafe URL format. Only public HTTP/HTTPS URLs are allowed.' });
  }

  try {
    const shouldBypass = !!(bypassCache || checkout || forceRefresh);
    const product = await scraperService.scrape(url, shouldBypass);
    return res.json(product);
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to fetch product details. Please check the URL and try again.'
    });
  }
});

// Serve static assets in production mode if the frontend build directory exists
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
  
  // Pre-warm Playwright browser instance at startup to avoid cold start delays
  scraperService.getBrowser().catch(err => {
    console.warn('Playwright browser pre-warming failed:', err.message);
  });
});

// Clean up browser instance on exit
const cleanExit = async () => {
  await scraperService.shutdown();
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
