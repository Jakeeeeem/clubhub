const request = require("supertest");

// MOCK DB
const mockQuery = jest.fn((text, params) => {
  // Return a row ONLY if email contains "dupe" or if it is exactly the login emails
  const email = params && params[0] ? params[0].toLowerCase() : "";

  // Duplicate check triggered in tests 1 & 2 (should be empty)
  // Duplicate check triggered in test 4 (should find one)
  if (email.includes("dupe")) {
    return Promise.resolve({ rows: [{ id: "999", email }] });
  }

  // Login check triggered in test 3 (should find one)
  if (email === "parent@test.com") {
    return Promise.resolve({
      rows: [
        {
          id: "uuid-parent",
          email: "parent@test.com",
          password_hash: "hashed",
          account_type: "adult",
          is_active: true,
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
            id: "new-uuid",
            email: params[0],
            account_type: params[4],
            first_name: params[2],
            last_name: params[3],
          },
        ],
      });
    }
    if (text.includes("INSERT INTO organizations")) {
      return Promise.resolve({ rows: [{ id: "org-uuid", name: params[0] }] });
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
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
  compare: jest.fn().mockResolvedValue(true),
}));

const app = require("../server");

jest.mock("../services/email-service", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendAdminWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock("stripe", () => {
  return jest.fn(() => ({
    products: { list: jest.fn().mockResolvedValue({ data: [] }) },
    prices: { list: jest.fn().mockResolvedValue({ data: [] }) },
  }));
});

describe("Public Registration Flow (Simple Mocks)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Parent Registration Success", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "new_user@test.com",
      password: "password123",
      firstName: "New",
      lastName: "User",
      accountType: "adult",
    });

    expect(res.statusCode).toBe(201);
  });

  test("2. Organization Registration Success", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "new_org@test.com",
        password: "password123",
        firstName: "Club",
        lastName: "Owner",
        accountType: "organization",
        orgTypes: ["Football"],
      });

    expect(res.statusCode).toBe(201);
  });

  test("3. Login Success", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "parent@test.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
  });

  test("4. Duplicate Fails", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "dupe_user@test.com",
      password: "password123",
      firstName: "Dupe",
      lastName: "User",
      accountType: "adult",
    });

    expect(res.statusCode).toBe(409);
  });
});
