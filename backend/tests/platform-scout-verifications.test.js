const request = require("supertest");
const app = require("../server");
const { pool } = require("../config/database");

describe("Platform admin scout verifications", () => {
  let adminEmail, adminToken, adminId;
  let userEmail, userId;
  let requestId;

  beforeAll(async () => {
    // create platform admin
    adminEmail = `admin+plat${Date.now()}@example.com`;
    await request(app).post("/api/auth/register").send({
      firstName: "Plat",
      lastName: "Admin",
      email: adminEmail,
      password: "Password123!",
      accountType: "adult",
    });
    const loginAdmin = await request(app)
      .post("/api/auth/login")
      .send({ email: adminEmail, password: "Password123!" });
    adminToken = loginAdmin.body.token;
    adminId = loginAdmin.body.user && loginAdmin.body.user.id;

    // mark as platform admin directly in DB
    await pool.query(
      "UPDATE users SET is_platform_admin = true WHERE id = $1",
      [adminId],
    );

    // create a normal user who will request verification
    userEmail = `user+plat${Date.now()}@example.com`;
    await request(app).post("/api/auth/register").send({
      firstName: "Scout",
      lastName: "User",
      email: userEmail,
      password: "Password123!",
      accountType: "adult",
    });
    const loginUser = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: "Password123!" });
    userId = loginUser.body.user && loginUser.body.user.id;

    // insert a pending scout verification request
    const res = await pool.query(
      `INSERT INTO scout_verification_requests (user_id, club_id, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [userId, null, "pending"],
    );
    requestId = res.rows[0].id;
  });

  afterAll(async () => {
    try {
      if (requestId)
        await pool.query(
          "DELETE FROM scout_verification_requests WHERE id = $1",
          [requestId],
        );
      if (userEmail)
        await pool.query("DELETE FROM users WHERE email = $1", [userEmail]);
      if (adminEmail)
        await pool.query("DELETE FROM users WHERE email = $1", [adminEmail]);
    } catch (err) {
      console.warn("Cleanup error:", err.message);
    }
    await pool.end();
  });

  test("non-admin cannot list verifications (403)", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: "Password123!" });
    const token = login.body.token;

    const res = await request(app)
      .get("/api/platform-admin/scout-verifications")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });

  test("admin can list pending verification and resolve it", async () => {
    const listRes = await request(app)
      .get("/api/platform-admin/scout-verifications?status=pending")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(listRes.statusCode).toBe(200);
    const ids = listRes.body.map((r) => r.id);
    expect(ids).toContain(requestId);

    const resolveRes = await request(app)
      .post(`/api/platform-admin/scout-verifications/${requestId}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "approved", adminNotes: "OK" });

    expect(resolveRes.statusCode).toBe(200);
    expect(resolveRes.body).toHaveProperty("success", true);

    const userRow = await pool.query(
      "SELECT is_verified_scout FROM users WHERE id = $1",
      [userId],
    );
    expect(userRow.rows[0].is_verified_scout).toBe(true);
  });
});
