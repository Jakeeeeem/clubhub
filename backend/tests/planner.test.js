const request = require("supertest");

// Mock Database FIRST before requiring app
const mockQuery = jest.fn();
const mockWithTransaction = jest.fn(async (callback) => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
  return await callback(mockClient);
});

jest.mock("../config/database", () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction,
  queries: {},
}));

// Mock Auth Middleware
jest.mock("../middleware/auth", () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      id: "user-123",
      email: "test@test.com",
      accountType: "organization",
    };
    next();
  },
  requireOrganization: (req, res, next) => {
    next();
  },
  optionalAuth: (req, res, next) => {
    req.user = { id: "user-123", accountType: "organization" };
    next();
  },
  requireAdult: (req, res, next) => next(),
  requirePlatformAdmin: (req, res, next) => next(),
  requireClubOwnership: (req, res, next) => next(),
  rateLimitSensitive: (req, res, next) => next(),
  injectOrgContext: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
}));

// Mock Email Service
jest.mock("../services/email-service", () => ({
  sendEventReminderEmail: jest.fn().mockResolvedValue(true),
}));

const app = require("../server");

describe("Planner (Events) API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Create Event Success", async () => {
    // 1. Resolve organization_id
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "org-123" }] });

    // 2. Mock Transaction for Insert
    mockWithTransaction.mockImplementationOnce(async (callback) => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [
            { id: "event-123", title: "Test Event", event_date: "2025-10-01" },
          ],
        }),
        release: jest.fn(),
      };
      return await callback(mockClient);
    });

    const res = await request(app).post("/api/events").send({
      title: "Test Event",
      eventType: "training",
      eventDate: "2025-10-01",
      eventTime: "10:00",
      capacity: 20,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.events[0].title).toBe("Test Event");
  });

  test("2. Get Events Success with Calculated Spots", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "event-1",
          title: "Event 1",
          event_date: "2025-10-01",
          capacity: 10,
          booking_count: 2,
        },
      ],
    });

    const res = await request(app)
      .get("/api/events")
      .query({ upcoming: "true" });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].spots_available).toBe(8);
  });

  test("3. Get Specific Event Success", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: "event-1",
            title: "Event 1",
            event_date: "2025-10-01",
            event_type: "training",
          },
        ],
      }) // Event details
      .mockResolvedValueOnce({ rows: [{ booking_count: 5 }] }) // Bookings count
      .mockResolvedValueOnce({ rows: [] }); // User booking check (due to req.user being mocked)

    const res = await request(app).get("/api/events/event-1");

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe("event-1");
    expect(res.body.booking_count).toBe(5);
  });

  test("4. Create Recurring Events", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "org-123" }] }); // Resolve org

    // Transaction should be called for each date (October 1st to October 15th weekly = 3 dates)
    let callCount = 0;
    mockWithTransaction.mockImplementationOnce(async (callback) => {
      const mockClient = {
        query: jest.fn().mockImplementation((text) => {
          if (text.includes("INSERT INTO events")) {
            callCount++;
            return Promise.resolve({
              rows: [{ id: `event-${callCount}`, title: "Recurring" }],
            });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
      };
      return await callback(mockClient);
    });

    const res = await request(app).post("/api/events").send({
      title: "Recurring Weekly",
      eventType: "training",
      eventDate: "2025-10-01", // Wed
      recurrencePattern: "weekly",
      recurrenceEndDate: "2025-10-15", // Should create for Oct 1, 8, 15
      capacity: 10,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.count).toBe(3);
    expect(callCount).toBe(3);
  });

  test("5. Prevent Booking Past Events", async () => {
    // Mock event that is in the past
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "past-event", event_date: "2020-01-01" }],
    });

    const res = await request(app)
      .post("/api/events/past-event/book")
      .send({
        playerData: {
          firstName: "Test",
          lastName: "Player",
          email: "test@player.com",
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Event has passed");
  });
});
