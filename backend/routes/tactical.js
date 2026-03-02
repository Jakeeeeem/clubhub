const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const pool = new Pool(); // or your custom pool config
const { authenticateToken } = require("../middleware/auth");

// Get all formations for a team/organization
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { organization_id, team_id } = req.query;
    let query = "SELECT * FROM tactical_formations WHERE organization_id = $1";
    let params = [organization_id];

    if (team_id) {
      query += " AND team_id = $2";
      params.push(team_id);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a formation
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { organization_id, team_id, name, formation, lineup, is_default } =
      req.body;
    const coach_id = req.user.id;

    const query = `
            INSERT INTO tactical_formations (organization_id, team_id, coach_id, name, formation, lineup, is_default)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                formation = EXCLUDED.formation,
                lineup = EXCLUDED.lineup,
                is_default = EXCLUDED.is_default,
                updated_at = NOW()
            RETURNING *
        `;

    const result = await pool.query(query, [
      organization_id,
      team_id,
      coach_id,
      name,
      formation,
      lineup,
      is_default || false,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a formation
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM tactical_formations WHERE id = $1 AND coach_id = $2",
      [req.params.id, req.user.id],
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
