const request = require("supertest");
const app = require("../server");
const { pool } = require("../config/database");

describe("Messages API Endpoints", () => {
  let authToken;
  let userId;
  let receiverId;
  let orgId;
  let insertedMessageId;
  let senderEmail;
  let receiverEmail;

  beforeAll(async () => {
    // Register sender
    const rand = Math.floor(Math.random() * 100000);
    const email = `msg_test_sender_${rand}@example.com`;
    senderEmail = email;

    const reg = await request(app).post("/api/auth/register").send({
      firstName: "Msg",
      lastName: "Sender",
      email,
      password: "Password123!",
      accountType: "organization",
    });
    authToken = reg.body.token;
    userId = reg.body.user.id;

    // Register receiver
    const recvEmail = `msg_test_recv_${rand}@example.com`;
    receiverEmail = recvEmail;
    const reg2 = await request(app).post("/api/auth/register").send({
      firstName: "Msg",
      lastName: "Receiver",
      email: recvEmail,
      password: "Password123!",
      accountType: "adult",
    });
    receiverId = reg2.body.user.id;

    // Create a temporary organization and add both users as members so messages can be exchanged
    const orgRes = await pool.query(
      `INSERT INTO organizations (name, slug, sport, description, location, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [`Test Org ${rand}`, `test-org-${rand}`, 'Football', 'Temporary org for messages.test', 'Local', userId]
    );
    orgId = orgRes.rows[0].id;

    await pool.query(
      `INSERT INTO organization_members (organization_id, user_id, role, status)
       VALUES ($1, $2, $3, $4)`,
      [orgId, userId, 'owner', 'active']
    );

    await pool.query(
      `INSERT INTO organization_members (organization_id, user_id, role, status)
       VALUES ($1, $2, $3, $4)`,
      [orgId, receiverId, 'player', 'active']
    );

    // Ensure sender preferences point to this org so injectOrgContext picks it up
    await pool.query(
      `INSERT INTO user_preferences (user_id, current_organization_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET current_organization_id = $2`,
      [userId, orgId]
    );

    // Prepare demo-bypass tokens for requests to ensure injectOrgContext resolves correctly
    // Format: demo-bypass-token:<email>
    // We'll use these instead of the JWT for the requests below.
    // Note: registration returned token is still available as `authToken`.
    // Use bypass tokens to avoid UUID header validation quirks in the test DB.
    // eslint-disable-next-line no-unused-vars
    this.senderBypass = `demo-bypass-token:${senderEmail}`;
    // eslint-disable-next-line no-unused-vars
    this.receiverBypass = `demo-bypass-token:${receiverEmail}`;
  });

  afterAll(async () => {
    try {
      if (userId) {
        // Remove messages first
        await pool.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [userId]);

        // Remove organization-related rows before deleting users to avoid FK constraint
        if (orgId) {
          await pool.query("DELETE FROM organization_members WHERE organization_id = $1", [orgId]);
          await pool.query("DELETE FROM organizations WHERE id = $1", [orgId]);
          await pool.query("DELETE FROM user_preferences WHERE user_id = $1", [userId]);
        }

        // Finally delete the test users
        await pool.query("DELETE FROM users WHERE id = $1 OR id = $2", [userId, receiverId]);
      }
    } catch (err) {
      // Log and continue - test teardown should not throw
      // eslint-disable-next-line no-console
      console.warn('messages.test.js teardown warning:', err.message);
    } finally {
      await pool.end();
    }
  });

  it("should send a message successfully", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer demo-bypass-token:${senderEmail}`)
      .set("X-Organization-Id", orgId)
      .send({
        receiverId,
        content: "Hey, integration test message!",
        type: "direct",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data).toHaveProperty("content", "Hey, integration test message!");
    insertedMessageId = res.body.data.id;
  });

  it("should fetch messages for the logged-in user", async () => {
    const res = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer demo-bypass-token:${senderEmail}`)
      .set("X-Organization-Id", orgId);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find(m => m.id === insertedMessageId);
    expect(found).toBeDefined();
    expect(found.content).toBe("Hey, integration test message!");
  });

  it("should return 400 when no receiverId or content provided", async () => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ content: "No receiver!" });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe("Receiver and content are required");
  });

  it("should mark a message as read", async () => {
    // Log in as receiver
    const recvRes = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [receiverId]
    );
    const recvEmail = recvRes.rows[0].email;

    // Use bypass token for receiver as well
    const res = await request(app)
      .patch(`/api/messages/${insertedMessageId}/read`)
      .set("Authorization", `Bearer demo-bypass-token:${receiverEmail}`)
      .set("X-Organization-Id", orgId);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("success", true);
  });

  it("should return 401 without a token", async () => {
    const res = await request(app).get("/api/messages");
    expect(res.statusCode).toEqual(401);
  });
});
