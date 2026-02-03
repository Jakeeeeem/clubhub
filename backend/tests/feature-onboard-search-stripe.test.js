const request = require("supertest");
const jwt = require("jsonwebtoken");

// MOCK STRIPE
const mockStripe = {
  // Basic mocks for onboarding checks
  accounts: {
    retrieve: jest.fn().mockResolvedValue({
      id: "acct_existing",
      details_submitted: true,
      payouts_enabled: true,
    }),
    search: jest.fn().mockResolvedValue({
      data: [{ id: "acct_found_via_search", email: "ardwick@example.com" }],
    }),
    create: jest.fn().mockResolvedValue({ id: "acct_new" }), // fallback
  },
};

jest.mock("stripe", () => {
  return jest.fn(() => mockStripe);
});

// MOCK DATABASE & EMAIL
// We need to simulate:
// 1. User does NOT exist in DB
// 2. Stripe Search finds an account
// 3. New Org is created with that ID
const mockQuery = jest.fn((text, params) => {
  // Check for user by email
  if (text.includes("SELECT id FROM users WHERE email")) {
    return Promise.resolve({ rows: [] }); // User not found
  }

  // Platform Admin Check
  if (text.includes("SELECT is_platform_admin")) {
    return Promise.resolve({ rows: [{ is_platform_admin: true }] });
  }

  // Create User
  if (text.includes("INSERT INTO users")) {
    return Promise.resolve({ rows: [{ id: 101 }] });
  }

  // Create Organization
  if (text.includes("INSERT INTO organizations")) {
    return Promise.resolve({
      rows: [{ id: 501, name: params[0], stripe_account_id: params[6] }],
    });
  }

  // Org Member & Prefs
  if (
    text.includes("INSERT INTO organization_members") ||
    text.includes("INSERT INTO user_preferences")
  ) {
    return Promise.resolve({ rows: [] });
  }

  return Promise.resolve({ rows: [] });
});

jest.mock("../config/database", () => ({
  query: mockQuery,
}));

const mockEmailService = {
  sendAdminWelcomeEmail: jest.fn().mockResolvedValue(true),
};
jest.mock("../services/email-service", () => mockEmailService);

const app = require("../server");

describe("Platform Admin - Search Stripe Link", () => {
  let token;

  beforeAll(() => {
    token = jwt.sign(
      { id: 1, email: "super@test.com", is_platform_admin: true },
      process.env.JWT_SECRET || "clubhub-secret-2024-dev",
      { expiresIn: "1h" },
    );
  });

  beforeEach(() => {
    mockQuery.mockClear();
    mockStripe.accounts.search.mockClear();
  });

  test("Onboard NEW Club but EXISTING Stripe Account links automatically via Search", async () => {
    const res = await request(app)
      .post("/api/platform-admin/onboard-club")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: "ardwick@example.com",
        firstName: "Ardwick",
        lastName: "Admin",
        clubName: "Ardwick FC",
        sport: "Football",
      });

    expect(res.statusCode).toBe(201);

    // Verify Stripe Search was called
    expect(mockStripe.accounts.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining("ardwick@example.com"),
      }),
    );

    // Verify the Organization Insert included the FOUND Stripe ID
    const orgInsertCall = mockQuery.mock.calls.find((call) =>
      call[0].includes("INSERT INTO organizations"),
    );
    expect(orgInsertCall).toBeDefined();

    const params = orgInsertCall[1];
    // params[5] should be the stripeAccountId found via search
    expect(params[5]).toBe("acct_found_via_search");
  });
});
