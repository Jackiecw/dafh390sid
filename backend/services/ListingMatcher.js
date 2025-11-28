const prisma = require('../prismaClient');

class ListingMatcher {
    /**
     * Match a row to a StoreProductListing
     * @param {string} platform - SHOPEE or TIKTOK_SHOP
     * @param {string} title - Product Title
     * @param {string} sku - Product SKU (Seller SKU or Reference SKU)
     * @returns {Promise<{listingId: string|null, matchType: string|null}>}
     */
    static async match(platform, title, sku) {
        // 1. Try to find by ListingMapping first (Manual overrides)
        // We check if there is a mapping for this specific title or SKU on this platform
        const mapping = await prisma.listingMapping.findFirst({
            where: {
                platform: platform,
                OR: [
                    { externalTitle: title },
                    { externalSku: sku }
                ]
            }
        });

        if (mapping) {
            return { listingId: mapping.listingId, matchType: 'MAPPING' };
        }

        // 2. Try to find by StoreProductListing.storeTitle (Exact Title match)
        // Title match is prioritized as per user request for "Same Product Multiple Links" scenario
        if (title) {
            const listingByTitle = await prisma.storeProductListing.findFirst({
                where: {
                    store: { platform: platform },
                    storeTitle: title
                }
            });
            if (listingByTitle) {
                return { listingId: listingByTitle.id, matchType: 'TITLE' };
            }
        }

        // 3. Try to find by StoreProductListing.productCode (if SKU matches)
        if (sku) {
            const listingBySku = await prisma.storeProductListing.findFirst({
                where: {
                    store: { platform: platform },
                    productCode: sku
                }
            });
            if (listingBySku) {
                return { listingId: listingBySku.id, matchType: 'SKU' };
            }
        }

        // 4. Try to find by Product.sku (if SKU matches internal SKU directly)
        // This assumes the platform SKU might be the internal SKU
        if (sku) {
            const listingByInternalSku = await prisma.storeProductListing.findFirst({
                where: {
                    store: { platform: platform },
                    product: { sku: sku }
                }
            });
            if (listingByInternalSku) {
                return { listingId: listingByInternalSku.id, matchType: 'INTERNAL_SKU' };
            }
        }

        return { listingId: null, matchType: null };
    }
}

module.exports = ListingMatcher;
