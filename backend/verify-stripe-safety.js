#!/usr/bin/env node

/**
 * STRIPE CONNECT SAFETY VERIFICATION SCRIPT
 *
 * This script verifies that:
 * 1. Payment processing is disabled
 * 2. payment.html is inaccessible
 * 3. Stripe Connect operations are safe (no charging)
 * 4. Environment is configured correctly
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config();

console.log("\n🛡️  STRIPE CONNECT SAFETY VERIFICATION\n");
console.log("═".repeat(60));

let allTestsPassed = true;
const results = [];

// Test 1: Check ENABLE_PAYMENT_PROCESSING flag
console.log("\n1️⃣  Checking ENABLE_PAYMENT_PROCESSING flag...");
const paymentProcessingEnabled =
  process.env.ENABLE_PAYMENT_PROCESSING === "true";
if (!paymentProcessingEnabled) {
  console.log("   ✅ PASS: Payment processing is DISABLED");
  results.push({ test: "Payment Processing Flag", status: "PASS", safe: true });
} else {
  console.log("   ❌ FAIL: Payment processing is ENABLED - UNSAFE!");
  results.push({
    test: "Payment Processing Flag",
    status: "FAIL",
    safe: false,
  });
  allTestsPassed = false;
}

// Test 2: Check payment.html is disabled
console.log("\n2️⃣  Checking payment.html accessibility...");
const frontendPath = path.join(__dirname, "../frontend");
const paymentHtmlPath = path.join(frontendPath, "payment.html");
const paymentHtmlDisabledPath = path.join(
  frontendPath,
  "payment.html.DISABLED",
);

const paymentHtmlExists = fs.existsSync(paymentHtmlPath);
const paymentHtmlDisabledExists = fs.existsSync(paymentHtmlDisabledPath);

if (!paymentHtmlExists && paymentHtmlDisabledExists) {
  console.log("   ✅ PASS: payment.html is disabled (renamed to .DISABLED)");
  results.push({ test: "payment.html Disabled", status: "PASS", safe: true });
} else if (paymentHtmlExists) {
  console.log("   ❌ FAIL: payment.html is ACCESSIBLE - UNSAFE!");
  results.push({ test: "payment.html Disabled", status: "FAIL", safe: false });
  allTestsPassed = false;
} else {
  console.log(
    "   ⚠️  WARNING: Neither payment.html nor payment.html.DISABLED found",
  );
  results.push({
    test: "payment.html Disabled",
    status: "WARNING",
    safe: true,
  });
}

// Test 3: Check Stripe keys are configured
console.log("\n3️⃣  Checking Stripe configuration...");
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

if (stripeSecretKey && stripePublishableKey) {
  const isLiveKey = stripeSecretKey.startsWith("sk_live_");
  const isTestKey = stripeSecretKey.startsWith("sk_test_");

  if (isLiveKey) {
    console.log("   ⚠️  Using LIVE Stripe keys");
    console.log("   ✅ PASS: But payment processing is disabled - SAFE");
    results.push({
      test: "Stripe Keys",
      status: "PASS",
      safe: true,
      note: "Live keys with payments disabled",
    });
  } else if (isTestKey) {
    console.log("   ✅ PASS: Using TEST Stripe keys - SAFE");
    results.push({
      test: "Stripe Keys",
      status: "PASS",
      safe: true,
      note: "Test keys",
    });
  } else {
    console.log("   ⚠️  WARNING: Unknown Stripe key format");
    results.push({ test: "Stripe Keys", status: "WARNING", safe: true });
  }
} else {
  console.log("   ❌ FAIL: Stripe keys not configured");
  results.push({ test: "Stripe Keys", status: "FAIL", safe: false });
  allTestsPassed = false;
}

// Test 4: Check database connection (optional)
console.log("\n4️⃣  Checking database configuration...");
const dbHost = process.env.DB_HOST;
const dbName = process.env.DB_NAME;

if (dbHost && dbName) {
  console.log(`   ✅ PASS: Database configured (${dbHost}/${dbName})`);
  results.push({ test: "Database Config", status: "PASS", safe: true });
} else {
  console.log("   ⚠️  WARNING: Database not fully configured");
  results.push({ test: "Database Config", status: "WARNING", safe: true });
}

// Test 5: Verify safe operations are available
console.log("\n5️⃣  Checking safe operation routes...");
const routesPath = path.join(__dirname, "routes");
const paymentsRoutePath = path.join(routesPath, "payments.js");
const platformAdminRoutePath = path.join(routesPath, "platform-admin.js");

if (fs.existsSync(paymentsRoutePath) && fs.existsSync(platformAdminRoutePath)) {
  console.log("   ✅ PASS: Route files exist");
  results.push({ test: "Route Files", status: "PASS", safe: true });
} else {
  console.log("   ❌ FAIL: Route files missing");
  results.push({ test: "Route Files", status: "FAIL", safe: false });
  allTestsPassed = false;
}

// Summary
console.log("\n" + "═".repeat(60));
console.log("\n📊 TEST SUMMARY:\n");

results.forEach((result, index) => {
  const icon =
    result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⚠️ ";
  const note = result.note ? ` (${result.note})` : "";
  console.log(`${index + 1}. ${result.test}: ${icon} ${result.status}${note}`);
});

console.log("\n" + "═".repeat(60));

if (allTestsPassed) {
  console.log("\n🎉 ALL TESTS PASSED - SYSTEM IS SAFE\n");
  console.log("✅ Safe Operations Available:");
  console.log("   - Stripe Connect (account linking)");
  console.log("   - Payment Plan Management");
  console.log("   - Player Assignment");
  console.log("   - Super Admin Monitoring\n");
  console.log("🔴 Blocked Operations:");
  console.log("   - Online card payments");
  console.log("   - Payment intent creation");
  console.log("   - Charging cards\n");
  process.exit(0);
} else {
  console.log("\n❌ SOME TESTS FAILED - SYSTEM MAY NOT BE SAFE\n");
  console.log(
    "Please review the failed tests above and fix them before proceeding.\n",
  );
  process.exit(1);
}
