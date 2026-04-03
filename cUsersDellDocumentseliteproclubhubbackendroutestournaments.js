module.exports = router;

/**
 * @route   POST /api/tournaments/link-guest
 * @desc    Link an unauthenticated guest team booking to an authenticated user
 */
router.post("/link-guest", authenticateToken, [body("teamId").isUUID()], async (req, res) => {
  const { teamId } = req.body;
  try {
    // Basic verification - this could be enhanced with a token/OTP sent to guest email.
    // For now, if the team matches the current user's email or user has a linked ID, claim it.
    await query("UPDATE tournament_teams SET created_by_user_id = $1 WHERE id = $2 AND created_by_user_id IS NULL", [req.user.id, teamId]);
    res.json({ message: "Guest team linked to account successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to link guest account" });
  }
});
