const scrapeAmazon = require('./amazon');
const scrapeFlipkart = require('./flipkart');
const scrapeMyntra = require('./myntra');
const scrapeMeesho = require('./meesho');
const scrapeGeneric = require('./generic');

// Scrapers mapped to matching hostname substrings
const scraperRegistry = [
  { pattern: 'amazon.in', scraper: scrapeAmazon },
  { pattern: 'amazon.com', scraper: scrapeAmazon },
  { pattern: 'flipkart.com', scraper: scrapeFlipkart },
  { pattern: 'myntra.com', scraper: scrapeMyntra },
  { pattern: 'meesho.com', scraper: scrapeMeesho },
];

/**
 * Gets the scraper for the given URL
 * @param {string} url
 * @returns {Function}
 */
function getScraper(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check for platforms slated for future updates
    const upcomingPlatforms = [
      { domain: 'ajio.com', name: 'Ajio' },
      { domain: 'nykaa.com', name: 'Nykaa' }
    ];

    for (const platform of upcomingPlatforms) {
      if (hostname.includes(platform.domain)) {
        throw new Error(`${platform.name} scraping is not supported in this version. Currently, only Amazon, Flipkart, Myntra, and Meesho links are supported.`);
      }
    }

    for (const entry of scraperRegistry) {
      if (hostname.includes(entry.pattern)) {
        return entry.scraper;
      }
    }
  } catch (error) {
    if (error.message.includes('not supported in this version')) {
      throw error;
    }
    throw new Error('Invalid URL format');
  }

  // If no specific scraper matches, use the generic fallback scraper
  return scrapeGeneric;
}

module.exports = {
  getScraper,
  scrapeAmazon,
  scrapeGeneric
};
