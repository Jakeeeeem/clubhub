require("dotenv").config();
const { pool } = require("../config/database");

async function checkDB() {
  try {
    try {
      const orgs = await pool.query("SELECT id, name FROM organizations");
      console.log("🏢 Organizations:", orgs.rows);
    } catch (e) {
      console.log("🏢 Organizations table MISSING or error:", e.message);
    }

    try {
      const clubs = await pool.query("SELECT id, name FROM clubs");
      console.log("♣️ Clubs:", clubs.rows);
    } catch (e) {
      console.log("♣️ Clubs table MISSING or error:", e.message);
    }

    try {
      const users = await pool.query("SELECT id, email FROM users");
      console.log("👤 Users:", users.rows);
    } catch (e) {
      console.log("👤 Users table MISSING or error:", e.message);
    }

    try {
      const members = await pool.query("SELECT * FROM organization_members");
      console.log("🔗 Org Members:", members.rows);
    } catch (e) {
      console.log("🔗 Org Members table MISSING or error:", e.message);
    }

  } catch (err) {
    console.error("❌ DB check CRITICAL failed:", err.message);
  } finally {
    await pool.end();
  }
}

checkDB();
