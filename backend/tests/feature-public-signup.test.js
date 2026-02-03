const request = require("supertest");
const jwt = require("jsonwebtoken");

// MOCK DB
const mockQuery = jest.fn((text, params) => {
  // Check for duplicate user
  if (text.includes("SELECT * FROM users WHERE email")) {
    // Return empty for success, or user for duplicate test
    if (params && params[0] && params[0].includes("Dupe")) {
      return Promise.resolve({ rows: [{ id: 999, email: params[0] }] });
    }
    return Promise.resolve({ rows: [] });
  }
  // Auth - Find User for Login
  if (text.includes("SELECT id, email, password_hash")) {
    return Promise.resolve({
      rows: [
        {
          id: 1,
          email: params[0],
          password_hash: "$2a$12$EjzVbZJ...hashedpassword...", // Mock hash
          account_type: "adult",
          first_name: "Test",
          last_name: "User",
        },
      ],
    });
  }
  return Promise.resolve({ rows: [] });
});

const mockClient = {
  query: jest.fn((text, params) => {
    if (text.includes("INSERT INTO users")) {
      return Promise.resolve({
        rows: [
          {
            id: 1,
            email: params[0],
            first_name: params[2],
            last_name: params[3],
            account_type: params[4],
            created_at: new Date(),
          },
        ],
      });
    }
    if (text.includes("INSERT INTO organizations")) {
      return Promise.resolve({
        rows: [{ id: 100, name: params[0], slug: params[1] }],
      });
    }
    return Promise.resolve({ rows: [] });
  }),
  release: jest.fn(),
};

const mockWithTransaction = jest.fn(async (callback) => {
  return await callback(mockClient);
});

jest.mock("../config/database", () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction,
  queries: {
    findUserByEmail: "SELECT * FROM users WHERE email = $1",
    findUserForLogin:
      "SELECT id, email, password_hash, first_name, last_name, account_type, is_active FROM users WHERE email = $1",
  },
}));

// Mock bcrypt to pass login
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_secret"),
  compare: jest.fn().mockResolvedValue(true), // Always pass password check
}));

const app = require("../server");

// Other Mocks
jest.mock("../services/email-service", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock("stripe", () => {
  return jest.fn(() => ({
    products: { list: jest.fn().mockResolvedValue({ data: [] }) },
    prices: { list: jest.fn().mockResolvedValue({ data: [] }) },
  }));
});

describe("Public Registration Flow (Mocked)", () => {
  const parentEmail = "parent@test.com"; // Fixed emails for mocks
  const orgEmail = "org@test.com";

  beforeEach(() => {
    mockQuery.mockClear();
    mockClient.query.mockClear();
  });

  test("1. Parent Registration Success", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: parentEmail,
      password: "password123",
      firstName: "Parent",
      lastName: "User",
      accountType: "adult",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("email", parentEmail);

    // Verify Insert
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users"),
      expect.anything(),
    );
  });

  test("2. Organization Registration Success & Auto-Setup", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: orgEmail,
        password: "password123",
        firstName: "Club",
        lastName: "Owner",
        accountType: "organization",
        orgTypes: ["Football"],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.user).toHaveProperty("account_type", "organization");

    // Verify Org Creation logic was called
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO organizations"),
      expect.anything(),
    );
  });

  test("3. Login Success for User", async () => {
    // Mock query needs to return user for this specific test
    // Handled in mockQuery definition above

    const res = await request(app).post("/api/auth/login").send({
      email: parentEmail,
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("4. Duplicate Email Fails", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "Dupe@test.com", // Trigger duplicate mock
      password: "password123",
      firstName: "Dupe",
      lastName: "User",
      accountType: "adult",
    });

    expect(res.statusCode).toBe(409);
  });
});
