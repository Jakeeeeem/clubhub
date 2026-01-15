const express = require('express');
const router = express.Router();
const { pool, queries } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

// ============================================================================
// ORGANIZATION ROUTES
// ============================================================================

/**
 * GET /api/organizations
 * Get all organizations the current user belongs to
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        o.*,
        om.role,
        om.status as membership_status,
        om.joined_at,
        om.permissions
      FROM organizations o
      INNER JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = $1
      AND om.status = 'active'
      ORDER BY om.joined_at DESC
    `, [userId]);

    res.json({
      success: true,
      organizations: result.rows
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organizations'
    });
  }
});

/**
 * GET /api/organizations/:id
 * Get a specific organization (if user is a member)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is a member
    const memberCheck = await pool.query(`
      SELECT role FROM organization_members
      WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, userId]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this organization'
      });
    }

    const result = await pool.query(`
      SELECT * FROM organizations WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      organization: result.rows[0],
      userRole: memberCheck.rows[0].role
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization'
    });
  }
});

/**
 * GET /api/organizations/super/:id
 * Get organization details for Super Admin
 */
const { requirePlatformAdmin } = require('../middleware/auth');
router.get('/super/:id', authenticateToken, requirePlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT o.*, u.email as owner_email, u.first_name as owner_name, u.last_name as owner_last_name
      FROM organizations o
      LEFT JOIN users u ON o.owner_id = u.id
      WHERE o.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      organization: result.rows[0]
    });
  } catch (error) {
    console.error('Super Admin fetch org error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization details'
    });
  }
});

/**
 * POST /api/organizations
 * Create a new organization
 */
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { name, description, sport, location, website } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required'
      });
    }

    await client.query('BEGIN');

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 255);

    // Check if slug exists
    const slugCheck = await client.query(
      'SELECT id FROM organizations WHERE slug = $1',
      [slug]
    );

    const finalSlug = slugCheck.rows.length > 0 
      ? `${slug}-${Date.now()}` 
      : slug;

    // Create organization
    const orgResult = await client.query(`
      INSERT INTO organizations (
        name, slug, description, sport, location, website, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, finalSlug, description, sport, location, website, userId]);

    const organization = orgResult.rows[0];

    // Add creator as owner
    await client.query(`
      INSERT INTO organization_members (
        organization_id, user_id, role, status
      ) VALUES ($1, $2, 'owner', 'active')
    `, [organization.id, userId]);

    // Create user preference if doesn't exist
    await client.query(`
      INSERT INTO user_preferences (user_id, current_organization_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE
      SET current_organization_id = $2
    `, [userId, organization.id]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      organization,
      message: 'Organization created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create organization'
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/organizations/:id
 * Update an organization (admin/owner only)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Check if user is admin or owner
    const roleCheck = await pool.query(`
      SELECT role FROM organization_members
      WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, userId]);

    if (roleCheck.rows.length === 0 || 
        !['owner', 'admin'].includes(roleCheck.rows[0].role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this organization'
      });
    }

    // Build update query dynamically
    const allowedFields = [
      'name', 'description', 'sport', 'location', 'website', 
      'email', 'phone', 'logo_url', 'cover_image_url',
      'primary_color', 'secondary_color', 'philosophy'
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    values.push(id);
    const query = `
      UPDATE organizations 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // After updating, let's fetch the fresh record to ensure we return everything (including images)
    const freshResult = await pool.query('SELECT * FROM organizations WHERE id = $1', [id]);

    res.json({
      success: true,
      organization: freshResult.rows[0],
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating organization:', error);
    
    // Check if it's a "column does not exist" error
    if (error.code === '42703') {
        return res.status(500).json({
            success: false,
            error: `Database schema mismatch: ${error.message}. Please ensure all migrations have run.`
        });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update organization: ' + error.message
    });
  }
});

/**
 * DELETE /api/organizations/:id
 * Delete an organization (owner only)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is owner
    const roleCheck = await pool.query(`
      SELECT role FROM organization_members
      WHERE organization_id = $1 AND user_id = $2
    `, [id, userId]);

    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'Only the owner can delete this organization'
      });
    }

    await pool.query('DELETE FROM organizations WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete organization'
    });
  }
});

/**
 * GET /api/organizations/:id/members
 * Get all members of an organization
 */
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is a member
    const memberCheck = await pool.query(`
      SELECT 1 FROM organization_members
      WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, userId]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this organization'
      });
    }

    const result = await pool.query(`
      SELECT 
        om.*,
        u.email,
        u.first_name,
        u.last_name,
        u.avatar_url
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1
      ORDER BY 
        CASE om.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'coach' THEN 3
          WHEN 'assistant_coach' THEN 4
          WHEN 'staff' THEN 5
          WHEN 'player' THEN 6
          WHEN 'parent' THEN 7
          ELSE 8
        END,
        om.joined_at ASC
    `, [id]);

    res.json({
      success: true,
      members: result.rows
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members'
    });
  }
});

// ============================================================================
// IMAGE UPLOAD ENDPOINTS
// ============================================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directory exists
const uploadDir = 'uploads/club-images';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'org-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

/**
 * POST /api/organizations/:id/images
 * Upload image to organization gallery
 */
router.post('/:id/images', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const { id } = req.params;
        const userId = req.user.id;

        // Check if user is admin or owner
        const roleCheck = await pool.query(`
          SELECT role FROM organization_members
          WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
        `, [id, userId]);

        if (roleCheck.rows.length === 0 || 
            !['owner', 'admin'].includes(roleCheck.rows[0].role)) {
          // Delete uploaded file
          try { fs.unlinkSync(req.file.path); } catch (e) {}
          return res.status(403).json({ error: 'Access denied' });
        }

        // Get current images
        const orgResult = await pool.query(
          'SELECT images FROM organizations WHERE id = $1',
          [id]
        );

        if (orgResult.rows.length === 0) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
          return res.status(404).json({ error: 'Organization not found' });
        }

        const currentImages = orgResult.rows[0].images || [];
        if (currentImages.length >= 5) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            return res.status(400).json({ error: 'Image limit reached (max 5 images)' });
        }

        const imageUrl = `/uploads/club-images/${req.file.filename}`;

        // Append to images array
        const result = await pool.query(`
            UPDATE organizations 
            SET images = array_append(COALESCE(images, '{}'), $1), updated_at = NOW()
            WHERE id = $2
            RETURNING images
        `, [imageUrl, id]);

        res.json({ message: 'Image uploaded', images: result.rows[0].images });

    } catch (err) {
        console.error('Upload image error:', err);
        if (req.file) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

/**
 * DELETE /api/organizations/:id/images
 * Delete image from organization gallery
 */
router.delete('/:id/images', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { imageUrl } = req.body;
        const userId = req.user.id;

        if (!imageUrl) {
          return res.status(400).json({ error: 'Image URL required' });
        }

        // Check if user is admin or owner
        const roleCheck = await pool.query(`
          SELECT role FROM organization_members
          WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
        `, [id, userId]);

        if (roleCheck.rows.length === 0 || 
            !['owner', 'admin'].includes(roleCheck.rows[0].role)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Remove from array
        const result = await pool.query(`
            UPDATE organizations 
            SET images = array_remove(images, $1), updated_at = NOW()
            WHERE id = $2
            RETURNING images
        `, [imageUrl, id]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        // Delete file from disk
        try {
            const filePath = path.join(__dirname, '..', imageUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (e) {
            console.warn('Failed to delete file from disk:', e);
        }

        res.json({ message: 'Image removed', images: result.rows[0].images });

    } catch (err) {
        console.error('Delete image error:', err);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

module.exports = router;
