require("dotenv").config();
const { pool } = require("./config/database");
const crypto = require("crypto");

async function seedMessages() {
    console.log("💬 Seeding Demo Messages...");
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Get IDs
        const adminEmail = "demo-admin@clubhub.com";
        const coachEmail = "multi@demo.com";
        const orgName = "Elite Pro Academy";

        const adminRes = await client.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
        const coachRes = await client.query("SELECT id FROM users WHERE email = $1", [coachEmail]);
        const orgRes = await client.query("SELECT id FROM organizations WHERE name = $1", [orgName]);

        if (adminRes.rows.length === 0 || coachRes.rows.length === 0 || orgRes.rows.length === 0) {
            throw new Error("Required demo entities not found. Run seed-live.js first.");
        }

        const adminId = adminRes.rows[0].id;
        const coachId = coachRes.rows[0].id;
        const orgId = orgRes.rows[0].id;

        // 2. Clear old demo messages to avoid duplicates
        await client.query("DELETE FROM messages WHERE organization_id = $1", [orgId]);

        // 3. Define conversation
        const conversation = [
            { from: adminId, to: coachId, text: "Hi Multi, how is the U14 training going? Are the Lions ready for the weekend?" },
            { from: coachId, to: adminId, text: "Hey Demo, all good! The Tigers are looking sharp, and the Lions have improved their defensive shape significantly." },
            { from: adminId, to: coachId, text: "Great to hear. I've updated the match events in the dashboard. Let me know if you need any extra kit for the academy boys." },
            { from: coachId, to: adminId, text: "Actually, we could use a few more medium bibs. I'll check the inventory after today's session." },
            { from: adminId, to: coachId, text: "No problem, just send me the count. See you at the match!" },
            { from: coachId, to: adminId, text: "Will do. Thanks!" }
        ];

        // 4. Insert messages with staggered timestamps
        for (let i = 0; i < conversation.length; i++) {
            const msg = conversation[i];
            const timestamp = new Date();
            timestamp.setMinutes(timestamp.getMinutes() - (conversation.length - i) * 5); // 5 min apart

            await client.query(
                `INSERT INTO messages (id, sender_id, receiver_id, organization_id, content, type, is_read, created_at)
                 VALUES ($1, $2, $3, $4, $5, 'direct', false, $6)`,
                [crypto.randomUUID(), msg.from, msg.to, orgId, msg.text, timestamp]
            );
        }

        await client.query("COMMIT");
        console.log("✅ SUCCESSFULLY SEEDED 6 MESSAGES for Elite Pro Academy!");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Message seeding failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

seedMessages();
