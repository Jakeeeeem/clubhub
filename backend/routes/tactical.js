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

// Save a formation or animated session plan
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { 
      organization_id, 
      team_id, 
      name, 
      formation, 
      lineup, 
      is_default,
      isAnimation,
      framesData 
    } = req.body;
    
    const coach_id = req.user.id;

    // Handle potential ID from frontend if updating an existing one
    const id = req.body.id;

    let query;
    let params;

    if (id) {
        query = `
            UPDATE tactical_formations SET
                name = $1,
                formation = $2,
                lineup = $3,
                is_default = $4,
                is_animation = $5,
                frames_data = $6,
                updated_at = NOW()
            WHERE id = $7 AND coach_id = $8
            RETURNING *
        `;
        params = [
            name,
            formation || null,
            lineup ? JSON.stringify(lineup) : null,
            is_default || false,
            isAnimation || false,
            framesData ? JSON.stringify(framesData) : null,
            id,
            coach_id
        ];
    } else {
        query = `
            INSERT INTO tactical_formations (
                organization_id, team_id, coach_id, name, formation, lineup, is_default, is_animation, frames_data
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        params = [
            organization_id,
           team_id,
           coach_id,
           name,
           formation || null,
           lineup ? JSON.stringify(lineup) : null,
           is_default || false,
           isAnimation || false,
           framesData ? JSON.stringify(framesData) : null
        ];
    }

    const result = await pool.query(query, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Save tactical plan error:", err);
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
