const path = require('path');

// Set browsers installation directory relative to backend to survive Render rebuild container swaps
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '../pw-browsers');

const { chromium } = require('playwright');
const { getScraper } = require('../scrapers');
const { execSync } = require('child_process');

class ScraperService {
  constructor() {
    this.browser = null;
    this.activePagesCount = 0;
    this.maxConcurrentScrapes = parseInt(process.env.MAX_CONCURRENT_SCRAPES, 10) || 5;
    this.scrapeQueue = [];
    
    // Cache configuration (TTL: 15 minutes)
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000;
    
    // Concurrency Lock: tracks active scraping promises to avoid simultaneous duplicate fetches
    this.activeScrapePromises = new Map();

    // Verify Playwright installation state
    this.isPlaywrightVerified = false;

    // Cache garbage collector
    this.cacheCleanupInterval = setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  // Self-healing check to download Chromium binary if missing at startup
  async ensurePlaywrightInstalled() {
    if (this.isPlaywrightVerified) return;
    try {
      console.log('[ScraperService] Verifying Playwright Chromium browser binaries...');
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      this.isPlaywrightVerified = true;
      console.log('[ScraperService] Playwright Chromium binaries verified.');
    } catch (err) {
      console.error('[ScraperService] Playwright auto-installation check failed:', err.message);
    }
  }

  // Launches global browser singleton
  async launchBrowser() {
    await this.ensurePlaywrightInstalled();
    
    const startTime = Date.now();
    console.log('[ScraperService] Initializing Playwright browser instance...');
    
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ];

    try {
      this.browser = await chromium.launch({
        headless: true,
        args: launchArgs
      });
      console.log(`[ScraperService] Browser launched successfully in ${Date.now() - startTime}ms.`);
      
      // Listen to disconnect events to trigger automatic self-healing restart
      this.browser.on('disconnected', () => {
        console.warn('[ScraperService] Browser disconnected! Triggering relaunch...');
        this.browser = null;
      });
    } catch (err) {
      console.error('[ScraperService] Failed to launch Playwright browser:', err.message);
      throw err;
    }
  }

  // Ensures browser is active and connected
  async getBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      await this.launchBrowser();
    }
    return this.browser;
  }

  // Run scraper execution with queued concurrency locks
  async scrape(url) {
    console.log(`[ScraperService] Scrape request received for URL: ${url}`);
    
    // Check in-memory cache first
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      console.log(`[ScraperService] Cache hit for URL: ${url}`);
      return cached.data;
    }

    // Coalesce concurrent duplicate requests targeting the exact same URL
    if (this.activeScrapePromises.has(url)) {
      console.log(`[ScraperService] Duplicate request detected. Coalescing fetch for URL: ${url}`);
      return this.activeScrapePromises.get(url);
    }

    const scrapePromise = this.executeScrapeWithConcurrency(url);
    this.activeScrapePromises.set(url, scrapePromise);
    
    try {
      const result = await scrapePromise;
      return result;
    } finally {
      this.activeScrapePromises.delete(url);
    }
  }

  // Acquire concurrency token and execute task
  async executeScrapeWithConcurrency(url) {
    if (this.activePagesCount >= this.maxConcurrentScrapes) {
      console.log(`[ScraperService] Concurrency limit reached (${this.activePagesCount}/${this.maxConcurrentScrapes}). Queuing URL: ${url}`);
      await new Promise((resolve) => this.scrapeQueue.push(resolve));
    }
    
    this.activePagesCount++;
    const startTime = Date.now();
    
    let context = null;
    let page = null;
    
    try {
      const startAcquire = Date.now();
      const browserInstance = await this.getBrowser();
      const browserAcquireTime = Date.now() - startAcquire;
      
      const startContext = Date.now();
      // Create request-isolated context
      context = await browserInstance.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      // Bypasses robot detection
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });
      const contextCreateTime = Date.now() - startContext;

      const startPage = Date.now();
      page = await context.newPage();
      page.prelandedDomains = new Set(); // For scraper sessions pre-lands
      const pageCreateTime = Date.now() - startPage;

      const startHeaders = Date.now();
      // Resource blocker middleware
      await page.route('**/*', (route) => {
        const req = route.request();
        const type = req.resourceType();
        const reqUrl = req.url().toLowerCase();

        // Block tracker and ad networks
        const isTrackerOrAd = 
          reqUrl.includes('google-analytics') || 
          reqUrl.includes('doubleclick') || 
          reqUrl.includes('facebook.net') || 
          reqUrl.includes('googleadservices') || 
          reqUrl.includes('hotjar') || 
          reqUrl.includes('mixpanel') || 
          reqUrl.includes('segment.com') ||
          reqUrl.includes('adsystem') ||
          reqUrl.includes('analytics');

        // Block media, stylesheets, images, fonts to speed up load time
        if (['image', 'stylesheet', 'font', 'media', 'manifest', 'other'].includes(type) || isTrackerOrAd) {
          route.abort();
        } else {
          route.continue();
        }
      });
      const headersTime = Date.now() - startHeaders;

      // Get scraper engine
      const scraper = getScraper(url);
      
      console.log(`[ScraperService] Scraping ${url}...`);
      const product = await scraper(page, url);
      
      // Price presence enforcement safety check
      if (!product.price || product.price === '0' || parseFloat(product.price) === 0) {
        throw new Error('Product price not found. The item might be out of stock or currently unavailable.');
      }

      const timings = product.timings || {};
      delete product.timings; // Clean returned timings before caching and returning to caller

      // Save to cache
      this.cache.set(url, {
        data: product,
        timestamp: Date.now()
      });

      const totalTime = Date.now() - startTime;

      // Measure cleanup
      const startCleanup = Date.now();
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
      page = null;
      context = null;
      const cleanupTime = Date.now() - startCleanup;

      // Print structured performance metrics logs
      console.info(`
====================================================
Performance Report
====================================================
Browser Acquire: ${browserAcquireTime} ms
Context Create:  ${contextCreateTime} ms
Page Create:     ${pageCreateTime} ms
Headers:         ${headersTime} ms
Navigation:      ${timings.navigation || 0} ms
DOM Ready:       ${timings.navigation || 0} ms
Selector Wait:   ${timings.wait || 0} ms
Evaluate:        ${timings.evaluate || 0} ms
Cleanup:         ${cleanupTime} ms

TOTAL:           ${totalTime} ms
====================================================
      `);

      return product;
    } catch (err) {
      console.error(`[ScraperService] Scraping failed for ${url}:`, err.message);
      
      // If browser crashed or connection was closed, clean browser instance to trigger auto relaunch
      if (err.message.includes('browser has been closed') || err.message.includes('Target closed') || err.message.includes('WS connection')) {
        console.warn('[ScraperService] Detected browser failure/crash, resetting browser instance.');
        if (this.browser) {
          this.browser.close().catch(() => {});
          this.browser = null;
        }
      }
      throw err;
    } finally {
      // Close page and context to avoid memory leaks if still open after an error
      const startCleanup = Date.now();
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
      const cleanupTime = Date.now() - startCleanup;
      
      this.activePagesCount--;
      
      // Trigger next task in queue
      if (this.scrapeQueue.length > 0) {
        const nextTaskResolve = this.scrapeQueue.shift();
        nextTaskResolve();
      }
    }
  }

  // Cleanup expired items from cache
  cleanupCache() {
    const now = Date.now();
    let deletedCount = 0;
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`[ScraperService] Pruned ${deletedCount} expired items from memory cache.`);
    }
  }

  // Get active health metrics for diagnostics
  getHealthStatus() {
    return {
      browserConnected: this.browser ? this.browser.isConnected() : false,
      activeScrapes: this.activePagesCount,
      queuedRequests: this.scrapeQueue.length,
      cachedItemsCount: this.cache.size,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    };
  }

  // Gracefully shuts down the global browser instance
  async shutdown() {
    console.log('[ScraperService] Shutting down. Closing browser...');
    clearInterval(this.cacheCleanupInterval);
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    console.log('[ScraperService] Shutdown complete.');
  }
}

// Export singleton instance
module.exports = new ScraperService();
