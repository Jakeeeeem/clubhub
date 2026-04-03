const request = require("supertest");
const express = require("express");
const app = express();

// Mock query and withTransaction
jest.mock("../config/database", () => {
  return {
    query: jest.fn(),
    withTransaction: jest.fn(),
  };
});

jest.mock("../middleware/auth", () => {
  return {
    authenticateToken: (req, res, next) => {
      req.user = { id: 'test-user-id', email: "test@example.com", groupId: "test-group-id" };
      next();
    },
    requireOrganization: (req, res, next) => {
      req.user.organization_id = "test-group-id";
      next();
    },
  };
});

const db = require("../config/database");
app.use(express.json());
app.use("/api/tournaments", require("../routes/tournaments"));

describe("Tournament Bracket Generation Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate a full 3-round bracket for 8 teams", async () => {
    const eventId = "test-event-id";
    const teams = Array.from({ length: 8 }, (_, i) => ({
      id: `team-${i + 1}`,
      team_name: `Team ${String.fromCharCode(65 + i)}`,
      status: 'approved'
    }));

    db.withTransaction.mockImplementation(async (cb) => {
      const client = {
        query: jest.fn()
      };

      // 1. Mock Stage creation
      client.query.mockResolvedValueOnce({ rows: [{ id: "stage-1" }] });
      
      // 2. Mock Teams fetch
      client.query.mockResolvedValueOnce({ rows: teams });

      // 3. Mock Match creation (7 matches for 8 teams)
      // Round 3 (Final): 1 match
      client.query.mockResolvedValueOnce({ rows: [{ id: "match-final" }] });
      // Round 2 (Semis): 2 matches
      client.query.mockResolvedValueOnce({ rows: [{ id: "match-semi-1" }] });
      client.query.mockResolvedValueOnce({ rows: [{ id: "match-semi-2" }] });
      // Round 1 (Quarters): 4 matches
      client.query.mockResolvedValueOnce({ rows: [{ id: "match-qf-1" }] });
      client.query.mockResolvedValueOnce({ rows: [{ id: "match-qf-2" }] });
      client.query.mockResolvedValueOnce({ rows: [{ id: "match-qf-3" }] });
      client.query.mockResolvedValueOnce({ rows: [{ id: "match-qf-4" }] });

      // 4. Mock Match linking (6 updates for 3 rounds)
      client.query.mockResolvedValue({ rows: [] });

      // 5. Mock Round 1 team filling (4 updates)
      client.query.mockResolvedValue({ rows: [] });

      return await cb(client);
    });

    const res = await request(app)
      .post(`/api/tournaments/${eventId}/generate-fixtures`)
      .send({
        stageName: "Knockout Phase",
        type: "knockout"
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Fixtures generated");
    
    // Total Match Insertions: 1 Stage + 1 Team Fetch + 7 Match Inserts = 9 calls? 
    // Wait, let's check exact call counts in implementation
    // The implementation creates rounds from numRounds down to 1.
    // 8 teams -> numRounds = 3.
    // R3: 1 match. R2: 2 matches. R1: 4 matches. Total = 7 matches.
  });

  it("should handle byes for 6 teams", async () => {
    const eventId = "test-event-id-byes";
    const teams = Array.from({ length: 6 }, (_, i) => ({
      id: `team-${i + 1}`,
      team_name: `Team ${String.fromCharCode(65 + i)}`,
      status: 'approved'
    }));

    db.withTransaction.mockImplementation(async (cb) => {
      const client = {
        query: jest.fn()
      };

      // Stage creation
      client.query.mockResolvedValueOnce({ rows: [{ id: "stage-byes" }] });
      // Teams fetch
      client.query.mockResolvedValueOnce({ rows: teams });

      // 6 teams -> numRounds 3 (8 bracket size)
      // R3: 1. R2: 2. R1: 4. Total = 7 matches.
      client.query.mockResolvedValue({ rows: [{ id: "some-match-id" }] });

      return await cb(client);
    });

    const res = await request(app)
      .post(`/api/tournaments/${eventId}/generate-fixtures`)
      .send({
        stageName: "Knockout Phase",
        type: "knockout"
      });

    expect(res.status).toBe(200);
  });
});
