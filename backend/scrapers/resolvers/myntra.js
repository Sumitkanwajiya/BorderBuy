/**
 * Myntra price resolver module
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>}
 */
async function resolveMyntraPrice(page) {
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

    // 1. JSON-LD schema Offers
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

    // 2. DOM selectors (excluding strike-through)
    const priceSelectors = [
      '.pdp-selling-price',
      '.pdp-price',
      '.pdp-discount',
      'span[class*="price"]'
    ];

    for (const selector of priceSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const el of elements) {
        const isStrikeThrough = el.classList.contains('pdp-mrp') || 
                               window.getComputedStyle(el).textDecoration.includes('line-through') ||
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

module.exports = resolveMyntraPrice;
