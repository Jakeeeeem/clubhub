#!/usr/bin/env node
// Simple test for email-service parental approval email using mocked transporter
process.env.NODE_ENV = "test";

(async () => {
  try {
    const emailService = require("../services/email-service");
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

    console.log("emailService test result:", res);
    if (res && res.success) {
      console.log("OK: Email service test passed");
      process.exit(0);
    } else {
      console.error("FAIL: Unexpected email service result");
      process.exit(2);
    }
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(3);
  }
})();
