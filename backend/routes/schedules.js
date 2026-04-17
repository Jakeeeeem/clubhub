const express = require("express");
const { query } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
} = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const router = express.Router();

// Upload or create a schedule template
router.post(
  "/templates",
  authenticateToken,
  requireOrganization,
  [body("name").trim().notEmpty(), body("template").isObject()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { name, template } = req.body;
      const result = await query(
        "INSERT INTO schedule_templates (name, template_json, created_by) VALUES ($1,$2,$3) RETURNING *",
        [name, JSON.stringify(template), req.user.id],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Create schedule template error:", err);
      res.status(500).json({ error: "Failed to create schedule template" });
    }
  },
);

// List templates
router.get(
  "/templates",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const result = await query(
        "SELECT * FROM schedule_templates ORDER BY created_at DESC",
      );
      res.json(result.rows);
    } catch (err) {
      console.error("List schedule templates error:", err);
      res.status(500).json({ error: "Failed to list templates" });
    }
  },
);

// Apply template to a tournament (simple import)
router.post(
  "/apply/:tournamentId/:templateId",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { tournamentId, templateId } = req.params;
      const t = await query(
        "SELECT template_json FROM schedule_templates WHERE id = $1",
        [templateId],
      );
      if (t.rows.length === 0)
        return res.status(404).json({ error: "Template not found" });
      const template = t.rows[0].template_json;

      // For now, store template application record; actual schedule generation may be separate
      const result = await query(
        "INSERT INTO schedule_applications (tournament_id, template_id, applied_by, template_snapshot) VALUES ($1,$2,$3,$4) RETURNING *",
        [tournamentId, templateId, req.user.id, JSON.stringify(template)],
      );
      res.json({ success: true, application: result.rows[0] });
    } catch (err) {
      console.error("Apply schedule template error:", err);
      res.status(500).json({ error: "Failed to apply template" });
    }
  },
);

module.exports = router;
