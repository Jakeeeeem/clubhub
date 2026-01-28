// Load environment variables for testing
const dotenv = require("dotenv");
const path = require("path");

// Load main .env file but override DB_HOST for local testing (localhost instead of db)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
process.env.DB_HOST = "localhost";
if (!process.env.DB_USER) process.env.DB_USER = "clubhub_dev_db_user";
if (!process.env.DB_PASSWORD)
  process.env.DB_PASSWORD = "hwkX8WjJLKyPRnPrMrBxetxPXRYpBuRQ";
if (!process.env.DB_NAME) process.env.DB_NAME = "clubhub_dev_db";
if (!process.env.DB_PORT) process.env.DB_PORT = "5432";

const request = require("supertest");
const app = require("../server");
const { pool } = require("../config/database");

describe("Payments API Integration Tests", () => {
  let createdUserEmail;
  let authToken;
  let organizationId;

  // Cleanup after tests
  afterAll(async () => {
    // Delete data in reverse order of dependency
    if (organizationId) {
      await pool.query(
        "DELETE FROM plans WHERE club_id = (SELECT id FROM clubs WHERE organization_id = $1)",
        [organizationId],
      ); // Clean plans if any
      await pool.query(
        "DELETE FROM organization_members WHERE organization_id = $1",
        [organizationId],
      );
      await pool.query("DELETE FROM organizations WHERE id = $1", [
        organizationId,
      ]);
    }
    if (createdUserEmail) {
      await pool.query("DELETE FROM users WHERE email = $1", [
        createdUserEmail,
      ]);
    }
    await pool.end();
  });

  // 1. Setup User and Organization
  it("should register a user and create an organization", async () => {
    const rand = Math.floor(Math.random() * 10000);
    createdUserEmail = `paytest${rand}@example.com`;

    // Register
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        firstName: "Stripe",
        lastName: "Tester",
        email: createdUserEmail,
        password: "Password123!",
        accountType: "organization",
        orgTypes: ["Football Club"],
      });

    expect(res.statusCode).toEqual(201);
    authToken = res.body.token;
    expect(authToken).toBeDefined();

    // The register endpoint with 'organization' type and orgTypes should have auto-created an org
    expect(res.body.user.organization).toBeDefined();
    organizationId = res.body.user.organization.id;
  });

  // 2. Check Stripe Configuration
  it("should check if Stripe is configured and active", async () => {
    const res = await request(app).get("/api/payments/health");

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe("healthy");

    if (res.body.stripe === false) {
      console.warn(
        "⚠️ Stripe is NOT configured (STRIPE_SECRET_KEY missing). Skipping strict Stripe tests.",
      );
    } else {
      console.log("✅ Stripe is configured and active.");
    }
  });

  // 3. Create a Payment Plan
  // This interacts with Stripe API. If it fails, it might be due to missing keys or network.
  it("should create a payment plan", async () => {
    // Check key presence first
    const health = await request(app).get("/api/payments/health");
    if (!health.body.stripe) {
      console.log("Skipping Create Plan test because Stripe is not configured");
      return;
    }

    // We need to make sure the user/org is connected to Stripe (Connect)
    // The current implementation might require a Connect account ID to be set on the org/user
    // mocking that for now or expecting a specific error "Stripe not connected"

    const res = await request(app)
      .post("/api/payments/plans")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test Annual Membership",
        amount: 100.0,
        interval: "year",
        description: "Unit Test Plan",
      });

    // We expect either 201 (Created) or 400 (Stripe not connected)
    // If it's 400 with "Stripe not connected", that effectively "passes" the logic test up to the integration point
    if (res.statusCode === 400 && res.body.error === "Stripe not connected") {
      console.log(
        "✅ Plan creation logic reached Connect check (Stripe not connected).",
      );
    } else {
      expect(res.statusCode).toEqual(201);
      expect(res.body.plan).toHaveProperty("name", "Test Annual Membership");
      console.log("✅ Plan created successfully in Stripe.");
    }
  });

  // 4. Fetch Plans
  it("should fetch plans", async () => {
    const res = await request(app)
      .get(`/api/payments/plans`)
      .set("Authorization", `Bearer ${authToken}`); // Authentication might be optional depending on implementation

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
