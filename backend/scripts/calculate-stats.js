/**
 * Maintenance script to recalculate all player stats
 * Usage: node backend/scripts/calculate-stats.js [club_id]
 */
require('dotenv').config();
const { query, pool } = require('../config/database');
const StatsService = require('../services/stats-service');

async function run() {
  const clubId = process.argv[2];
  
  try {
    console.log("🚀 Starting global stats recalculation...");
    
    let players;
    if (clubId) {
      console.log(`📍 Filtering for club: ${clubId}`);
      const res = await query("SELECT id FROM players WHERE club_id = $1", [clubId]);
      players = res.rows;
    } else {
      console.log("📍 Processing ALL players in system");
      const res = await query("SELECT id FROM players");
      players = res.rows;
    }
    
    console.log(`📈 Found ${players.length} players to process.`);
    
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      process.stdout.write(`⏳ [${i+1}/${players.length}] Processing ${p.id}... `);
      await StatsService.updatePlayerStats(p.id);
      process.stdout.write("✅\n");
    }
    
    console.log("\n✨ Stats recalculation complete!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
