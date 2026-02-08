const express = require("express");
const { query, queries, withTransaction } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
  optionalAuth,
} = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");

const router = express.Router();

// 🔴 PAYMENT PROCESSING FEATURE FLAG
// Set to 'true' in .env to enable actual payment charging
const PAYMENT_PROCESSING_ENABLED =
  process.env.ENABLE_PAYMENT_PROCESSING === "true";

if (!PAYMENT_PROCESSING_ENABLED) {
  console.log(
    "⚠️  Payment processing is DISABLED. Set ENABLE_PAYMENT_PROCESSING=true in .env to enable.",
  );
}

// Middleware to block payment processing if disabled
function requirePaymentProcessing(req, res, next) {
  if (!PAYMENT_PROCESSING_ENABLED) {
    return res.status(403).json({
      error: "Payment processing is currently disabled",
      message:
        "Payment collection is not yet enabled on this platform. Please contact support.",
      hint: "Set ENABLE_PAYMENT_PROCESSING=true in environment variables to enable",
    });
  }
  next();
}

module.exports = { router, requirePaymentProcessing };
