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
