const request = require("supertest");
const app = require("../server");

describe("Camp endpoints (basic smoke tests)", () => {
  // These tests are optional and use placeholders. They are skipped by default.
  test.skip("should list groups for event (requires real event id)", async () => {
    const eventId = "00000000-0000-0000-0000-000000000001";
    const res = await request(app)
      .get(`/api/events/${eventId}/groups`)
      .set("Accept", "application/json");
    expect([200, 404]).toContain(res.status);
  });

  test.skip("should export CSV for event (requires real event id)", async () => {
    const eventId = "00000000-0000-0000-0000-000000000001";
    const res = await request(app)
      .get(`/api/events/${eventId}/export`)
      .set("Accept", "text/csv");
    expect([200, 404]).toContain(res.status);
  });
});
