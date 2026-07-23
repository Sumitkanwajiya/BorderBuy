/**
 * Meesho price resolver module
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>}
 */
async function resolveMeeshoPrice(page) {
  const price = await page.evaluate(() => {
    // Helper to validate and clean a resolved price string
    const cleanAndValidate = (val) => {
      if (!val) return null;
      const cleaned = val.replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0 && parsed < 500000) {
        return cleaned;
      }
      return null;
    };

    // 1. DOM selectors
    const priceSelectors = [
      'h5[class*="CardProductPrice"]',
      'h4[class*="Price"]',
      'h2[class*="Price"]',
      'h2',
      'h3'
    ];

    for (const selector of priceSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const el of elements) {
        const isStrikeThrough = window.getComputedStyle(el).textDecoration.includes('line-through') ||
                               (el.parentElement && window.getComputedStyle(el.parentElement).textDecoration.includes('line-through'));
        
        if (!isStrikeThrough) {
          const cleaned = cleanAndValidate(el.textContent);
          if (cleaned) return cleaned;
        }
      }
    }

    return null;
  });

  return price;
}

module.exports = resolveMeeshoPrice;
