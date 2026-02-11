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
const { requirePaymentProcessing } = require("../middleware/payment-guard");
const emailService = require("../services/email-service");

const router = express.Router();

/**
 * Helper to calculate next billing date based on plan settings
 */
function calculateNextBilling(plan, startStr) {
  const start = startStr ? new Date(startStr) : new Date();
  let next = new Date(start);

  if (plan.billing_anchor_type === "fixed_date" && plan.billing_anchor_day) {
    // Set to the target day
    next.setDate(plan.billing_anchor_day);

    // If that day is today or in the past this month, move to next month
    if (next <= start) {
      next.setMonth(next.getMonth() + 1);
    }
  } else {
    // Default signup_date logic
    if (plan.interval === "month") next.setMonth(next.getMonth() + 1);
    else if (plan.interval === "week") next.setDate(next.getDate() + 7);
    else if (plan.interval === "year") next.setFullYear(next.getFullYear() + 1);
  }

  return next.toISOString().slice(0, 10);
}

// Basic routes follow below
// ---------- STRIPE CONFIG ENDPOINT ----------

// GET /api/payments/config - Get Stripe configuration
router.get("/config", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    mode: process.env.NODE_ENV,
  });
});

// ---------- STRIPE CONNECT (PAYOUTS ACCOUNT) ENDPOINTS ----------

// Helper: get or create a Stripe Connect account for the current user
async function getOrCreateStripeConnectAccount(user) {
  try {
    // Check if stripe_account_id column exists, if not, add it
    const userResult = await query(
      `
      SELECT id, email, first_name, last_name, stripe_account_id 
      FROM users 
      WHERE id = $1
    `,
      [user.id],
    ).catch(async (err) => {
      if (err.message.includes('column "stripe_account_id" does not exist')) {
        console.log("Adding stripe_account_id column to users table...");
        await query(
          `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255)`,
        );
        return await query(
          `SELECT id, email, first_name, last_name, stripe_account_id FROM users WHERE id = $1`,
          [user.id],
        );
      }
      throw err;
    });

    if (userResult.rows.length === 0) throw new Error("User not found");
    const dbUser = userResult.rows[0];

    let accountId = dbUser.stripe_account_id;

    if (!accountId) {
      // Create a Standard Connect account instead of Express to avoid platform profile issues
      const account = await stripe.accounts.create({
        type: "standard", // Changed from 'express'
        email: dbUser.email,
        settings: {
          payouts: {
            schedule: {
              interval: "monthly",
              monthly_anchor: 1,
            },
          },
        },
        metadata: {
          app_user_id: String(dbUser.id),
        },
      });

      accountId = account.id;
      // Update both users and organizations tables for consistency
      await query(
        `UPDATE users SET stripe_account_id = $1, updated_at = NOW() WHERE id = $2`,
        [accountId, user.id],
      );
      await query(
        `UPDATE organizations SET stripe_account_id = $1, updated_at = NOW() WHERE owner_id = $2`,
        [accountId, user.id],
      );
    }

    // Always fetch latest status
    let account = await stripe.accounts.retrieve(accountId);

    // If account exists but doesn't have the payout schedule set to monthly on the 1st, update it
    if (
      account.settings?.payouts?.schedule?.interval !== "monthly" ||
      account.settings?.payouts?.schedule?.monthly_anchor !== 1
    ) {
      console.log(
        `Updating payout schedule for account ${accountId} to monthly on the 1st...`,
      );
      account = await stripe.accounts.update(accountId, {
        settings: {
          payouts: {
            schedule: {
              interval: "monthly",
              monthly_anchor: 1,
            },
          },
        },
      });
    }

    return account;
  } catch (err) {
    console.error("Stripe Connect account error:", err);

    // Handle specific Stripe errors
    if (err.type === "StripeInvalidRequestError") {
      if (err.message.includes("platform profile")) {
        throw new Error(
          "Stripe Connect not properly configured. Please contact support.",
        );
      }
    }

    throw err;
  }
}

// GET /api/payments/stripe/connect/status
router.get("/stripe/connect/status", authenticateToken, async (req, res) => {
  try {
    const account = await getOrCreateStripeConnectAccount(req.user);
    const response = {
      linked: true,
      account_id: account.id,
      stripeAccountId: account.id, // For frontend compatibility
      payouts_enabled: !!account.payouts_enabled,
      details_submitted: !!account.details_submitted,
      requirements: account.requirements?.currently_due || [],
    };

    // Auto-Sync Plans if connected but no plans exist locally
    if (account.details_submitted) {
      // removed payouts_enabled check for broader compat
      let orgId = req.user.currentOrganizationId;

      if (!orgId) {
        const userOrgs = await query(
          "SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1",
          [req.user.id],
        );
        orgId = userOrgs.rows[0]?.id;
      }

      if (!orgId) {
        console.log("No organization context found for auto-sync skipping...");
        return res.json(response);
      }
      const result = await query(
        "SELECT COUNT(*) FROM plans WHERE club_id = $1",
        [orgId],
      );

      if (parseInt(result.rows[0].count) === 0) {
        console.log("🔄 Auto-syncing plans for newly connected account...");
        // We can reuse the logic from import endpoint, or just call it if we extract it.
        // For now, let's extract the import logic to a helper or just inline a quick sync here?
        // Inline minimal sync to avoid code duplication is risky, let's extract or just replicate the key parts lightly.
        // Actually, let's just make an internal function call if possible, effectively 'lazy loading' logic.
        // Simpler: Just rely on the user clicking sync?
        // User explicitly asked: "just happen when connecting stripe".
        // I will implement a quick fetch here.

        try {
          const products = await stripe.products.list(
            { active: true, limit: 100 },
            { stripeAccount: account.id },
          );
          if (products.data.length > 0) {
            const prices = await stripe.prices.list(
              { active: true, limit: 100 },
              { stripeAccount: account.id },
            );

            for (const product of products.data) {
              const price = prices.data.find((p) => p.product === product.id);
              if (!price) continue;

              const existing = await query(
                "SELECT id FROM plans WHERE stripe_product_id = $1",
                [product.id],
              );
              if (existing.rows.length === 0) {
                const interval = price.recurring
                  ? price.recurring.interval
                  : "one_time";
                const amount = price.unit_amount / 100;

                // Using orgId as club_id based on schema
                await query(
                  `INSERT INTO plans (
                    club_id, name, price, interval, description, 
                    stripe_product_id, stripe_price_id, active, 
                    billing_anchor_type, billing_anchor_day,
                    created_at, updated_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, NOW(), NOW())`,
                  [
                    orgId,
                    product.name,
                    amount,
                    interval,
                    product.description || "",
                    product.id,
                    price.id,
                    "signup_date", // Default for auto-sync
                    null,
                  ],
                );
              }
            }
            console.log("✅ Auto-sync completed");
          }
        } catch (syncErr) {
          console.warn("⚠️ Auto-sync failed:", syncErr.message);
          // Don't fail the status request though
        }
      }
    }

    res.json(response);
  } catch (err) {
    console.error("Stripe connect status error:", err);
    if (String(err.message).includes("User not found")) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({
      error: "Failed to fetch Stripe account status",
      message: err.message,
    });
  }
});

// POST /api/payments/stripe/connect/onboard
router.post("/stripe/connect/onboard", authenticateToken, async (req, res) => {
  try {
    const account = await getOrCreateStripeConnectAccount(req.user);

    const refresh_url =
      (process.env.FRONTEND_URL || "https://clubhubsports.net") +
      "/admin-dashboard.html";
    const return_url =
      (process.env.FRONTEND_URL || "https://clubhubsports.net") +
      "/admin-dashboard.html";

    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url,
      return_url,
      type: "account_onboarding",
    });

    res.json({ url: link.url });
  } catch (err) {
    console.error("Stripe onboarding error:", err);
    res.status(500).json({ error: "Failed to create onboarding link" });
  }
});

router.get("/stripe/connect/manage", authenticateToken, async (req, res) => {
  try {
    const account = await getOrCreateStripeConnectAccount(req.user);

    // Standard accounts do not support createLoginLink - redirect to Stripe Dashboard
    if (account.type === "standard") {
      // For Standard accounts, they just log in at dashboard.stripe.com
      return res.json({ url: "https://dashboard.stripe.com" });
    }

    // For Express accounts, use login links or account links
    try {
      const loginLink = await stripe.accounts.createLoginLink(account.id);
      return res.json({ url: loginLink.url });
    } catch (linkError) {
      console.warn(
        "Failed to create login link, falling back to account link:",
        linkError.message,
      );

      const return_url =
        (process.env.FRONTEND_URL || "https://clubhubsports.net") +
        "/admin-dashboard.html";

      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: return_url,
        return_url,
        type: "account_update",
      });

      return res.json({ url: link.url });
    }
  } catch (err) {
    console.error("Stripe manage link error:", err);
    res.status(500).json({
      error: "Failed to create account management link",
      message: err.message,
      details: err.raw?.message || "Unknown error",
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    stripe: !!process.env.STRIPE_SECRET_KEY,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/payments/plans - Get all plans
router.get("/plans", async (req, res) => {
  try {
    // Ensure plans table exists with club_id
    await query(`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        club_id UUID REFERENCES clubs(id),
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        interval VARCHAR(50) DEFAULT 'month',
        active BOOLEAN DEFAULT true,
        description TEXT,
        stripe_product_id VARCHAR(255),
        stripe_price_id VARCHAR(255),
        billing_anchor_type VARCHAR(50) DEFAULT 'signup_date',
        billing_anchor_day INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Fetch plans for specific club (or all if not specified - but usually should be scoped)
    // For now, let's allow fetching by clubId query param
    const { clubId } = req.query;
    let queryText = "SELECT * FROM plans WHERE active = true";
    const params = [];

    if (clubId) {
      queryText += " AND club_id = $1";
      params.push(clubId);
    } else if (req.user && req.user.currentOrganizationId) {
      // Auto-scope to current org if logged in and no clubId param
      queryText += " AND club_id = $1";
      params.push(req.user.currentOrganizationId);
    }

    queryText += " ORDER BY price ASC";

    const result = await query(queryText, params);

    res.json(result.rows);
  } catch (err) {
    console.error("Get plans error:", err);
    res.status(500).json({
      error: "Failed to load plans",
      message: err.message,
    });
  }
});

// POST /api/payments/plans/import - Import plans from Stripe
router.post(
  "/plans/import",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      console.log("📥 Starting Plan Import from Stripe...");
      // 1. Get the organization's Stripe Account ID
      let orgId = req.user.currentOrganizationId;

      if (!orgId) {
        console.log(
          "No organization ID in token, searching for user's owned clubs...",
        );
        const userOrgs = await query(
          "SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1",
          [req.user.id],
        );
        orgId = userOrgs.rows[0]?.id;
      }

      const orgResult = await query(
        "SELECT stripe_account_id, id FROM organizations WHERE id = $1",
        [orgId],
      );

      if (orgResult.rows.length === 0) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const stripeAccountId = orgResult.rows[0].stripe_account_id;
      const organizationId = orgResult.rows[0].id; // This is the UUID from organizations table

      if (!stripeAccountId) {
        return res.status(400).json({
          error: "Stripe not connected",
          message: "Please connect your Stripe account first to import plans.",
        });
      }

      // 2. Fetch Products and Prices from Stripe Connected Account
      const products = await stripe.products.list(
        { active: true, limit: 100 },
        { stripeAccount: stripeAccountId },
      );

      const prices = await stripe.prices.list(
        { active: true, limit: 100 },
        { stripeAccount: stripeAccountId },
      );

      console.log(
        `Found ${products.data.length} products and ${prices.data.length} prices in Stripe.`,
      );

      let importedCount = 0;
      let updatedCount = 0;

      // 3. Loop and Upsert into Local Database
      for (const product of products.data) {
        // Find price for this product
        const price = prices.data.find((p) => p.product === product.id);

        // Skip if no price or not recurring (optional check, depends if you want one-time payments as "plans")
        if (!price) {
          console.log(`Skipping product ${product.name} - no price found.`);
          continue;
        }

        const interval = price.recurring
          ? price.recurring.interval
          : "one_time";
        const amount = price.unit_amount / 100; // Convert cents to currency units (e.g. GBP)

        // Check if plan exists by stripe_product_id
        const existingPlan = await query(
          "SELECT id FROM plans WHERE stripe_product_id = $1 OR stripe_price_id = $2",
          [product.id, price.id],
        );

        if (existingPlan.rows.length > 0) {
          await query(
            `
            UPDATE plans 
            SET name = $1, price = $2, interval = $3, active = true, 
                billing_anchor_type = COALESCE($5, billing_anchor_type),
                billing_anchor_day = COALESCE($6, billing_anchor_day),
                updated_at = NOW()
            WHERE id = $4
        `,
            [
              product.name,
              amount,
              interval,
              existingPlan.rows[0].id,
              req.body.billingAnchorType,
              req.body.billingAnchorDay,
            ],
          );
          updatedCount++;
        } else {
          // Insert new
          await query(
            `
                    INSERT INTO plans (
                        club_id, name, price, interval, description, 
                        stripe_product_id, stripe_price_id, active, 
                        billing_anchor_type, billing_anchor_day,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, NOW(), NOW())
                `,
            [
              organizationId,
              product.name,
              amount,
              interval,
              product.description || "",
              product.id,
              price.id,
              req.body.billingAnchorType || "signup_date",
              req.body.billingAnchorDay || null,
            ],
          );
          importedCount++;
        }
      }

      res.json({
        success: true,
        message: `Sync complete. Imported ${importedCount} new plans, updated ${updatedCount} existing plans.`,
        stats: { imported: importedCount, updated: updatedCount },
      });
    } catch (error) {
      console.error("Import plans error:", error);
      res.status(500).json({
        error: "Failed to import plans",
        message: error.message,
      });
    }
  },
);

// POST /api/payments/plans - Create payment plan
router.post(
  "/plans",
  authenticateToken,
  requireOrganization,
  [
    body("name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Plan name is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("interval")
      .isIn(["month", "monthly", "year", "yearly", "week", "weekly"])
      .withMessage("Invalid interval"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      let { name, amount, interval, description } = req.body;

      // Normalize interval
      if (interval === "monthly") interval = "month";
      if (interval === "yearly") interval = "year";
      if (interval === "weekly") interval = "week";

      // Get current organization's Stripe account
      // Use clubId from body if available, otherwise currentOrganizationId, otherwise find by owner
      let orgId = req.body.clubId || req.user.currentOrganizationId;

      let orgResult;
      if (orgId) {
        orgResult = await query(
          `
          SELECT o.stripe_account_id, o.name as org_name, o.id as organization_id
          FROM organizations o
          WHERE o.id = $1
        `,
          [orgId],
        );
      }

      // Fallback: If no org ID or not found, find any organization owned by the user
      if (!orgResult || orgResult.rows.length === 0) {
        orgResult = await query(
          `
          SELECT o.stripe_account_id, o.name as org_name, o.id as organization_id
          FROM organizations o
          WHERE o.owner_id = $1
          LIMIT 1
        `,
          [req.user.id],
        );
      }

      if (orgResult.rows.length === 0) {
        return res.status(404).json({
          error: "Organization not found",
          message:
            "Could not identify your club profile. Please ensure you have created a club.",
        });
      }

      const organization = orgResult.rows[0];
      const clubContextId = organization.organization_id;

      // If missing from organization table, check the users table (sync fallback)
      let stripeAccountId = organization.stripe_account_id;
      if (!stripeAccountId) {
        const userRes = await query(
          `SELECT stripe_account_id FROM users WHERE id = $1`,
          [req.user.id],
        );
        stripeAccountId = userRes.rows[0]?.stripe_account_id;
      }

      if (!stripeAccountId) {
        return res.status(400).json({
          error: "Stripe not connected",
          message:
            "Please connect your Stripe account first in the dashboard to create payment plans",
        });
      }

      // Create Stripe Product on the connected account
      const stripeProduct = await stripe.products.create(
        {
          name: name,
          description: description || `${name} - ${organization.org_name}`,
          metadata: {
            organization_id: clubContextId,
            club_id: clubContextId,
            created_by: req.user.id,
          },
        },
        {
          stripeAccount: stripeAccountId, // Create on connected account
        },
      );

      // Create Stripe Price on the connected account
      const stripePrice = await stripe.prices.create(
        {
          product: stripeProduct.id,
          unit_amount: Math.round(parseFloat(amount) * 100), // Convert to pence
          currency: "gbp",
          recurring: {
            interval: interval,
            interval_count: 1,
          },
          metadata: {
            organization_id: clubContextId,
            club_id: clubContextId,
          },
        },
        {
          stripeAccount: stripeAccountId, // Create on connected account
        },
      );

      // Save to database with Stripe IDs
      const result = await query(
        `
      INSERT INTO plans (
        club_id, name, price, interval, description, 
        stripe_product_id, stripe_price_id, active, 
        billing_anchor_type, billing_anchor_day,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, NOW(), NOW())
      RETURNING *
    `,
        [
          clubContextId,
          name,
          amount,
          interval,
          description || null,
          stripeProduct.id,
          stripePrice.id,
          req.body.billingAnchorType || "signup_date",
          req.body.billingAnchorDay || null,
        ],
      );

      const newPlan = result.rows[0];

      res.status(201).json({
        message: "Payment plan created successfully on Stripe",
        plan: newPlan,
        stripe: {
          productId: stripeProduct.id,
          priceId: stripePrice.id,
          account: organization.stripe_account_id,
        },
      });
    } catch (error) {
      console.error("Create payment plan error:", error);

      // Handle Stripe errors
      if (error.type === "StripeInvalidRequestError") {
        return res.status(400).json({
          error: "Stripe error",
          message: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to create payment plan",
        message: error.message,
      });
    }
  },
);

// PUT /api/payments/plans/:id - Update payment plan
router.put(
  "/plans/:id",
  authenticateToken,
  requireOrganization,
  [
    body("name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Plan name is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("interval")
      .isIn(["month", "year", "week"])
      .withMessage("Invalid interval"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { id } = req.params;
      const { name, amount, interval, description, active } = req.body;

      // 1. Fetch existing plan to get Stripe IDs
      const planRes = await query("SELECT * FROM plans WHERE id = $1", [id]);
      if (planRes.rows.length === 0) {
        return res.status(404).json({ error: "Payment plan not found" });
      }
      const plan = planRes.rows[0];

      // 2. Update Stripe if connected
      if (plan.stripe_product_id) {
        try {
          // Get Org ID
          const orgId = req.user.currentOrganizationId;
          const orgRes = await query(
            "SELECT stripe_account_id FROM organizations WHERE id = $1",
            [orgId],
          );
          const stripeAccount = orgRes.rows[0]?.stripe_account_id;

          if (stripeAccount) {
            // Update Product Name
            await stripe.products.update(
              plan.stripe_product_id,
              {
                name: name,
                description: description || undefined,
                active: active !== undefined ? active : true,
              },
              { stripeAccount },
            );

            // Note: We cannot easily update Price amount on Stripe without creating a new Price object
            // If amount changed, we might warn or just create new one, but for now we sync the Name/Description
          }
        } catch (stripeErr) {
          console.error("Failed to update Stripe product:", stripeErr);
          // We continue to update local DB but warn?
        }
      }

      // Update in database with COALESCE to support partial updates
      const result = await query(
        `
        UPDATE plans SET 
          name = COALESCE($1, name), 
          price = COALESCE($2, price), 
          interval = COALESCE($3, interval), 
          description = COALESCE($4, description),
          active = COALESCE($5, active),
          billing_anchor_type = COALESCE($6, billing_anchor_type),
          billing_anchor_day = COALESCE($7, billing_anchor_day),
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `,
        [
          name,
          amount,
          interval,
          description || null,
          active,
          req.body.billingAnchorType,
          req.body.billingAnchorDay,
          id,
        ],
      );

      res.json({
        message: "Payment plan updated successfully",
        plan: result.rows[0],
      });
    } catch (error) {
      console.error("Update payment plan error:", error);
      res.status(500).json({
        error: "Failed to update payment plan",
        message: error.message,
      });
    }
  },
);

// DELETE /api/payments/plans/:id - Delete payment plan
router.delete(
  "/plans/:id",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Fetch existing plan
      const planRes = await query("SELECT * FROM plans WHERE id = $1", [id]);
      if (planRes.rows.length === 0) {
        return res.status(404).json({ error: "Payment plan not found" });
      }
      const plan = planRes.rows[0];

      // 2. Archive on Stripe
      if (plan.stripe_product_id) {
        try {
          const orgId = req.user.currentOrganizationId;
          const orgRes = await query(
            "SELECT stripe_account_id FROM organizations WHERE id = $1",
            [orgId],
          );
          const stripeAccount = orgRes.rows[0]?.stripe_account_id;

          if (stripeAccount) {
            await stripe.products.update(
              plan.stripe_product_id,
              { active: false },
              { stripeAccount },
            );
            if (plan.stripe_price_id) {
              await stripe.prices.update(
                plan.stripe_price_id,
                { active: false },
                { stripeAccount },
              );
            }
          }
        } catch (stripeErr) {
          console.error("Failed to archive Stripe product:", stripeErr);
        }
      }

      // Soft delete - mark as inactive instead of hard delete
      const result = await query(
        `
      UPDATE plans SET 
        active = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
        [id],
      );

      res.json({
        message: "Payment plan deleted successfully",
      });
    } catch (error) {
      console.error("Delete payment plan error:", error);
      res.status(500).json({
        error: "Failed to delete payment plan",
        message: error.message,
      });
    }
  },
);

// GET /api/payments/plan/current - Get current user's plan
// GET /api/payments/plan/current - Get current user's plan (from players table)
router.get("/plan/current", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { playerId } = req.query;

    let queryStr;
    let params;

    if (playerId) {
      // Fetch for specific player (verify ownership/family)
      // We check if the player belongs to the user OR is a family member (parent_user_id)
      queryStr = `
            SELECT 
              p.payment_plan_id as id, 
              pl.name, 
              COALESCE(p.plan_price, pl.price) as amount, 
              pl.interval, 
              p.plan_start_date as start_date, 
              p.payment_status as status,
              p.stripe_subscription_id, 
              p.stripe_customer_id,
              pl.description
            FROM players p
            LEFT JOIN plans pl ON p.payment_plan_id = pl.id
            WHERE p.id = $1 
              AND (
                p.user_id = $2 
                OR p.email = (SELECT email FROM users WHERE id = $2) -- Fallback email match
              )
        `;
      params = [playerId, userId];
    } else {
      // Fetch for main user profile (most recently updated active player record)
      queryStr = `
            SELECT 
              p.payment_plan_id as id, 
              pl.name, 
              COALESCE(p.plan_price, pl.price) as amount, 
              pl.interval, 
              p.plan_start_date as start_date, 
              p.payment_status as status,
              p.stripe_subscription_id, 
              p.stripe_customer_id,
              pl.description
            FROM players p
            LEFT JOIN plans pl ON p.payment_plan_id = pl.id
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC
            LIMIT 1
        `;
      params = [userId];
    }

    const result = await query(queryStr, params);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      // If no plan assigned (payment_plan_id is null), return null or empty object
      if (!row.id) return res.json(null);
      return res.json(row);
    }

    res.json(null);
  } catch (err) {
    console.error("Get current plan error:", err);
    res.status(500).json({ error: "Failed to fetch current plan" });
  }
});

// POST /api/payments/plan/assign - Assign/update plan for current user
router.post("/plan/assign", authenticateToken, async (req, res) => {
  try {
    const { planId, startDate } = req.body;
    if (!planId) return res.status(400).json({ error: "planId is required" });

    const planResult = await query("SELECT * FROM plans WHERE id = $1", [
      planId,
    ]);
    if (planResult.rows.length === 0)
      return res.status(404).json({ error: "Plan not found" });
    const plan = planResult.rows[0];

    const start = startDate || new Date().toISOString().slice(0, 10);
    const nextBillingStr = calculateNextBilling(plan, start);

    await withTransaction(async (client) => {
      await client.query(
        "UPDATE player_plans SET is_active = false WHERE user_id = $1",
        [req.user.id],
      );
      await client.query(
        `
        INSERT INTO player_plans (user_id, plan_id, start_date, next_billing_date, is_active)
        VALUES ($1, $2, $3, $4, true)
      `,
        [req.user.id, planId, start, nextBillingStr],
      );

      // Send confirmation email
      try {
        await emailService.sendPlanAssignedEmail({
          email: req.user.email,
          firstName: req.user.firstName || req.user.first_name || "there",
          planName: plan.name,
          clubName: "Your Club", // We should ideally get the club name
          amount: plan.price,
          interval: plan.interval,
          startDate: start,
        });
      } catch (err) {
        console.error("Email failed on single assign:", err);
      }
    });

    res.json({ success: true, message: "Plan assigned" });
  } catch (err) {
    console.error("Assign plan error:", err);
    res.status(500).json({ error: "Failed to assign plan" });
  }
});

// OLD /api/payments/bulk-assign-plan (Legacy)
router.post("/bulk-assign-plan-legacy", authenticateToken, async (req, res) => {
  try {
    const { playerIds, planId, startDate } = req.body;
    if (!Array.isArray(playerIds) || playerIds.length === 0 || !planId) {
      return res
        .status(400)
        .json({ error: "playerIds (array) and planId are required" });
    }

    // Get plan details to calculate next billing date
    const planResult = await query("SELECT * FROM plans WHERE id = $1", [
      planId,
    ]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: "Plan not found" });
    }
    const plan = planResult.rows[0];
    const clubId = plan.club_id;

    const start = startDate || new Date().toISOString().slice(0, 10);
    const nextBillingStr = calculateNextBilling(plan, start);

    const results = await withTransaction(async (client) => {
      const out = [];

      // Resolve playerIds to userIds and verify club membership
      for (const id of playerIds) {
        const playerRes = await client.query(
          "SELECT user_id, club_id FROM players WHERE id = $1",
          [id],
        );

        if (playerRes.rows.length === 0) {
          console.warn(`Player ${id} not found, skipping`);
          continue;
        }

        const player = playerRes.rows[0];

        // Security check: Ensure player belongs to the same club as the plan
        if (player.club_id !== clubId) {
          console.warn(
            `Player ${id} does not belong to club ${clubId}, skipping`,
          );
          continue;
        }

        if (!player.user_id) {
          console.warn(`Player ${id} has no associated user_id, skipping`);
          continue;
        }

        const userId = player.user_id;

        // Deactivate other active payment plans for this user in this club
        await client.query(
          `UPDATE player_plans SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND is_active = true`,
          [userId],
        );

        // Assign new plan
        const { rows } = await client.query(
          `
          INSERT INTO player_plans (user_id, plan_id, start_date, next_billing_date, is_active)
          VALUES ($1, $2, $3, $4, true)
          RETURNING *
          `,
          [userId, planId, start, nextBillingStr],
        );

        // Send confirmation email
        try {
          // Fetch user details for email
          const userRes = await client.query(
            "SELECT email, first_name FROM users WHERE id = $1",
            [userId],
          );
          const orgRes = await client.query(
            "SELECT name FROM organizations WHERE id = $1",
            [clubId],
          );

          if (userRes.rows.length > 0 && orgRes.rows.length > 0) {
            await emailService.sendPlanAssignedEmail({
              email: userRes.rows[0].email,
              firstName: userRes.rows[0].first_name,
              planName: plan.name,
              clubName: orgRes.rows[0].name,
              amount: plan.price,
              interval: plan.interval,
              startDate: start,
            });
          }
        } catch (emailErr) {
          console.error(
            `Failed to send plan email to user ${userId}:`,
            emailErr,
          );
        }

        out.push(rows[0]);
      }
      return out;
    });

    return res.json({
      message: `Successfully assigned plan to ${results.length} users`,
      results,
    });
  } catch (err) {
    console.error("bulk-assign-plan error:", err);
    return res.status(500).json({ error: "Failed to assign plan" });
  }
});

// POST /api/payments/plan/cancel - Deactivate current active plan for a user
router.post(
  "/plan/cancel",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { playerId } = req.body;
      if (!playerId)
        return res.status(400).json({ error: "playerId is required" });

      // Find user_id and club context
      const playerRes = await query(
        "SELECT user_id, club_id FROM players WHERE id = $1",
        [playerId],
      );
      if (playerRes.rows.length === 0)
        return res.status(404).json({ error: "Player not found" });

      const { user_id } = playerRes.rows[0];

      await query(
        `UPDATE player_plans SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND is_active = true`,
        [user_id],
      );

      res.json({ message: "Plan successfully deactivated" });
    } catch (err) {
      console.error("Cancel plan error:", err);
      res.status(500).json({ error: "Failed to cancel plan" });
    }
  },
);

// Validation rules
const paymentValidation = [
  body("playerId")
    .optional()
    .isUUID()
    .withMessage("Valid player ID is required"),
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("paymentType")
    .optional()
    .isIn(["monthly_fee", "event_booking", "registration", "equipment"])
    .withMessage("Invalid payment type"),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Description is required"),
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid due date"),
];

// Get all payments (with filters)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { playerId, clubId, status, paymentType, startDate, endDate } =
      req.query;

    let queryText = `
      SELECT p.*, 
             pl.first_name as player_first_name,
             pl.last_name as player_last_name,
             pl.email as player_email,
             c.name as club_name
      FROM payments p
      LEFT JOIN players pl ON p.player_id = pl.id
      LEFT JOIN clubs c ON p.club_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filter by player if provided
    if (playerId) {
      paramCount++;
      queryText += ` AND p.player_id = $${paramCount}`;
      queryParams.push(playerId);
    }

    // Filter by club if provided
    if (clubId) {
      paramCount++;
      queryText += ` AND p.club_id = $${paramCount}`;
      queryParams.push(clubId);
    } else if (req.user.account_type === "organization") {
      // If no clubId specified, safeguard to only user's owned clubs (Already covered by lines 653+ but good to be explicit here or leave as is)
      // The existing logic at line 653 handles the 'Owner' restriction globally.
      // So we just ensure we don't return 'all' to non-owners.
    }

    // Filter by status if provided
    if (status) {
      paramCount++;
      queryText += ` AND p.payment_status = $${paramCount}`;
      queryParams.push(status);
    }

    // Filter by payment type if provided
    if (paymentType) {
      paramCount++;
      queryText += ` AND p.payment_type = $${paramCount}`;
      queryParams.push(paymentType);
    }

    // Filter by date range
    if (startDate) {
      paramCount++;
      queryText += ` AND p.due_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND p.due_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    // Check if user has permission to view these payments
    if (req.user.account_type === "organization") {
      // Organization can see payments for their clubs only
      paramCount++;
      queryText += ` AND c.owner_id = $${paramCount}`;
      queryParams.push(req.user.id);
    } else {
      // Regular users can only see their own payments
      paramCount++;
      queryText += ` AND pl.user_id = $${paramCount}`;
      queryParams.push(req.user.id);
    }

    queryText += ` ORDER BY p.due_date DESC, p.created_at DESC`;

    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      error: "Failed to fetch payments",
      message: "An error occurred while fetching payments",
    });
  }
});

// CREATE STRIPE PAYMENT INTENT - ENHANCED
router.post("/create-intent", requirePaymentProcessing, async (req, res) => {
  try {
    console.log("Creating payment intent with data:", req.body);

    const { amount, paymentId, metadata = {} } = req.body;

    // Validate Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY not configured");
      return res.status(500).json({
        error: "Payment system not configured",
        message: "Please contact support - payment system unavailable",
        details: "Stripe secret key missing",
      });
    }

    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
        message: "Amount must be a positive number",
        received: amount,
      });
    }

    const numericAmount = parseFloat(amount);

    // Check minimum amount for GBP (30p)
    if (numericAmount < 0.3) {
      return res.status(400).json({
        error: "Amount too small",
        message: "Minimum payment amount is £0.30",
        received: numericAmount,
      });
    }

    // Check maximum amount (£999,999.99)
    if (numericAmount > 999999.99) {
      return res.status(400).json({
        error: "Amount too large",
        message: "Maximum payment amount is £999,999.99",
        received: numericAmount,
      });
    }

    let paymentDetails = null;

    // Fetch payment details if paymentId is provided
    if (
      paymentId &&
      paymentId !== `direct_${paymentId}` &&
      !paymentId.startsWith("direct_")
    ) {
      try {
        const paymentResult = await query(
          `
          SELECT p.*, pl.first_name, pl.last_name, pl.email, c.name as club_name
          FROM payments p
          LEFT JOIN players pl ON p.player_id = pl.id
          LEFT JOIN clubs c ON p.club_id = c.id
          WHERE p.id = $1
        `,
          [paymentId],
        );

        if (paymentResult.rows.length > 0) {
          paymentDetails = paymentResult.rows[0];

          // Check if already paid
          if (paymentDetails.payment_status === "paid") {
            return res.status(400).json({
              error: "Payment already completed",
              message: "This payment has already been processed",
              paymentStatus: "paid",
            });
          }
        } else {
          console.warn(`Payment record not found for ID: ${paymentId}`);
        }
      } catch (dbError) {
        console.error("Database error fetching payment:", dbError);
        // Don't fail here - continue with direct payment
        console.warn("Continuing with direct payment due to database error");
      }
    }

    // Create Stripe Payment Intent
    try {
      const paymentIntentData = {
        amount: Math.round(numericAmount * 100), // Convert to pence
        currency: "gbp",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          paymentId: paymentId || "direct_payment",
          playerName: paymentDetails
            ? `${paymentDetails.first_name} ${paymentDetails.last_name}`
            : metadata.playerName || "Customer",
          clubName: paymentDetails
            ? paymentDetails.club_name
            : metadata.clubName || "ClubHub",
          environment: process.env.NODE_ENV || "development",
          timestamp: new Date().toISOString(),
          source: "clubhub_payment_page",
          ...metadata,
        },
        description: paymentDetails
          ? paymentDetails.description
          : metadata.description || `ClubHub Payment of £${numericAmount}`,
        statement_descriptor: "CLUBHUB", // Fixed: removed malformed suffix
      };

      // Add receipt email if available
      const email = paymentDetails?.email || metadata.email;
      if (email && email.includes("@")) {
        paymentIntentData.receipt_email = email;
      }

      console.log("Creating Stripe PaymentIntent with data:", {
        amount: paymentIntentData.amount,
        currency: paymentIntentData.currency,
        description: paymentIntentData.description,
      });

      const paymentIntent =
        await stripe.paymentIntents.create(paymentIntentData);

      console.log(
        `Stripe Payment Intent created: ${paymentIntent.id} for £${numericAmount}`,
      );

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: numericAmount,
        currency: "gbp",
        paymentDetails: paymentDetails,
        metadata: paymentIntentData.metadata,
      });
    } catch (stripeError) {
      console.error("Stripe API error:", stripeError);

      let errorMessage = "Unable to create payment intent. Please try again.";
      let statusCode = 500;

      if (stripeError.code === "api_key_invalid") {
        errorMessage =
          "Payment system configuration error. Please contact support.";
        statusCode = 500;
      } else if (stripeError.code === "rate_limit") {
        errorMessage = "Too many requests. Please wait a moment and try again.";
        statusCode = 429;
      } else if (stripeError.code === "amount_too_small") {
        errorMessage = "Payment amount is too small. Minimum is £0.30.";
        statusCode = 400;
      } else if (stripeError.code === "amount_too_large") {
        errorMessage = "Payment amount is too large. Maximum is £999,999.99.";
        statusCode = 400;
      }

      return res.status(statusCode).json({
        error: "Payment system error",
        message: errorMessage,
        code: stripeError.code,
        type: stripeError.type,
      });
    }
  } catch (error) {
    console.error("Create payment intent error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// CONFIRM STRIPE PAYMENT - ENHANCED
router.post("/confirm-payment", async (req, res) => {
  try {
    console.log("Confirming payment with data:", req.body);

    const { paymentIntentId, paymentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: "Payment Intent ID is required",
        message: "Missing paymentIntentId parameter",
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "Payment system not configured",
        message: "Stripe not configured on server",
      });
    }

    // Retrieve and verify payment intent from Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log(
        `Retrieved PaymentIntent ${paymentIntentId} with status: ${paymentIntent.status}`,
      );
    } catch (stripeError) {
      console.error("Failed to retrieve payment intent:", stripeError);
      return res.status(400).json({
        error: "Invalid payment intent",
        message: "Could not verify payment with Stripe",
        code: stripeError.code,
      });
    }

    if (paymentIntent.status !== "succeeded") {
      console.warn(
        `Payment intent status is ${paymentIntent.status}, not succeeded`,
      );
      return res.status(400).json({
        error: "Payment not completed",
        message: `Payment status: ${paymentIntent.status}`,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === "requires_action",
      });
    }

    // If paymentId provided, update our database
    if (paymentId && !paymentId.startsWith("direct_")) {
      try {
        console.log(`Updating payment record ${paymentId} in database`);

        const result = await query(
          `
          UPDATE payments SET 
            payment_status = 'paid',
            paid_date = NOW(),
            stripe_payment_intent_id = $1,
            stripe_charge_id = $2,
            updated_at = NOW()
          WHERE id = $3 AND payment_status != 'paid'
          RETURNING *
        `,
          [paymentIntent.id, paymentIntent.latest_charge, paymentId],
        );

        if (result.rows.length === 0) {
          console.warn(
            `Payment record ${paymentId} not found or already processed`,
          );
          // Don't fail here - payment succeeded on Stripe side
        } else {
          const payment = result.rows[0];
          console.log(`Updated payment record: ${payment.id}`);

          // Update player payment status if this was a monthly fee
          if (payment.payment_type === "monthly_fee" && payment.player_id) {
            try {
              await query(
                `
                UPDATE players SET 
                  payment_status = 'paid',
                  updated_at = NOW()
                WHERE id = $1
              `,
                [payment.player_id],
              );
              console.log(
                `Updated player payment status for player: ${payment.player_id}`,
              );
            } catch (playerError) {
              console.error("Failed to update player status:", playerError);
              // Don't fail the whole request
            }
          }
        }
      } catch (dbError) {
        console.error("Database error updating payment:", dbError);
        // Don't fail here - payment succeeded on Stripe side
        console.warn("Payment succeeded on Stripe but database update failed");
      }
    } else {
      console.log("Direct payment - no database record to update");
    }

    // Return success response
    const response = {
      success: true,
      message: "Payment confirmed successfully",
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount_received: paymentIntent.amount_received / 100,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata,
      },
    };

    console.log(`Payment confirmation successful: ${paymentIntent.id}`);
    res.json(response);
  } catch (error) {
    console.error("Confirm payment error:", error);
    res.status(500).json({
      error: "Failed to confirm payment",
      message: "An unexpected error occurred",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// PUBLIC PAYMENT DETAILS - ENHANCED (for payment page)
router.get("/public/:id", async (req, res) => {
  try {
    const { token } = req.query;
    const paymentId = req.params.id;

    console.log(`Fetching public payment details for ID: ${paymentId}`);

    // If no token provided, this might be a direct payment
    if (!token) {
      console.log("No token provided - treating as direct payment");
      return res.status(400).json({
        error: "Payment token required",
        message: "This payment requires a valid token for security",
      });
    }

    // Verify token format and decode
    let decodedPaymentId, timestamp;
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      [decodedPaymentId, timestamp] = decoded.split(":");

      if (!decodedPaymentId || !timestamp) {
        throw new Error("Invalid token format");
      }

      if (decodedPaymentId !== paymentId) {
        throw new Error("Token mismatch");
      }
    } catch (tokenError) {
      console.error("Token verification failed:", tokenError);
      return res.status(403).json({
        error: "Invalid payment token",
        message: "The payment link is invalid or has been tampered with",
      });
    }

    // Fetch payment details from database
    try {
      const paymentResult = await query(
        `
        SELECT p.*, pl.first_name, pl.last_name, pl.email, c.name as club_name, c.location
        FROM payments p
        LEFT JOIN players pl ON p.player_id = pl.id
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.id = $1
      `,
        [paymentId],
      );

      if (paymentResult.rows.length === 0) {
        console.warn(`Payment not found: ${paymentId}`);
        return res.status(404).json({
          error: "Payment not found",
          message: "This payment record does not exist",
        });
      }

      const payment = paymentResult.rows[0];

      if (payment.payment_status === "paid") {
        return res.status(400).json({
          error: "Payment already completed",
          message: "This payment has already been processed",
          paidDate: payment.paid_date,
        });
      }

      const isOverdue = new Date() > new Date(payment.due_date);

      const response = {
        id: payment.id,
        amount: payment.amount,
        description: payment.description,
        dueDate: payment.due_date,
        paymentType: payment.payment_type,
        isOverdue,
        player: {
          name:
            payment.first_name && payment.last_name
              ? `${payment.first_name} ${payment.last_name}`
              : "N/A",
        },
        club: {
          name: payment.club_name || "N/A",
          location: payment.location || "N/A",
        },
      };

      console.log(`Public payment details retrieved: ${paymentId}`);
      res.json(response);
    } catch (dbError) {
      console.error("Database error fetching public payment:", dbError);
      return res.status(500).json({
        error: "Database error",
        message: "Unable to fetch payment details",
      });
    }
  } catch (error) {
    console.error("Get public payment error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "An unexpected error occurred",
    });
  }
});

async function assignPlayerToPaymentPlanHandler(req, res, next) {
  try {
    const {
      playerId,
      player_id,
      planId,
      plan_id,
      startDate,
      start_date,
      customPrice,
      amount,
      custom_amount,
      price,
      clubId,
      club_id,
    } = req.body || {};

    const pid = playerId ?? player_id;
    const plid = planId ?? plan_id;
    const start =
      startDate ?? start_date ?? new Date().toISOString().slice(0, 10);
    const custom = customPrice ?? amount ?? custom_amount ?? price;
    const club = clubId ?? club_id ?? null;

    if (!pid || !plid) {
      return res
        .status(400)
        .json({ error: "playerId and planId are required" });
    }

    const result = await assignPlayersCore({
      playerIds: [pid],
      planId: plid,
      startDate: start,
      customPrice: custom === "" || custom == null ? null : Number(custom),
      clubId: club,
    });

    return res
      .status(200)
      .json({ assigned: result.assigned, failures: result.failures });
  } catch (err) {
    next(err);
  }
}

async function bulkAssignPlanHandler(req, res, next) {
  try {
    const {
      playerIds,
      planId,
      plan_id,
      startDate,
      start_date,
      customPrice,
      amount,
      custom_amount,
      price,
      clubId,
      club_id,
    } = req.body || {};

    const ids = Array.isArray(playerIds) ? playerIds.filter(Boolean) : [];
    const plid = planId ?? plan_id;
    const start =
      startDate ?? start_date ?? new Date().toISOString().slice(0, 10);
    const custom = customPrice ?? amount ?? custom_amount ?? price;
    const club = clubId ?? club_id ?? null;

    if (!ids.length || !plid) {
      return res
        .status(400)
        .json({ error: "playerIds (non-empty) and planId are required" });
    }

    const result = await assignPlayersCore({
      playerIds: ids,
      planId: plid,
      startDate: start,
      customPrice: custom === "" || custom == null ? null : Number(custom),
      clubId: club,
    });

    return res
      .status(200)
      .json({ assigned: result.assigned, failures: result.failures });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper: Find or create a Stripe customer by email
 */
async function getOrCreateStripeCustomer(
  email,
  firstName,
  lastName,
  clubId,
  stripeAccountId = null,
) {
  if (!email) return null;

  const options = stripeAccountId ? { stripeAccount: stripeAccountId } : {};
  console.log(
    `🔍 Syncing customer ${email} for club ${clubId} ${stripeAccountId ? `(Connect: ${stripeAccountId})` : "(Platform)"}`,
  );

  try {
    // 1. Search existing customers by email
    const customers = await stripe.customers.list(
      {
        email: email,
        limit: 1,
      },
      options,
    );

    if (customers.data.length > 0) {
      console.log(
        `✅ Found existing Stripe customer: ${customers.data[0].id} ${stripeAccountId ? `on ${stripeAccountId}` : ""}`,
      );
      return customers.data[0].id;
    }

    // 2. Create new if not found
    const customer = await stripe.customers.create(
      {
        email: email,
        name: `${firstName} ${lastName}`.trim(),
        metadata: {
          club_id: clubId,
          source: "clubhub_assignment",
        },
      },
      options,
    );

    console.log(
      `🆕 Created Stripe customer for ${email}: ${customer.id} ${stripeAccountId ? `on ${stripeAccountId}` : ""}`,
    );
    return customer.id;
  } catch (err) {
    console.error("Stripe customer sync error:", err);
    return null; // Don't crash the whole process if Stripe is down
  }
}

/**
 * Writes the assignment onto players(payment_plan_id, plan_price, plan_start_date).
 * If customPrice is null/undefined, we use the plan price from `plans`.
 */
async function assignPlayersCore({
  playerIds,
  planId,
  startDate,
  customPrice,
  clubId,
}) {
  const assigned = [];
  const failures = [];

  // Get the plan (for default price) – also ensures the plan exists
  const planRes = await query(
    "SELECT id, name, price, interval FROM plans WHERE id = $1 AND (active IS TRUE OR active IS NULL)",
    [planId],
  );
  if (planRes.rowCount === 0) {
    for (const pid of playerIds) {
      failures.push({ playerId: pid, error: "Plan not found or inactive" });
    }
    return { assigned, failures };
  }
  const planRow = planRes.rows[0];
  const priceToApply = customPrice == null ? planRow.price : customPrice;

  // Fetch Club's Stripe Account ID if available
  let stripeAccountId = null;
  if (clubId) {
    const clubRes = await query(
      "SELECT stripe_account_id FROM organizations WHERE id = $1",
      [clubId],
    );
    if (clubRes.rowCount > 0 && clubRes.rows[0].stripe_account_id) {
      stripeAccountId = clubRes.rows[0].stripe_account_id;
    }
  }

  // Ensure Plan has a Stripe Price ID (Create if missing)
  let stripePriceId = null;

  // We always enter this block to validate/resolve the Price ID against the current account
  // (Previously we blindly used the DB ID which caused issues with Connect vs Platform mismatches)
  {
    // Create a new Price object in Stripe for this subscription
    try {
      const priceData = {
        unit_amount: Math.round(priceToApply * 100),
        currency: "gbp",
        recurring: {
          interval: planRow.interval || "month",
        },
        product: planRow.stripe_product_id, // Ensure product exists!
      };

      // 1. Resolve Product ID
      let productId = planRow.stripe_product_id;

      // Validate if this Product ID exists on the current account
      if (productId) {
        try {
          await stripe.products.retrieve(
            productId,
            stripeAccountId ? { stripeAccount: stripeAccountId } : {},
          );
        } catch (e) {
          console.warn(
            `Stored Product ID ${productId} not found on account ${stripeAccountId || "Platform"}. Clearing to resolve...`,
          );
          productId = null;
        }
      }

      // If missing or invalid, search Stripe first
      if (!productId) {
        const queryStr = `name:'${planRow.name.replace(/'/g, "\\'")}' AND active:'true'`;
        try {
          const existingProducts = await stripe.products.search(
            {
              query: queryStr,
              limit: 1,
            },
            stripeAccountId ? { stripeAccount: stripeAccountId } : {},
          );

          if (existingProducts.data.length > 0) {
            productId = existingProducts.data[0].id;
            // Sync back to DB
            await query(
              "UPDATE plans SET stripe_product_id = $1 WHERE id = $2",
              [productId, planId],
            );
            console.log(`🔗 Linked to existing Stripe Product: ${productId}`);
          } else {
            // Create new if truly missing
            const product = await stripe.products.create(
              {
                name: planRow.name,
                type: "service",
              },
              stripeAccountId ? { stripeAccount: stripeAccountId } : {},
            );
            productId = product.id;
            await query(
              "UPDATE plans SET stripe_product_id = $1 WHERE id = $2",
              [productId, planId],
            );
            console.log(`🆕 Created new Stripe Product: ${productId}`);
          }
        } catch (searchErr) {
          console.error("Product search/create failed:", searchErr);
          // One last ditch: Create it without search if search failed (e.g. syntax)
          if (!productId) {
            const product = await stripe.products.create(
              {
                name: planRow.name,
                type: "service",
              },
              stripeAccountId ? { stripeAccount: stripeAccountId } : {},
            );
            productId = product.id;
            await query(
              "UPDATE plans SET stripe_product_id = $1 WHERE id = $2",
              [productId, planId],
            );
          }
        }
      }

      priceData.product = productId;

      // 2. Resolve Price ID
      // If we have a stored price ID, try to retrieve it to ensure it exists on THIS account
      if (planRow.stripe_price_id && customPrice == null) {
        try {
          const existingPrice = await stripe.prices.retrieve(
            planRow.stripe_price_id,
            stripeAccountId ? { stripeAccount: stripeAccountId } : {},
          );
          stripePriceId = existingPrice.id;
        } catch (e) {
          console.warn(
            "Stored price ID invalid or not found on this account, searching/creating new...",
          );
        }
      }

      // If still no valid price ID, search for matching price
      if (!stripePriceId) {
        const prices = await stripe.prices.list(
          {
            product: productId,
            active: true,
            limit: 100,
          },
          stripeAccountId ? { stripeAccount: stripeAccountId } : {},
        );

        const matchingPrice = prices.data.find(
          (p) =>
            p.unit_amount === priceData.unit_amount &&
            p.currency === priceData.currency &&
            p.recurring?.interval === priceData.recurring.interval,
        );

        if (matchingPrice) {
          stripePriceId = matchingPrice.id;
          console.log(`🔗 Found existing matching Price: ${stripePriceId}`);
        } else {
          const price = await stripe.prices.create(
            priceData,
            stripeAccountId ? { stripeAccount: stripeAccountId } : {},
          );
          stripePriceId = price.id;
          console.log(`🆕 Created new Stripe Price: ${stripePriceId}`);
        }

        // Save if standard
        if (customPrice == null) {
          // Archive old price if it differs from the new one to keep Stripe clean
          if (
            planRow.stripe_price_id &&
            planRow.stripe_price_id !== stripePriceId
          ) {
            try {
              await stripe.prices.update(
                planRow.stripe_price_id,
                { active: false },
                stripeAccountId ? { stripeAccount: stripeAccountId } : {},
              );
              console.log(
                `🗑 Archived old Stripe Price: ${planRow.stripe_price_id}`,
              );
            } catch (archiveErr) {
              console.warn(
                `Failed to archive old price ${planRow.stripe_price_id}:`,
                archiveErr.message,
              );
            }
          }

          await query("UPDATE plans SET stripe_price_id = $1 WHERE id = $2", [
            stripePriceId,
            planId,
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to resolve/create Stripe Price/Product:", err);
      // Fallback: don't crash, but subscription step will fail
    }
  }

  // Optional: validate player/club relationship here if needed, using clubId.

  // Update each player
  for (const pid of playerIds) {
    try {
      // 1. Fetch current info (we need email)
      let member = null;
      let table = null;

      const pRes = await query(
        "SELECT email, first_name, last_name, stripe_customer_id, stripe_subscription_id FROM players WHERE id = $1",
        [pid],
      );
      if (pRes.rowCount > 0) {
        member = pRes.rows[0];
        table = "players";
      } else {
        const iRes = await query(
          "SELECT email, first_name, last_name, stripe_customer_id, stripe_subscription_id FROM invitations WHERE id = $1",
          [pid],
        );
        if (iRes.rowCount > 0) {
          member = iRes.rows[0];
          table = "invitations";
        }
      }

      if (!member) {
        failures.push({ playerId: pid, error: "Member not found" });
        continue;
      }

      // 2. Sync with Stripe Customer if needed
      // 2. Sync with Stripe Customer
      // We ALWAYS call this to ensure the returned Customer ID belongs to the correct Stripe Account (Connect vs Platform).
      // If the email exists on the target account, it returns that ID. If not, it creates a new one.
      const stripeCustomerId = await getOrCreateStripeCustomer(
        member.email,
        member.first_name,
        member.last_name,
        clubId,
        stripeAccountId,
      );

      if (!stripeCustomerId) {
        failures.push({
          playerId: pid,
          error: "Failed to create/fetch Stripe Customer",
        });
        continue;
      }

      // 3. Create Stripe Subscription (Visible immediately, Pay via Invoice URL)
      let stripeSubscriptionId = null;
      let checkoutUrl = null;

      if (stripeCustomerId && stripePriceId) {
        try {
          // Cancel previous subscription if it exists
          if (member.stripe_subscription_id) {
            try {
              await stripe.subscriptions.cancel(
                member.stripe_subscription_id,
                stripeAccountId ? { stripeAccount: stripeAccountId } : {},
              );
              console.log(
                `🗑 Cancelled previous subscription: ${member.stripe_subscription_id}`,
              );
            } catch (cancelErr) {
              console.warn(
                `Failed to cancel old subscription ${member.stripe_subscription_id}:`,
                cancelErr.message,
              );
            }
          }

          const subscription = await stripe.subscriptions.create(
            {
              customer: stripeCustomerId,
              items: [{ price: stripePriceId }],
              payment_behavior: "default_incomplete",
              collection_method: "send_invoice", // Crucial for hosted invoice link
              days_until_due: 7,
              expand: ["latest_invoice"],
              metadata: {
                club_id: clubId,
                player_id: pid,
                plan_id: planId,
              },
            },
            stripeAccountId ? { stripeAccount: stripeAccountId } : {},
          );

          stripeSubscriptionId = subscription.id;

          // Get the Hosted Invoice URL - serves as our "Checkout Window"
          if (
            subscription.latest_invoice &&
            subscription.latest_invoice.hosted_invoice_url
          ) {
            checkoutUrl = subscription.latest_invoice.hosted_invoice_url;
          }

          console.log(
            `✅ Created Subscription ${stripeSubscriptionId} with Invoice URL: ${checkoutUrl}`,
          );
        } catch (subError) {
          console.error("❌ Failed to create Stripe Subscription:", subError);
        }
      }

      // 4. Update the record (subscription ID is null until webhook confirms, but we record the assignment)
      console.log(`📝 Updating ${table} for ${pid} with plan ${planId}...`);
      const updateRes = await query(
        `UPDATE ${table} SET 
          payment_plan_id = $2, 
          plan_price = $3, 
          plan_start_date = $4, 
          stripe_customer_id = $5,
          stripe_subscription_id = $6,
          updated_at = NOW()
          WHERE id = $1 RETURNING id`,
        [
          pid,
          planId,
          priceToApply,
          startDate,
          stripeCustomerId,
          stripeSubscriptionId,
        ],
      );

      if (updateRes.rowCount > 0) {
        assigned.push(pid);

        // 4. Send Notification Email
        try {
          console.log(
            `📧 Sending Plan Assignment Email to ${member.email}. Checkout URL: ${checkoutUrl}`,
          );
          await emailService.sendPlanAssignedEmail({
            email: member.email,
            firstName: member.first_name || "there",
            planName: planRow.name,
            clubName: "Your Club", // Ideally fetch club name from clubId
            amount: priceToApply,
            interval: planRow.interval || "month",
            startDate: startDate,
            checkoutUrl: checkoutUrl,
            subscriptionId: stripeSubscriptionId,
            stripeAccountId: stripeAccountId,
          });
        } catch (mailErr) {
          console.error(`📧 Mail failed for ${member.email}:`, mailErr);
        }
      } else {
        failures.push({ playerId: pid, error: `Failed to update ${table}` });
      }
    } catch (e) {
      console.error(`Assignment error for ${pid}:`, e);
      failures.push({ playerId: pid, error: e.message });
    }
  }

  return { assigned, failures };
}

// GENERATE PAYMENT LINK - ENHANCED
router.get(
  "/:id/payment-link",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const paymentId = req.params.id;

      const paymentResult = await query(
        `
      SELECT p.*, c.owner_id, pl.first_name, pl.last_name, pl.email
      FROM payments p
      LEFT JOIN clubs c ON p.club_id = c.id
      LEFT JOIN players pl ON p.player_id = pl.id
      WHERE p.id = $1
    `,
        [paymentId],
      );

      if (paymentResult.rows.length === 0) {
        return res.status(404).json({
          error: "Payment not found",
          message: "The specified payment does not exist",
        });
      }

      const payment = paymentResult.rows[0];

      // Check ownership
      if (payment.owner_id && payment.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only generate links for your own club payments",
        });
      }

      if (payment.payment_status === "paid") {
        return res.status(400).json({
          error: "Payment already completed",
          message: "Cannot generate link for completed payment",
        });
      }

      // Generate secure token
      const paymentToken = Buffer.from(
        `${payment.id}:${payment.created_at || new Date().toISOString()}`,
      ).toString("base64");
      const baseUrl = process.env.BASE_URL || "https://clubhubsports.net";
      const paymentLink = `${baseUrl}/payment.html?id=${payment.id}&token=${paymentToken}`;

      res.json({
        paymentLink,
        player: {
          name:
            payment.first_name && payment.last_name
              ? `${payment.first_name} ${payment.last_name}`
              : "N/A",
          email: payment.email || "N/A",
        },
        payment: {
          amount: payment.amount,
          description: payment.description,
          dueDate: payment.due_date,
        },
      });
    } catch (error) {
      console.error("Generate payment link error:", error);
      res.status(500).json({
        error: "Failed to generate payment link",
        message: "An unexpected error occurred",
      });
    }
  },
);

// BOOK EVENT WITH PAYMENT - ENHANCED
router.post("/book-event", async (req, res) => {
  try {
    const { eventId, paymentIntentId, playerData } = req.body;

    if (!eventId) {
      return res.status(400).json({
        error: "Event ID is required",
        message: "Missing eventId parameter",
      });
    }

    // Fetch event details
    const eventResult = await query(
      `
      SELECT e.*, c.name as club_name, c.owner_id
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = $1
    `,
      [eventId],
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: "Event not found",
        message: "The specified event does not exist",
      });
    }

    const event = eventResult.rows[0];

    // Check if payment is required
    if (event.price > 0 && !paymentIntentId) {
      return res.status(400).json({
        error: "Payment required",
        message: `This event costs £${event.price}. Payment is required to book.`,
        eventPrice: event.price,
      });
    }

    // Verify payment if provided
    if (paymentIntentId) {
      try {
        const paymentIntent =
          await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== "succeeded") {
          return res.status(400).json({
            error: "Payment not completed",
            message: `Payment status: ${paymentIntent.status}`,
            paymentStatus: paymentIntent.status,
          });
        }

        const expectedAmount = Math.round(event.price * 100);
        if (paymentIntent.amount !== expectedAmount) {
          return res.status(400).json({
            error: "Payment amount mismatch",
            message: `Expected £${event.price}, but received £${paymentIntent.amount / 100}`,
            expected: event.price,
            received: paymentIntent.amount / 100,
          });
        }
      } catch (stripeError) {
        console.error("Stripe verification error:", stripeError);
        return res.status(400).json({
          error: "Payment verification failed",
          message: "Could not verify payment with Stripe",
        });
      }
    }

    // Get user ID (if authenticated) or use guest
    const userId = req.user?.id || null;

    // Check if user already booked this event
    if (userId) {
      const existingBooking = await query(
        `
        SELECT id FROM event_bookings
        WHERE event_id = $1 AND user_id = $2
      `,
        [eventId, userId],
      );

      if (existingBooking.rows.length > 0) {
        return res.status(409).json({
          error: "Already booked",
          message: "You have already booked this event",
        });
      }
    }

    // Create booking in transaction
    const booking = await withTransaction(async (client) => {
      let playerId = null;

      // Handle player data if provided
      if (playerData && event.club_id) {
        const { firstName, lastName, email, phone, dateOfBirth } = playerData;

        // Check if player already exists
        const existingPlayer = await client.query(
          `
          SELECT id FROM players 
          WHERE email = $1 AND club_id = $2
        `,
          [email, event.club_id],
        );

        if (existingPlayer.rows.length > 0) {
          playerId = existingPlayer.rows[0].id;
        } else {
          // Create new player
          const newPlayer = await client.query(
            `
            INSERT INTO players (first_name, last_name, email, phone, date_of_birth, club_id, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `,
            [
              firstName,
              lastName,
              email,
              phone,
              dateOfBirth,
              event.club_id,
              userId,
            ],
          );

          playerId = newPlayer.rows[0].id;
        }
      }

      // Create booking record
      const bookingResult = await client.query(
        `
        INSERT INTO event_bookings (event_id, user_id, player_id, amount_paid, stripe_payment_intent_id, booking_status)
        VALUES ($1, $2, $3, $4, $5, 'confirmed')
        RETURNING *
      `,
        [eventId, userId, playerId, event.price || 0, paymentIntentId],
      );

      return bookingResult.rows[0];
    });

    console.log(`Event booked: ${event.title} by user ${userId || "guest"}`);

    res.status(201).json({
      success: true,
      message: "Event booked successfully",
      booking: booking,
      event: {
        title: event.title,
        date: event.event_date,
        price: event.price,
      },
    });
  } catch (error) {
    console.error("Book event error:", error);
    res.status(500).json({
      error: "Failed to book event",
      message: "An error occurred while booking the event",
    });
  }
});

// Create new payment
router.post(
  "/",
  authenticateToken,
  requireOrganization,
  paymentValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { playerId, amount, paymentType, description, dueDate } = req.body;

      // Fetch player details
      const playerResult = await query(
        `
      SELECT p.*, c.owner_id 
      FROM players p
      LEFT JOIN clubs c ON p.club_id = c.id
      WHERE p.id = $1
    `,
        [playerId],
      );

      if (playerResult.rows.length === 0) {
        return res.status(404).json({
          error: "Player not found",
          message: "The specified player does not exist",
        });
      }

      const player = playerResult.rows[0];

      // Check ownership
      if (player.owner_id && player.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only create payments for players in your own clubs",
        });
      }

      // Create payment record
      const result = await query(
        `
      INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `,
        [
          playerId,
          player.club_id,
          amount,
          paymentType || "general",
          description,
          dueDate,
        ],
      );

      const newPayment = result.rows[0];

      console.log(
        `Payment created: ${description} - £${amount} for player ${playerId}`,
      );

      res.status(201).json({
        success: true,
        message: "Payment created successfully",
        payment: newPayment,
      });
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({
        error: "Failed to create payment",
        message: "An error occurred while creating the payment",
      });
    }
  },
);

// NEW DASHBOARD ASSIGNMENT ROUTES
router.post(
  "/assign-player-plan",
  authenticateToken,
  assignPlayerToPaymentPlanHandler,
);
router.post("/bulk-assign-plan", authenticateToken, bulkAssignPlanHandler);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error("Payment route error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: "An unexpected error occurred in payment processing",
  });
});

// POST /api/payments/cleanup - Clear dummy data (Admin Only)
router.post(
  "/cleanup",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      console.log("🧹 Cleaning up dummy plans and payments via API...");

      // Check which tables exist before truncating
      const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

      const existingTables = tablesResult.rows.map((r) => r.table_name);

      // Define tables to clear
      const tablesToClear = [
        "plans",
        "payments",
        "player_plans",
        "invoices",
        "subscriptions",
        "event_bookings",
      ];

      const cleared = [];
      for (const table of tablesToClear) {
        if (existingTables.includes(table)) {
          console.log(`- Truncating ${table}...`);
          await query(`TRUNCATE TABLE ${table} CASCADE`);
          cleared.push(table);
        }
      }

      res.json({
        success: true,
        message: "Dummy data cleared successfully",
        clearedTables: cleared,
      });
    } catch (error) {
      console.error("❌ API Cleanup failed:", error);
      res.status(500).json({
        error: "Cleanup failed",
        message: error.message,
      });
    }
  },
);

module.exports = router;
