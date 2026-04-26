const express = require("express");
const { query } = require("../config/database");
const { authenticateToken, requireOrganization } = require("../middleware/auth");
const { syncProductToStripe } = require("../services/stripe-service");

const router = express.Router();

/**
 * @route   GET /api/bibs
 * @desc    Get inventory for the current organization
 */
router.get("/", authenticateToken, async (req, res) => {
    try {
        const clubId = req.headers['x-group-id'] || req.query.clubId;
        if (!clubId) return res.status(400).json({ error: "Missing clubId" });

        const result = await query(
            "SELECT * FROM bib_inventory WHERE club_id = $1 ORDER BY color ASC",
            [clubId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Get bib inventory error:", error);
        res.status(500).json({ error: "Failed to fetch bib inventory" });
    }
});

/**
 * @route   POST /api/bibs
 * @desc    Add or update inventory for a specific color
 */
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { color, totalQuantity, availableQuantity, price } = req.body;
        const clubId = req.headers['x-group-id'];

        if (!clubId) return res.status(400).json({ error: "Missing organization context" });
        if (!color) return res.status(400).json({ error: "Color is required" });

        const result = await query(
            `INSERT INTO bib_inventory (club_id, color, total_quantity, available_quantity, price)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (club_id, color) 
             DO UPDATE SET 
                total_quantity = EXCLUDED.total_quantity,
                available_quantity = EXCLUDED.available_quantity,
                price = EXCLUDED.price,
                updated_at = NOW()
             RETURNING *`,
            [clubId, color, totalQuantity || 0, availableQuantity || totalQuantity || 0, price || 0]
        );

        const savedItem = result.rows[0];

        // Sync with Stripe if price is set
        if (price > 0) {
            await syncProductToStripe({
                type: 'bib',
                id: savedItem.id,
                name: `${color} Bib Set`,
                price: price,
                clubId: clubId
            });
        }

        res.status(201).json(savedItem);
    } catch (error) {
        console.error("Save bib inventory error:", error);
        res.status(500).json({ error: "Failed to save bib inventory" });
    }
});

/**
 * @route   DELETE /api/bibs/:id
 * @desc    Remove a color set from inventory
 */
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        await query("DELETE FROM bib_inventory WHERE id = $1", [req.params.id]);
        res.json({ message: "Item removed from inventory" });
    } catch (error) {
        console.error("Delete bib inventory error:", error);
        res.status(500).json({ error: "Failed to delete inventory item" });
    }
});

module.exports = router;
