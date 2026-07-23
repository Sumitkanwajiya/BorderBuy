const amazonPrice = require('./amazon');
const flipkartPrice = require('./flipkart');
const myntraPrice = require('./myntra');
const meeshoPrice = require('./meesho');
const genericPrice = require('./generic');

function isValidPrice(price) {
  if (price === undefined || price === null) return false;
  const num = parseFloat(price);
  if (isNaN(num)) return false;
  if (num <= 0) return false;
  if (num > 500000) return false; // Unrealistically high (5 Lakhs INR)
  return true;
}

/**
 * Universal PriceResolver Module
 * Automatically resolves the selling price from the page context without strike-throughs.
 * Handles validation, logging, and retry loops.
 * @param {import('playwright').Page} page
 * @returns {Promise<string>}
 */
async function priceResolver(page) {
  const url = page.url();
  const lowerUrl = url.toLowerCase();
  
  let resolver;
  let sourceName = '';
  if (lowerUrl.includes('amazon.in') || lowerUrl.includes('amazon.com') || lowerUrl.includes('amzn.')) {
    resolver = amazonPrice;
    sourceName = 'Amazon';
  } else if (lowerUrl.includes('flipkart.com')) {
    resolver = flipkartPrice;
    sourceName = 'Flipkart';
  } else if (lowerUrl.includes('myntra.com')) {
    resolver = myntraPrice;
    sourceName = 'Myntra';
  } else if (lowerUrl.includes('meesho.com')) {
    resolver = meeshoPrice;
    sourceName = 'Meesho';
  } else {
    resolver = genericPrice;
    sourceName = 'Generic';
  }
  
  const startTime = Date.now();
  let price = null;
  
  // Try extraction
  try {
    price = await resolver(page);
  } catch (err) {
    console.warn(`[PriceResolver] Primary extraction failed for ${sourceName}:`, err.message);
  }
  
  // Retry strategy: if invalid, wait 500ms and try one more time without page reload
  if (!isValidPrice(price)) {
    console.log(`[PriceResolver] Price "${price}" is invalid. Retrying extraction in 500ms...`);
    await page.waitForTimeout(500);
    try {
      price = await resolver(page);
    } catch (err) {
      console.warn(`[PriceResolver] Retry extraction failed for ${sourceName}:`, err.message);
    }
  }
  
  const duration = Date.now() - startTime;
  
  if (isValidPrice(price)) {
    console.log(`[PriceResolver] Price resolved successfully for ${sourceName} in ${duration}ms: ${price}`);
    return price;
  }
  
  console.error(`[PriceResolver] Price could not be resolved for ${sourceName} in ${duration}ms.`);
  throw new Error(`Failed to resolve a valid selling price for ${sourceName}. The item may be out of stock, unavailable, or restricted.`);
}

module.exports = priceResolver;
