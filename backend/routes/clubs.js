const express = require('express');
const { query, queries, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation rules
const clubValidation = [
  body('name').trim().isLength({ min: 1 }).withMessage('Club name is required'),
  body('description').optional().trim(),
  body('location').optional().trim(),
  body('philosophy').optional().trim(),
  body('website').optional({ checkFalsy: true }).isURL().withMessage('Please provide a valid website URL'),
  body('types').optional().isArray().withMessage('Types must be an array'),
  body('sport').optional().trim(),
  body('established').optional().trim()
];

// Get all clubs (public)
//Changed all instances of '${paramCount}' to '$${paramCount}' | 06.08.25 BM
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, sport, location, types, limit = 50 } = req.query;
    
    // Query organizations table instead of clubs
    let queryText = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = c.id AND om.role != 'owner') as member_count,
             (SELECT COUNT(*) FROM events e WHERE e.club_id = c.id AND e.event_date >= CURRENT_DATE) as event_count
      FROM organizations c
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Search by name (prefix match as requested), or location/sport
    if (search) {
      paramCount++;
      // "only show based on first characters" -> prefix match for name matches user intent
      // We keep looser match for location/sport if needed, or make them all prefix?
      // User said: "only show based on first chartors as all show"
      // I'll make name prefix match, keep others as simple matching or prefix too.
      queryText += ` AND (c.name ILIKE $${paramCount} OR c.location ILIKE $${paramCount} OR c.sport ILIKE $${paramCount})`;
      queryParams.push(`${search}%`); // Prefix match
    }

    // Filter by sport
    if (sport) {
      paramCount++;
      queryText += ` AND c.sport ILIKE $${paramCount}`;
      queryParams.push(`${sport}%`);
    }

    // Filter by location
    if (location) {
      paramCount++;
      queryText += ` AND c.location ILIKE $${paramCount}`;
      queryParams.push(`${location}%`);
    }

    // Filter by types (if organization supports it, otherwise ignore or assume 'sports-club')
    // organizations might not have 'types' column yet. I'll comment it out to be safe unless I know it exists.
    /*
    if (types) {
      const typesArray = Array.isArray(types) ? types : [types];
      paramCount++;
      queryText += ` AND c.types && $${paramCount}::text[]`;
      queryParams.push(typesArray);
    }
    */

    paramCount++;
    queryText += ` 
      ORDER BY c.name ASC
      LIMIT $${paramCount}
    `;
    queryParams.push(parseInt(limit));

    const result = await query(queryText, queryParams);
    res.json(result.rows);

  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({
      error: 'Failed to fetch clubs',
      message: 'An error occurred while fetching clubs'
    });
  }
});

// Get specific club
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const clubResult = await query(`
      SELECT c.*, 
             u.first_name as owner_first_name,
             u.last_name as owner_last_name,
             (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = c.id AND om.role != 'owner') as member_count,
             (SELECT COUNT(*) FROM teams t WHERE t.club_id = c.id) as team_count,
             (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = c.id AND om.role != 'owner') as staff_count
      FROM organizations c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.id = $1
    `, [req.params.id]);
    
    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Club not found',
        message: 'Club with this ID does not exist'
      });
    }

    const club = clubResult.rows[0];

    // Get club's teams
    const teamsResult = await query(`
      SELECT t.*, 
             s.first_name as coach_first_name,
             s.last_name as coach_last_name,
             COUNT(tp.player_id) as player_count
      FROM teams t
      LEFT JOIN staff s ON t.coach_id = s.id
      LEFT JOIN team_players tp ON t.id = tp.team_id
      WHERE t.club_id = $1
      GROUP BY t.id, s.first_name, s.last_name
      ORDER BY t.created_at DESC
    `, [req.params.id]);

    club.teams = teamsResult.rows;

    // Get upcoming events
    const eventsResult = await query(`
      SELECT e.*, t.name as team_name
      FROM events e
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE e.club_id = $1 AND e.event_date >= CURRENT_DATE
      ORDER BY e.event_date ASC
      LIMIT 10
    `, [req.params.id]);

    club.upcoming_events = eventsResult.rows;

    // Get staff (public info only)
    const staffResult = await query(`
      SELECT first_name, last_name, role
      FROM staff
      WHERE club_id = $1
      ORDER BY 
        CASE role 
          WHEN 'coach' THEN 1
          WHEN 'assistant-coach' THEN 2
          WHEN 'coaching-supervisor' THEN 3
          ELSE 4
        END,
        first_name
    `, [req.params.id]);

    club.staff = staffResult.rows;

    // If user is authenticated, check if they've applied to this club
    if (req.user) {
      const applicationResult = await query(`
        SELECT * FROM club_applications
        WHERE club_id = $1 AND user_id = $2
      `, [req.params.id, req.user.id]);
      
      club.user_application = applicationResult.rows[0] || null;
    }

    res.json(club);

  } catch (error) {
    console.error('Get club error:', error);
    res.status(500).json({
      error: 'Failed to fetch club',
      message: 'An error occurred while fetching club details'
    });
  }
});

// Create new club (organization only)
router.post('/', authenticateToken, requireOrganization, clubValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, description, location, philosophy, website, types, sport, established } = req.body;

    // Check if club name already exists for this user
    const existingClub = await query(
      'SELECT id FROM clubs WHERE name = $1 AND owner_id = $2',
      [name, req.user.id]
    );
    
    if (existingClub.rows.length > 0) {
      return res.status(409).json({
        error: 'Club already exists',
        message: 'You already have a club with this name'
      });
    }

    const result = await query(queries.createClub, [
      name,
      description || null,
      location || null,
      philosophy || null,
      website || null,
      types,
      sport || null,
      req.user.id,
      established || new Date().getFullYear().toString()
    ]);

    const newClub = result.rows[0];

    res.status(201).json({
      message: 'Club created successfully',
      club: newClub
    });

  } catch (error) {
    console.error('Create club error:', error);
    res.status(500).json({
      error: 'Failed to create club',
      message: 'An error occurred while creating the club'
    });
  }
});

// Update club
router.put('/:id', authenticateToken, requireOrganization, clubValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if club exists and user owns it
    const clubResult = await query(queries.findClubById, [req.params.id]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Club not found',
        message: 'Club with this ID does not exist'
      });
    }

    const club = clubResult.rows[0];
    if (club.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own clubs'
      });
    }

    const { name, description, location, philosophy, website, types, sport, established } = req.body;

    const result = await query(`
      UPDATE clubs SET 
        name = $1,
        description = $2,
        location = $3,
        philosophy = $4,
        website = $5,
        types = $6,
        sport = $7,
        established = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      name,
      description || null,
      location || null,
      philosophy || null,
      website || null,
      types || ['sports-club'], // Default to sports-club if not provided
      sport || null,
      established || club.established,
      req.params.id
    ]);

    const updatedClub = result.rows[0];

    res.json({
      message: 'Club updated successfully',
      club: updatedClub
    });

  } catch (error) {
    console.error('Update club error:', error);
    res.status(500).json({
      error: 'Failed to update club',
      message: 'An error occurred while updating the club'
    });
  }
});

// Delete club
router.delete('/:id', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Check if club exists and user owns it
    const clubResult = await query(queries.findClubById, [req.params.id]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Club not found',
        message: 'Club with this ID does not exist'
      });
    }

    const club = clubResult.rows[0];
    if (club.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own clubs'
      });
    }

    // Delete club and all related data in transaction
    await withTransaction(async (client) => {
      // Delete in correct order to respect foreign key constraints
      await client.query('DELETE FROM availability_responses WHERE event_id IN (SELECT id FROM events WHERE club_id = $1)', [req.params.id]);
      await client.query('DELETE FROM event_bookings WHERE event_id IN (SELECT id FROM events WHERE club_id = $1)', [req.params.id]);
      await client.query('DELETE FROM match_results WHERE event_id IN (SELECT id FROM events WHERE club_id = $1)', [req.params.id]);
      await client.query('DELETE FROM player_ratings WHERE match_result_id IN (SELECT id FROM match_results WHERE event_id IN (SELECT id FROM events WHERE club_id = $1))', [req.params.id]);
      await client.query('DELETE FROM events WHERE club_id = $1', [req.params.id]);
      await client.query('DELETE FROM payments WHERE club_id = $1', [req.params.id]);
      await client.query('DELETE FROM team_players WHERE team_id IN (SELECT id FROM teams WHERE club_id = $1)', [req.params.id]);
      await client.query('DELETE FROM tactical_formations WHERE team_id IN (SELECT id FROM teams WHERE club_id = $1)', [req.params.id]);
      await client.query('DELETE FROM teams WHERE club_id = $1', [req.params.id]);
      await client.query('DELETE FROM players WHERE club_id = $1', [req.params.id]);
      await client.query('DELETE FROM staff WHERE club_id = $1', [req.params.id]);
      await client.query('DELETE FROM club_applications WHERE club_id = $1', [req.params.id]);
      await client.query('DELETE FROM documents WHERE club_id = $1', [req.params.id]);
      await client.query('DELETE FROM clubs WHERE id = $1', [req.params.id]);
    });

    res.json({
      message: 'Club deleted successfully'
    });

  } catch (error) {
    console.error('Delete club error:', error);
    res.status(500).json({
      error: 'Failed to delete club',
      message: 'An error occurred while deleting the club'
    });
  }
});

// Apply to join club
router.post('/:id/apply', authenticateToken, [
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  body('preferredPosition').optional().trim(),
  body('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced', 'professional']).withMessage('Invalid experience level'),
  body('availability').optional().isArray().withMessage('Availability must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { message, preferredPosition, experienceLevel, availability } = req.body;

    // Check if club exists
    const clubResult = await query(queries.findClubById, [req.params.id]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Club not found'
      });
    }

    // Check if user already applied
    const existingApplication = await query(`
      SELECT id FROM club_applications
      WHERE club_id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);
    
    if (existingApplication.rows.length > 0) {
      return res.status(409).json({
        error: 'Application already exists',
        message: 'You have already applied to this club'
      });
    }

    // Create application
    const result = await query(`
      INSERT INTO club_applications (club_id, user_id, message, preferred_position, experience_level, availability)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      req.params.id,
      req.user.id,
      message,
      preferredPosition || null,
      experienceLevel || null,
      availability || null
    ]);

    res.status(201).json({
      message: 'Application submitted successfully',
      application: result.rows[0]
    });

  } catch (error) {
    console.error('Apply to club error:', error);
    res.status(500).json({
      error: 'Failed to submit application'
    });
  }
});

// Get club applications (club owner only)
router.get('/:id/applications', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Verify club exists and user owns it
    const clubResult = await query(queries.findClubById, [req.params.id]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Club not found'
      });
    }

    const club = clubResult.rows[0];
    if (club.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Get applications
    const applicationsResult = await query(`
      SELECT ca.*, 
             u.first_name,
             u.last_name,
             u.email
      FROM club_applications ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.club_id = $1
      ORDER BY ca.submitted_at DESC
    `, [req.params.id]);

    res.json({
      club: {
        id: club.id,
        name: club.name
      },
      applications: applicationsResult.rows
    });

  } catch (error) {
    console.error('Get club applications error:', error);
    res.status(500).json({
      error: 'Failed to fetch applications'
    });
  }
});

// Review club application
router.post('/applications/:applicationId/review', authenticateToken, requireOrganization, [
  body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { decision, notes } = req.body;

    // Get application and verify permissions
    const applicationResult = await query(`
      SELECT ca.*, c.owner_id
      FROM club_applications ca
      JOIN clubs c ON ca.club_id = c.id
      WHERE ca.id = $1
    `, [req.params.applicationId]);

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Application not found'
      });
    }

    const application = applicationResult.rows[0];

    if (application.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    if (application.application_status !== 'pending') {
      return res.status(400).json({
        error: 'Application already reviewed',
        message: 'This application has already been processed'
      });
    }

    // Update application status
    const result = await query(`
      UPDATE club_applications SET 
        application_status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [decision, req.user.id, req.params.applicationId]);

    // If approved, optionally create a player record
    if (decision === 'approved') {
    }

    res.json({
      message: `Application ${decision} successfully`,
      application: result.rows[0]
    });

  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({
      error: 'Failed to review application'
    });
  }
});

// Get club statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    // Get basic club info
    const clubResult = await query(queries.findClubById, [req.params.id]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Club not found'
      });
    }

    const club = clubResult.rows[0];

    // Get comprehensive statistics
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM players WHERE club_id = $1) as total_players,
        (SELECT COUNT(*) FROM staff WHERE club_id = $1) as total_staff,
        (SELECT COUNT(*) FROM teams WHERE club_id = $1) as total_teams,
        (SELECT COUNT(*) FROM events WHERE club_id = $1) as total_events,
        (SELECT COUNT(*) FROM events WHERE club_id = $1 AND event_date >= CURRENT_DATE) as upcoming_events,
        (SELECT COUNT(*) FROM payments WHERE club_id = $1 AND payment_status = 'pending') as pending_payments,
        (SELECT COUNT(*) FROM payments WHERE club_id = $1 AND payment_status = 'overdue') as overdue_payments,
        (SELECT SUM(amount) FROM payments WHERE club_id = $1 AND payment_status = 'paid') as total_revenue,
        (SELECT COUNT(*) FROM club_applications WHERE club_id = $1 AND application_status = 'pending') as pending_applications
    `, [req.params.id]);

    const stats = statsResult.rows[0];

    // Get recent activity
    const recentActivityResult = await query(`
      (SELECT 'player_joined' as activity_type, first_name || ' ' || last_name as description, created_at as activity_date
       FROM players WHERE club_id = $1 ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'event_created' as activity_type, title as description, created_at as activity_date
       FROM events WHERE club_id = $1 ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'team_created' as activity_type, name as description, created_at as activity_date
       FROM teams WHERE club_id = $1 ORDER BY created_at DESC LIMIT 5)
      ORDER BY activity_date DESC
      LIMIT 10
    `, [req.params.id]);

    res.json({
      club: {
        id: club.id,
        name: club.name,
        created_at: club.created_at
      },
      statistics: {
        ...stats,
        total_revenue: parseFloat(stats.total_revenue) || 0
      },
      recent_activity: recentActivityResult.rows
    });

  } catch (error) {
    console.error('Get club stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch club statistics'
    });
  }
});

// Configure Multer for Club Gallery
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
    cb(null, 'club-' + uniqueSuffix + path.extname(file.originalname))
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

// POST /api/clubs/:id/images - Upload Image
router.post('/:id/images', authenticateToken, requireOrganization, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        // Verify ownership
        const clubResult = await query(queries.findClubById, [req.params.id]);
        if (clubResult.rows.length === 0) return res.status(404).json({ error: 'Club not found' });
        if (clubResult.rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        if (clubResult.rows[0].images && clubResult.rows[0].images.length >= 5) {
            // Optional: Delete the file that was just uploaded since we're rejecting it
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            return res.status(400).json({ error: 'Image limit reached (max 5 images)' });
        }

        const imageUrl = `/uploads/club-images/${req.file.filename}`;

        // Append to images array
        const result = await query(`
            UPDATE clubs 
            SET images = array_append(COALESCE(images, '{}'), $1), updated_at = NOW()
            WHERE id = $2
            RETURNING images
        `, [imageUrl, req.params.id]);

        res.json({ message: 'Image uploaded', images: result.rows[0].images });

    } catch (err) {
        console.error('Upload image error:', err);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// DELETE /api/clubs/:id/images - Delete Image (by URL)
router.delete('/:id/images', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) return res.status(400).json({ error: 'Image URL required' });

        // Verify ownership
        const clubResult = await query(queries.findClubById, [req.params.id]);
        if (clubResult.rows.length === 0) return res.status(404).json({ error: 'Club not found' });
        if (clubResult.rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

        // Remove from array
        const result = await query(`
            UPDATE clubs 
            SET images = array_remove(images, $1), updated_at = NOW()
            WHERE id = $2
            RETURNING images
        `, [imageUrl, req.params.id]);

        // Optional: Delete file from disk
        try {
            const filePath = path.join(__dirname, '..', imageUrl); // imageUrl starts with /uploads
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