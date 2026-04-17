const express = require("express");
const { query } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
  optionalAuth,
} = require("../middleware/auth");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// GET /api/venues - List all venues
router.get("/", authenticateToken, async (req, res) => {
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

// GET /api/venues/:id - Get single venue
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `
            SELECT v.*, o.name as organization_name
            FROM venues v
            LEFT JOIN organizations o ON v.organization_id = o.id
            WHERE v.id = $1
        `,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get venue error:", error);
    res.status(500).json({ error: "Failed to fetch venue" });
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
        imageUrl,
        organizationId,
      } = req.body;

      const result = await query(
        `
            INSERT INTO venues (name, location, description, capacity, facilities, hourly_rate, image_url, organization_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `,
        [
          name,
          location,
          description,
          capacity,
          JSON.stringify(facilities || []),
          hourlyRate || 0,
          imageUrl,
          organizationId,
        ],
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create venue error:", error);
      res.status(500).json({ error: "Failed to create venue" });
    }
  },
);

// GET /api/venues/:id/availability - Check venue availability
router.get("/:id/availability", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD format

    if (!date) {
      return res.status(400).json({ error: "Date parameter required" });
    }

    // Get all bookings for this venue on this date
    const bookings = await query(
      `
            SELECT start_time, end_time, status
            FROM venue_bookings
            WHERE venue_id = $1
              AND DATE(start_time) = $2
              AND status IN ('pending', 'confirmed')
            ORDER BY start_time
        `,
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
      `
            SELECT * FROM documents
            WHERE venue_id = $1
            ORDER BY created_at DESC
        `,
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
      const {
        startTime,
        endTime,
        notes,
        guestEmail,
        guestFirstName,
        guestLastName,
      } = req.body;
      const userId = req.user ? req.user.id : null;

      // Check if venue exists
      const venueResult = await query("SELECT * FROM venues WHERE id = $1", [
        id,
      ]);
      if (venueResult.rows.length === 0) {
        return res.status(404).json({ error: "Venue not found" });
      }

      const venue = venueResult.rows[0];

      // Check for conflicts
      const conflicts = await query(
        `
            SELECT id FROM venue_bookings
            WHERE venue_id = $1
              AND status IN ('pending', 'confirmed')
              AND (
                  (start_time <= $2 AND end_time > $2) OR
                  (start_time < $3 AND end_time >= $3) OR
                  (start_time >= $2 AND end_time <= $3)
              )
        `,
        [id, startTime, endTime],
      );

      if (conflicts.rows.length > 0) {
        return res
          .status(409)
          .json({ error: "Venue is already booked for this time slot" });
      }

      // Calculate cost
      const start = new Date(startTime);
      const end = new Date(endTime);
      const hours = (end - start) / (1000 * 60 * 60);
      const totalCost = hours * (venue.hourly_rate || 0);

      // If guest checkout, ensure guestEmail provided
      let guestToken = null;
      if (!userId) {
        if (!guestEmail) {
          return res.status(401).json({
            error:
              "Account required at checkout. Provide guestEmail to continue or register.",
          });
        }

        // Ensure DB has guest columns (lightweight migration)
        await query(
          `ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_token UUID`,
        );
        await query(
          `ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255)`,
        );
        await query(
          `ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_first_name VARCHAR(255)`,
        );
        await query(
          `ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_last_name VARCHAR(255)`,
        );
        await query(
          `ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS guest_token_expires_at TIMESTAMP WITH TIME ZONE`,
        );
        await query(
          `ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS accepted_tos BOOLEAN DEFAULT false`,
        );

        guestToken = crypto.randomUUID();
      }

      // If guestToken exists, set expiry (48 hours)
      const guestTokenExpiresAt = guestToken
        ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        : null;

      const result = await query(
        `
            INSERT INTO venue_bookings (venue_id, user_id, organization_id, start_time, end_time, total_cost, notes, status, guest_token, guest_email, guest_first_name, guest_last_name, guest_token_expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11, $12)
            RETURNING *
        `,
        [
          id,
          userId,
          venue.organization_id,
          startTime,
          endTime,
          totalCost,
          notes,
          guestToken,
          guestEmail || null,
          guestFirstName || null,
          guestLastName || null,
          guestTokenExpiresAt,
        ],
      );

      const booking = result.rows[0];

      res.status(201).json({
        message: "Booking created successfully",
        booking,
        guest_token: guestToken,
      });
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
      `
            SELECT vb.*, v.name as venue_name, v.location
            FROM venue_bookings vb
            JOIN venues v ON vb.venue_id = v.id
            WHERE vb.user_id = $1
            ORDER BY vb.start_time DESC
        `,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get my bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// PUT /api/venues/bookings/:id/status - Update booking status
router.put(
  "/bookings/:id/status",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (
        !["pending", "confirmed", "cancelled", "completed"].includes(status)
      ) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const result = await query(
        `
            UPDATE venue_bookings
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `,
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
  },
);

// POST /api/venues/bookings/:id/claim - Claim a guest booking after registration/login
router.post("/bookings/:id/claim", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { guestToken } = req.body;

    if (!guestToken)
      return res.status(400).json({ error: "guestToken required" });

    const b = await query(
      "SELECT * FROM venue_bookings WHERE id = $1 AND guest_token = $2 AND (guest_token_expires_at IS NULL OR guest_token_expires_at > NOW()) LIMIT 1",
      [id, guestToken],
    );
    if (b.rows.length === 0)
      return res
        .status(404)
        .json({ error: "Booking not found, token mismatch, or token expired" });

    const updated = await query(
      `UPDATE venue_bookings SET user_id = $1, guest_token = NULL, guest_token_expires_at = NULL, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [req.user.id, id],
    );

    await query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        "Booking Linked",
        `Your booking has been linked to your account.`,
        "booking",
        `/venues/bookings/${id}`,
      ],
    );

    res.json({ success: true, booking: updated.rows[0] });
  } catch (err) {
    console.error("Claim booking error:", err);
    res.status(500).json({ error: "Failed to claim booking" });
  }
});

module.exports = router;
