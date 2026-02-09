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
  },
};

jest.mock("stripe", () => {
  return jest.fn(() => mockStripe);
});

// MOCK DATABASE & EMAIL
// We need to simulate:
// 1. Finding an existing user
// 2. Finding that user has a stripe_account_id
// 3. Creating the org with that stripe_account_id
const mockQuery = jest.fn((text, params) => {
  // Check for user by email
  if (text.includes("SELECT id FROM users WHERE email")) {
    // Simulate existing user
    return Promise.resolve({ rows: [{ id: 999 }] });
  }

  // Check for users stripe account
  if (text.includes("SELECT stripe_account_id FROM organizations")) {
    return Promise.resolve({
      rows: [{ stripe_account_id: "acct_existing_linked" }],
    });
  }

  // Platform Admin Check
  if (text.includes("SELECT is_platform_admin")) {
    return Promise.resolve({ rows: [{ is_platform_admin: true }] }); // authorized
  }

  // Create Organization
  if (text.includes("INSERT INTO organizations")) {
    // Capture the inserted parameters for verification
    return Promise.resolve({
      rows: [
        {
          id: 500,
          name: params[0],
          stripe_account_id: params[6] || "captured_in_test",
        },
      ],
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

describe("Platform Admin - Existing Stripe Link", () => {
  let token;

  beforeAll(() => {
    token = jwt.sign(
      { id: 1, email: "super@test.com", is_platform_admin: true }, // Ensure platform admin claim
      process.env.JWT_SECRET || "clubhub-secret-2024-dev",
      { expiresIn: "1h" },
    );
  });

  beforeEach(() => {
    mockQuery.mockClear();
  });

  test("Onboard Club with Existing User Auto-Links Stripe Account", async () => {
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

    // Verify we checked for the existing user's Stripe ID
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SELECT stripe_account_id FROM organizations"),
      [999],
    );

    // Verify the Organization Insert included the Stripe ID
    // The query params order in the code: [clubName, slug, sport, location, userId, stripeAccountId]
    // Our mock returns what it was called with roughly, but we can inspect the calls specifically
    const orgInsertCall = mockQuery.mock.calls.find((call) =>
      call[0].includes("INSERT INTO organizations"),
    );
    expect(orgInsertCall).toBeDefined();

    const params = orgInsertCall[1];
    // params[5] should be the stripeAccountId passed
    expect(params[5]).toBe("acct_existing_linked");
  });
});
