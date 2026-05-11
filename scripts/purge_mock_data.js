const { query, withTransaction } = require("../backend/config/database");

async function purgeMockData() {
  console.log("🧹 Starting database purge...");
  
  const keepEmail = "instantonlinesuccess@gmail.com";
  
  try {
    await withTransaction(async (client) => {
      // 1. Get user ID to keep
      const userRes = await client.query("SELECT id FROM users WHERE email = $1", [keepEmail]);
      const keepUserId = userRes.rows[0]?.id;
      
      if (!keepUserId) {
        console.warn(`⚠️ User ${keepEmail} not found. Purging everything except core users.`);
      }

      console.log("🗑️ Clearing events and tournament data...");
      await client.query("TRUNCATE tournament_match_events, tournament_matches, tournament_groups, tournament_stages, tournament_pitches, tournament_teams CASCADE");
      await client.query("TRUNCATE match_results, player_ratings, availability_responses, event_bookings, event_players, event_invitations, event_checkins, event_reminder_log CASCADE");
      await client.query("DELETE FROM events");

      console.log("🗑️ Clearing training and activity data...");
      const tablesToCheck = ['drills', 'drill_submissions', 'drill_assignments', 'drill_reviews', 'player_skill_scores'];
      for (const table of tablesToCheck) {
        const tableExists = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", [table]);
        if (tableExists.rows[0].exists) {
          await client.query(`TRUNCATE ${table} CASCADE`);
        }
      }
      await client.query("TRUNCATE player_activities, player_history CASCADE");

      console.log("🗑️ Clearing listings and applications...");
      await client.query("TRUNCATE listing_applications, listings, club_applications CASCADE");

      console.log("🗑️ Clearing commerce and plans...");
      await client.query("TRUNCATE product_orders, products, player_plans, payments, plans CASCADE");

      console.log("🗑️ Clearing communication and other...");
      await client.query("TRUNCATE messages, notifications, invitations, scheduled_notifications, polls, poll_votes CASCADE");
      await client.query("TRUNCATE venue_bookings, venue_checkins, venue_availability, venues CASCADE");
      await client.query("TRUNCATE bibs, bib_inventory, camp_bibs, camp_groups CASCADE");
      await client.query("TRUNCATE scout_reports, scout_assignments, scout_contact_requests, scout_verification_requests CASCADE");
      await client.query("TRUNCATE documents, user_preferences, custom_form_responses, custom_form_fields, custom_forms CASCADE");

      console.log("🗑️ Clearing staff, players, and teams...");
      await client.query("TRUNCATE team_players, team_coaches, staff, players, teams CASCADE");

      console.log("🗑️ Clearing organizations...");
      if (keepUserId) {
        await client.query("DELETE FROM organization_members WHERE user_id != $1", [keepUserId]);
        await client.query("DELETE FROM organizations WHERE owner_id != $1", [keepUserId]);
        await client.query("DELETE FROM users WHERE id != $1 AND email NOT IN ('admin@clubhub.com', 'superadmin@clubhub.com')", [keepUserId]);
      } else {
        await client.query("TRUNCATE organization_members, organizations CASCADE");
      }

      console.log("✅ Purge complete!");
    });
  } catch (error) {
    console.error("❌ Purge failed:", error.message);
    process.exit(1);
  }
}

purgeMockData().then(() => process.exit(0));
