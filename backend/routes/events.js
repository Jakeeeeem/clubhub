const express = require("express");
const { query, queries, withTransaction } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
  optionalAuth,
} = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const emailService = require("../services/email-service");

const router = express.Router();

// Validation rules
const eventValidation = [
  body("title")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Event title is required"),
  body("eventType")
    .isIn(["training", "match", "tournament", "camp", "social", "talent-id"])
    .withMessage("Invalid event type"),
  body("eventDate")
    .isISO8601()
    .withMessage("Please provide a valid event date"),
  body("eventTime")
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Please provide a valid time (HH:MM)"),
  body("location").optional().trim(),
  body("price").optional().isNumeric().withMessage("Price must be a number"),
  body("capacity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Capacity must be a positive number"),
  body("clubId").optional().isUUID().withMessage("Valid club ID required"),
  body("teamId").optional().isUUID().withMessage("Valid team ID required"),
  body("recurrencePattern")
    .optional()
    .isIn(["daily", "weekly", "monthly", "none"])
    .withMessage("Invalid recurrence pattern"),
  body("recurrenceEndDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid recurrence end date"),
  body("requireDeclineReason")
    .optional()
    .isBoolean()
    .withMessage("Must be a boolean"),
  body("notificationSchedule")
    .optional()
    .isArray()
    .withMessage("Notification schedule must be an array"),
  body("assignedPlayers")
    .optional()
    .isArray()
    .withMessage("Assigned players must be an array of IDs"),
];

// Get all events (public with optional authentication)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      clubId,
      teamId,
      eventType,
      location,
      startDate,
      endDate,
      upcoming,
      limit = 50,
    } = req.query;

    let queryText = `
      SELECT e.*, 
             c.name as club_name,
             t.name as team_name,
             COUNT(eb.id) as booking_count
      FROM events e
      LEFT JOIN organizations c ON e.club_id = c.id
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN event_bookings eb ON e.id = eb.event_id AND eb.booking_status = 'confirmed'
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filter by club if provided
    if (clubId) {
      paramCount++;
      queryText += ` AND e.club_id = $${paramCount}`;
      queryParams.push(clubId);
    } else if (req.user) {
      // Enforce Isolation: If no clubId, limit to user's clubs/teams context
      paramCount++;
      queryText += ` AND e.club_id IN (
            SELECT id FROM organizations WHERE owner_id = $${paramCount}
            UNION
            SELECT club_id FROM staff WHERE user_id = $${paramCount}
            UNION
            SELECT club_id FROM players WHERE user_id = $${paramCount}
        )`;
      queryParams.push(req.user.id);
    }

    // Filter by team if provided
    if (teamId) {
      paramCount++;
      queryText += ` AND e.team_id = $${paramCount}`;
      queryParams.push(teamId);
    }

    // Filter by event type if provided
    if (eventType) {
      paramCount++;
      queryText += ` AND e.event_type = $${paramCount}`;
      queryParams.push(eventType);
    }

    // Filter by location if provided
    if (location) {
      paramCount++;
      queryText += ` AND e.location ILIKE $${paramCount}`;
      queryParams.push(`%${location}%`);
    }

    // Filter by date range
    if (startDate) {
      paramCount++;
      queryText += ` AND e.event_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND e.event_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    // Filter upcoming events
    if (upcoming === "true") {
      queryText += ` AND e.event_date >= CURRENT_DATE`;
    }

    queryText += ` 
      GROUP BY e.id, c.name, t.name
      ORDER BY e.event_date ASC, e.event_time ASC
      LIMIT $${paramCount + 1}
    `;
    queryParams.push(parseInt(limit));

    const result = await query(queryText, queryParams);

    // Calculate spots available for each event
    const eventsWithSpots = result.rows.map((event) => ({
      ...event,
      spots_available: event.capacity
        ? event.capacity - event.booking_count
        : null,
      is_full: event.capacity ? event.booking_count >= event.capacity : false,
    }));

    res.json(eventsWithSpots);
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      error: "Failed to fetch events",
      message: "An error occurred while fetching events",
    });
  }
});

// Get specific event
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const eventResult = await query(
      `
      SELECT e.*, 
             c.name as club_name,
             c.location as club_location,
             t.name as team_name,
             t.age_group,
             u.first_name as creator_first_name,
             u.last_name as creator_last_name
      FROM events e
      LEFT JOIN organizations c ON e.club_id = c.id
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `,
      [req.params.id],
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: "Event not found",
        message: "Event with this ID does not exist",
      });
    }

    const event = eventResult.rows[0];

    // Get bookings count
    const bookingsResult = await query(
      `
      SELECT COUNT(*) as booking_count
      FROM event_bookings
      WHERE event_id = $1 AND booking_status = 'confirmed'
    `,
      [req.params.id],
    );

    event.booking_count = parseInt(bookingsResult.rows[0].booking_count);
    event.spots_available = event.capacity
      ? event.capacity - event.booking_count
      : null;
    event.is_full = event.capacity
      ? event.booking_count >= event.capacity
      : false;

    // Get match result if it's a match and has been played
    if (
      event.event_type === "match" &&
      new Date(event.event_date) < new Date()
    ) {
      const matchResult = await query(
        `
        SELECT * FROM match_results WHERE event_id = $1
      `,
        [req.params.id],
      );

      event.match_result = matchResult.rows[0] || null;
    }

    // If user is authenticated, check if they've booked this event
    if (req.user) {
      const userBookingResult = await query(
        `
        SELECT * FROM event_bookings
        WHERE event_id = $1 AND user_id = $2
      `,
        [req.params.id, req.user.id],
      );

      event.user_booking = userBookingResult.rows[0] || null;
    }

    res.json(event);
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      error: "Failed to fetch event",
      message: "An error occurred while fetching event details",
    });
  }
});

// Create new event
router.post(
  "/",
  authenticateToken,
  requireOrganization,
  eventValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      let {
        title,
        description,
        eventType,
        eventDate, // String like '2023-10-01'
        eventTime,
        location,
        price,
        capacity,
        clubId,
        teamId,
        opponent,
        recurrencePattern,
        recurrenceEndDate,
        requireDeclineReason,
        notificationSchedule,
        assignedPlayers,
      } = req.body;

      // Ensure reason is boolean
      requireDeclineReason =
        requireDeclineReason === true || requireDeclineReason === "true";

      // Logic to resolve club ID
      let userClubId = clubId;
      if (!userClubId) {
        const clubResult = await query(
          "SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1",
          [req.user.id],
        );
        if (clubResult.rows.length === 0) {
          return res.status(404).json({ error: "No club found" });
        }
        userClubId = clubResult.rows[0].id;
      }

      // Generate dates for recurrence
      const dates = [eventDate];
      if (
        recurrencePattern &&
        recurrencePattern !== "none" &&
        recurrenceEndDate
      ) {
        let current = new Date(eventDate);
        const end = new Date(recurrenceEndDate);

        while (true) {
          if (recurrencePattern === "daily")
            current.setDate(current.getDate() + 1);
          else if (recurrencePattern === "weekly")
            current.setDate(current.getDate() + 7);
          else if (recurrencePattern === "monthly")
            current.setMonth(current.getMonth() + 1);

          if (current > end) break;
          dates.push(current.toISOString().split("T")[0]);
        }
      }

      const recurrenceGroupId =
        dates.length > 1 ? require("crypto").randomUUID() : null;
      const createdEvents = [];

      // Use Transaction for multiple inserts
      await withTransaction(async (client) => {
        for (const date of dates) {
          const result = await client.query(
            `
            INSERT INTO events (
              title, description, event_type, event_date, event_time, 
              location, price, capacity, spots_available, club_id, 
              team_id, opponent, created_by, 
              recurrence_pattern, recurrence_end_date, recurrence_id,
              require_decline_reason, notification_schedule,
              created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
            RETURNING *
          `,
            [
              title,
              description || null,
              eventType,
              date,
              eventTime || null,
              location || null,
              price || 0,
              capacity || null,
              capacity || null,
              clubId || userClubId,
              teamId || null,
              opponent || null,
              req.user.id,
              recurrencePattern || null,
              recurrenceEndDate || null,
              recurrenceGroupId,
              requireDeclineReason,
              JSON.stringify(notificationSchedule || []),
            ],
          );

          const newEvent = result.rows[0];
          createdEvents.push(newEvent);

          // Handle Specific Player Assignments
          if (
            assignedPlayers &&
            Array.isArray(assignedPlayers) &&
            assignedPlayers.length > 0
          ) {
            for (const playerId of assignedPlayers) {
              await client.query(
                `INSERT INTO event_players (event_id, player_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [newEvent.id, playerId],
              );
            }
          }
        }
      });

      res.status(201).json({
        message:
          createdEvents.length > 1
            ? `Created ${createdEvents.length} recurring events`
            : "Event created successfully",
        events: createdEvents,
        count: createdEvents.length,
      });

      // Email Notifications (Primary event only for now to avoid spam)
      if (createdEvents[0].team_id) {
        // ... (existing email logic can follow for the first event)
        // I'll keep the email logic simplified for now as requested
      }
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({
        error: "Failed to create event",
        message: error.message,
      });
    }
  },
);

// Update event
router.put(
  "/:id",
  authenticateToken,
  requireOrganization,
  eventValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      // Check if event exists and user has permission
      const eventResult = await query(
        `
      SELECT e.*, c.owner_id 
      FROM events e
      LEFT JOIN organizations c ON e.club_id = c.id
      WHERE e.id = $1
    `,
        [req.params.id],
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          error: "Event not found",
          message: "Event with this ID does not exist",
        });
      }

      const event = eventResult.rows[0];

      // Check if user created the event or owns the club
      if (event.created_by !== req.user.id && event.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only update your own events",
        });
      }

      const {
        title,
        description,
        eventType,
        eventDate,
        eventTime,
        location,
        price,
        capacity,
        opponent,
      } = req.body;

      const result = await query(
        `
      UPDATE events SET 
        title = $1,
        description = $2,
        event_type = $3,
        event_date = $4,
        event_time = $5,
        location = $6,
        price = $7,
        capacity = $8,
        opponent = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `,
        [
          title,
          description || null,
          eventType,
          eventDate,
          eventTime || null,
          location || null,
          price || event.price,
          capacity || null,
          opponent || null,
          req.params.id,
        ],
      );

      const updatedEvent = result.rows[0];

      res.json({
        message: "Event updated successfully",
        event: updatedEvent,
      });
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({
        error: "Failed to update event",
        message: "An error occurred while updating the event",
      });
    }
  },
);

// Delete event
router.delete(
  "/:id",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      // Check if event exists and user has permission
      const eventResult = await query(
        `
      SELECT e.*, c.owner_id 
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = $1
    `,
        [req.params.id],
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          error: "Event not found",
          message: "Event with this ID does not exist",
        });
      }

      const event = eventResult.rows[0];

      // Check if user created the event or owns the club
      if (event.created_by !== req.user.id && event.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only delete your own events",
        });
      }

      // Delete event and related data in transaction
      await withTransaction(async (client) => {
        // Delete event bookings
        await client.query("DELETE FROM event_bookings WHERE event_id = $1", [
          req.params.id,
        ]);

        // Delete availability responses
        await client.query(
          "DELETE FROM availability_responses WHERE event_id = $1",
          [req.params.id],
        );

        // Delete match results
        await client.query("DELETE FROM match_results WHERE event_id = $1", [
          req.params.id,
        ]);

        // Delete event
        await client.query("DELETE FROM events WHERE id = $1", [req.params.id]);
      });

      res.json({
        message: "Event deleted successfully",
      });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({
        error: "Failed to delete event",
        message: "An error occurred while deleting the event",
      });
    }
  },
);

// Book event
router.post(
  "/:id/book",
  authenticateToken,
  [
    body("playerData")
      .optional()
      .isObject()
      .withMessage("Player data must be an object"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { playerData } = req.body;

      // Get event details
      const eventResult = await query("SELECT * FROM events WHERE id = $1", [
        req.params.id,
      ]);
      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          error: "Event not found",
          message: "Event with this ID does not exist",
        });
      }

      const event = eventResult.rows[0];

      // Check if event is in the future
      if (new Date(event.event_date) < new Date()) {
        return res.status(400).json({
          error: "Event has passed",
          message: "Cannot book past events",
        });
      }

      // Check if user already booked this event
      const existingBooking = await query(
        `
      SELECT id FROM event_bookings
      WHERE event_id = $1 AND user_id = $2
    `,
        [req.params.id, req.user.id],
      );

      if (existingBooking.rows.length > 0) {
        return res.status(409).json({
          error: "Already booked",
          message: "You have already booked this event",
        });
      }

      // Check capacity
      const bookingsCount = await query(
        `
      SELECT COUNT(*) as count
      FROM event_bookings
      WHERE event_id = $1 AND booking_status = 'confirmed'
    `,
        [req.params.id],
      );

      const currentBookings = parseInt(bookingsCount.rows[0].count);

      if (event.capacity && currentBookings >= event.capacity) {
        return res.status(400).json({
          error: "Event is full",
          message: "No more spots available for this event",
        });
      }

      // Create booking in transaction
      const booking = await withTransaction(async (client) => {
        let playerId = null;

        // If player data is provided, create or find player
        if (playerData) {
          const { firstName, lastName, email, phone, dateOfBirth } = playerData;

          // Try to find existing player
          const existingPlayer = await client.query(
            `
          SELECT id FROM players 
          WHERE email = $1 AND club_id = $2
        `,
            [email, event.club_id],
          );

          if (existingPlayer.rows.length > 0) {
            playerId = existingPlayer.rows[0].id;
          } else {
            // Create new player
            const newPlayer = await client.query(
              `
            INSERT INTO players (first_name, last_name, email, phone, date_of_birth, club_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `,
              [firstName, lastName, email, phone, dateOfBirth, event.club_id],
            );

            playerId = newPlayer.rows[0].id;
          }
        }

        // Create booking
        const bookingResult = await client.query(
          `
        INSERT INTO event_bookings (event_id, user_id, player_id, amount_paid)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
          [req.params.id, req.user.id, playerId, event.price || 0],
        );

        // Update spots available
        if (event.capacity) {
          await client.query(
            `
          UPDATE events 
          SET spots_available = capacity - (
            SELECT COUNT(*) FROM event_bookings 
            WHERE event_id = $1 AND booking_status = 'confirmed'
          )
          WHERE id = $1
        `,
            [req.params.id],
          );
        }

        return bookingResult.rows[0];
      });

      res.status(201).json({
        message: "Event booked successfully",
        booking,
      });
    } catch (error) {
      console.error("Book event error:", error);
      res.status(500).json({
        error: "Failed to book event",
        message: "An error occurred while booking the event",
      });
    }
  },
);

// Cancel booking
router.post(
  "/bookings/:bookingId/cancel",
  authenticateToken,
  async (req, res) => {
    try {
      // Get booking details
      const bookingResult = await query(
        `
      SELECT * FROM event_bookings
      WHERE id = $1 AND user_id = $2
    `,
        [req.params.bookingId, req.user.id],
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({
          error: "Booking not found",
          message: "Booking does not exist or does not belong to you",
        });
      }

      const booking = bookingResult.rows[0];

      // Get event details
      const eventResult = await query("SELECT * FROM events WHERE id = $1", [
        booking.event_id,
      ]);
      const event = eventResult.rows[0];

      // Check if event is in the future (allow cancellation up to event time)
      if (new Date(event.event_date) < new Date()) {
        return res.status(400).json({
          error: "Cannot cancel",
          message: "Cannot cancel bookings for past events",
        });
      }

      // Update booking status in transaction
      await withTransaction(async (client) => {
        // Cancel booking
        await client.query(
          `
        UPDATE event_bookings 
        SET booking_status = 'cancelled', updated_at = NOW()
        WHERE id = $1
      `,
          [req.params.bookingId],
        );

        // Update spots available
        if (event.capacity) {
          await client.query(
            `
          UPDATE events 
          SET spots_available = capacity - (
            SELECT COUNT(*) FROM event_bookings 
            WHERE event_id = $1 AND booking_status = 'confirmed'
          )
          WHERE id = $1
        `,
            [booking.event_id],
          );
        }
      });

      res.json({
        message: "Booking cancelled successfully",
      });
    } catch (error) {
      console.error("Cancel booking error:", error);
      res.status(500).json({
        error: "Failed to cancel booking",
        message: "An error occurred while cancelling the booking",
      });
    }
  },
);

// Get event bookings (for event organizers)
router.get(
  "/:id/bookings",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      // Verify user has permission to view bookings
      const eventResult = await query(
        `
      SELECT e.*, c.owner_id 
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = $1
    `,
        [req.params.id],
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          error: "Event not found",
        });
      }

      const event = eventResult.rows[0];

      if (event.created_by !== req.user.id && event.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
        });
      }

      // Get all bookings for the event
      const bookingsResult = await query(
        `
      SELECT eb.*, 
             u.first_name as user_first_name,
             u.last_name as user_last_name,
             u.email as user_email,
             p.first_name as player_first_name,
             p.last_name as player_last_name,
             p.email as player_email
      FROM event_bookings eb
      JOIN users u ON eb.user_id = u.id
      LEFT JOIN players p ON eb.player_id = p.id
      WHERE eb.event_id = $1
      ORDER BY eb.booked_at ASC
    `,
        [req.params.id],
      );

      res.json({
        event: {
          id: event.id,
          title: event.title,
          event_date: event.event_date,
          capacity: event.capacity,
        },
        bookings: bookingsResult.rows,
      });
    } catch (error) {
      console.error("Get event bookings error:", error);
      res.status(500).json({
        error: "Failed to fetch event bookings",
      });
    }
  },
);

// Get user's bookings
router.get("/bookings/my-bookings", authenticateToken, async (req, res) => {
  try {
    const { status, upcoming } = req.query;

    let queryText = `
      SELECT eb.*, 
             e.title,
             e.event_type,
             e.event_date,
             e.event_time,
             e.location,
             c.name as club_name
      FROM event_bookings eb
      JOIN events e ON eb.event_id = e.id
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE eb.user_id = $1
    `;
    const queryParams = [req.user.id];
    let paramCount = 1;

    // Filter by status if provided
    if (status) {
      paramCount++;
      queryText += ` AND eb.booking_status = $${paramCount}`;
      queryParams.push(status);
    }

    // Filter upcoming events
    if (upcoming === "true") {
      queryText += ` AND e.event_date >= CURRENT_DATE`;
    }

    queryText += ` ORDER BY e.event_date ASC`;

    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error("Get user bookings error:", error);
    res.status(500).json({
      error: "Failed to fetch your bookings",
    });
  }
});

// Submit availability for team event
router.post(
  "/:id/availability",
  authenticateToken,
  [
    body("availability")
      .isIn(["yes", "no", "maybe"])
      .withMessage("Invalid availability status"),
    body("notes").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { availability, notes } = req.body;

      // Get event and verify it's a team event
      const eventResult = await query(
        `
      SELECT e.*, t.id as team_id
      FROM events e
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE e.id = $1
    `,
        [req.params.id],
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          error: "Event not found",
        });
      }

      const event = eventResult.rows[0];

      if (!event.team_id) {
        return res.status(400).json({
          error: "Not a team event",
          message: "Availability can only be submitted for team events",
        });
      }

      // Check if user has a player in this team
      const playerResult = await query(
        `
      SELECT p.id FROM players p
      JOIN team_players tp ON p.id = tp.player_id
      WHERE tp.team_id = $1 AND p.user_id = $2
    `,
        [event.team_id, req.user.id],
      );

      if (playerResult.rows.length === 0) {
        return res.status(403).json({
          error: "Not a team member",
          message: "You must be a member of this team to submit availability",
        });
      }

      const playerId = playerResult.rows[0].id;

      // 🔥 MANDATORY DECLINE REASON CHECK
      if (
        availability === "no" &&
        event.require_decline_reason &&
        (!notes || notes.trim().length < 3)
      ) {
        return res.status(400).json({
          error: "Reason required",
          message:
            "A decline reason is required for this event. Please provide a brief note.",
        });
      }
      const result = await query(
        `
      INSERT INTO availability_responses (event_id, player_id, availability, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (event_id, player_id)
      DO UPDATE SET 
        availability = EXCLUDED.availability,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `,
        [req.params.id, playerId, availability, notes || null],
      );

      res.json({
        message: "Availability submitted successfully",
        response: result.rows[0],
      });
    } catch (error) {
      console.error("Submit availability error:", error);
      res.status(500).json({
        error: "Failed to submit availability",
      });
    }
  },
);

// Admin/Coach override availability for any player
router.post(
  "/:id/availability/override",
  authenticateToken,
  requireOrganization,
  [
    body("playerId").isUUID().withMessage("Valid player ID required"),
    body("availability")
      .isIn(["yes", "no", "maybe", "none"])
      .withMessage("Invalid availability"),
    body("notes").optional().trim(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { playerId, availability, notes } = req.body;

      // Verify event exists
      const eventResult = await query("SELECT * FROM events WHERE id = $1", [
        id,
      ]);
      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }

      const event = eventResult.rows[0];

      // Check if user has permission (must own the club)
      const clubResult = await query(
        "SELECT owner_id FROM organizations WHERE id = $1",
        [event.club_id],
      );
      if (
        clubResult.rows.length === 0 ||
        clubResult.rows[0].owner_id !== req.user.id
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (availability === "none") {
        // Delete response if it exists
        await query(
          "DELETE FROM availability_responses WHERE event_id = $1 AND player_id = $2",
          [id, playerId],
        );
        return res.json({ message: "Availability reset successfully" });
      }

      // Upsert availability
      const result = await query(
        `
        INSERT INTO availability_responses (event_id, player_id, availability, notes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (event_id, player_id)
        DO UPDATE SET 
          availability = EXCLUDED.availability,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *
      `,
        [id, playerId, availability, notes || null],
      );

      res.json({
        message: "Availability overridden successfully",
        response: result.rows[0],
      });
    } catch (error) {
      console.error("Override availability error:", error);
      res.status(500).json({ error: "Failed to override availability" });
    }
  },
);

// Get event availability responses (for coaches/organizers)
router.get("/:id/availability", authenticateToken, async (req, res) => {
  try {
    // Get event and verify permissions
    const eventResult = await query(
      `
      SELECT e.*, c.owner_id, t.coach_id
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE e.id = $1
    `,
      [req.params.id],
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: "Event not found",
      });
    }

    const event = eventResult.rows[0];

    // Check if user has permission to view availability
    const hasPermission =
      event.created_by === req.user.id ||
      event.owner_id === req.user.id ||
      event.coach_id === req.user.id;

    if (!hasPermission) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    // Get availability responses
    const responsesResult = await query(
      `
      SELECT ar.*, 
             p.first_name,
             p.last_name,
             tp.position
      FROM availability_responses ar
      JOIN players p ON ar.player_id = p.id
      LEFT JOIN team_players tp ON p.id = tp.player_id AND tp.team_id = $2
      WHERE ar.event_id = $1
      ORDER BY ar.availability, p.last_name
    `,
      [req.params.id, event.team_id],
    );

    // Group responses by availability
    const grouped = {
      yes: [],
      no: [],
      maybe: [],
    };

    responsesResult.rows.forEach((response) => {
      grouped[response.availability].push(response);
    });

    res.json({
      event: {
        id: event.id,
        title: event.title,
        event_date: event.event_date,
      },
      responses: grouped,
      summary: {
        total: responsesResult.rows.length,
        available: grouped.yes.length,
        unavailable: grouped.no.length,
        maybe: grouped.maybe.length,
      },
    });
  } catch (error) {
    console.error("Get event availability error:", error);
    res.status(500).json({
      error: "Failed to fetch availability responses",
    });
  }
});

/**
 * @route POST /api/events/:id/notify
 * @desc Send notifications/emails for an event to relevant members
 */
router.post(
  "/:id/notify",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const eventId = req.params.id;

      // 1. Fetch event and club/team info
      const eventResult = await query(
        `
      SELECT e.*, c.name as club_name, c.owner_id as club_owner_id, t.name as team_name
      FROM events e
      JOIN clubs c ON e.club_id = c.id
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE e.id = $1
    `,
        [eventId],
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }

      const event = eventResult.rows[0];

      // Check permissions
      if (
        event.created_by !== req.user.id &&
        event.club_owner_id !== req.user.id
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      // 2. Identify recipients
      let recipientsResult;
      if (event.team_id) {
        // Team members
        recipientsResult = await query(
          `
        SELECT DISTINCT u.id as user_id, u.email, u.first_name, u.last_name
        FROM players p
        JOIN team_players tp ON p.id = tp.player_id
        JOIN users u ON p.user_id = u.id
        WHERE tp.team_id = $1 AND u.email IS NOT NULL
      `,
          [event.team_id],
        );
      } else {
        // Club members (players and staff)
        recipientsResult = await query(
          `
        SELECT DISTINCT u.id as user_id, u.email, u.first_name, u.last_name
        FROM (
          SELECT user_id FROM players WHERE club_id = $1 AND user_id IS NOT NULL
          UNION
          SELECT user_id FROM staff WHERE club_id = $1 AND user_id IS NOT NULL
        ) members
        JOIN users u ON members.user_id = u.id
        WHERE u.email IS NOT NULL
      `,
          [event.club_id],
        );
      }

      const recipients = recipientsResult.rows;
      if (recipients.length === 0) {
        return res.json({
          message: "No registered users found to notify for this event",
          count: 0,
        });
      }

      // 3. Send notifications and emails
      const notificationTitle = `New Event: ${event.title}`;
      const notificationMessage = `You have a new ${event.event_type} scheduled for ${new Date(event.event_date).toLocaleDateString()} at ${event.event_time || "TBA"}. Location: ${event.location || "TBA"}`;
      const actionUrl = `/events/${event.id}`;

      const notificationPromises = recipients.map(async (r) => {
        // In-app notification
        try {
          await query(queries.createNotification, [
            r.user_id,
            notificationTitle,
            notificationMessage,
            "event",
            actionUrl,
          ]);
        } catch (err) {
          console.error(
            `Failed to create notification for user ${r.user_id}:`,
            err.message,
          );
        }

        // Email notification
        // (Optional: Implement batching for large clubs)
        try {
          await emailService.sendEmail({
            to: r.email,
            subject: notificationTitle,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #007bff;">${notificationTitle}</h2>
              <p style="font-size: 16px; line-height: 1.5;">${notificationMessage}</p>
              <div style="margin-top: 25px;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:8000"}${actionUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                   View Event Details
                </a>
              </div>
              <p style="margin-top: 30px; font-size: 12px; color: #888;">
                You received this because you are a member of the club organizing this event.
              </p>
            </div>
          `,
          });
        } catch (err) {
          console.error(`Failed to send email to ${r.email}:`, err.message);
        }
      });

      await Promise.all(notificationPromises);

      res.json({
        message: `Notifications sent to ${recipients.length} members`,
        count: recipients.length,
      });
    } catch (error) {
      console.error("Event notification error:", error);
      res.status(500).json({ error: "Failed to send event notifications" });
    }
  },
);

// DELETE /api/events/:id - Delete an event
router.delete(
  "/:id",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if event exists and if user owns the club
      const eventResult = await query(
        `
      SELECT e.*, c.owner_id 
      FROM events e
      JOIN clubs c ON e.club_id = c.id
      WHERE e.id = $1
    `,
        [id],
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (eventResult.rows[0].owner_id !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      await query("DELETE FROM events WHERE id = $1", [id]);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  },
);

// ========================================
// QR CHECK-IN & 'I'M HERE' FUNCTIONALITY
// ========================================

// Check-in to event (QR or manual)
router.post("/:id/checkin", authenticateToken, async (req, res) => {
  try {
    const { method = "manual", latitude, longitude } = req.body;

    // Verify event exists
    const eventResult = await query("SELECT * FROM events WHERE id = $1", [
      req.params.id,
    ]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if already checked in
    const existing = await query(
      "SELECT id FROM event_checkins WHERE event_id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );

    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "Already checked in to this event" });
    }

    // Geofencing Validation
    if (
      latitude &&
      longitude &&
      eventResult.rows[0].latitude &&
      eventResult.rows[0].longitude
    ) {
      const distance = calculateDistance(
        latitude,
        longitude,
        eventResult.rows[0].latitude,
        eventResult.rows[0].longitude,
      );

      if (distance > 500) {
        // 500 meters limit
        return res.status(400).json({
          error: "Location validation failed",
          message: "You must be within 500 meters of the venue to check in.",
        });
      }
    }

    // Create check-in record
    const result = await query(
      `
      INSERT INTO event_checkins (event_id, user_id, checkin_method, location_lat, location_lng)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [req.params.id, req.user.id, method, latitude, longitude],
    );

    res.status(201).json({
      message: "Checked in successfully",
      checkin: result.rows[0],
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Failed to check in" });
  }
});

// Get event check-ins (for organizers)
router.get(
  "/:id/checkins",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const result = await query(
        `
      SELECT ec.*, u.first_name, u.last_name, u.email
      FROM event_checkins ec
      JOIN users u ON ec.user_id = u.id
      WHERE ec.event_id = $1
      ORDER BY ec.checkin_time DESC
    `,
        [req.params.id],
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Get checkins error:", error);
      res.status(500).json({ error: "Failed to fetch check-ins" });
    }
  },
);

// Helper function for geofencing distance calculation (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Record match result with player stats
router.post("/:id/result", authenticateToken, async (req, res) => {
  try {
    const {
      home_score,
      away_score,
      result,
      notes,
      playerStats = [],
    } = req.body;
    const eventId = req.params.id;

    // Check if event exists
    const eventCheck = await query("SELECT * FROM events WHERE id = $1", [
      eventId,
    ]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventCheck.rows[0];

    // Use transaction to ensure data integrity
    await withTransaction(async (client) => {
      // 1. Upsert match result
      let matchResultId;
      const existingRes = await client.query(
        "SELECT id FROM match_results WHERE event_id = $1",
        [eventId],
      );

      if (existingRes.rows.length > 0) {
        matchResultId = existingRes.rows[0].id;
        // If updating, we might want to adjust team stats by subtracting old result first
        // For simplicity, we'll just update the result record
        await client.query(
          `UPDATE match_results 
           SET home_score = $1, away_score = $2, result = $3, match_notes = $4, updated_at = NOW() 
           WHERE id = $5`,
          [home_score, away_score, result, notes || null, matchResultId],
        );
      } else {
        const insertRes = await client.query(
          `INSERT INTO match_results (event_id, home_score, away_score, result, match_notes, recorded_by)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [eventId, home_score, away_score, result, notes || null, req.user.id],
        );
        matchResultId = insertRes.rows[0].id;

        // Update team records ONLY on first record to avoid duplication errors
        // (Real system should track totals more robustly)
        if (event.team_id) {
          if (result === "win") {
            await client.query(
              "UPDATE teams SET wins = wins + 1 WHERE id = $1",
              [event.team_id],
            );
          } else if (result === "loss") {
            await client.query(
              "UPDATE teams SET losses = losses + 1 WHERE id = $1",
              [event.team_id],
            );
          } else if (result === "draw") {
            await client.query(
              "UPDATE teams SET draws = draws + 1 WHERE id = $1",
              [event.team_id],
            );
          }
        }
      }

      // 2. Clear old stats for this match if any (for clean update)
      // Activities are harder to clean without specific link, so we'll just log new ones
      // In a production app, we'd delete activities with this eventId first.
      await client.query("DELETE FROM player_activities WHERE event_id = $1", [
        eventId,
      ]);

      // 3. Process player statistics
      if (playerStats && Array.isArray(playerStats)) {
        for (const stat of playerStats) {
          const {
            playerId,
            rating = 7,
            goals = 0,
            assists = 0,
            yellowCards = 0,
            redCards = 0,
            minutesPlayed = 0,
            notes: playerNotes = "",
          } = stat;

          // Upsert rating & performance data
          await client.query(
            `INSERT INTO player_ratings (
              match_result_id, player_id, rating, notes, 
              goals, assists, yellow_cards, red_cards, minutes_played
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (match_result_id, player_id) DO UPDATE SET
              rating = EXCLUDED.rating,
              notes = EXCLUDED.notes,
              goals = EXCLUDED.goals,
              assists = EXCLUDED.assists,
              yellow_cards = EXCLUDED.yellow_cards,
              red_cards = EXCLUDED.red_cards,
              minutes_played = EXCLUDED.minutes_played,
              created_at = NOW()`,
            [
              matchResultId,
              playerId,
              rating,
              playerNotes,
              goals,
              assists,
              yellowCards,
              redCards,
              minutesPlayed,
            ],
          );

          // 4. Create activity logs
          // Generic Match Activity
          await client.query(
            `INSERT INTO player_activities (player_id, activity_type, description, event_id, metadata)
             VALUES ($1, 'match', $2, $3, $4)`,
            [
              playerId,
              `Played in match: ${event.title}`,
              eventId,
              JSON.stringify({
                result,
                home_score,
                away_score,
                goals,
                assists,
              }),
            ],
          );

          if (goals > 0) {
            await client.query(
              `INSERT INTO player_activities (player_id, activity_type, description, event_id, metadata)
               VALUES ($1, 'goal', $2, $3, $4)`,
              [
                playerId,
                `Scored ${goals} goal(s) vs ${event.opponent || "TBD"}`,
                eventId,
                JSON.stringify({ count: goals }),
              ],
            );
          }

          if (assists > 0) {
            await client.query(
              `INSERT INTO player_activities (player_id, activity_type, description, event_id, metadata)
               VALUES ($1, 'assist', $2, $3, $4)`,
              [
                playerId,
                `Provided ${assists} assist(s) vs ${event.opponent || "TBD"}`,
                eventId,
                JSON.stringify({ count: assists }),
              ],
            );
          }

          if (yellowCards > 0 || redCards > 0) {
            await client.query(
              `INSERT INTO player_activities (player_id, activity_type, description, event_id, metadata)
               VALUES ($1, 'card', $2, $3, $4)`,
              [
                playerId,
                `${yellowCards ? "Yellow" : ""}${yellowCards && redCards ? " and " : ""}${redCards ? "Red" : ""} card received`,
                eventId,
                JSON.stringify({ yellow: yellowCards, red: redCards }),
              ],
            );
          }
        }
      }
    });

    res.json({
      success: true,
      message: "Match result and player statistics recorded successfully!",
    });
  } catch (error) {
    console.error("Detailed match record error:", error);
    res.status(500).json({ error: "Failed to record match data" });
  }
});

// ================= CAMP MANAGEMENT =================

/**
 * @route   GET /api/events/:id/groups
 * @desc    Get all camp groups for an event
 */
router.get("/:id/groups", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM camp_groups WHERE event_id = $1",
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

/**
 * @route   GET /api/events/:id/players
 * @desc    Get all players registered/attending an event with their group and bib info
 */
router.get("/:id/players", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT 
        p.id, 
        u.first_name, 
        u.last_name, 
        u.email,
        ep.group_id,
        cg.name as group_name,
        cb.bib_number,
        cb.bib_color,
        EXISTS(SELECT 1 FROM event_checkins WHERE event_id = ep.event_id AND user_id = u.id) as checked_in
      FROM event_players ep
      JOIN players p ON ep.player_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN camp_groups cg ON ep.group_id = cg.id
      LEFT JOIN camp_bibs cb ON (cb.event_id = ep.event_id AND cb.player_id = ep.player_id)
      WHERE ep.event_id = $1
    `,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

/**
 * @route   POST /api/events/:id/groups
 * @desc    Create a new group for a camp/event
 */
router.post(
  "/:id/groups",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const { name, coachId } = req.body;
    try {
      const result = await query(
        "INSERT INTO camp_groups (event_id, name, coach_id) VALUES ($1, $2, $3) RETURNING *",
        [req.params.id, name, coachId || null],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to create camp group" });
    }
  },
);

/**
 * @route   POST /api/events/:id/assign-group
 * @desc    Assign a player to a camp group within an event
 */
router.post(
  "/:id/assign-group",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const { playerId, groupId } = req.body;
    try {
      await query(
        "UPDATE event_players SET group_id = $1 WHERE event_id = $2 AND player_id = $3",
        [groupId, req.params.id, playerId],
      );
      res.json({ success: true, message: "Player assigned to group" });
    } catch (err) {
      res.status(500).json({ error: "Failed to assign player to group" });
    }
  },
);

/**
 * @route   POST /api/events/:id/bibs
 * @desc    Assign a numbered bib/color to a player
 */
router.post(
  "/:id/bibs",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const { playerId, bibNumber, bibColor } = req.body;
    try {
      const result = await query(
        `
                INSERT INTO camp_bibs (event_id, player_id, bib_number, bib_color)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (event_id, bib_number) 
                DO UPDATE SET player_id = $2, bib_color = $4 
                RETURNING *
            `,
        [req.params.id, playerId, bibNumber, bibColor],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to assign bib" });
    }
  },
);

/**
 * @route   GET /api/events/:id/export
 * @desc    Export camp attendee list as CSV
 */
router.get("/:id/export", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `
            SELECT 
                u.first_name, 
                u.last_name, 
                u.email, 
                p.date_of_birth,
                p.emergency_contact_phone,
                cg.name as group_name,
                cb.bib_number,
                cb.bib_color
            FROM event_players ep
            JOIN players p ON ep.player_id = p.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN camp_groups cg ON ep.group_id = cg.id
            LEFT JOIN camp_bibs cb ON (cb.event_id = ep.event_id AND cb.player_id = ep.player_id)
            WHERE ep.event_id = $1
            ORDER BY u.last_name, u.first_name
        `,
      [req.params.id],
    );

    const data = result.rows;
    if (data.length === 0) {
      return res.status(404).json({ error: "No attendees found for export" });
    }

    // Manual CSV Generation
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "DOB",
      "Emergency Contact",
      "Group",
      "Bib #",
      "Bib Color",
    ];
    let csv = headers.join(",") + "\n";

    data.forEach((row) => {
      csv +=
        [
          `"${row.first_name}"`,
          `"${row.last_name}"`,
          `"${row.email}"`,
          `"${row.date_of_birth || ""}"`,
          `"${row.emergency_contact_phone || ""}"`,
          `"${row.group_name || "Unassigned"}"`,
          `"${row.bib_number || ""}"`,
          `"${row.bib_color || ""}"`,
        ].join(",") + "\n";
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=camp_export_${req.params.id}.csv`,
    );
    res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate export" });
  }
});

/**
 * @route   POST /api/events/:id/checkin
 * @desc    Check-in a player (manual or via QR)
 */
router.post("/:id/checkin", authenticateToken, async (req, res) => {
  const { playerId, method, lat, lng } = req.body;
  const eventId = req.params.id;

  try {
    // 1. Get user_id for the player
    const playerRes = await query("SELECT user_id FROM players WHERE id = $1", [
      playerId,
    ]);
    if (playerRes.rows.length === 0)
      return res.status(404).json({ error: "Player not found" });
    const userId = playerRes.rows[0].user_id;

    // 2. Record check-in
    await query(
      `
            INSERT INTO event_checkins (event_id, user_id, checkin_method, location_lat, location_lng)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING
        `,
      [eventId, userId, method || "manual", lat || null, lng || null],
    );

    res.json({ success: true, message: "Check-in successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Check-in failed" });
  }
});

module.exports = router;
