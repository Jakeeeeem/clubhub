const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { query } = require("../config/database");

/**
 * Syncs an item (Venue, Bib, or Event) to Stripe as a Product and Price
 * @param {Object} options 
 * @param {string} options.type - 'venue', 'bib', or 'event'
 * @param {string} options.id - The local ID of the item
 * @param {string} options.name - The name of the product
 * @param {number} options.price - The price in pounds
 * @param {string} options.clubId - The organization ID
 */
async function syncProductToStripe({ type, id, name, price, clubId }) {
    if (!price || price <= 0) return null;

    try {
        // 1. Get the club's Stripe Connect Account ID
        // In this system, the owner of the club is the one with the stripe_account_id
        const clubResult = await query(
            `SELECT u.stripe_account_id 
             FROM clubs c 
             JOIN users u ON c.owner_id = u.id 
             WHERE c.id = $1`,
            [clubId]
        );

        const stripeAccountId = clubResult.rows[0]?.stripe_account_id;
        if (!stripeAccountId) {
            console.warn(`⚠️ No Stripe Connect account found for club ${clubId}. Product will not be synced.`);
            return null;
        }

        // 2. Check if we already have a product ID for this item
        let existingProductId = null;
        let table = '';
        if (type === 'venue') table = 'venues';
        else if (type === 'bib') table = 'bib_inventory';
        else if (type === 'event') table = 'events';

        if (table) {
            const itemResult = await query(`SELECT stripe_product_id FROM ${table} WHERE id = $1`, [id]);
            existingProductId = itemResult.rows[0]?.stripe_product_id;
        }

        let product;
        if (existingProductId) {
            // Update existing product
            product = await stripe.products.update(
                existingProductId,
                { name: `${name} (${type.toUpperCase()})` },
                { stripeAccount: stripeAccountId }
            );
        } else {
            // Create new product
            product = await stripe.products.create({
                name: `${name} (${type.toUpperCase()})`,
                type: 'service',
                metadata: {
                    item_type: type,
                    item_id: String(id),
                    club_id: String(clubId)
                }
            }, { stripeAccount: stripeAccountId });

            // Store the product ID back in our database
            if (table) {
                await query(`UPDATE ${table} SET stripe_product_id = $1 WHERE id = $2`, [product.id, id]);
            }
        }

        // 3. Create a Price for this product
        // Note: Stripe Prices are immutable, so we always create a new one if the price changes
        const priceObj = await stripe.prices.create({
            unit_amount: Math.round(price * 100), // convert to pence
            currency: 'gbp',
            product: product.id,
        }, { stripeAccount: stripeAccountId });

        return {
            productId: product.id,
            priceId: priceObj.id
        };
    } catch (error) {
        console.error(`❌ Stripe Sync Error (${type}):`, error);
        return null;
    }
}

module.exports = {
    syncProductToStripe
};
