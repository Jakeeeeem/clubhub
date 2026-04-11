const request = require("supertest");
const express = require("express");
const app = express();

// Mock database
jest.mock("../config/database", () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  queries: {
    findUserByEmail: "SELECT * FROM users WHERE email = $1"
  }
}));

const db = require("../config/database");

// Mock auth middleware to return fixed data
jest.mock("../middleware/auth", () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: "00000000-0000-4000-a000-000000000001", email: "coach@clubhub.com" };
    next();
  },
  requireOrganization: (req, res, next) => {
    req.user.organization_id = "00000000-0000-4000-a000-000000000002";
    next();
  }
}));

// Mock Stripe
jest.mock("stripe", () => {
  return jest.fn(() => ({
    products: {
      create: jest.fn().mockResolvedValue({ id: "prod_123" })
    },
    prices: {
      create: jest.fn().mockResolvedValue({ id: "price_123" })
    }
  }));
});

app.use(express.json());
app.use("/api/auth", require("../routes/auth"));
app.use("/api/payments", require("../routes/payments"));

describe("Payments API Integration Tests (Mocked)", () => {
  let authToken = "mock-token";
  let organizationId = "00000000-0000-4000-a000-000000000002";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Setup User and Organization
  it("should register a user and create an organization", async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // User duplicate check
    db.withTransaction.mockImplementation(async (cb) => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: "u1", email: "test@test.com", account_type: "organization" }] }) // User insert
          .mockResolvedValueOnce({ rows: [{ id: "org1" }] }) // Org insert
          .mockResolvedValue({ rows: [] }) // Members/Prefs
      };
      return await cb(client);
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        firstName: "Stripe",
        lastName: "Tester",
        email: "stripe-test@example.com",
        password: "Password123!",
        accountType: "organization",
        orgTypes: ["Football Club"],
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.token).toBeDefined();
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
  it("should create a payment plan", async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: organizationId, stripe_account_id: "acct_123" }] }) // Org check
      .mockResolvedValueOnce({ rows: [{ id: "plan1" }] }); // Plan insert

    const res = await request(app)
      .post("/api/payments/plans")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test Annual Membership",
        amount: 100.0,
        interval: "year",
        description: "Unit Test Plan",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.plan).toHaveProperty("id");
  });

  // 4. Fetch Plans
  it("should fetch plans", async () => {
    // We need to ensure this is the ONLY query result returned for this test
    db.query.mockReset();
    db.query
      .mockResolvedValueOnce({ rows: [] }) // Table check/create
      .mockResolvedValueOnce({
        rows: [
          { id: "p1", name: "Basic Plan" },
          { id: "p2", name: "Pro Plan" }
        ]
      }); // Plans fetch

    const res = await request(app)
      .get(`/api/payments/plans`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(2);
  });
});
