const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Debug endpoint to check what's actually in the database
router.get('/check-org/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the raw data from database
    const result = await pool.query('SELECT * FROM organizations WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.json({ error: 'Organization not found' });
    }
    
    const org = result.rows[0];
    
    // Check which columns exist
    const columns = Object.keys(org);
    
    res.json({
      success: true,
      columns: columns,
      data: org,
      hasDescription: 'description' in org,
      hasImages: 'images' in org,
      hasPhilosophy: 'philosophy' in org,
      descriptionValue: org.description,
      imagesValue: org.images,
      philosophyValue: org.philosophy
    });
  } catch (error) {
    res.status(500).json({ error: error.message, code: error.code });
  }
});

module.exports = router;
