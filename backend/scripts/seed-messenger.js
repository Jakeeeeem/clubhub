const { query } = require("../config/database");

async function seedMessages() {
  const masterId = "c403dbdc-a2fb-4327-a452-705c59877e61";
  const coachId = "a7a8b62a-93db-483e-9626-20eac210a7ec";
  const playerId = "29edcefc-f611-45d2-8110-1c8d3796aac6";
  const orgId = "0c1ddbc0-b1be-421f-a949-310b7332a868";

  const messages = [
    { sender: coachId, receiver: playerId, content: "Hey, are you ready for the game tomorrow?", status: true },
    { sender: playerId, receiver: coachId, content: "Yes coach, I'll be there on time!", status: false },
    { sender: coachId, receiver: masterId, content: "Master, I've updated the tactical board for the next match.", status: true },
    { sender: masterId, receiver: coachId, content: "Great job, I'll take a look now.", status: false },
    { sender: coachId, receiver: masterId, content: "Let me know if you want any changes.", status: false },
  ];

  console.log("🌱 Seeding messages...");

  for (const m of messages) {
    await query(
      "INSERT INTO messages (sender_id, receiver_id, organization_id, content, is_read) VALUES ($1, $2, $3, $4, $5)",
      [m.sender, m.receiver, orgId, m.content, m.status]
    );
  }

  console.log("✅ Messages seeded successfully!");
  process.exit(0);
}

seedMessages().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
