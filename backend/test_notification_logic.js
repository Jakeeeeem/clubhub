require("dotenv").config();
const { query, pool } = require("./config/database");
const { checkEventReminders } = require("./services/notification-service");

async function test() {
  console.log("🧪 Starting Notification Logic Test...");
  try {
    // 1. Create a mock event
    const eventRes = await query(`
      INSERT INTO events (title, event_type, event_date, event_time, club_id, created_by)
      VALUES ($1, $2, CURRENT_DATE + INTERVAL '7 days', '10:00', 
              (SELECT id FROM organizations LIMIT 1), 
              (SELECT id FROM users LIMIT 1))
      RETURNING id
    `, ['Test Notification Event', 'match']);
    
    const eventId = eventRes.rows[0].id;
    console.log(`✅ Created test event: ${eventId}`);

    // 2. Insert a pending notification scheduled for "now"
    const notifRes = await query(`
      INSERT INTO scheduled_notifications (event_id, notification_type, scheduled_at, status)
      VALUES ($1, $2, NOW() - INTERVAL '1 minute', 'pending')
      RETURNING id
    `, [eventId, 'reminder']);
    
    const notifId = notifRes.rows[0].id;
    console.log(`✅ Created test notification: ${notifId}`);

    // 3. Run the service check
    console.log("🏃 Running checkEventReminders...");
    await checkEventReminders();

    // 4. Verify status change
    const verifyRes = await query(
      "SELECT status, sent_at, error_message FROM scheduled_notifications WHERE id = $1",
      [notifId]
    );
    
    const result = verifyRes.rows[0];
    console.log("📊 Result:", result);

    if (result.status === 'sent' || (result.status === 'failed' && result.error_message === 'No recipients found')) {
      console.log("✨ TEST PASSED (status changed correctly)");
    } else {
      console.error("❌ TEST FAILED (status is still pending)");
    }

    // Cleanup
    await query("DELETE FROM scheduled_notifications WHERE event_id = $1", [eventId]);
    await query("DELETE FROM events WHERE id = $1", [eventId]);
    console.log("🧹 Cleanup complete.");

  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    await pool.end();
  }
}

test();
