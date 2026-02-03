const request = require("supertest");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// MOCK STRIPE
jest.mock("stripe", () => {
  return jest.fn(() => ({
    products: {
      list: jest.fn().mockResolvedValue({
        data: [{ id: "prod_1", name: "Test Product 1", description: "Desc 1" }],
      }),
    },
    prices: {
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: "price_1",
            product: "prod_1",
            unit_amount: 1000,
            recurring: { interval: "month" },
          },
        ],
      }),
    },
    accounts: {
      list: jest.fn().mockResolvedValue({
        data: [],
      }),
    },
  }));
});

// MOCK BCRYPT
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_secret_123"),
  compare: jest.fn().mockResolvedValue(true),
}));

// MOCK EMAIL SERVICE to prevent timeouts
jest.mock("../services/email-service", () => ({
  sendAdminWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

// MOCK DATABASE
const mockQuery = jest.fn((text, params) => {
  // 1. Onboard Club Queries
  if (text.includes("is_platform_admin")) {
    return Promise.resolve({ rows: [{ is_platform_admin: true, id: 1 }] });
  }
  if (text.includes("SELECT id FROM users WHERE email")) {
    return Promise.resolve({ rows: [] }); // User not found
  }
  if (text.includes("INSERT INTO users")) {
    return Promise.resolve({ rows: [{ id: 100 }] });
  }
  if (text.includes("INSERT INTO organizations")) {
    return Promise.resolve({ rows: [{ id: "org-new", name: "New Club" }] });
  }
  if (
    text.includes("INSERT INTO organization_members") ||
    text.includes("INSERT INTO user_preferences")
  ) {
    return Promise.resolve({ rows: [] });
  }

  // 2. Sync Plans Queries
  if (text.includes("SELECT stripe_account_id, id FROM organizations")) {
    return Promise.resolve({
      rows: [{ stripe_account_id: "acct_test", id: "org-123" }],
    });
  }
  if (text.includes("SELECT id FROM plans WHERE stripe_product_id")) {
    return Promise.resolve({ rows: [] }); // No existing plan
  }
  if (text.includes("INSERT INTO plans")) {
    return Promise.resolve({ rows: [{ id: "plan-new" }] });
  }

  // 3. Auth/Context Queries
  if (
    text.includes("is_platform_admin") ||
    text.includes("FROM user_preferences") ||
    text.includes("FROM organizations")
  ) {
    // Generic fallbacks for context lookups if not caught above
    if (text.includes("FROM user_preferences"))
      return Promise.resolve({
        rows: [{ current_organization_id: "org-123" }],
      });
  }

  return Promise.resolve({ rows: [] });
});

jest.mock("../config/database", () => ({
  pool: {
    query: mockQuery,
    end: jest.fn(),
  },
  query: mockQuery,
}));

// Import app AFTER mocks
const app = require("../server");

describe("Super Admin & Sync Features (Unit Tests)", () => {
  let superAdminToken;
  let ownerToken;

  beforeAll(() => {
    superAdminToken = jwt.sign(
      {
        id: 1,
        email: "super@test.com",
        role: "platform_admin",
        isPlatformAdmin: true,
        accountType: "platform_admin",
      },
      process.env.JWT_SECRET || "clubhub-secret-2024-dev", // Matching default
      { expiresIn: "1h" },
    );

    ownerToken = jwt.sign(
      {
        id: 2,
        email: "owner@test.com",
        accountType: "organization",
        currentOrganizationId: "org-123",
      },
      process.env.JWT_SECRET || "clubhub-secret-2024-dev",
      { expiresIn: "1h" },
    );
  });

  beforeEach(() => {
    mockQuery.mockClear();
  });

  test("1. POST /api/platform-admin/onboard-club - Success", async () => {
    const res = await request(app)
      .post("/api/platform-admin/onboard-club")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        firstName: "Club",
        lastName: "Owner",
        email: "newowner@test.com",
        clubName: "New Club",
        sport: "Football",
        location: "London",
      });

    if (res.statusCode !== 201) {
      console.error("Test 1 Result:", res.body);
    }

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.organization.id).toBe("org-new");
  });

  test("2. POST /api/payments/plans/import - Success", async () => {
    const res = await request(app)
      .post("/api/payments/plans/import")
      .set("Authorization", `Bearer ${ownerToken}`);

    if (res.statusCode !== 200) {
      console.error("Test 2 Result:", res.body);
    }

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.imported).toBe(1);
  });
});
