const request = require("supertest");
const express = require("express");
const app = express();

// Mock database
jest.mock("../config/database", () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

// Mock auth middleware
jest.mock("../middleware/auth", () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: "00000000-0000-4000-a000-000000000001", email: "coach@clubhub.com" };
    next();
  },
  requireOrganization: (req, res, next) => {
    req.user.organization_id = "00000000-0000-4000-a000-000000000002";
    next();
  },
  optionalAuth: (req, res, next) => {
    req.user = { id: "00000000-0000-4000-a000-000000000001" };
    next();
  }
}));

// Mock email service
jest.mock("../services/email-service", () => ({
  sendEventNotification: jest.fn()
}));

const db = require("../config/database");
app.use(express.json());
app.use("/api/events", require("../routes/events"));

describe("Events API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/events", () => {
    it("should successfully create a single event", async () => {
      db.withTransaction.mockImplementation(async (cb) => {
        const client = {
          query: jest.fn().mockResolvedValue({
            rows: [{ id: "00000000-0000-4000-a000-000000000003", title: "Training Session" }]
          })
        };
        return await cb(client);
      });

      const res = await request(app)
        .post("/api/events")
        .send({
          title: "Training Session",
          eventType: "training",
          eventDate: "2024-06-01",
          eventTime: "18:00",
          clubId: "00000000-0000-4000-a000-000000000002" // Valid UUID
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Event created successfully");
      expect(res.body.event.id).toBe("00000000-0000-4000-a000-000000000003");
    });
  });

  describe("GET /api/events", () => {
    it("should list events for the authenticated user", async () => {
      db.query.mockResolvedValue({
        rows: [
          { id: "e1", title: "Match A", booking_count: 5 },
          { id: "e2", title: "Social B", booking_count: 2 }
        ]
      });

      const res = await request(app).get("/api/events");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe("GET /api/events/:id/availability", () => {
    it("should return availability responses for an event", async () => {
      const eventId = "00000000-0000-4000-b000-000000000001";
      const userId = "00000000-0000-4000-a000-000000000001";

      db.query
        .mockResolvedValueOnce({
          rows: [{ id: eventId, created_by: userId, club_id: "c1", team_id: "t1" }]
        }) // Permission check
        .mockResolvedValueOnce({
          rows: [
            { player_id: "p1", availability: "yes", first_name: "John" },
            { player_id: "p2", availability: "no", first_name: "Jane" }
          ]
        }); // Availability data

      const res = await request(app).get(`/api/events/${eventId}/availability`);

      expect(res.status).toBe(200);
      expect(res.body.responses.yes.length).toBe(1);
      expect(res.body.responses.no.length).toBe(1);
    });
  });
});
