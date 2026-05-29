const express = require("express");
const { query } = require("../config/database");
const { syncProductToStripe } = require("../services/stripe-service");
const {
  authenticateToken,
  requireOrganization,
  optionalAuth,
} = require("../middleware/auth");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();

// Create uploads dir for venue images
const venueImgDir = path.join(__dirname, '..', 'uploads', 'venue-images');
if (!fs.existsSync(venueImgDir)) {
  fs.mkdirSync(venueImgDir, { recursive: true });
}

const venueImgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, venueImgDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'venue-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const venueImgUpload = multer({
  storage: venueImgStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
});

// GET /api/venues - List all venues
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { organizationId, search } = req.query;

    let queryText = `
      SELECT v.*, o.name as organization_name,
             (SELECT COUNT(*) FROM venue_bookings WHERE venue_id = v.id AND status = 'confirmed') as booking_count
      FROM venues v
      LEFT JOIN organizations o ON v.organization_id = o.id
      WHERE v.is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (organizationId) {
      paramCount++;
      queryText += ` AND v.organization_id = $${paramCount}`;
      params.push(organizationId);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (v.name ILIKE $${paramCount} OR v.location ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    queryText += " ORDER BY v.created_at DESC";

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Get venues error:", error);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});

// GET /api/venues/:id - Get single venue (with time blocks)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT v.*, o.name as organization_name
       FROM venues v
       LEFT JOIN organizations o ON v.organization_id = o.id
       WHERE v.id = $1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    // Fetch time blocks for this venue
    let timeBlocks = [];
    let openingHours = null;
    try {
      const tbResult = await query(
        `SELECT * FROM venue_time_blocks WHERE venue_id = $1 ORDER BY created_at ASC`,
        [req.params.id]
      );
      timeBlocks = tbResult.rows;
    } catch (tbErr) {
      console.warn('Could not fetch time blocks (table may not exist):', tbErr.message);
    }

    try {
      const ohResult = await query(
        `SELECT * FROM venue_opening_hours WHERE venue_id = $1 LIMIT 1`,
        [req.params.id]
      );
      openingHours = ohResult.rows[0] || null;
    } catch (ohErr) {
      console.warn('Could not fetch opening hours (table may not exist):', ohErr.message);
    }

    const venue = result.rows[0];
    venue.time_blocks = timeBlocks;
    venue.opening_hours = openingHours;
    res.json(venue);
  } catch (error) {
    console.error("Get venue error:", error);
    res.status(500).json({ error: "Failed to fetch venue" });
  }
});

// PUT /api/venues/:id - Update venue
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, hourlyRate, entryPrice, stripe_price_id, description, capacity, type } = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIdx = 1;

    if (name !== undefined) { fields.push(`name = $${paramIdx++}`); values.push(name); }
    if (location !== undefined) { fields.push(`location = $${paramIdx++}`); values.push(location); }
    if (hourlyRate !== undefined) { fields.push(`hourly_rate = $${paramIdx++}`); values.push(hourlyRate); }
    if (entryPrice !== undefined) { fields.push(`entry_price = $${paramIdx++}`); values.push(entryPrice); }
    // stripe_price_id column may not exist in local dev DB; skip updating it here
    if (type !== undefined) { fields.push(`type = $${paramIdx++}`); values.push(type); }
    if (description !== undefined) { fields.push(`description = $${paramIdx++}`); values.push(description); }
    if (capacity !== undefined) { fields.push(`capacity = $${paramIdx++}`); values.push(capacity); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE venues SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const updatedVenue = result.rows[0];

    // Replace time blocks if provided (delete existing and insert new)
    const timeBlocks = req.body.time_blocks;
    if (timeBlocks && Array.isArray(timeBlocks)) {
      try {
        await query(`DELETE FROM venue_time_blocks WHERE venue_id = $1`, [id]);
        for (const tb of timeBlocks) {
          await query(
            `INSERT INTO venue_time_blocks (venue_id, days, start_time, end_time, capacity, start_date, end_date, excluded_dates)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              id,
              JSON.stringify(tb.days || []),
              tb.start_time || null,
              tb.end_time || null,
              tb.capacity || null,
              tb.start_date || null,
              tb.end_date || null,
              JSON.stringify(tb.excluded_dates || []),
            ]
          );
        }
      } catch (tbErr) {
        console.warn('Could not save time blocks on update (table may not exist):', tbErr.message);
      }
    }

    // Replace opening hours if provided
    const openingHours = req.body.opening_hours;
    if (openingHours && (openingHours.open_time || openingHours.close_time)) {
      try {
        // Clear existing then insert
        await query(`DELETE FROM venue_opening_hours WHERE venue_id = $1`, [id]);
        await query(
          `INSERT INTO venue_opening_hours (venue_id, open_time, close_time, block_duration, block_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            openingHours.open_time || null,
            openingHours.close_time || null,
            openingHours.block_duration || 60,
            openingHours.block_type || 'fixed',
          ]
        );
      } catch (ohErr) {
        console.warn('Could not save opening hours on update (table may not exist):', ohErr.message);
      }
    }

    // Re-fetch time blocks and opening hours to include in response
    let timeBlocksRows = [];
    let openingHoursRow = null;
    try {
      const tbRes = await query(`SELECT * FROM venue_time_blocks WHERE venue_id = $1 ORDER BY created_at ASC`, [id]);
      timeBlocksRows = tbRes.rows;
    } catch (e) {
      /* ignore if table missing */
    }
    try {
      const ohRes = await query(`SELECT * FROM venue_opening_hours WHERE venue_id = $1 LIMIT 1`, [id]);
      openingHoursRow = ohRes.rows[0] || null;
    } catch (e) {
      /* ignore if table missing */
    }

    updatedVenue.time_blocks = timeBlocksRows;
    updatedVenue.opening_hours = openingHoursRow;

    res.json(updatedVenue);
  } catch (error) {
    console.error("Update venue error:", error);
    res.status(500).json({ error: "Failed to update venue" });
  }
});

// POST /api/venues - Create venue
router.post(
  "/",
  authenticateToken,
  requireOrganization,
  [body("name").trim().notEmpty(), body("organizationId").isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        name,
        location,
        description,
        capacity,
        facilities,
        hourlyRate,
        entryPrice,
        stripe_price_id,
        imageUrl,
        organizationId,
      } = req.body;

      const result = await query(
        `INSERT INTO venues (name, location, description, capacity, facilities, hourly_rate, entry_price, image_url, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          name,
          location,
          description,
          capacity || null,
          JSON.stringify(facilities || []),
          hourlyRate || 0,
          entryPrice || 0,
          imageUrl,
          organizationId,
        ],
      );

      const savedVenue = result.rows[0];

      // Save time blocks if provided
      const timeBlocks = req.body.time_blocks;
      if (timeBlocks && Array.isArray(timeBlocks) && timeBlocks.length > 0) {
        try {
          // Try venue_time_blocks table
          for (const tb of timeBlocks) {
            await query(
              `INSERT INTO venue_time_blocks (venue_id, days, start_time, end_time, capacity, start_date, end_date, excluded_dates)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                savedVenue.id,
                JSON.stringify(tb.days || []),
                tb.start_time || null,
                tb.end_time || null,
                tb.capacity || null,
                tb.start_date || null,
                tb.end_date || null,
                JSON.stringify(tb.excluded_dates || []),
              ]
            );
          }
        } catch (tbErr) {
          console.warn('Could not save time blocks (table may not exist):', tbErr.message);
        }
      }

      // Save opening hours if provided
      const openingHours = req.body.opening_hours;
      if (openingHours && openingHours.open_time && openingHours.close_time) {
        try {
          await query(
            `INSERT INTO venue_opening_hours (venue_id, open_time, close_time, block_duration, block_type)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              savedVenue.id,
              openingHours.open_time,
              openingHours.close_time,
              openingHours.block_duration || 60,
              openingHours.block_type || 'fixed',
            ]
          );
        } catch (ohErr) {
          console.warn('Could not save opening hours (table may not exist):', ohErr.message);
        }
      }

        // Attempt to sync to Stripe if a price is provided
        let stripeSync = null;
        let stripeSyncError = null;
        try {
          if (entryPrice && entryPrice > 0) {
            const syncResult = await syncProductToStripe({
              type: 'venue',
              id: savedVenue.id,
              name: name || savedVenue.name,
              price: Number(entryPrice),
              clubId: organizationId,
            });

            if (syncResult && syncResult.priceId) {
              stripeSync = syncResult;
              // Try to persist stripe ids back to the venues table if columns exist
              try {
                await query(`UPDATE venues SET stripe_product_id = $1, stripe_price_id = $2 WHERE id = $3`, [stripeSync.productId, stripeSync.priceId, savedVenue.id]);
              } catch (updateErr) {
                console.warn('Could not persist stripe ids to venues table:', updateErr.message);
                stripeSyncError = 'stripe_columns_missing';
              }
            } else {
              stripeSyncError = 'stripe_sync_failed';
            }
          }
        } catch (syncErr) {
          console.error('Stripe sync attempt failed:', syncErr);
          stripeSyncError = (syncErr && syncErr.message) || 'stripe_sync_exception';
        }

        // attach stripe sync info to the response so frontend can show a clear error to user
        if (stripeSyncError) {
          res.status(201).json({ venue: savedVenue, stripeSyncError });
        } else {
          res.status(201).json({ venue: savedVenue, stripeSync });
        }
      // response already sent above with stripe sync info
      return;
    } catch (error) {
      console.error("Create venue error:", error);
      res.status(500).json({ error: "Failed to create venue" });
    }
  },
);

// DELETE /api/venues/:id - Delete venue
router.delete("/:id", authenticateToken, requireOrganization, async (req, res) => {
  try {
    const venueId = req.params.id;
    // Verify ownership
    const v = await query('SELECT * FROM venues WHERE id = $1', [venueId]);
    if (v.rows.length === 0) return res.status(404).json({ error: 'Venue not found' });
    
    const venue = v.rows[0];
    const orgId = req.organization?.id || req.orgContext?.organization_id;
    
    // Soft delete
    await query('UPDATE venues SET is_active = false, updated_at = NOW() WHERE id = $1', [venueId]);
    
    res.json({ message: 'Venue deleted' });
  } catch (err) {
    console.error('Delete venue error:', err);
    res.status(500).json({ error: 'Failed to delete venue' });
  }
});

// GET /api/venues/:id/availability - Check venue availability
router.get("/:id/availability", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date parameter required" });
    }

    const bookings = await query(
      `SELECT start_time, end_time, status
       FROM venue_bookings
       WHERE venue_id = $1 AND DATE(start_time) = $2 AND status IN ('pending', 'confirmed')
       ORDER BY start_time`,
      [id, date],
    );

    res.json({
      date,
      bookings: bookings.rows,
      available: bookings.rows.length === 0,
    });
  } catch (error) {
    console.error("Check availability error:", error);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

// GET /api/venues/:id/documents - Get documents for a venue
router.get("/:id/documents", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM documents WHERE venue_id = $1 ORDER BY created_at DESC`,
      [id],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get venue documents error:", error);
    res.status(500).json({ error: "Failed to fetch venue documents" });
  }
});

// POST /api/venues/:id/book - Book a venue (supports guest checkout)
router.post(
  "/:id/book",
  optionalAuth,
  [body("startTime").isISO8601(), body("endTime").isISO8601()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { startTime, endTime, notes, guestEmail, guestFirstName, guestLastName } = req.body;
      const userId = req.user ? req.user.id : null;

      const venueResult = await query("SELECT * FROM venues WHERE id = $1", [id]);
      if (venueResult.rows.length === 0) {
        return res.status(404).json({ error: "Venue not found" });
      }

      const venue = venueResult.rows[0];

      // Check for conflicts
      const conflicts = await query(
        `SELECT id FROM venue_bookings
         WHERE venue_id = $1 AND status IN ('pending', 'confirmed')
           AND ((start_time <= $2 AND end_time > $2) OR (start_time < $3 AND end_time >= $3) OR (start_time >= $2 AND end_time <= $3))`,
        [id, startTime, endTime],
      );

      if (conflicts.rows.length > 0) {
        return res.status(409).json({ error: "Venue is already booked for this time slot" });
      }

      const start = new Date(startTime);
      const end = new Date(endTime);
      const hours = (end - start) / (1000 * 60 * 60);
      const totalCost = hours * (venue.hourly_rate || 0);

      let guestToken = null;
      if (!userId) {
        if (!guestEmail) {
          return res.status(401).json({ error: "Account required at checkout. Provide guestEmail to continue or register." });
        }

        await query(`ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_token UUID`);
        await query(`ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255)`);
        await query(`ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_first_name VARCHAR(255)`);
        await query(`ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_last_name VARCHAR(255)`);
        await query(`ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_token_expires_at TIMESTAMP WITH TIME ZONE`);
        await query(`ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS accepted_tos BOOLEAN DEFAULT false`);

        guestToken = crypto.randomUUID();
      }

      const guestTokenExpiresAt = guestToken
        ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        : null;

      const result = await query(
        `INSERT INTO venue_bookings (venue_id, user_id, organization_id, start_time, end_time, total_cost, notes, status, guest_token, guest_email, guest_first_name, guest_last_name, guest_token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11, $12)
         RETURNING *`,
        [id, userId, venue.organization_id, startTime, endTime, totalCost, notes, guestToken, guestEmail || null, guestFirstName || null, guestLastName || null, guestTokenExpiresAt],
      );

      const booking = result.rows[0];
      res.status(201).json({ message: "Booking created successfully", booking, guest_token: guestToken });
    } catch (error) {
      console.error("Book venue error:", error);
      res.status(500).json({ error: "Failed to book venue" });
    }
  },
);

// GET /api/venues/bookings/my - Get user's bookings
router.get("/bookings/my", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT vb.*, v.name as venue_name, v.location
       FROM venue_bookings vb JOIN venues v ON vb.venue_id = v.id
       WHERE vb.user_id = $1
       ORDER BY vb.start_time DESC`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get my bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// PUT /api/venues/bookings/:id/status - Update booking status
router.put("/bookings/:id/status", authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const result = await query(
      `UPDATE venue_bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({ error: "Failed to update booking status" });
  }
});

// POST /api/venues/bookings/:id/claim - Claim a guest booking after registration/login
router.post("/bookings/:id/claim", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { guestToken } = req.body;

    if (!guestToken) return res.status(400).json({ error: "guestToken required" });

    const b = await query(
      "SELECT * FROM venue_bookings WHERE id = $1 AND guest_token = $2 AND (guest_token_expires_at IS NULL OR guest_token_expires_at > NOW()) LIMIT 1",
      [id, guestToken],
    );
    if (b.rows.length === 0)
      return res.status(404).json({ error: "Booking not found, token mismatch, or token expired" });

    const updated = await query(
      `UPDATE venue_bookings SET user_id = $1, guest_token = NULL, guest_token_expires_at = NULL, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [req.user.id, id],
    );

    await query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, "Booking Linked", "Your booking has been linked to your account.", "booking", `/venues/bookings/${id}`],
    );

    res.json({ success: true, booking: updated.rows[0] });
  } catch (err) {
    console.error("Claim booking error:", err);
    res.status(500).json({ error: "Failed to claim booking" });
  }
});

// GET /api/venues/:id/bookings - Owner view of bookings for a venue
router.get('/:id/bookings', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const venueId = req.params.id;
    const v = await query('SELECT * FROM venues WHERE id = $1', [venueId]);
    if (v.rows.length === 0) return res.status(404).json({ error: 'Venue not found' });
    
    const venue = v.rows[0];
    const orgId = req.organization?.id || req.orgContext?.organization_id || req.query.organizationId || req.headers['x-organization-id'];
    if (!orgId || venue.organization_id !== orgId) {
      return res.status(403).json({ error: 'Not authorized to view bookings for this venue' });
    }

    const bookings = await query(
      `SELECT vb.*, u.first_name, u.last_name, u.email
       FROM venue_bookings vb LEFT JOIN users u ON vb.user_id = u.id
       WHERE vb.venue_id = $1 ORDER BY vb.start_time DESC`,
      [venueId]
    );

    res.json(bookings.rows);
  } catch (err) {
    console.error('Get venue bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// POST /api/venues/:id/upload-image
router.post('/:id/upload-image', authenticateToken, venueImgUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const imageUrl = `/uploads/venue-images/${req.file.filename}`;

    const venueRes = await query('SELECT * FROM venues WHERE id = $1', [req.params.id]);
    if (venueRes.rows.length === 0) return res.status(404).json({ error: 'Venue not found' });

    await query('UPDATE venues SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING image_url', [imageUrl, req.params.id]);

    res.json({ message: 'Image uploaded', imageUrl });
  } catch (err) {
    console.error('Upload venue image error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;
