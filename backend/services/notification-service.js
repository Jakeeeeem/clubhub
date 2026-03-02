const { query } = require("../config/database");
const emailService = require("./email-service");

/**
 * Checks for upcoming events and sends reminders based on the notification schedule.
 */
async function checkEventReminders() {
  console.log("🔔 Checking for event reminders...");
  try {
    // 1. Get upcoming events that have a notification schedule
    const result = await query(`
      SELECT e.id, e.title, e.event_date, e.event_time, e.location, e.notification_schedule, 
             e.club_id, e.team_id, t.name as team_name, c.name as club_name
      FROM events e
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN organizations c ON e.club_id = c.id
      WHERE e.notification_schedule IS NOT NULL 
      AND e.event_date >= CURRENT_DATE
    `);

    const events = result.rows;
    for (const event of events) {
      const schedule = event.notification_schedule; // Array like ["7d", "1d"]
      if (!Array.isArray(schedule)) continue;

      for (const leadTime of schedule) {
        // leadTime examples: "7d", "4d", "2d", "1d"
        const days = parseInt(leadTime);
        if (isNaN(days)) continue;

        // Calculate the target notification date
        const eventDate = new Date(event.event_date);
        const targetDate = new Date(eventDate);
        targetDate.setDate(targetDate.getDate() - days);

        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const targetDateStr = targetDate.toISOString().split("T")[0];

        // If today is the day to send the notification
        if (todayStr === targetDateStr) {
          // Check if already sent for this event and leadTime
          const logResult = await query(
            "SELECT 1 FROM event_reminder_log WHERE event_id = $1 AND lead_time = $2",
            [event.id, leadTime],
          );

          if (logResult.rows.length === 0) {
            console.log(
              `📡 Sending ${leadTime} reminder for event: ${event.title}`,
            );

            // Get recipients and their names
            let recipients = [];

            // Priority 1: Specific Assignments
            const assignedResult = await query(
              `
              SELECT u.email, u.first_name 
              FROM event_players ep 
              JOIN players p ON ep.player_id = p.id 
              JOIN users u ON p.user_id = u.id 
              WHERE ep.event_id = $1
            `,
              [event.id],
            );

            if (assignedResult.rows.length > 0) {
              recipients = assignedResult.rows;
            } else if (event.team_id) {
              // Priority 2: All team members
              const teamResult = await query(
                `
                SELECT u.email, u.first_name 
                FROM team_players tp 
                JOIN players p ON tp.player_id = p.id 
                JOIN users u ON p.user_id = u.id 
                WHERE tp.team_id = $1
              `,
                [event.team_id],
              );
              recipients = teamResult.rows;
            }

            if (recipients.length > 0) {
              // Send emails
              const humanLeadTime = leadTime
                .replace("d", " days")
                .replace("h", " hours");

              for (const recipient of recipients) {
                await emailService.sendEventReminderEmail({
                  email: recipient.email,
                  firstName: recipient.first_name,
                  eventTitle: event.title,
                  eventDate: event.event_date,
                  eventTime: event.event_time,
                  location: event.location,
                  teamName: event.team_name || "the team",
                  clubName: event.club_name || "ClubHub",
                  leadTime: humanLeadTime,
                });
              }

              // Log as sent
              await query(
                "INSERT INTO event_reminder_log (event_id, lead_time) VALUES ($1, $2)",
                [event.id, leadTime],
              );
            }
          }
        }
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

  // Re-run every 12 hours
  setInterval(checkEventReminders, 1000 * 60 * 60 * 12);
}

module.exports = { startNotificationScheduler, checkEventReminders };
