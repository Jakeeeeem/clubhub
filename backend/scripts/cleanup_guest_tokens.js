const { pool } = require("../config/database");

async function cleanupExpiredGuestTokens() {
  try {
    const res = await pool.query(
      `DELETE FROM venue_bookings WHERE guest_token_expires_at IS NOT NULL AND guest_token_expires_at < NOW()`,
    );
    console.log(
      `Cleanup complete. Removed ${res.rowCount} expired guest tokens.`,
    );
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanupExpiredGuestTokens();
}

module.exports = cleanupExpiredGuestTokens;
