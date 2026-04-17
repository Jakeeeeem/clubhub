const express = require("express");
const { query } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const router = express.Router();

// POST live match update (simple webhook-like endpoint)
router.post(
  "/matches/:id/update",
  authenticateToken,
  [body("state").isObject().withMessage("state must be an object")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { id } = req.params;
      const { state } = req.body;

      await query(
        "INSERT INTO match_live_updates (match_id, state, updated_by) VALUES ($1,$2,$3)",
        [id, JSON.stringify(state), req.user.id],
      );

      res.json({ success: true });
    } catch (err) {
      console.error("Live update error:", err);
      res.status(500).json({ error: "Failed to post live update" });
    }
  },
);

// GET printable layout stub for a match
router.get("/matches/:id/print", async (req, res) => {
  try {
    const { id } = req.params;
    // Return a basic printable layout JSON describing pitches and times for the match
    const layout = await query(
      "SELECT id, name, start_time, end_time FROM tournament_matches WHERE id = $1",
      [id],
    );
    if (layout.rows.length === 0)
      return res.status(404).json({ error: "Match not found" });
    res.json({ printable: { match: layout.rows[0], layout_version: 1 } });
  } catch (err) {
    console.error("Print layout error:", err);
    res.status(500).json({ error: "Failed to fetch printable layout" });
  }
});

module.exports = router;
