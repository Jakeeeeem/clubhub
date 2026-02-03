const request = require("supertest");
const jwt = require("jsonwebtoken");

// MOCK STRIPE
const mockStripe = {
  products: {
    list: jest.fn().mockResolvedValue({
      data: [
        { id: "prod_sync", name: "Synced Plan", description: "Auto Sync" },
      ],
    }),
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ id: "prod_new" }),
  },
  prices: {
    list: jest.fn().mockResolvedValue({
      data: [
        {
          id: "price_sync",
          product: "prod_sync",
          unit_amount: 1000,
          recurring: { interval: "month" },
        },
      ],
    }),
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ id: "price_new" }),
  },
  accounts: {
    retrieve: jest.fn().mockResolvedValue({
      id: "acct_test",
      details_submitted: true,
      payouts_enabled: true,
      requirements: { currently_due: [] },
      settings: {
        payouts: { schedule: { interval: "monthly", monthly_anchor: 1 } },
      },
    }),
    update: jest.fn().mockResolvedValue({}),
  },
};

jest.mock("stripe", () => {
  return jest.fn(() => mockStripe);
});

// MOCK DATABASE
const mockQuery = jest.fn((text, params) => {
  // 1. Connect Status & Auto Sync
  if (text.includes("SELECT id, email, first_name")) {
    return Promise.resolve({
      rows: [{ id: 1, email: "test@test.com", stripe_account_id: "acct_test" }],
    });
  }
  if (text.includes("SELECT COUNT(*) FROM plans")) {
    return Promise.resolve({ rows: [{ count: "0" }] }); // Simulate 0 plans to trigger sync
  }
  if (text.includes("SELECT id FROM plans WHERE stripe_product_id")) {
    return Promise.resolve({ rows: [] }); // Plan doesn't exist yet
  }
  if (text.includes("INSERT INTO plans")) {
    return Promise.resolve({ rows: [{ id: "plan_synced" }] });
  }

  // 2. PUT Plan
  if (text.includes("SELECT * FROM plans WHERE id")) {
    return Promise.resolve({
      rows: [
        {
          id: "plan_1",
          stripe_product_id: "prod_1",
          stripe_price_id: "price_1",
        },
      ],
    });
  }
  if (text.includes("SELECT stripe_account_id FROM organizations")) {
    return Promise.resolve({ rows: [{ stripe_account_id: "acct_test" }] });
  }
  if (text.includes("UPDATE plans SET")) {
    return Promise.resolve({ rows: [{ id: "plan_1", name: "Updated Name" }] });
  }

  // 3. DELETE Plan
  // (Uses same SELECT * FROM plans logic above)
  // (Uses same SELECT stripe_account_id logic above)
  // (UPDATE plans SET active = false...)

  // Auth & Misc
  if (text.includes("FROM user_preferences")) {
    return Promise.resolve({ rows: [{ current_organization_id: "org_1" }] });
  }

  return Promise.resolve({ rows: [] });
});

jest.mock("../config/database", () => ({
  pool: { query: mockQuery },
  query: mockQuery,
}));

// Import app AFTER mocks
const app = require("../server");

describe("Stripe CRUD Enhancements", () => {
  let token;

  beforeAll(() => {
    token = jwt.sign(
      {
        id: 1,
        email: "owner@test.com",
        accountType: "organization",
        currentOrganizationId: "org_1",
      },
      process.env.JWT_SECRET || "clubhub-secret-2024-dev",
      { expiresIn: "1h" },
    );
  });

  beforeEach(() => {
    modelStripe = require("stripe")(); // re-access mock
    mockQuery.mockClear();
    mockStripe.products.update.mockClear();
    mockStripe.prices.update.mockClear();
    mockStripe.products.list.mockClear();
  });

  test("1. GET /stripe/connect/status triggers Auto-Sync if 0 plans", async () => {
    const res = await request(app)
      .get("/api/payments/stripe/connect/status")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    // Verify we checked plan count
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringMatching(/SELECT COUNT\(\*\) FROM plans/),
      expect.anything(),
    );
    // Verify we called Stripe to list products
    expect(mockStripe.products.list).toHaveBeenCalled();
    // Verify we inserted the plan
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO plans/),
      expect.anything(),
    );
  });

  test("2. PUT /plans/:id updates Stripe Product", async () => {
    const res = await request(app)
      .put("/api/payments/plans/plan_1")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Name", amount: 10, interval: "month" });

    expect(res.statusCode).toBe(200);
    expect(mockStripe.products.update).toHaveBeenCalledWith(
      "prod_1",
      expect.objectContaining({ name: "New Name" }),
      expect.objectContaining({ stripeAccount: "acct_test" }),
    );
  });

  test("3. DELETE /plans/:id archives Stripe Product & Price", async () => {
    const res = await request(app)
      .delete("/api/payments/plans/plan_1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(mockStripe.products.update).toHaveBeenCalledWith(
      "prod_1",
      { active: false },
      expect.objectContaining({ stripeAccount: "acct_test" }),
    );
    expect(mockStripe.prices.update).toHaveBeenCalledWith(
      "price_1",
      { active: false },
      expect.objectContaining({ stripeAccount: "acct_test" }),
    );
  });
});
