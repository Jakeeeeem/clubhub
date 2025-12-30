const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * @route GET /api/listings
 * @desc Get all active listings (with optional filters)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { clubId, type, position } = req.query;
    
    let queryText = `
      SELECT l.*, c.name as club_name,
             (SELECT COUNT(*) FROM listing_applications WHERE listing_id = l.id) as application_count
      FROM listings l
      JOIN clubs c ON l.club_id = c.id
      WHERE l.is_active = true
    `;
    const queryParams = [];
    let paramCount = 0;

    if (clubId) {
      paramCount++;
      queryText += ` AND l.club_id = $${paramCount}`;
      queryParams.push(clubId);
    }

    if (type) {
      paramCount++;
      queryText += ` AND l.listing_type = $${paramCount}`;
      queryParams.push(type);
    }

    if (position) {
      paramCount++;
      queryText += ` AND l.position ILIKE $${paramCount}`;
      queryParams.push(`%${position}%`);
    }

    queryText += ' ORDER BY l.created_at DESC';

    const result = await query(queryText, queryParams);
    res.json(result.rows);

  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

/**
 * @route POST /api/listings
 * @desc Create a new recruitment listing
 */
router.post('/', authenticateToken, requireOrganization, [
  body('title').trim().notEmpty(),
  body('listing_type').isIn(['player', 'staff', 'trial', 'other']),
  body('clubId').isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, description, listing_type, position, requirements, clubId } = req.body;

    const result = await query(
      `INSERT INTO listings (title, description, listing_type, position, requirements, club_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, listing_type, position, requirements, clubId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

/**
 * @route GET /api/listings/:id/applications
 * @desc Get all applications for a listing
 */
router.get('/:id/applications', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT la.*, u.first_name, u.last_name, u.email, u.phone, up.date_of_birth as dob, up.experience_level as experience
       FROM listing_applications la
       JOIN users u ON la.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE la.listing_id = $1
       ORDER BY la.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * @route DELETE /api/listings/:id
 * @desc Delete (deactivate) a listing
 */
router.delete('/:id', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE listings SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

module.exports = router;
