const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * @route GET /api/products
 * @desc Get all products for a club
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const clubId = req.query.clubId;
    if (!clubId) {
      return res.status(400).json({ error: 'clubId is required' });
    }

    const result = await query(
      'SELECT * FROM products WHERE club_id = $1 AND is_active = true ORDER BY created_at DESC',
      [clubId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * @route POST /api/products
 * @desc Create a new product (Admin only)
 */
router.post('/', authenticateToken, requireOrganization, [
  body('name').notEmpty().trim(),
  body('price').isNumeric(),
  body('clubId').isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, price, stock_quantity, image_url, category, clubId, custom_fields } = req.body;

    const result = await query(
      `INSERT INTO products (name, description, price, stock_quantity, image_url, category, club_id, custom_fields) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, description, price, stock_quantity || 0, image_url, category, clubId, JSON.stringify(custom_fields || [])]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * @route POST /api/products/purchase
 * @desc Purchase a product
 */
router.post('/purchase', authenticateToken, async (req, res) => {
  const { productId, quantity, paymentIntentId, customization_details } = req.body;
  const actualQuantity = quantity || 1;

  try {
    const result = await withTransaction(async (client) => {
      // 1. Check stock
      const productResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const product = productResult.rows[0];
      if (product.stock_quantity < actualQuantity) {
        throw new Error('Insufficient stock');
      }

      // 2. Create order
      const totalAmount = product.price * actualQuantity;
      const orderResult = await client.query(
        `INSERT INTO product_orders (product_id, user_id, quantity, total_amount, status, stripe_payment_intent_id, customization_details) 
         VALUES ($1, $2, $3, $4, 'paid', $5, $6) RETURNING *`,
        [productId, req.user.id, actualQuantity, totalAmount, paymentIntentId || null, JSON.stringify(customization_details || {})]
      );

      // 3. Update stock
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [actualQuantity, productId]
      );

      return orderResult.rows[0];
    });

    res.json({ 
      message: 'Purchase successful',
      order: result
    });
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * @route PUT /api/products/:id
 * @desc Update a product
 */
router.put('/:id', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { name, description, price, stock_quantity, image_url, category } = req.body;
    const { id } = req.params;

    const result = await query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, stock_quantity = $4, image_url = $5, category = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, description, price, stock_quantity, image_url, category, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * @route DELETE /api/products/:id
 * @desc Delete a product
 */
router.delete('/:id', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { id } = req.params;

    // We do a soft delete by setting is_active = false
    const result = await query(
      'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
