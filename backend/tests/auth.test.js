const request = require("supertest");
const app = require("../server");
const { pool } = require("../config/database");

describe("Auth API Endpoints", () => {
  let createdUserEmail;
  let token;

  // Cleanup after tests
  afterAll(async () => {
    if (createdUserEmail) {
      await pool.query("DELETE FROM users WHERE email = $1", [
        createdUserEmail,
      ]);
    }
    await pool.end();
  });

  it("should register a new user", async () => {
    const rand = Math.floor(Math.random() * 10000);
    createdUserEmail = `unittest${rand}@example.com`;

    const res = await request(app).post("/api/auth/register").send({
      firstName: "Test",
      lastName: "Unit",
      email: createdUserEmail,
      password: "Password123!",
      accountType: "adult",
    });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("email", createdUserEmail);
  });

  it("should login with the registered user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: createdUserEmail,
      password: "Password123!",
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
    token = res.body.token; // Save token for next test
  });

  it("should access protected route /auth/me", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.user).toHaveProperty("email", createdUserEmail);
  });

  it("should fail to access protected route without token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.statusCode).toEqual(401);
  });
});
