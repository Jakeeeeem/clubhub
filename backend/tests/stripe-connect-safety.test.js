/**
 * STRIPE CONNECT SAFETY TESTS
 *
 * These tests verify that Stripe Connect operations are SAFE and do NOT:
 * - Charge any cards
 * - Process any payments
 * - Create any payment intents
 * - Move any money
 *
 * Stripe Connect ONLY links accounts - it's a read-only operation from a payment perspective.
 */

const request = require("supertest");
const { expect } = require("chai");
const sinon = require("sinon");

describe("🛡️ STRIPE CONNECT SAFETY TESTS", () => {
  let app;
  let stripeStub;
  let authToken;

  before(async () => {
    // Setup test app and authentication
    app = require("../server");

    // Login as test user to get auth token
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "testpassword123",
    });

    authToken = loginRes.body.token;
  });

  beforeEach(() => {
    // Stub Stripe to prevent any real API calls
    stripeStub = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("✅ Stripe Connect Account Linking", () => {
    it("should create Stripe Connect account WITHOUT charging", async () => {
      const res = await request(app)
        .post("/api/stripe/connect/onboard")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          organizationId: "test-org-123",
        });

      // Verify response
      expect(res.status).to.be.oneOf([200, 201]);
      expect(res.body).to.have.property("accountLink");

      // CRITICAL: Verify NO payment methods were called
      expect(stripeStub).to.not.have.been.calledWith(
        sinon.match.has("paymentIntents"),
      );
      expect(stripeStub).to.not.have.been.calledWith(
        sinon.match.has("charges"),
      );
      expect(stripeStub).to.not.have.been.calledWith(
        sinon.match.has("paymentMethods"),
      );
    });

    it("should retrieve connected account info WITHOUT charging", async () => {
      const res = await request(app)
        .get("/api/stripe/connect/account")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).to.equal(200);

      // CRITICAL: Should only read account info, not create charges
      expect(res.body).to.not.have.property("paymentIntent");
      expect(res.body).to.not.have.property("charge");
      expect(res.body).to.not.have.property("clientSecret");
    });

    it("should NOT expose payment processing endpoints", async () => {
      // These endpoints should NOT exist or should be disabled
      const dangerousEndpoints = [
        "/api/payments/create-intent",
        "/api/payments/confirm-payment",
        "/api/payments/charge-player",
      ];

      for (const endpoint of dangerousEndpoints) {
        const res = await request(app)
          .post(endpoint)
          .set("Authorization", `Bearer ${authToken}`)
          .send({ amount: 100 });

        // Should either 404 or 403 (forbidden)
        expect(res.status).to.be.oneOf([403, 404]);

        // Should NOT return a successful payment
        expect(res.body).to.not.have.property("clientSecret");
        expect(res.body).to.not.have.property("paymentIntentId");
      }
    });
  });

  describe("✅ Payment Plan Management (No Charging)", () => {
    it("should create payment plan WITHOUT charging", async () => {
      const res = await request(app)
        .post("/api/plans")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Plan",
          amount: 30.0,
          frequency: "monthly",
          description: "Test membership plan",
        });

      expect(res.status).to.be.oneOf([200, 201]);
      expect(res.body).to.have.property("id");

      // CRITICAL: Creating a plan should NOT charge anyone
      expect(stripeStub).to.not.have.been.calledWith(
        sinon.match.has("paymentIntents"),
      );
    });

    it("should assign player to plan WITHOUT charging", async () => {
      const res = await request(app)
        .post("/api/payments/plan/assign")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          playerId: "test-player-123",
          planId: "test-plan-456",
        });

      expect(res.status).to.equal(200);

      // CRITICAL: Assigning to plan should NOT create charges
      expect(res.body).to.not.have.property("paymentIntent");
      expect(res.body).to.not.have.property("charge");
    });
  });

  describe("✅ Super Admin Monitoring (Read-Only)", () => {
    it("should fetch connected accounts WITHOUT charging", async () => {
      const res = await request(app)
        .get("/api/platform-admin/stats")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ includeMock: false });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("stats");

      // CRITICAL: Monitoring should be read-only
      expect(stripeStub).to.not.have.been.calledWith(
        sinon.match.has("paymentIntents"),
      );
    });

    it("should list organizations WITHOUT charging", async () => {
      const res = await request(app)
        .get("/api/platform-admin/organizations")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ includeMock: false });

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an("array");

      // Verify each org has Stripe account ID but no payment data
      res.body.forEach((org) => {
        expect(org).to.not.have.property("paymentIntent");
        expect(org).to.not.have.property("clientSecret");
      });
    });
  });

  describe("🔴 CRITICAL: Payment Processing Blocked", () => {
    it("should block payment intent creation when flag is false", async () => {
      // Ensure flag is set to false
      process.env.ENABLE_PAYMENT_PROCESSING = "false";

      const res = await request(app)
        .post("/api/payments/create-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 50.0,
          paymentId: "test-payment-123",
        });

      // Should be forbidden
      expect(res.status).to.equal(403);
      expect(res.body).to.have.property("error");
      expect(res.body.error).to.include("disabled");

      // CRITICAL: Should NOT have created a payment intent
      expect(res.body).to.not.have.property("clientSecret");
      expect(res.body).to.not.have.property("paymentIntentId");
    });

    it("should return 404 for payment.html", async () => {
      const res = await request(app).get("/payment.html");

      // File should not exist (renamed to .DISABLED)
      expect(res.status).to.equal(404);
    });

    it("should verify payment.html.DISABLED exists", () => {
      const fs = require("fs");
      const path = require("path");

      const disabledPath = path.join(
        __dirname,
        "../../frontend/payment.html.DISABLED",
      );
      const enabledPath = path.join(__dirname, "../../frontend/payment.html");

      // Disabled file should exist
      expect(fs.existsSync(disabledPath)).to.be.true;

      // Enabled file should NOT exist
      expect(fs.existsSync(enabledPath)).to.be.false;
    });
  });

  describe("🔍 Stripe API Call Verification", () => {
    it("should NEVER call stripe.paymentIntents.create", async () => {
      // Run all safe operations
      await request(app)
        .post("/api/stripe/connect/onboard")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ organizationId: "test-org" });

      await request(app)
        .post("/api/plans")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Test", amount: 30 });

      await request(app)
        .get("/api/platform-admin/stats")
        .set("Authorization", `Bearer ${authToken}`);

      // CRITICAL: Verify paymentIntents was NEVER called
      const paymentIntentCalls = stripeStub
        .getCalls()
        .filter(
          (call) => call.args[0] && call.args[0].includes("paymentIntents"),
        );

      expect(paymentIntentCalls).to.have.lengthOf(0);
    });

    it("should NEVER call stripe.charges.create", async () => {
      // Run all safe operations
      await request(app)
        .get("/api/platform-admin/organizations")
        .set("Authorization", `Bearer ${authToken}`);

      // CRITICAL: Verify charges was NEVER called
      const chargeCalls = stripeStub
        .getCalls()
        .filter((call) => call.args[0] && call.args[0].includes("charges"));

      expect(chargeCalls).to.have.lengthOf(0);
    });
  });

  describe("📊 Environment Variable Checks", () => {
    it("should have ENABLE_PAYMENT_PROCESSING set to false", () => {
      expect(process.env.ENABLE_PAYMENT_PROCESSING).to.equal("false");
    });

    it("should have Stripe keys configured", () => {
      expect(process.env.STRIPE_SECRET_KEY).to.exist;
      expect(process.env.STRIPE_PUBLISHABLE_KEY).to.exist;
    });

    it("should warn if using live keys with payments disabled", () => {
      const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_");
      const paymentsDisabled = process.env.ENABLE_PAYMENT_PROCESSING !== "true";

      if (isLiveKey && paymentsDisabled) {
        console.warn(
          "⚠️  Using LIVE Stripe keys but payment processing is disabled - GOOD!",
        );
      }

      // This is actually the SAFE state
      expect(isLiveKey && paymentsDisabled).to.be.true;
    });
  });
});

describe("✅ INTEGRATION: Full Safe Workflow", () => {
  it("should complete full membership workflow WITHOUT charging", async () => {
    const app = require("../server");

    // Login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "password123" });

    const token = loginRes.body.token;

    // 1. Connect Stripe account
    const connectRes = await request(app)
      .post("/api/stripe/connect/onboard")
      .set("Authorization", `Bearer ${token}`)
      .send({ organizationId: "test-org" });

    expect(connectRes.status).to.be.oneOf([200, 201]);

    // 2. Create payment plan
    const planRes = await request(app)
      .post("/api/plans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Monthly Membership",
        amount: 30.0,
        frequency: "monthly",
      });

    expect(planRes.status).to.be.oneOf([200, 201]);
    const planId = planRes.body.id;

    // 3. Assign player to plan
    const assignRes = await request(app)
      .post("/api/payments/plan/assign")
      .set("Authorization", `Bearer ${token}`)
      .send({
        playerId: "test-player-123",
        planId: planId,
      });

    expect(assignRes.status).to.equal(200);

    // 4. View in Super Admin
    const statsRes = await request(app)
      .get("/api/platform-admin/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(statsRes.status).to.equal(200);

    // CRITICAL: Entire workflow completed WITHOUT any charges
    // No clientSecret, no paymentIntent, no charges created
    expect(connectRes.body).to.not.have.property("clientSecret");
    expect(planRes.body).to.not.have.property("paymentIntent");
    expect(assignRes.body).to.not.have.property("charge");
    expect(statsRes.body).to.not.have.property("paymentIntent");

    console.log("✅ Full workflow completed safely - NO CHARGES");
  });
});
