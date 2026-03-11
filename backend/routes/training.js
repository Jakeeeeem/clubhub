/**
 * Training & Drills API Routes
 * ClubHub - /api/training
 *
 * Covers:
 *  - Drill Library (CRUD by coaches)
 *  - Drill Assignments (assign to player/team)
 *  - Player Submissions (upload attempt)
 *  - Coach Reviews (feedback + score)
 *  - Player Skill Scores
 */

const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────
//  DRILL LIBRARY
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/training/drills
 * Get all drills for the current user's org
 */
router.get("/drills", authenticateToken, async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    const orgId = req.user.currentOrgId || req.user.org_id;

    let whereClauses = ["d.org_id = $1", "d.is_active = true"];
    let params = [orgId];

    if (category) {
      params.push(category);
      whereClauses.push(`d.category = $${params.length}`);
    }
    if (difficulty) {
      params.push(difficulty);
      whereClauses.push(`d.difficulty = $${params.length}`);
    }

    const result = await pool.query(
      `
      SELECT 
        d.*,
        u.first_name || ' ' || u.last_name AS coach_name,
        (SELECT COUNT(*) FROM drill_submissions ds WHERE ds.drill_id = d.id) AS submission_count
      FROM drills d
      LEFT JOIN users u ON u.id = d.coach_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY d.created_at DESC
    `,
      params,
    );

    res.json({ success: true, drills: result.rows });
  } catch (err) {
    console.error("❌ GET /training/drills:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/training/drills
 * Coach creates a new drill
 */
router.post("/drills", authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      demo_video_url,
      category,
      difficulty,
      duration_minutes,
      required_equipment,
    } = req.body;

    const orgId = req.user.currentOrgId || req.user.org_id;
    const coachId = req.user.id;

    if (!title)
      return res.status(400).json({ error: "Drill title is required" });

    const result = await pool.query(
      `
      INSERT INTO drills 
        (org_id, coach_id, title, description, demo_video_url, category, difficulty, duration_minutes, required_equipment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        orgId,
        coachId,
        title,
        description,
        demo_video_url,
        category || "General",
        difficulty || "Beginner",
        duration_minutes || 10,
        required_equipment,
      ],
    );

    res.status(201).json({ success: true, drill: result.rows[0] });
  } catch (err) {
    console.error("❌ POST /training/drills:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/training/drills/:id
 * Get a single drill with its assignments and submission count
 */
router.get("/drills/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const drill = await pool.query(
      `
      SELECT d.*, u.first_name || ' ' || u.last_name AS coach_name
      FROM drills d
      LEFT JOIN users u ON u.id = d.coach_id
      WHERE d.id = $1
    `,
      [id],
    );

    if (!drill.rows.length)
      return res.status(404).json({ error: "Drill not found" });

    const submissions = await pool.query(
      `
      SELECT ds.*, p.first_name, p.last_name, p.avatar_url
      FROM drill_submissions ds
      JOIN players p ON p.id = ds.player_id
      WHERE ds.drill_id = $1
      ORDER BY ds.submitted_at DESC
    `,
      [id],
    );

    res.json({
      success: true,
      drill: drill.rows[0],
      submissions: submissions.rows,
    });
  } catch (err) {
    console.error("❌ GET /training/drills/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/training/drills/:id
 * Coach updates a drill
 */
router.put("/drills/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      demo_video_url,
      category,
      difficulty,
      duration_minutes,
      required_equipment,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE drills SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        demo_video_url = COALESCE($3, demo_video_url),
        category = COALESCE($4, category),
        difficulty = COALESCE($5, difficulty),
        duration_minutes = COALESCE($6, duration_minutes),
        required_equipment = COALESCE($7, required_equipment),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `,
      [
        title,
        description,
        demo_video_url,
        category,
        difficulty,
        duration_minutes,
        required_equipment,
        id,
      ],
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Drill not found" });
    res.json({ success: true, drill: result.rows[0] });
  } catch (err) {
    console.error("❌ PUT /training/drills/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/training/drills/:id
 * Soft-delete a drill
 */
router.delete("/drills/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE drills SET is_active = false WHERE id = $1", [id]);
    res.json({ success: true, message: "Drill archived" });
  } catch (err) {
    console.error("❌ DELETE /training/drills/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  DRILL ASSIGNMENTS
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/training/drills/:id/assign
 * Assign a drill to a player or team
 */
router.post("/drills/:id/assign", authenticateToken, async (req, res) => {
  try {
    const { id: drillId } = req.params;
    const { player_id, team_id, due_date } = req.body;
    const coachId = req.user.id;

    if (!player_id && !team_id) {
      return res
        .status(400)
        .json({ error: "Must assign to a player_id or team_id" });
    }

    // If assigning to a team, expand to individual players
    if (team_id) {
      const teamPlayers = await pool.query(
        "SELECT player_id FROM team_players WHERE team_id = $1",
        [team_id],
      );
      const insertPromises = teamPlayers.rows.map((row) =>
        pool.query(
          `
          INSERT INTO drill_assignments (drill_id, assigned_to_player_id, assigned_to_team_id, assigned_by_coach_id, due_date)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `,
          [drillId, row.player_id, team_id, coachId, due_date],
        ),
      );
      await Promise.all(insertPromises);
      return res
        .status(201)
        .json({
          success: true,
          message: `Drill assigned to ${teamPlayers.rows.length} team members`,
        });
    }

    // Single player assignment
    const result = await pool.query(
      `
      INSERT INTO drill_assignments (drill_id, assigned_to_player_id, assigned_by_coach_id, due_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [drillId, player_id, coachId, due_date],
    );

    res.status(201).json({ success: true, assignment: result.rows[0] });
  } catch (err) {
    console.error("❌ POST /training/drills/:id/assign:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/training/my-drills
 * Get drills assigned to the currently logged-in player
 */
router.get("/my-drills", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find player record for this user
    const playerRecord = await pool.query(
      "SELECT id FROM players WHERE user_id = $1 LIMIT 1",
      [userId],
    );

    if (!playerRecord.rows.length) {
      return res.json({ success: true, drills: [] });
    }

    const playerId = playerRecord.rows[0].id;

    const result = await pool.query(
      `
      SELECT 
        d.*,
        da.id AS assignment_id,
        da.due_date,
        da.status AS assignment_status,
        u.first_name || ' ' || u.last_name AS coach_name,
        (
          SELECT id FROM drill_submissions ds 
          WHERE ds.drill_id = d.id AND ds.player_id = $1
          ORDER BY ds.submitted_at DESC LIMIT 1
        ) AS my_submission_id,
        (
          SELECT status FROM drill_submissions ds 
          WHERE ds.drill_id = d.id AND ds.player_id = $1
          ORDER BY ds.submitted_at DESC LIMIT 1
        ) AS my_submission_status
      FROM drill_assignments da
      JOIN drills d ON d.id = da.drill_id
      LEFT JOIN users u ON u.id = d.coach_id
      WHERE da.assigned_to_player_id = $1 AND d.is_active = true
      ORDER BY da.due_date ASC NULLS LAST, da.created_at DESC
    `,
      [playerId],
    );

    res.json({ success: true, drills: result.rows });
  } catch (err) {
    console.error("❌ GET /training/my-drills:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  PLAYER SUBMISSIONS
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/training/submissions
 * Player uploads a drill attempt
 */
router.post("/submissions", authenticateToken, async (req, res) => {
  try {
    const { drill_id, assignment_id, video_url, photo_urls, player_notes } =
      req.body;
    const userId = req.user.id;

    if (!drill_id || !video_url) {
      return res
        .status(400)
        .json({ error: "drill_id and video_url are required" });
    }

    // Get player ID for this user
    const playerRecord = await pool.query(
      "SELECT id FROM players WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    if (!playerRecord.rows.length) {
      return res
        .status(404)
        .json({ error: "Player profile not found for this user" });
    }
    const playerId = playerRecord.rows[0].id;

    const result = await pool.query(
      `
      INSERT INTO drill_submissions (drill_id, assignment_id, player_id, video_url, photo_urls, player_notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [
        drill_id,
        assignment_id,
        playerId,
        video_url,
        JSON.stringify(photo_urls || []),
        player_notes,
      ],
    );

    // Update assignment status
    if (assignment_id) {
      await pool.query(
        `UPDATE drill_assignments SET status = 'completed' WHERE id = $1`,
        [assignment_id],
      );
    }

    // Generate a team feed activity
    await pool
      .query(
        `
      INSERT INTO player_activities (player_id, activity_type, description, metadata)
      VALUES ($1, 'drill_submitted', 'submitted a new drill attempt', $2)
    `,
        [
          playerId,
          JSON.stringify({ drill_id, submission_id: result.rows[0].id }),
        ],
      )
      .catch(() => {});

    res.status(201).json({ success: true, submission: result.rows[0] });
  } catch (err) {
    console.error("❌ POST /training/submissions:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/training/submissions
 * Coach gets all pending submissions to review (for their org)
 */
router.get("/submissions", authenticateToken, async (req, res) => {
  try {
    const { status, drill_id } = req.query;
    const orgId = req.user.currentOrgId || req.user.org_id;
    const coachId = req.user.id;

    let whereClauses = ["d.org_id = $1"];
    let params = [orgId];

    // By default coaches only see submissions for their drills
    if (req.user.role !== "admin" && req.user.role !== "owner") {
      params.push(coachId);
      whereClauses.push(`d.coach_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`ds.status = $${params.length}`);
    }
    if (drill_id) {
      params.push(drill_id);
      whereClauses.push(`ds.drill_id = $${params.length}`);
    }

    const result = await pool.query(
      `
      SELECT 
        ds.*,
        d.title AS drill_title,
        d.category AS drill_category,
        p.first_name, p.last_name, p.avatar_url,
        dr.score, dr.feedback, dr.improvement_focus, dr.reviewed_at
      FROM drill_submissions ds
      JOIN drills d ON d.id = ds.drill_id
      JOIN players p ON p.id = ds.player_id
      LEFT JOIN drill_reviews dr ON dr.submission_id = ds.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY ds.submitted_at DESC
    `,
      params,
    );

    res.json({ success: true, submissions: result.rows });
  } catch (err) {
    console.error("❌ GET /training/submissions:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  COACH REVIEWS
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/training/submissions/:id/review
 * Coach submits feedback and a score for a submission
 */
router.post("/submissions/:id/review", authenticateToken, async (req, res) => {
  try {
    const { id: submissionId } = req.params;
    const { score, feedback, improvement_focus } = req.body;
    const coachId = req.user.id;

    if (!score) return res.status(400).json({ error: "A score is required" });

    // Upsert the review
    const review = await pool
      .query(
        `
      INSERT INTO drill_reviews (submission_id, coach_id, score, feedback, improvement_focus)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (submission_id) DO UPDATE SET
        score = EXCLUDED.score,
        feedback = EXCLUDED.feedback,
        improvement_focus = EXCLUDED.improvement_focus,
        reviewed_at = NOW()
      RETURNING *
    `,
        [submissionId, coachId, score, feedback, improvement_focus],
      )
      .catch(async () => {
        // Fallback insert if ON CONFLICT doesn't work (no unique constraint)
        return pool.query(
          `
        INSERT INTO drill_reviews (submission_id, coach_id, score, feedback, improvement_focus)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
          [submissionId, coachId, score, feedback, improvement_focus],
        );
      });

    // Mark submission as reviewed
    await pool.query(
      `UPDATE drill_submissions SET status = 'reviewed' WHERE id = $1`,
      [submissionId],
    );

    // Update player skill scores based on the drill's category
    const subInfo = await pool.query(
      `
      SELECT ds.player_id, d.category
      FROM drill_submissions ds
      JOIN drills d ON d.id = ds.drill_id
      WHERE ds.id = $1
    `,
      [submissionId],
    );

    if (subInfo.rows.length) {
      const { player_id, category } = subInfo.rows[0];
      await updatePlayerSkillScore(player_id, category, score);
    }

    res.json({ success: true, review: review.rows[0] });
  } catch (err) {
    console.error("❌ POST /training/submissions/:id/review:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  PLAYER SKILL SCORES
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/training/skills/:playerId
 * Get a player's skill score breakdown
 */
router.get("/skills/:playerId", authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.params;

    let result = await pool.query(
      "SELECT * FROM player_skill_scores WHERE player_id = $1",
      [playerId],
    );

    if (!result.rows.length) {
      // Create default profile
      const inserted = await pool.query(
        `
        INSERT INTO player_skill_scores (player_id) VALUES ($1) RETURNING *
      `,
        [playerId],
      );
      result = { rows: inserted.rows };
    }

    // Also get drill completion history
    const history = await pool.query(
      `
      SELECT d.title, d.category, dr.score, dr.feedback, ds.submitted_at
      FROM drill_submissions ds
      JOIN drills d ON d.id = ds.drill_id
      LEFT JOIN drill_reviews dr ON dr.submission_id = ds.id
      WHERE ds.player_id = $1
      ORDER BY ds.submitted_at DESC
      LIMIT 20
    `,
      [playerId],
    );

    res.json({ success: true, skills: result.rows[0], history: history.rows });
  } catch (err) {
    console.error("❌ GET /training/skills/:playerId:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/training/team-progress/:teamId
 * Coach gets all players' skill scores and completed drills in a team
 */
router.get("/team-progress/:teamId", authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        p.id AS player_id,
        p.first_name, p.last_name, p.avatar_url,
        pss.ball_control, pss.passing, pss.shooting, pss.agility, pss.fitness,
        (SELECT COUNT(*) FROM drill_submissions ds WHERE ds.player_id = p.id AND ds.status = 'reviewed') AS completed_drills,
        (SELECT AVG(dr.score) FROM drill_reviews dr 
         JOIN drill_submissions ds2 ON ds2.id = dr.submission_id 
         WHERE ds2.player_id = p.id) AS avg_score
      FROM team_players tp
      JOIN players p ON p.id = tp.player_id
      LEFT JOIN player_skill_scores pss ON pss.player_id = p.id
      WHERE tp.team_id = $1
      ORDER BY p.last_name
    `,
      [teamId],
    );

    res.json({ success: true, players: result.rows });
  } catch (err) {
    console.error("❌ GET /training/team-progress/:teamId:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Incrementally update a player's skill score for a given category
 * based on a new coach score (1-10 scale → weighted towards 100)
 */
async function updatePlayerSkillScore(playerId, category, score) {
  const categoryToColumn = {
    "Ball Control": "ball_control",
    Passing: "passing",
    Shooting: "shooting",
    Fitness: "fitness",
    Goalkeeping: "goalkeeping",
    Tactics: "tactics",
    Agility: "agility",
  };

  const column = categoryToColumn[category];
  if (!column) return; // Unknown category, skip

  // Ensure player has a skill score row
  await pool.query(
    `
    INSERT INTO player_skill_scores (player_id) VALUES ($1)
    ON CONFLICT (player_id) DO NOTHING
  `,
    [playerId],
  );

  // Weighted incremental update (ELO-inspired): nudge score by 20% of the difference
  const scaledScore = Math.round((score / 10) * 100); // Convert 1-10 to 0-100
  await pool.query(
    `
    UPDATE player_skill_scores
    SET ${column} = LEAST(100, GREATEST(0, ROUND(${column} + ($1 - ${column}) * 0.2))),
        updated_at = NOW()
    WHERE player_id = $2
  `,
    [scaledScore, playerId],
  );
}

module.exports = router;
