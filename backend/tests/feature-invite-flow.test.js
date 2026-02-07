const request = require("supertest");
const jwt = require("jsonwebtoken");

// Comprehensive mock database for invite flow
const mockQuery = jest.fn((text, params) => {
  // 1. Club lookup by owner_id (for invite generation)
  if (text.includes("FROM clubs WHERE owner_id")) {
    return Promise.resolve({
      rows: [
        {
          id: "club-123",
          name: "Test FC",
          owner_id: "coach-123",
          organization_id: "org-123",
        },
      ],
    });
  }

  // 2. Club lookup with owner verification
  if (text.includes("FROM clubs WHERE id") && text.includes("AND owner_id")) {
    return Promise.resolve({
      rows: [
        {
          id: "club-123",
          name: "Test FC",
          owner_id: "coach-123",
          organization_id: "org-123",
        },
      ],
    });
  }

  // 3. Check for duplicate pending invites
  if (
    text.includes("FROM club_invites") &&
    text.includes("invite_status = 'pending'")
  ) {
    return Promise.resolve({ rows: [] });
  }

  // 4. Check if user is already a player
  if (text.includes("FROM players WHERE email")) {
    return Promise.resolve({ rows: [] });
  }

  // 5. Insert new invite
  if (text.includes("INSERT INTO club_invites")) {
    const isPublic = params[11] || false;
    return Promise.resolve({
      rows: [
        {
          id: "invite-new-" + Date.now(),
          email: params[0],
          first_name: params[1] || "",
          last_name: params[2] || "",
          date_of_birth: params[3],
          club_id: params[4],
          invited_by: params[5],
          club_role: params[6],
          invite_token: params[7],
          expires_at: params[8],
          personal_message: params[9],
          team_id: params[10],
          is_public: isPublic,
          invite_status: "pending",
        },
      ],
    });
  }

  // 6. Get invite details (public endpoint)
  if (text.includes("FROM club_invites ci") && text.includes("JOIN clubs c")) {
    return Promise.resolve({
      rows: [
        {
          id: "invite-123",
          email: "test@test.com",
          first_name: "Test",
          last_name: "Player",
          club_id: "club-123",
          club_role: "player",
          invite_status: "pending",
          expires_at: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_public: false,
          club_name: "Test FC",
          club_description: "Test Club",
          club_location: "London",
          club_sport: "Football",
          inviter_first_name: "Coach",
          inviter_last_name: "Admin",
          team_id: null,
          team_name: null,
        },
      ],
    });
  }

  return Promise.resolve({ rows: [] });
});

jest.mock("../config/database", () => ({
  query: mockQuery,
  withTransaction: jest.fn(async (cb) => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    return await cb(mockClient);
  }),
  queries: {},
}));

jest.mock("../services/email-service", () => ({
  sendInviteEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock("stripe", () => {
  return jest.fn(() => ({
    products: { list: jest.fn().mockResolvedValue({ data: [] }) },
    prices: { list: jest.fn().mockResolvedValue({ data: [] }) },
  }));
});

const app = require("../server");

describe("Invite Flow - Complete Test Suite", () => {
  let coachToken;

  beforeAll(() => {
    coachToken = jwt.sign(
      {
        id: "coach-123",
        email: "coach@test.com",
        accountType: "organization",
        currentOrganizationId: "org-123",
        currentClubId: "club-123",
      },
      process.env.JWT_SECRET || "clubhub-secret-2024-dev",
      { expiresIn: "1h" },
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Generate Email Invite - Success", async () => {
    const res = await request(app)
      .post("/api/invites/generate")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({
        email: "player@test.com",
        firstName: "New",
        lastName: "Player",
        clubRole: "player",
        isPublic: false,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("inviteLink");
    expect(res.body.invite.clubRole).toBe("player");
    expect(res.body.invite.isPublic).toBe(false);
  });

  test("2. Generate Shareable Link - Success", async () => {
    const res = await request(app)
      .post("/api/invites/generate")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({
        clubRole: "player",
        isPublic: true,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.invite.isPublic).toBe(true);
    expect(res.body.invite.email).toBeNull();
  });

  test("3. Get Invite Details - Public Endpoint", async () => {
    const res = await request(app).get("/api/invites/details/test-token-123");

    expect(res.statusCode).toBe(200);
    expect(res.body.invite.clubName).toBe("Test FC");
    expect(res.body.invite.clubRole).toBe("player");
    expect(res.body.club.name).toBe("Test FC");
  });

  test("4. Generate Invite - Requires Auth", async () => {
    const res = await request(app).post("/api/invites/generate").send({
      email: "test@test.com",
      clubRole: "player",
    });

    expect(res.statusCode).toBe(401);
  });

  test("5. Generate Invite - Validates Club Role", async () => {
    const res = await request(app)
      .post("/api/invites/generate")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({
        email: "test@test.com",
        clubRole: "invalid_role",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });
});
