/**
 * Generic price resolver module
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>}
 */
async function resolveGenericPrice(page) {
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

    // 1. JSON-LD Offers
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

    // 2. Meta tags
    const metaSelectors = [
      'meta[property="og:price:amount"]',
      'meta[property="product:price:amount"]',
      'meta[name="twitter:label1"]',
      'meta[itemprop="price"]'
    ];
    for (const selector of metaSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const cleaned = cleanAndValidate(el.getAttribute('content'));
        if (cleaned) return cleaned;
      }
    }

    // 3. Fallback DOM selectors
    const priceClasses = [
      '.price', '.product-price', '.current-price', 
      '[class*="price"]', '[id*="price"]'
    ];
    for (const cls of priceClasses) {
      const elements = Array.from(document.querySelectorAll(cls));
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

module.exports = resolveGenericPrice;
