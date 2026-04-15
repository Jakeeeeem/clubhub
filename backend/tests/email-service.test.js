/* eslint-env jest */
// Simple test for email-service parental approval email using mocked transporter
process.env.NODE_ENV = "test";

const emailService = require("../services/email-service");

describe("Email service", () => {
  test("sends parental approval email (mocked)", async () => {
    const res = await emailService.sendParentalApprovalEmail({
      to: "parent@example.test",
      parentFirstName: "Jane",
      scoutName: "Scout Joe",
      playerName: "Alex Player",
      approvalLink:
        "http://localhost:8000/parent-approval.html?token=testtoken&req=testid",
      denyLink:
        "http://localhost:8000/parent-approval.html?token=testtoken&req=testid&action=deny",
    });

    expect(res).toBeDefined();
    expect(typeof res).toBe("object");
    expect(res.success).toBeTruthy();
  }, 10000);
});
