/**
 * Amazon price resolver module
 * Prioritizes Structured JSON-LD schema, twister state data, strict non-strike pricing elements.
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>}
 */
async function resolveAmazonPrice(page) {
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

    // 2. Embedded application state (Twister dynamic variant variables)
    const scriptTags = Array.from(document.querySelectorAll('script'));
    for (const tag of scriptTags) {
      const content = tag.textContent;
      if (content.includes('twister-js-init-dpx') || content.includes('dimensionValuesDisplayData')) {
        const priceMatch = content.match(/"priceAmount"\s*:\s*(\d+\.?\d*)/);
        if (priceMatch && priceMatch[1]) {
          const cleaned = cleanAndValidate(priceMatch[1]);
          if (cleaned) return cleaned;
        }
      }
    }

    // 3. Selling price DOM selectors (specifically omitting strike-through, list-price, MRP)
    const mainContainer = document.querySelector('#ppd') || 
                          document.querySelector('#centerCol') || 
                          document.querySelector('#rightCol') || 
                          document.querySelector('#buyBoxAccordion') ||
                          document.querySelector('#combinedBuyBox_feature_div') ||
                          document;

    const priceSelectors = [
      '#price_inside_buybox',
      '#newBuyBoxPrice',
      '#corePriceDisplay_desktop_feature_div .a-price-whole',
      '#corePrice_feature_div .a-price-whole',
      '#priceblock_dealprice',
      '#priceblock_ourprice',
      '.apexPriceToPay .a-offscreen',
      '.a-price .a-offscreen',
      '.a-color-price'
    ];

    for (const selector of priceSelectors) {
      const elements = Array.from(mainContainer.querySelectorAll(selector));
      for (const el of elements) {
        // Filter out strike-through/MRP elements
        const isStrikeThrough = el.closest('.a-text-price') || 
                               el.closest('.basisPrice') || 
                               el.closest('del') || 
                               el.closest('strike') ||
                               el.classList.contains('a-text-price') ||
                               el.getAttribute('data-a-strike') === 'true' ||
                               window.getComputedStyle(el).textDecoration.includes('line-through') ||
                               (el.parentElement && window.getComputedStyle(el.parentElement).textDecoration.includes('line-through')) ||
                               el.closest('#listPriceLegalMessage') ||
                               el.closest('.a-section.a-spacing-small.a-text-center');
        
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

module.exports = resolveAmazonPrice;
