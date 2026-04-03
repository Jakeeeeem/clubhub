const { query } = require("../config/database");
const emailService = require("./email-service");

/**
 * Checks for upcoming events and sends reminders based on the notification schedule.
 */
async function checkEventReminders() {
  console.log("🔔 Checking for scheduled notifications...");
  try {
    // 1. Get pending notifications that are due
    const result = await query(`
      SELECT 
        sn.id as notification_id,
        sn.notification_type,
        sn.scheduled_at,
        e.id as event_id,
        e.title,
        e.event_date,
        e.event_time,
        e.location,
        e.club_id,
        e.team_id,
        t.name as team_name,
        c.name as club_name
      FROM scheduled_notifications sn
      JOIN events e ON sn.event_id = e.id
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN organizations c ON e.club_id = c.id
      WHERE sn.status = 'pending' 
        AND sn.scheduled_at <= NOW()
    `);

    const notifications = result.rows;
    if (notifications.length === 0) {
      console.log("✅ No pending notifications due at this time.");
      return;
    }

    console.log(`📡 Found ${notifications.length} notifications to process.`);

    for (const notif of notifications) {
      try {
        // Get recipients
        let recipients = [];

        // Priority 1: Specific Assignments
        const assignedResult = await query(
          `
          SELECT u.email, u.first_name 
          FROM event_invitations ep 
          JOIN players p ON ep.player_id = p.id 
          JOIN users u ON p.user_id = u.id 
          WHERE ep.event_id = $1
        `,
          [notif.event_id],
        );

        if (assignedResult.rows.length > 0) {
          recipients = assignedResult.rows;
        } else if (notif.team_id) {
          // Priority 2: All team members
          const teamResult = await query(
            `
            SELECT u.email, u.first_name 
            FROM team_players tp 
            JOIN players p ON tp.player_id = p.id 
            JOIN users u ON p.user_id = u.id 
            WHERE tp.team_id = $1
          `,
            [notif.team_id],
          );
          recipients = teamResult.rows;
        }

        if (recipients.length > 0) {
          // Determine the lead time for display (optional, could be passed in payload)
          // For now, we'll try to derive it from scheduled_at vs event_date or just use a generic term
          const eventDate = new Date(notif.event_date);
          const scheduledAt = new Date(notif.scheduled_at);
          const diffDays = Math.round((eventDate - scheduledAt) / (1000 * 60 * 60 * 24));
          const humanLeadTime = diffDays > 0 ? `${diffDays} days` : "upcoming";

          for (const recipient of recipients) {
            await emailService.sendEventReminderEmail({
              email: recipient.email,
              firstName: recipient.first_name,
              eventTitle: notif.title,
              eventDate: notif.event_date,
              eventTime: notif.event_time,
              location: notif.location,
              teamName: notif.team_name || "the team",
              clubName: notif.club_name || "ClubHub",
              leadTime: humanLeadTime,
            });
          }

          // Mark as sent
          await query(
            "UPDATE scheduled_notifications SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1",
            [notif.notification_id],
          );
          console.log(`✅ Sent notification ${notif.notification_id} for event: ${notif.title}`);
        } else {
          // No recipients found, mark as failed or just skip
          await query(
            "UPDATE scheduled_notifications SET status = 'failed', error_message = 'No recipients found', updated_at = NOW() WHERE id = $1",
            [notif.notification_id],
          );
          console.warn(`⚠️ No recipients for notification ${notif.notification_id}`);
        }
      } catch (notifError) {
        console.error(`❌ Failed to process notification ${notif.notification_id}:`, notifError);
        await query(
          "UPDATE scheduled_notifications SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $1",
          [notifError.message, notif.notification_id],
        ).catch(err => console.error("Critical: Failed to log failure:", err));
      }
    }
  } catch (error) {
    console.error("❌ Notification service error:", error);
  }
}

/**
 * Starts the notification scheduler.
 */
function startNotificationScheduler() {
  console.log("⏰ Starting event notification scheduler...");
  // Check once on startup
  checkEventReminders().catch((err) =>
    console.error("Initial reminder check failed:", err),
  );

  // Re-run every 15 minutes (more responsive for game day reminders)
  setInterval(checkEventReminders, 1000 * 60 * 15);
}

module.exports = { startNotificationScheduler, checkEventReminders };
