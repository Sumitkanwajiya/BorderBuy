/**
 * Flipkart price resolver module
 * Prioritizes Structured JSON-LD schema, page state queries, clean DOM selling selectors.
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>}
 */
async function resolveFlipkartPrice(page) {
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

    // 1. Prioritize Structured Data: JSON-LD Product Offers
    const jsonLdTags = document.querySelectorAll('script[type="application/ld+json"]');
    for (const tag of jsonLdTags) {
      try {
        const data = JSON.parse(tag.textContent);
        const schemas = Array.isArray(data) ? data : [data];
        for (const schema of schemas) {
          if (schema && (schema['@type'] === 'Product' || schema['@type'] === 'http://schema.org/Product')) {
            if (schema.offers) {
              const offers = Array.isArray(schema.offers) ? schema.offers : [schema.offers];
              for (const offer of offers) {
                if (offer && offer.price) {
                  const cleaned = cleanAndValidate(String(offer.price));
                  if (cleaned) return cleaned;
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    // 2. Embedded application state (Flipkart init state variable extraction)
    if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.pageState) {
      try {
        // Look for price or discount keys inside init states
        const stateStr = JSON.stringify(window.__INITIAL_STATE__);
        const priceMatch = stateStr.match(/"sellingPrice"\s*:\s*(\d+)/) || stateStr.match(/"price"\s*:\s*(\d+)/);
        if (priceMatch && priceMatch[1]) {
          const cleaned = cleanAndValidate(priceMatch[1]);
          if (cleaned) return cleaned;
        }
      } catch (e) {}
    }

    // 3. Selling price DOM selectors (specifically omitting strike-through, list-price, MRP)
    const priceSelectors = [
      '.Nx9zhl', 
      '._30jeq3', 
      '._16Jk6d', 
      '.dyC4S1', 
      '.UOC0FD',
      'div[class*="price"]'
    ];

    for (const selector of priceSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const el of elements) {
        const isStrikeThrough = el.classList.contains('_3I9_R3') || 
                               el.classList.contains('y3Z5D1') || 
                               window.getComputedStyle(el).textDecoration.includes('line-through') ||
                               (el.parentElement && window.getComputedStyle(el.parentElement).textDecoration.includes('line-through'));
        
        if (!isStrikeThrough) {
          const cleaned = cleanAndValidate(el.textContent);
          if (cleaned) return cleaned;
        }
      }
    }

    // 4. Meta tags fallback
    const metaPrice = document.querySelector('meta[property="product:price:amount"]') || 
                      document.querySelector('meta[property="og:price:amount"]') ||
                      document.querySelector('meta[itemprop="price"]');
    if (metaPrice) {
      const cleaned = cleanAndValidate(metaPrice.getAttribute('content'));
      if (cleaned) return cleaned;
    }

    return null;
  });

  return price;
}

module.exports = resolveFlipkartPrice;
