const express = require("express");
const { query } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
} = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const router = express.Router();

// Create pitch for a tournament
router.post(
  "/:tournamentId/pitches",
  authenticateToken,
  requireOrganization,
  [
    body("name").trim().notEmpty(),
    body("timeRanges")
      .isArray()
      .withMessage("timeRanges must be an array of {start,end}"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { tournamentId } = req.params;
      const { name, timeRanges } = req.body;

      const result = await query(
        `INSERT INTO tournament_pitches (tournament_id, name, time_ranges) VALUES ($1,$2,$3) RETURNING *`,
        [tournamentId, name, JSON.stringify(timeRanges)],
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Create pitch error:", err);
      res.status(500).json({ error: "Failed to create pitch" });
    }
  },
);

// List pitches
router.get("/:tournamentId/pitches", async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const result = await query(
      "SELECT * FROM tournament_pitches WHERE tournament_id = $1 ORDER BY name",
      [tournamentId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List pitches error:", err);
    res.status(500).json({ error: "Failed to list pitches" });
  }
});

// Update pitch
router.put(
  "/pitches/:id",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, timeRanges } = req.body;
      const result = await query(
        "UPDATE tournament_pitches SET name = COALESCE($1,name), time_ranges = COALESCE($2,time_ranges), updated_at = NOW() WHERE id = $3 RETURNING *",
        [name || null, timeRanges ? JSON.stringify(timeRanges) : null, id],
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "Pitch not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Update pitch error:", err);
      res.status(500).json({ error: "Failed to update pitch" });
    }
  },
);

// Delete pitch
router.delete(
  "/pitches/:id",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { id } = req.params;
      await query("DELETE FROM tournament_pitches WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete pitch error:", err);
      res.status(500).json({ error: "Failed to delete pitch" });
    }
  },
);

module.exports = router;
