const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { query, withTransaction, queries } = require("../config/database");
const emailService = require("../services/email-service");

// Generic form webhook ingestion endpoint
// Accepts payloads from third-party form builders (Jotform-like)
// Expected body: { provider, formId, formName, mappedTo, formData: { email, firstName, lastName, phone, dateOfBirth, coverLetter, listingId, teamId, clubId, position } }
router.post("/webhook", async (req, res) => {
  try {
    const secret = process.env.FORM_WEBHOOK_SECRET;

    // Optional HMAC verification: header 'x-form-signature' is HMAC-SHA256 of JSON.stringify(body)
    const signature =
      req.headers["x-form-signature"] || req.headers["x-hook-signature"];
    if (secret && signature) {
      try {
        const hmac = crypto.createHmac("sha256", secret);
        const raw = JSON.stringify(req.body || {});
        hmac.update(raw);
        const expected = hmac.digest("hex");
        if (expected !== signature) {
          return res.status(401).json({ error: "Invalid signature" });
        }
      } catch (err) {
        console.warn("Form webhook signature check failed:", err.message);
      }
    }

    const { provider, formId, formName, mappedTo, formData } = req.body;

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ error: "Missing formData object" });
    }

    const email = (formData.email || "").toLowerCase().trim();
    const firstName =
      formData.firstName || formData.firstname || formData.name || "";
    const lastName = formData.lastName || formData.lastname || "";

    // Use a transaction to create user/player/application atomically
    const result = await withTransaction(async (client) => {
      let userId = null;
      // If email provided, try to find existing user
      if (email) {
        const existing = await client.query(queries.findUserByEmail, [email]);
        if (existing.rows.length > 0) {
          userId = existing.rows[0].id;
        } else {
          // Create a lightweight user (admin will ask them to set password)
          const tempPassword = crypto.randomBytes(16).toString("hex");
          const passwordHash = await bcrypt.hash(tempPassword, 12);
          const newUser = await client.query(queries.createUser, [
            email,
            passwordHash,
            firstName || "",
            lastName || "",
            "adult",
            [],
          ]);
          userId = newUser.rows[0].id;

          // Send admin welcome to allow them to set password (best-effort)
          try {
            const setPasswordLink = `${process.env.FRONTEND_URL || "http://localhost:8000"}/set-password?email=${encodeURIComponent(
              email,
            )}`;
            await emailService.sendAdminWelcomeEmail({
              email,
              firstName: firstName || "",
              accountType: "adult",
              setPasswordLink,
            });
          } catch (mailErr) {
            console.warn(
              "Failed to send admin welcome after form webhook:",
              mailErr.message,
            );
          }
        }
      }

      // Optionally create a player record if DOB present or mappedTo == 'player'
      let playerId = null;
      if (
        formData.dateOfBirth ||
        mappedTo === "player" ||
        formData.createPlayer === true
      ) {
        const dob = formData.dateOfBirth || null;
        const phone = formData.phone || null;
        const position = formData.position || null;
        const clubId = formData.clubId || formData.club_id || null;

        const createdPlayer = await client.query(queries.createPlayer, [
          firstName || "",
          lastName || "",
          email || null,
          phone,
          dob,
          position,
          clubId,
          0,
        ]);
        playerId = createdPlayer.rows[0].id;

        // Link user to player if both exist
        if (userId) {
          try {
            await client.query(
              "UPDATE players SET user_id = $1 WHERE id = $2",
              [userId, playerId],
            );
          } catch (err) {
            console.warn("Could not link user to player:", err.message);
          }
        }
      }

      // If mapped to listing application or listingId provided, create application
      if (
        mappedTo === "listing_application" ||
        formData.listingId ||
        formData.listing_id
      ) {
        const listingId = formData.listingId || formData.listing_id;
        if (!listingId) {
          throw new Error("listingId required for listing_application mapping");
        }

        const coverLetter =
          formData.coverLetter || formData.message || formData.notes || null;
        const appData = { provider, formId, formName, raw: formData };

        const insertApp = await client.query(
          `INSERT INTO listing_applications (listing_id, applicant_id, player_id, cover_letter, application_data)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [listingId, userId, playerId, coverLetter, JSON.stringify(appData)],
        );

        // Notify listing owner (best-effort)
        try {
          const listingRes = await client.query(
            "SELECT club_id, title FROM listings WHERE id = $1",
            [listingId],
          );
          if (listingRes.rows.length > 0) {
            const clubId = listingRes.rows[0].club_id;
            const clubRes = await client.query(
              "SELECT owner_id, name FROM clubs WHERE id = $1",
              [clubId],
            );
            if (clubRes.rows.length > 0) {
              const ownerId = clubRes.rows[0].owner_id;
              const owner = await client.query(
                "SELECT email, first_name FROM users WHERE id = $1",
                [ownerId],
              );
              if (owner.rows.length > 0) {
                const ownerEmail = owner.rows[0].email;
                const ownerFirst = owner.rows[0].first_name;
                // Create an in-app notification
                await client.query(
                  `INSERT INTO notifications (user_id, title, message, notification_type, action_url)
                   VALUES ($1,$2,$3,$4,$5)`,
                  [
                    ownerId,
                    `New Listing Application`,
                    `${firstName || "Someone"} ${lastName || ""} applied to ${listingRes.rows[0].title}`,
                    "listing_application",
                    `/listings/${listingId}/applications`,
                  ],
                );

                // Send email to owner
                try {
                  await emailService.sendEmail({
                    to: ownerEmail,
                    subject: `New application for ${listingRes.rows[0].title}`,
                    html: `<p>Hi ${ownerFirst || ""},</p><p>${firstName || "Someone"} applied to your listing <strong>${listingRes.rows[0].title}</strong>. View applications: ${process.env.FRONTEND_URL || "http://localhost:8000"}/listings/${listingId}/applications</p>`,
                    text: `${firstName || "Someone"} applied to your listing ${listingRes.rows[0].title}`,
                  });
                } catch (mailErr) {
                  console.warn(
                    "Failed to email listing owner after form webhook:",
                    mailErr.message,
                  );
                }
              }
            }
          }
        } catch (notifyErr) {
          console.warn("Failed to notify listing owner:", notifyErr.message);
        }

        return { type: "listing_application", application: insertApp.rows[0] };
      }

      // If mappedTo team and teamId provided, optionally add player to team
      if (
        (mappedTo === "team_player" || formData.teamId || formData.team_id) &&
        playerId
      ) {
        const teamId = formData.teamId || formData.team_id;
        if (teamId) {
          await client.query(
            `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [teamId, playerId],
          );
          return { type: "team_player", teamId, playerId };
        }
      }

      return { type: "generic", userId, playerId };
    });

    res.status(201).json({ success: true, result });
  } catch (error) {
    console.error("Form webhook ingestion error:", error);
    res
      .status(500)
      .json({
        error: "Failed to ingest form submission",
        message: error.message,
      });
  }
});

module.exports = router;
const express = require("express");
const { query, withTransaction } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
  optionalAuth,
} = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();

const ALLOWED_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "email",
  "phone",
  "select",
  "multiselect",
  "checkbox",
  "textarea",
  "file",
];

/* =========================================================
   ADMIN ROUTES — create / manage forms
   ========================================================= */

// POST /api/forms — create a new form with fields
router.post(
  "/",
  authenticateToken,
  requireOrganization,
  [
    body("title")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Form title is required"),
    body("fields")
      .isArray({ min: 1 })
      .withMessage("At least one field is required"),
    body("fields.*.label")
      .notEmpty()
      .withMessage("Every field must have a label"),
    body("fields.*.fieldType")
      .isIn(ALLOWED_FIELD_TYPES)
      .withMessage("Invalid field type"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
    }

    const { title, description, fields } = req.body;

    try {
      // Resolve org from the authenticated user
      const orgResult = await query(
        "SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1",
        [req.user.id],
      );
      if (orgResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "No organization found for this user" });
      }
      const organizationId = orgResult.rows[0].id;

      let form;
      await withTransaction(async (client) => {
        // Insert form header
        const formResult = await client.query(
          `INSERT INTO custom_forms (organization_id, title, description, is_active)
           VALUES ($1, $2, $3, TRUE) RETURNING *`,
          [organizationId, title, description || null],
        );
        form = formResult.rows[0];

        // Insert fields in order
        for (let i = 0; i < fields.length; i++) {
          const {
            label,
            fieldType,
            isRequired = false,
            options = null,
          } = fields[i];
          await client.query(
            `INSERT INTO custom_form_fields (form_id, label, field_type, is_required, options, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              form.id,
              label,
              fieldType,
              isRequired,
              options ? JSON.stringify(options) : null,
              i,
            ],
          );
        }
      });

      // Return full form with fields
      const fieldsResult = await query(
        "SELECT * FROM custom_form_fields WHERE form_id = $1 ORDER BY sort_order",
        [form.id],
      );

      res.status(201).json({ form: { ...form, fields: fieldsResult.rows } });
    } catch (error) {
      console.error("Create form error:", error);
      res
        .status(500)
        .json({ error: "Failed to create form", message: error.message });
    }
  },
);

// GET /api/forms — list all forms for this org
router.get("/", authenticateToken, requireOrganization, async (req, res) => {
  try {
    const orgResult = await query(
      "SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1",
      [req.user.id],
    );
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: "No organization found" });
    }
    const organizationId = orgResult.rows[0].id;

    const result = await query(
      `SELECT f.*,
              COUNT(r.id)::int AS response_count
       FROM custom_forms f
       LEFT JOIN custom_form_responses r ON r.form_id = f.id
       WHERE f.organization_id = $1
       GROUP BY f.id
       ORDER BY f.created_at DESC`,
      [organizationId],
    );

    res.json({ forms: result.rows });
  } catch (error) {
    console.error("List forms error:", error);
    res.status(500).json({ error: "Failed to fetch forms" });
  }
});

// GET /api/forms/:id — get a single form + its fields (used to render the form)
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const formResult = await query(
      "SELECT * FROM custom_forms WHERE id = $1 AND is_active = TRUE",
      [req.params.id],
    );
    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: "Form not found" });
    }
    const form = formResult.rows[0];

    const fieldsResult = await query(
      "SELECT * FROM custom_form_fields WHERE form_id = $1 ORDER BY sort_order",
      [form.id],
    );

    res.json({ form: { ...form, fields: fieldsResult.rows } });
  } catch (error) {
    console.error("Get form error:", error);
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

// PUT /api/forms/:id — update form title/description/active status
router.put("/:id", authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { title, description, isActive } = req.body;

    // Verify ownership
    const check = await query(
      `SELECT f.id FROM custom_forms f
         JOIN organizations o ON o.id = f.organization_id
         WHERE f.id = $1 AND o.owner_id = $2`,
      [req.params.id, req.user.id],
    );
    if (check.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Not authorised to edit this form" });
    }

    const result = await query(
      `UPDATE custom_forms SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
         WHERE id = $4 RETURNING *`,
      [title || null, description || null, isActive ?? null, req.params.id],
    );

    res.json({ form: result.rows[0] });
  } catch (error) {
    console.error("Update form error:", error);
    res.status(500).json({ error: "Failed to update form" });
  }
});

// DELETE /api/forms/:id — soft-delete (deactivate)
router.delete(
  "/:id",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const check = await query(
        `SELECT f.id FROM custom_forms f
       JOIN organizations o ON o.id = f.organization_id
       WHERE f.id = $1 AND o.owner_id = $2`,
        [req.params.id, req.user.id],
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ error: "Not authorised" });
      }

      await query(
        "UPDATE custom_forms SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
        [req.params.id],
      );

      res.json({ message: "Form deactivated" });
    } catch (error) {
      console.error("Delete form error:", error);
      res.status(500).json({ error: "Failed to delete form" });
    }
  },
);

/* =========================================================
   SUBMISSION ROUTES — public or player-facing
   ========================================================= */

// POST /api/forms/:id/submit — submit a response
router.post("/:id/submit", optionalAuth, async (req, res) => {
  try {
    const formResult = await query(
      "SELECT * FROM custom_forms WHERE id = $1 AND is_active = TRUE",
      [req.params.id],
    );
    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: "Form not found or inactive" });
    }

    const form = formResult.rows[0];

    // Validate required fields
    const fieldsResult = await query(
      "SELECT * FROM custom_form_fields WHERE form_id = $1 AND is_required = TRUE",
      [form.id],
    );
    const requiredLabels = fieldsResult.rows.map((f) => f.label);
    const responseData = req.body.responseData || {};
    const missing = requiredLabels.filter((label) => !responseData[label]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missing,
      });
    }

    const eventId = req.body.eventId || null;
    const userId = req.user ? req.user.id : null;

    const result = await query(
      `INSERT INTO custom_form_responses (form_id, user_id, event_id, response_data)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [form.id, userId, eventId, JSON.stringify(responseData)],
    );

    res.status(201).json({
      message: "Response submitted successfully",
      response: result.rows[0],
    });
  } catch (error) {
    console.error("Submit form error:", error);
    res.status(500).json({ error: "Failed to submit form" });
  }
});

/* =========================================================
   RESPONSES — admin view submissions
   ========================================================= */

// GET /api/forms/:id/responses — get all submissions for a form
router.get(
  "/:id/responses",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      // Verify ownership
      const check = await query(
        `SELECT f.id FROM custom_forms f
       JOIN organizations o ON o.id = f.organization_id
       WHERE f.id = $1 AND o.owner_id = $2`,
        [req.params.id, req.user.id],
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ error: "Not authorised" });
      }

      const result = await query(
        `SELECT r.*,
              u.first_name, u.last_name, u.email,
              e.title as event_title
       FROM custom_form_responses r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN events e ON e.id = r.event_id
       WHERE r.form_id = $1
       ORDER BY r.submitted_at DESC`,
        [req.params.id],
      );

      res.json({ responses: result.rows, total: result.rows.length });
    } catch (error) {
      console.error("Get responses error:", error);
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  },
);

module.exports = router;

// Jotform webhook receiver
// POST /api/forms/jotform-webhook?formId=<form_uuid>
router.post("/jotform-webhook", async (req, res) => {
  try {
    const formId = req.query.formId;
    if (!formId) {
      return res.status(400).json({ error: "Missing formId query parameter" });
    }

    // Jotform posts can be complex; we will accept either a `submission` object
    // or a flat key->value map in the body. We'll store the payload as response_data.
    const payload = req.body || {};

    // Ensure form exists and belongs to an org (but webhook must be open)
    const formCheck = await query("SELECT id FROM custom_forms WHERE id = $1", [
      formId,
    ]);
    if (formCheck.rows.length === 0) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Normalize response data: if body.submission exists, use it; else use body
    const responseData = payload.submission || payload || {};

    await query(
      `INSERT INTO custom_form_responses (form_id, user_id, event_id, response_data)
       VALUES ($1, $2, $3, $4)`,
      [formId, null, null, JSON.stringify(responseData)],
    );

    // Respond quickly to Jotform
    res.json({ success: true });
  } catch (error) {
    console.error("Jotform webhook error:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});
