const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
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
      req.user = { id: 1, email: "test@example.com", groupId: "test-group-id" };
      next();
    },
    requireOrganization: (req, res, next) => {
      req.user.organization_id = "test-group-id";
      next();
    },
    optionalAuth: (req, res, next) => {
      req.user = { id: 1, email: "test@example.com", groupId: "test-group-id" };
      next();
    },
  };
});

// Import mock DB after mocking it
const db = require("../config/database");
app.use(express.json());
app.use("/api/tournaments", require("../routes/tournaments"));

describe("Tournaments API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new tournament", async () => {
    db.withTransaction.mockImplementation(async (cb) => {
      const client = {
        query: jest.fn(),
      };
      // Mock INSERT events return ID
      client.query.mockResolvedValueOnce({
        rows: [{ id: "new-tournament-id" }],
      });
      // Mock SELECT team name
      client.query.mockResolvedValueOnce({ rows: [{ name: "Team A" }] });
      // Mock INSERT tournament_teams
      client.query.mockResolvedValueOnce({ rows: [] });
      return await cb(client);
    });

    const res = await request(app)
      .post("/api/tournaments")
      .send({
        name: "Summer Cup 2024",
        type: "knockout",
        teams: ["team-1"],
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Tournament created");
    expect(res.body.id).toBe("new-tournament-id");
    expect(db.withTransaction).toHaveBeenCalled();
  });

  it("should fetch a tournament dashboard", async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: "tourney-1", title: "Summer Cup" }],
      }) // event
      .mockResolvedValueOnce({
        rows: [
          { id: "t-1", team_name: "Team A" },
          { id: "t-2", team_name: "Team B" },
        ],
      }) // teams
      .mockResolvedValueOnce({ rows: [] }) // stages
      .mockResolvedValueOnce({ rows: [] }) // matches
      .mockResolvedValueOnce({ rows: [] }); // groups

    const res = await request(app).get("/api/tournaments/tourney-1/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Summer Cup");
    expect(res.body.teams.length).toBe(2);
    expect(db.query).toHaveBeenCalledTimes(5);
  });

  it("should upload and update match video", async () => {
    // We mock multer in the router if it was pure testing, but since it's an end-to-end integration test of the route here
    // using supertest it normally requires a multipart request.
    // Let's mock DB for normal result submission.
    db.query.mockResolvedValueOnce({ rows: [{ id: "tourney-1" }] }); // check event
    db.withTransaction.mockImplementation(async (cb) => {
      const client = { query: jest.fn() };
      client.query.mockResolvedValueOnce({
        rows: [{ id: "match-1", home_team_id: "t-1", away_team_id: "t-2" }],
      }); // update score
      return await cb(client);
    });

    const res = await request(app)
      .post("/api/tournaments/matches/match-1/result")
      .send({
        homeScore: 3,
        awayScore: 1,
        scorers: [
          { playerId: "p-1", teamId: "t-1", type: "goal" },
          { playerId: "p-2", teamId: "t-1", type: "goal" },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Match result and stats updated");
  });
});
