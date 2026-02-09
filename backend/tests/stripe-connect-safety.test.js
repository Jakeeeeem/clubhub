const request = require("supertest");
const jwt = require("jsonwebtoken");

/**
 * STRIPE CONNECT SAFETY TESTS (Refactored for Jest)
 */

// MOCK STRIPE
const mockStripe = {
  accounts: {
    create: jest.fn().mockResolvedValue({ id: "acct_test" }),
    retrieve: jest
      .fn()
      .mockResolvedValue({
        id: "acct_test",
        details_submitted: true,
        type: "standard",
      }),
    update: jest.fn().mockResolvedValue({ id: "acct_test" }),
    list: jest.fn().mockResolvedValue({ data: [] }),
  },
  accountLinks: {
    create: jest.fn().mockResolvedValue({ url: "https://stripe.com/reauth" }),
  },
  paymentIntents: {
    create: jest
      .fn()
      .mockResolvedValue({ id: "pi_test", client_secret: "secret" }),
  },
  charges: {
    create: jest.fn().mockResolvedValue({ id: "ch_test" }),
  },
  products: {
    create: jest.fn().mockResolvedValue({ id: "prod_1" }),
    list: jest.fn().mockResolvedValue({ data: [] }),
    update: jest.fn().mockResolvedValue({ id: "prod_1" }),
  },
  prices: {
    create: jest.fn().mockResolvedValue({ id: "price_1" }),
    list: jest.fn().mockResolvedValue({ data: [] }),
    update: jest.fn().mockResolvedValue({ id: "price_1" }),
  },
};

jest.mock("stripe", () => {
  return jest.fn(() => mockStripe);
});

// MOCK DATABASE
const mockQuery = jest.fn((text, params) => {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  // Auth & Platform Admin Check
  if (normalizedText.includes("SELECT is_platform_admin")) {
    return Promise.resolve({ rows: [{ is_platform_admin: true }] });
  }
  // User lookup in payments logic
  if (
    normalizedText.includes(
      "SELECT id, email, first_name, last_name, stripe_account_id FROM users WHERE id = $1",
    )
  ) {
    return Promise.resolve({
      rows: [
        {
          id: 1,
          email: "super@test.com",
          first_name: "Test",
          last_name: "User",
          stripe_account_id: "acct_test",
        },
      ],
    });
  }
  // Organization looking for currentOrgId or owners
  if (
    normalizedText.includes("FROM organizations o") ||
    normalizedText.includes("FROM organizations")
  ) {
    return Promise.resolve({
      rows: [
        {
          id: "org_123",
          organization_id: "org_123",
          stripe_account_id: "acct_test",
          org_name: "Test Org",
        },
      ],
    });
  }
  // Plan count check for auto-sync
  if (normalizedText.includes("SELECT COUNT(*) FROM plans")) {
    return Promise.resolve({ rows: [{ count: "1" }] });
  }
  // Insert plan
  if (normalizedText.includes("INSERT INTO plans")) {
    return Promise.resolve({ rows: [{ id: "plan_1" }] });
  }
  // Catch all for other queries to avoid 404s/500s
  return Promise.resolve({ rows: [] });
});

jest.mock("../config/database", () => ({
  query: mockQuery,
  pool: { query: mockQuery },
  withTransaction: jest.fn((callback) => callback(mockQuery)),
}));

// FORCE ENABLE_PAYMENT_PROCESSING to false before requiring app
process.env.ENABLE_PAYMENT_PROCESSING = "false";

const app = require("../server");

describe("🛡️ STRIPE CONNECT SAFETY TESTS", () => {
  let token;

  beforeAll(() => {
    token = jwt.sign(
      {
        id: 1,
        email: "super@test.com",
        is_platform_admin: true,
        accountType: "organization",
      },
      process.env.JWT_SECRET || "clubhub-secret-2024-dev",
      { expiresIn: "1h" },
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("✅ Stripe Connect Account Linking", () => {
    test("should fetch connect status WITHOUT charging", async () => {
      const res = await request(app)
        .get("/api/payments/stripe/connect/status")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      // Verify NO payment methods were called
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
      expect(mockStripe.charges.create).not.toHaveBeenCalled();
    });

    test("should NOT expose payment processing endpoints (Safety Check)", async () => {
      const res = await request(app)
        .post("/api/payments/create-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 100 });

      // Should be 403 because requirePaymentProcessing middleware is enabled and flag is false
      expect(res.statusCode).toBe(403);
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
    });
  });

  describe("✅ Payment Plan Management (No Charging)", () => {
    test("should create payment plan WITHOUT charging cards", async () => {
      const res = await request(app)
        .post("/api/payments/plans")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Test Plan",
          amount: 30.0,
          interval: "month",
          description: "Test membership plan",
        });

      expect(res.statusCode).toBe(201);

      // It creates products and prices, but NO payment intents
      expect(mockStripe.products.create).toHaveBeenCalled();
      expect(mockStripe.prices.create).toHaveBeenCalled();
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
    });
  });

  describe("🔴 CRITICAL: Payment Processing Blocked", () => {
    test("should block payment intent creation when flag is false", async () => {
      const res = await request(app)
        .post("/api/payments/create-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 50.0,
          paymentId: "test-payment-123",
        });

      expect(res.statusCode).toBe(403);
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
    });
  });

  describe("🔍 Stripe API Call Verification", () => {
    test("should NEVER call stripe.paymentIntents.create during normal operations", async () => {
      await request(app)
        .get("/api/payments/stripe/connect/status")
        .set("Authorization", `Bearer ${token}`);

      await request(app)
        .post("/api/payments/plans")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Test", amount: 30, interval: "month" });

      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
      expect(mockStripe.charges.create).not.toHaveBeenCalled();
    });
  });
});
