const request = require("supertest");
const app = require("../server");
const { pool } = require("../config/database");

describe("Auth Access Control", () => {
  let userEmail;
  let userId;

  console.log("DEBUG TEST ENV:", {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
  });

  // Setup: Create a user for testing
  beforeAll(async () => {
    const rand = Math.floor(Math.random() * 100000);
    userEmail = `access_test_${rand}@example.com`;

    // Register directly via API to ensure password hashing etc matches
    const res = await request(app).post("/api/auth/register").send({
      firstName: "Access",
      lastName: "Test",
      email: userEmail,
      password: "Password123!",
      accountType: "adult",
    });

    if (res.statusCode !== 201) {
      console.error("Setup failed: Could not register user", res.body);
      throw new Error("Setup failed");
    }
    userId = res.body.user.id;
  });

  // Cleanup
  afterAll(async () => {
    if (userId) {
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
    await pool.end();
  });

  it("should prevent login when user is deactivated", async () => {
    // 1. Manually deactivate user
    await pool.query("UPDATE users SET is_active = false WHERE id = $1", [
      userId,
    ]);

    // 2. Attempt Login
    const res = await request(app).post("/api/auth/login").send({
      email: userEmail,
      password: "Password123!",
    });

    // 3. Assert 403 Forbidden
    expect(res.statusCode).toEqual(403);
    expect(res.body.error).toEqual("Account deactivated");
  });

  it("should allow login when user is re-activated", async () => {
    // 1. Manually activate user
    await pool.query("UPDATE users SET is_active = true WHERE id = $1", [
      userId,
    ]);

    // 2. Attempt Login
    const res = await request(app).post("/api/auth/login").send({
      email: userEmail,
      password: "Password123!",
    });

    // 3. Assert 200 OK
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
  });
});
