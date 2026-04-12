const request = require("supertest");
const app = require("../server");
const { pool } = require("../config/database");

describe("Staff verify-scout endpoint", () => {
  let ownerEmail;
  let ownerToken;
  let ownerId;
  let otherEmail;
  let otherToken;
  let clubId;
  let staffId;
  let DB_OK = false;

  beforeAll(async () => {
    // DB availability check — skip setup if DB is unreachable
    try {
      await pool.query("SELECT 1");
      DB_OK = true;
    } catch (err) {
      console.warn(
        "DB not available, skipping staff-verify tests:",
        err.message,
      );
      DB_OK = false;
      return;
    }
    // create owner account
    ownerEmail = `owner+test${Date.now()}@example.com`;
    await request(app).post("/api/auth/register").send({
      firstName: "Owner",
      lastName: "Test",
      email: ownerEmail,
      password: "Password123!",
      accountType: "organization",
    });

    const loginOwner = await request(app)
      .post("/api/auth/login")
      .send({ email: ownerEmail, password: "Password123!" });
    ownerToken = loginOwner.body.token;
    ownerId = loginOwner.body.user && loginOwner.body.user.id;

    // create another user
    otherEmail = `other+test${Date.now()}@example.com`;
    await request(app).post("/api/auth/register").send({
      firstName: "Other",
      lastName: "User",
      email: otherEmail,
      password: "Password123!",
      accountType: "adult",
    });
    const loginOther = await request(app)
      .post("/api/auth/login")
      .send({ email: otherEmail, password: "Password123!" });
    otherToken = loginOther.body.token;

    // create a club owned by owner
    const clubRes = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "Test Club (verify)",
        slug: `test-club-verify-${Date.now()}`,
        sport: "Football",
      });
    clubId = clubRes.body.club && clubRes.body.club.id;

    // create a staff member in that club
    const staffRes = await request(app)
      .post("/api/staff")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        clubId,
        firstName: "Coach",
        lastName: "ToVerify",
        role: "coach",
        email: `coach+${Date.now()}@example.com`,
      });
    staffId = (staffRes.body && (staffRes.body.staff || staffRes.body)).id;
  });

  afterAll(async () => {
    if (!DB_OK) return;
    // cleanup created rows
    try {
      if (staffId)
        await pool.query("DELETE FROM staff WHERE id = $1", [staffId]);
      if (clubId)
        await pool.query("DELETE FROM organizations WHERE id = $1", [clubId]);
      if (ownerEmail)
        await pool.query("DELETE FROM users WHERE email = $1", [ownerEmail]);
      if (otherEmail)
        await pool.query("DELETE FROM users WHERE email = $1", [otherEmail]);
    } catch (err) {
      console.warn("Cleanup error:", err.message);
    }
    await pool.end();
  });

  test("non-owner cannot verify staff (403)", async () => {
    if (!DB_OK) {
      console.warn("Skipping test due to DB unavailable");
      return;
    }
    const res = await request(app)
      .patch(`/api/staff/${staffId}/verify-scout`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ verified: true });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  test("owner can verify staff and flag is set", async () => {
    if (!DB_OK) {
      console.warn("Skipping test due to DB unavailable");
      return;
    }
    const res = await request(app)
      .patch(`/api/staff/${staffId}/verify-scout`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ verified: true });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("staff");
    expect(res.body.staff).toHaveProperty("club_verified_scout");
    expect(res.body.staff.club_verified_scout).toBe(true);
  });
});
