const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { query, queries, withTransaction } = require("../config/database");
const emailService = require("../services/email-service"); // Your existing email service

let authenticateToken;
try {
  const authMiddleware = require("../middleware/auth");
  authenticateToken = authMiddleware.authenticateToken;
} catch (error) {
  console.error("Failed to import auth middleware:", error);
  authenticateToken = (req, res, next) => {
    res.status(500).json({ error: "Authentication middleware not available" });
  };
}

const router = express.Router();

/* --------------------------- Validation rules --------------------------- */

const registerValidation = [
  // accountType can arrive as accountType or userType; check either
  body("accountType")
    .custom((value, { req }) => {
      const v = value || req.body.userType;
      return ["adult", "organization"].includes(v);
    })
    .withMessage("Invalid account type"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("firstName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("First name is required"),
  body("lastName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Last name is required"),
  body("phone").optional().isMobilePhone().withMessage("Invalid phone number"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date of birth"),
];

const childProfileValidation = [
  body("firstName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Child first name is required"),
  body("lastName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Child last name is required"),
  body("dateOfBirth")
    .isISO8601()
    .withMessage("Child date of birth is required"),
  body("primarySport").optional().isLength({ max: 50 }),
  body("emergencyContactName").optional().isLength({ max: 255 }),
  body("emergencyContactPhone").optional().isMobilePhone(),
];

/* ------------------------------- Helpers -------------------------------- */

// Ensure JWT_SECRET is available
const JWT_SECRET = process.env.JWT_SECRET || "clubhub-secret-2024-dev";

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      accountType: user.account_type,
      isPlatformAdmin: user.is_platform_admin || false,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

async function sendWelcomeEmail(email, firstName, accountType) {
  try {
    const dashboardLink =
      accountType === "organization"
        ? `${process.env.FRONTEND_URL || "http://localhost:3000"}/admin-dashboard.html`
        : `${process.env.FRONTEND_URL || "http://localhost:3000"}/player-dashboard.html`;

    await emailService.sendWelcomeEmail({
      email,
      firstName,
      accountType,
      dashboardLink,
    });

    console.log("✅ Welcome email sent to:", email);
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
    throw error;
  }
}

async function sendPasswordResetEmail(email, firstName, resetToken) {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/forgot-password.html?token=${resetToken}`;

    await emailService.sendPasswordResetEmail(email, firstName, resetUrl);

    console.log("✅ Password reset email sent to:", email);
  } catch (error) {
    console.error("❌ Failed to send password reset email:", error);
    throw error;
  }
}

async function sendPasswordResetConfirmationEmail(email, firstName) {
  try {
    await emailService.sendPasswordResetConfirmationEmail(email, firstName);
    console.log("✅ Password reset confirmation sent to:", email);
  } catch (error) {
    console.error("❌ Failed to send password reset confirmation:", error);
  }
}

/* ------------------------------- Templates ------------------------------ */

/* ------------------------------- Templates ------------------------------ */
// (Moved to EmailService for centralized branding)

/* -------------------------------- Routes -------------------------------- */

// REGISTER (accepts accountType or userType; returns camelCase fields)
router.post("/register", registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors.array() });
    }

    // normalize alias
    if (!req.body.accountType && req.body.userType) {
      req.body.accountType = req.body.userType;
    }

    const {
      email,
      password,
      firstName,
      lastName,
      accountType,
      orgTypes = [],
      phone,
      dateOfBirth,
      profile = {},
    } = req.body;

    // duplicate?
    const existingUser = await query(queries.findUserByEmail, [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: "User already exists",
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await withTransaction(async (client) => {
      const userResult = await client.query(
        `
        INSERT INTO users (
          email, password_hash, first_name, last_name, account_type, org_types,
          phone, date_of_birth, email_recovery_enabled, auto_payments_enabled,
          payment_reminders_enabled, receipt_emails_enabled
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id, email, first_name, last_name, account_type, org_types, phone, date_of_birth, created_at
      `,
        [
          email,
          passwordHash,
          firstName,
          lastName,
          accountType,
          orgTypes,
          phone,
          dateOfBirth,
          profile.emailRecovery !== false,
          profile.autoPayments || false,
          profile.paymentReminders !== false,
          profile.receiptEmails !== false,
        ],
      );

      const newUser = userResult.rows[0];

      // optional profile (non-fatal if table doesn't exist)
      if (
        profile.location ||
        profile.primarySport ||
        profile.position ||
        profile.experience
      ) {
        try {
          await client.query(
            `
            INSERT INTO user_profiles (
              user_id, location, primary_sport, position, experience_level,
              previous_teams, achievements, bio, availability_weekdays,
              availability_weekends, availability_evenings
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          `,
            [
              newUser.id,
              profile.location || null,
              profile.primarySport || null,
              profile.position || null,
              profile.experience || null,
              profile.previousTeams || null,
              profile.achievements || null,
              profile.bio || null,
              profile.availabilityWeekdays !== false,
              profile.availabilityWeekends !== false,
              profile.availabilityEvenings !== false,
            ],
          );
        } catch (profileError) {
          console.warn(
            "⚠️ Failed to create user profile (non-fatal):",
            profileError.message,
          );
        }
      }

      // organization bootstrap
      if (accountType === "organization" && orgTypes.length > 0) {
        const clubName = `${firstName} ${lastName}'s ${orgTypes.join(", ")}`;
        const slug = clubName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 255);

        const orgResult = await client.query(
          `
          INSERT INTO organizations (name, slug, sport, description, location, owner_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
          [
            clubName,
            `${slug}-${Date.now()}`,
            orgTypes[0],
            "New organization created with ClubHub",
            profile.location || "To be updated",
            newUser.id,
          ],
        );

        newUser.club = orgResult.rows[0];

        await client.query(
          `
          INSERT INTO organization_members (user_id, organization_id, role, status)
          VALUES ($1,$2,$3,$4)
        `,
          [newUser.id, orgResult.rows[0].id, "owner", "active"],
        );

        await client.query(
          `
          INSERT INTO user_preferences (user_id, current_organization_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id) DO UPDATE SET current_organization_id = $2
        `,
          [newUser.id, orgResult.rows[0].id],
        );
      }

      return newUser;
    });

    const token = generateToken(result);

    try {
      await sendWelcomeEmail(
        result.email,
        result.first_name,
        result.account_type,
      );
    } catch (emailErr) {
      console.warn("Welcome email failed (non-fatal):", emailErr.message);
    }

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: result.id,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        userType: result.account_type,
        org_types: result.org_types,
        phone: result.phone,
        date_of_birth: result.date_of_birth,
        organization: result.club || null,
        club: result.club || null,
      },
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      table: error.table,
      column: error.column,
    });
    res.status(500).json({
      error: "Registration failed",
      message: "An error occurred while creating your account",
      debug: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// LOGIN (returns camelCase + userType)
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password").exists().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const { email, password, demoBypass } = req.body;
      const normalizedEmail = email ? email.toLowerCase().trim() : "";

      console.log(`🔑 Login Attempt: ${normalizedEmail}`);

      // Auto-create demo users if they don't exist
      const demoCredentials = {
        "demo-admin@clubhub.com": {
          pass: "password123",
          firstName: "Demo",
          lastName: "Admin",
          type: "organization",
          isPlatformAdmin: false,
        },
        "demo-coach@clubhub.com": {
          pass: "password123",
          firstName: "Demo",
          lastName: "Coach",
          type: "organization",
          isPlatformAdmin: false,
        },
        "demo-player@clubhub.com": {
          pass: "password123",
          firstName: "Demo",
          lastName: "Player",
          type: "adult",
          isPlatformAdmin: false,
        },
        // NEW DEMO ACCOUNTS
        "superadmin@clubhub.com": {
          pass: "Super@123",
          firstName: "Super",
          lastName: "Admin",
          type: "organization",
          isPlatformAdmin: true,
        },
        "admin@proclubdemo.com": {
          pass: "Admin@123",
          firstName: "Pro",
          lastName: "Club Admin",
          type: "organization",
          isPlatformAdmin: false,
        },
        "coach@proclubdemo.com": {
          pass: "Coach@123",
          firstName: "Michael",
          lastName: "Thompson",
          type: "organization",
          isPlatformAdmin: false,
        },
        "player@proclubdemo.com": {
          pass: "Player@123",
          firstName: "David",
          lastName: "Williams",
          type: "adult",
          isPlatformAdmin: false,
        },
      };

      // Check if this is a demo login attempt
      if (demoCredentials[normalizedEmail]) {
        const demo = demoCredentials[normalizedEmail];

        // Try to find existing user
        let userResult = await query(queries.findUserByEmail, [
          normalizedEmail,
        ]);

        // If user doesn't exist, create them
        if (userResult.rows.length === 0) {
          console.log(`🌱 Auto-creating demo user: ${normalizedEmail}`);
          const hashedPassword = await bcrypt.hash(demo.pass, 10);

          userResult = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_platform_admin)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, password_hash, first_name, last_name, account_type, is_platform_admin`,
            [
              normalizedEmail,
              hashedPassword,
              demo.firstName,
              demo.lastName,
              demo.type,
              demo.isPlatformAdmin,
            ],
          );
          console.log(`✅ Demo user created: ${normalizedEmail}`);
        }

        // Now verify password
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
          const token = jwt.sign(
            {
              id: user.id,
              email: user.email,
              accountType: user.account_type,
              isPlatformAdmin: user.is_platform_admin || false,
            },
            JWT_SECRET,
            { expiresIn: "7d" },
          );

          console.log(`✅ Demo login successful: ${normalizedEmail}`);

          // Auto-create demo organization and data for demo accounts
          const demoKey = demoCredentials[normalizedEmail]
            ? normalizedEmail
            : null;

          if (demoKey) {
            try {
              // ADMIN DEMO - Create full club setup (Existing or New Logic)
              if (
                (normalizedEmail === "demo-admin@clubhub.com" ||
                  normalizedEmail === "admin@proclubdemo.com") &&
                user.account_type === "organization"
              ) {
                const existingClub = await query(
                  "SELECT id FROM clubs WHERE owner_id = $1",
                  [user.id],
                );

                if (existingClub.rows.length === 0) {
                  console.log("🏢 Creating demo club for admin...");

                  const clubResult = await query(
                    `INSERT INTO clubs (name, sport, description, location, owner_id, member_count, types)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                    [
                      normalizedEmail === "admin@proclubdemo.com"
                        ? "Pro Club Demo"
                        : "Demo Sports Club",
                      "Football",
                      "A premium demo club showcasing ClubHub features",
                      "London, UK",
                      user.id,
                      24,
                      ["academy", "competitive"],
                    ],
                  );
                  const clubId = clubResult.rows[0].id;

                  // Create team
                  const teamResult = await query(
                    `INSERT INTO teams (name, age_group, sport, club_id) VALUES ($1, $2, $3, $4) RETURNING id`,
                    ["Under 18s", "U18", "Football", clubId],
                  );
                  const teamId = teamResult.rows[0].id;

                  // Create Sample Event (Training)
                  const eventDate = new Date();
                  eventDate.setDate(eventDate.getDate() + 2); // 2 days from now

                  await query(
                    `INSERT INTO events (
                        title, description, event_type, event_date, event_time, 
                        location, price, capacity, spots_available, club_id, 
                        team_id, created_by, created_at, updated_at
                      )
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
                    [
                      "U18 Training Session",
                      "Regular squad training focusing on possession.",
                      "training",
                      eventDate.toISOString().split("T")[0], // YYYY-MM-DD
                      "18:00", // event_time
                      "Main Pitch, London",
                      0, // price
                      22, // capacity
                      22, // spots_available
                      clubId,
                      teamId,
                      user.id,
                    ],
                  );

                  // Create 3 players
                  for (let i = 1; i <= 3; i++) {
                    await query(
                      `INSERT INTO players (first_name, last_name, email, date_of_birth, position, club_id, monthly_fee)
                       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                      [
                        `Player${i}`,
                        "Demo",
                        `player${i}.demo@clubhub.com`,
                        "2006-01-15",
                        i === 1
                          ? "Forward"
                          : i === 2
                            ? "Midfielder"
                            : "Defender",
                        clubId,
                        50.0,
                      ],
                    );
                  }
                  console.log(`✅ Demo club created with team and players`);
                }
              }

              // COACH DEMO - Add to demo club as staff
              if (
                (normalizedEmail === "demo-coach@clubhub.com" ||
                  normalizedEmail === "coach@proclubdemo.com") &&
                user.account_type === "organization"
              ) {
                const targetAdminEmail =
                  normalizedEmail === "coach@proclubdemo.com"
                    ? "admin@proclubdemo.com"
                    : "demo-admin@clubhub.com";
                const demoClub = await query(
                  `SELECT c.id FROM clubs c JOIN users u ON c.owner_id = u.id WHERE u.email = $1 LIMIT 1`,
                  [targetAdminEmail],
                );

                if (demoClub.rows.length > 0) {
                  const clubId = demoClub.rows[0].id;
                  const existingStaff = await query(
                    "SELECT id FROM staff WHERE user_id = $1",
                    [user.id],
                  );

                  if (existingStaff.rows.length === 0) {
                    await query(
                      `INSERT INTO staff (user_id, club_id, role, is_active, first_name, last_name, email) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                      [
                        user.id,
                        clubId,
                        "coach",
                        true,
                        user.first_name,
                        user.last_name,
                        user.email,
                      ],
                    );
                    console.log(`✅ Coach added to demo club`);
                  }
                }
              }

              // PLAYER DEMO - Create player profile
              if (
                (normalizedEmail === "demo-player@clubhub.com" ||
                  normalizedEmail === "player@proclubdemo.com") &&
                user.account_type === "adult"
              ) {
                const existingProfile = await query(
                  "SELECT id FROM user_profiles WHERE user_id = $1",
                  [user.id],
                );

                if (existingProfile.rows.length === 0) {
                  await query(
                    `INSERT INTO user_profiles (user_id, date_of_birth, gender, location, sport, position)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                      user.id,
                      "1995-06-20",
                      "Male",
                      "London, UK",
                      "Football",
                      "Forward",
                    ],
                  );
                  console.log(`✅ Player profile created`);
                }
              }
            } catch (error) {
              console.error("⚠️ Failed to create demo data:", error.message);
            }
          }

          return res.json({
            message: "Login successful",
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              userType: user.account_type,
              account_type: user.account_type, // For dashboard compatibility
              isPlatformAdmin: user.is_platform_admin || false,
            },
          });
        }
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(
          `❌ Validation Failed for: ${normalizedEmail}`,
          errors.array(),
        );
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const userResult = await query(queries.findUserByEmail, [email]);
      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = userResult.rows[0];

      // Check if user is active
      if (user.is_active === false) {
        return res.status(403).json({
          error: "Account deactivated",
          message: "Your account has been deactivated. Please contact support.",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch)
        return res.status(401).json({ error: "Invalid email or password" });

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          accountType: user.account_type,
          isPlatformAdmin: user.is_platform_admin || false,
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      return res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: user.account_type,
          isPlatformAdmin: user.is_platform_admin || false,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Login failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
);

// LOGOUT (stateless JWT; client discards token)
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// SEED DEMO USERS (public endpoint for quick setup)
router.post("/seed-demo-users", async (req, res) => {
  try {
    const demoUsers = [
      {
        email: "superadmin@clubhub.com",
        pass: "Super@123",
        firstName: "Super",
        lastName: "Admin",
        type: "organization",
        isPlatformAdmin: true,
      },
      {
        email: "admin@proclubdemo.com",
        pass: "Admin@123",
        firstName: "John",
        lastName: "Smith",
        type: "organization",
        isPlatformAdmin: false,
      },
      {
        email: "coach@proclubdemo.com",
        pass: "Coach@123",
        firstName: "Michael",
        lastName: "Thompson",
        type: "organization",
        isPlatformAdmin: false,
      },
      {
        email: "player@proclubdemo.com",
        pass: "Player@123",
        firstName: "David",
        lastName: "Williams",
        type: "adult",
        isPlatformAdmin: false,
      },
    ];

    const created = [];
    const existed = [];

    for (const demo of demoUsers) {
      const existing = await query(queries.findUserByEmail, [demo.email]);

      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(demo.pass, 10);
        await query(
          `INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_platform_admin, email_verified)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [
            demo.email,
            hashedPassword,
            demo.firstName,
            demo.lastName,
            demo.type,
            demo.isPlatformAdmin,
          ],
        );
        created.push(demo.email);
      } else {
        existed.push(demo.email);
      }
    }

    res.json({
      message: "Demo users seeded",
      created,
      existed,
      total: created.length + existed.length,
    });
  } catch (error) {
    console.error("Seed demo users error:", error);
    res.status(500).json({ error: "Failed to seed demo users" });
  }
});

// CURRENT USER (/api/auth/me) — Authorization: Bearer <token>
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      "SELECT id, email, first_name, last_name, account_type FROM users WHERE id = $1",
      [decoded.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const u = result.rows[0];
    return res.json({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      userType: u.account_type,
      account_type: u.account_type, // For dashboard compatibility
    });
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Find user by email (optional helper your frontend might call)
router.get("/find-user", async (req, res) => {
  try {
    const email = (req.query.email || "").toString();
    if (!email) return res.status(400).json({ error: "Email is required" });

    const result = await query(queries.findUserByEmail, [email]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const u = result.rows[0];
    res.json({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      userType: u.account_type,
    });
  } catch (err) {
    console.error("find-user error:", err);
    res.status(500).json({ error: "Failed to find user" });
  }
});

/* -------------------- Child/Org/Profile routes  ------------------- */

// Add child profile
router.post(
  "/add-child",
  authenticateToken,
  childProfileValidation,
  async (req, res) => {
    try {
      if (req.user.accountType !== "adult") {
        return res.status(403).json({
          error: "Access denied",
          message: "Only adult accounts can manage child profiles",
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: errors.array() });
      }

      const {
        firstName,
        lastName,
        dateOfBirth,
        primarySport,
        position,
        school,
        emergencyContactName,
        emergencyContactPhone,
        medicalNotes,
      } = req.body;

      const result = await query(
        `
      INSERT INTO child_profiles (
        parent_id, first_name, last_name, date_of_birth, primary_sport,
        position, school, emergency_contact_name, emergency_contact_phone, medical_notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `,
        [
          req.user.id,
          firstName,
          lastName,
          dateOfBirth,
          primarySport,
          position,
          school,
          emergencyContactName,
          emergencyContactPhone,
          medicalNotes,
        ],
      );

      res.status(201).json({
        message: "Child profile created successfully",
        child: result.rows[0],
      });
    } catch (error) {
      console.error("Add child error:", error);
      res.status(500).json({
        error: "Failed to add child profile",
        message: "An error occurred while creating the child profile",
      });
    }
  },
);

// Get child profiles
router.get("/children", authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== "adult") {
      return res.status(403).json({
        error: "Access denied",
        message: "Only adult accounts can view child profiles",
      });
    }

    const result = await query(
      `
      SELECT * FROM child_profiles
      WHERE parent_id = $1 AND is_active = true
      ORDER BY first_name, last_name
    `,
      [req.user.id],
    );

    res.json({ children: result.rows });
  } catch (error) {
    console.error("Get children error:", error);
    res.status(500).json({
      error: "Failed to get child profiles",
      message: "An error occurred while fetching child profiles",
    });
  }
});

// Update child profile
router.put(
  "/children/:childId",
  authenticateToken,
  childProfileValidation,
  async (req, res) => {
    try {
      if (req.user.accountType !== "adult") {
        return res.status(403).json({
          error: "Access denied",
          message: "Only adult accounts can manage child profiles",
        });
      }

      const { childId } = req.params;
      const {
        firstName,
        lastName,
        dateOfBirth,
        primarySport,
        position,
        school,
        emergencyContactName,
        emergencyContactPhone,
        medicalNotes,
      } = req.body;

      const childCheck = await query(
        `SELECT id FROM child_profiles WHERE id = $1 AND parent_id = $2`,
        [childId, req.user.id],
      );
      if (childCheck.rows.length === 0) {
        return res.status(404).json({
          error: "Child not found",
          message: "Child profile not found or access denied",
        });
      }

      const result = await query(
        `
      UPDATE child_profiles SET
        first_name=$1,last_name=$2,date_of_birth=$3,primary_sport=$4,
        position=$5,school=$6,emergency_contact_name=$7,emergency_contact_phone=$8,
        medical_notes=$9,updated_at=NOW()
      WHERE id=$10 AND parent_id=$11
      RETURNING *
    `,
        [
          firstName,
          lastName,
          dateOfBirth,
          primarySport,
          position,
          school,
          emergencyContactName,
          emergencyContactPhone,
          medicalNotes,
          childId,
          req.user.id,
        ],
      );

      res.json({
        message: "Child profile updated successfully",
        child: result.rows[0],
      });
    } catch (error) {
      console.error("Update child error:", error);
      res.status(500).json({
        error: "Failed to update child profile",
        message: "An error occurred while updating the child profile",
      });
    }
  },
);

// Organizations list
router.get("/organizations", authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== "organization") {
      return res.status(403).json({
        error: "Access denied",
        message: "Only organization accounts can view organizations",
      });
    }

    const result = await query(
      `
      SELECT c.*, oa.role, oa.is_primary, oa.permissions
      FROM clubs c
      INNER JOIN organization_associations oa ON c.id = oa.club_id
      WHERE oa.user_id = $1
      ORDER BY oa.is_primary DESC, c.name
    `,
      [req.user.id],
    );

    res.json({ organizations: result.rows });
  } catch (error) {
    console.error("Get organizations error:", error);
    res.status(500).json({
      error: "Failed to get organizations",
      message: "An error occurred while fetching organizations",
    });
  }
});

// Get authentication context (current user + organizations)
router.get("/context", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user info and current org preference
    const userResult = await query(
      `
      SELECT u.id, u.email, u.first_name, u.last_name, u.account_type, u.is_platform_admin, up.current_organization_id
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user = userResult.rows[0];

    // Get all organizations user belongs to (direct memberships only)
    const orgsResult = await query(
      `
      SELECT o.id, o.name, o.sport, o.location, o.logo_url, om.role, om.status
      FROM organizations o
      INNER JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = $1 AND om.status = 'active'
      ORDER BY o.name
    `,
      [userId],
    );

    const organizations = orgsResult.rows;

    console.log("🔍 Context - User orgs:", {
      userId,
      account_type: user.account_type,
      saved_org_id: user.current_organization_id,
      orgCount: organizations.length,
      orgs: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        role: o.role,
      })),
    });

    // Determine current organization
    let currentOrg = null;

    // Step 1: Check saved preference
    if (user.current_organization_id) {
      currentOrg = organizations.find(
        (o) => o.id === user.current_organization_id,
      );

      // CRITICAL FIX FOR PLATFORM ADMINS:
      // If we are a platform admin and the org isn't in our membership list,
      // we still need to fetch it to maintain context.
      if (!currentOrg && user.is_platform_admin) {
        const platformOrgResult = await query(
          "SELECT id, name, sport, location, logo_url FROM organizations WHERE id = $1",
          [user.current_organization_id],
        );
        if (platformOrgResult.rows.length > 0) {
          currentOrg = {
            ...platformOrgResult.rows[0],
            role: "Platform Admin",
            status: "active",
          };
          console.log("🛠️ Platform Admin context injection:", currentOrg.name);
        }
      }

      if (currentOrg) {
        console.log("📌 Using saved preference:", {
          id: currentOrg.id,
          name: currentOrg.name,
          role: currentOrg.role,
        });
      } else {
        console.log(
          "⚠️ Saved org ID not found in user's orgs:",
          user.current_organization_id,
        );
      }
    } else {
      console.log("ℹ️ No saved org preference");
    }

    // Step 2: If no saved preference, prioritize organizations where user is owner/admin
    if (!currentOrg && organizations.length > 0) {
      console.log("🔍 No saved preference, applying prioritization...");

      // For organization accounts, prioritize orgs where they're owner/admin
      if (user.account_type === "organization") {
        process.stdout.write(
          "👤 User is organization account, looking for BEST role...",
        );

        // Find owner role first, then admin, then others
        const sortedOrgs = [...organizations].sort((a, b) => {
          const roles = { owner: 0, admin: 1, coach: 2, staff: 3, player: 4 };
          const roleA = roles[a.role] ?? 10;
          const roleB = roles[b.role] ?? 10;
          if (roleA !== roleB) return roleA - roleB;
          return a.name.localeCompare(b.name); // Alphabetical fallback
        });

        currentOrg = sortedOrgs[0];

        if (currentOrg) {
          console.log(
            "👑 Selected prioritized org:",
            currentOrg.name,
            " (Role:",
            currentOrg.role,
            ")",
          );
        }
      } else {
        // For other accounts (player/parent), just pick the first active association
        currentOrg = organizations[0];
      }

      // Fallback to first org
      if (!currentOrg) {
        currentOrg = organizations[0];
        console.log("📍 Fallback to first org:", {
          id: currentOrg.id,
          name: currentOrg.name,
          role: currentOrg.role,
        });
      }
    }

    console.log("✅ Final current org:", {
      id: currentOrg?.id,
      name: currentOrg?.name,
      role: currentOrg?.role,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.account_type,
        isPlatformAdmin: user.is_platform_admin || false,
      },
      currentOrganization: currentOrg,
      organizations: organizations,
      hasMultipleOrganizations: organizations.length > 1,
    });
  } catch (error) {
    console.error("Get context error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get auth context" });
  }
});

// Switch organization
router.post("/switch-organization", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { organizationId } = req.body;

    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, error: "Organization ID is required" });
    }

    // Verify membership OR check if user is platform admin
    const userCheck = await query(
      "SELECT is_platform_admin FROM users WHERE id = $1",
      [userId],
    );
    const isPlatformAdmin = userCheck.rows[0]?.is_platform_admin;

    if (!isPlatformAdmin) {
      const memberCheck = await query(
        `
        SELECT 1 FROM organization_members 
        WHERE user_id = $1 AND organization_id = $2 AND status = 'active'
      `,
        [userId, organizationId],
      );

      if (memberCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: "Organization not found or access denied",
        });
      }
    }

    // Update preference
    await query(
      `
      INSERT INTO user_preferences (user_id, current_organization_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET current_organization_id = $2, updated_at = NOW()
    `,
      [userId, organizationId],
    );

    res.json({ success: true, message: "Organization switched successfully" });
  } catch (error) {
    console.error("Switch organization error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to switch organization" });
  }
});

// Profile update
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const {
      location,
      primarySport,
      position,
      experienceLevel,
      previousTeams,
      achievements,
      bio,
      availabilityWeekdays,
      availabilityWeekends,
      availabilityEvenings,
    } = req.body;

    const existingProfile = await query(
      `SELECT id FROM user_profiles WHERE user_id=$1`,
      [req.user.id],
    );

    let result;
    if (existingProfile.rows.length > 0) {
      result = await query(
        `
        UPDATE user_profiles SET
          location=$1, primary_sport=$2, position=$3, experience_level=$4,
          previous_teams=$5, achievements=$6, bio=$7,
          availability_weekdays=$8, availability_weekends=$9, availability_evenings=$10,
          updated_at=NOW()
        WHERE user_id=$11
        RETURNING *
      `,
        [
          location,
          primarySport,
          position,
          experienceLevel,
          previousTeams,
          achievements,
          bio,
          availabilityWeekdays,
          availabilityWeekends,
          availabilityEvenings,
          req.user.id,
        ],
      );
    } else {
      result = await query(
        `
        INSERT INTO user_profiles (
          user_id, location, primary_sport, position, experience_level,
          previous_teams, achievements, bio, availability_weekdays,
          availability_weekends, availability_evenings
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
      `,
        [
          req.user.id,
          location,
          primarySport,
          position,
          experienceLevel,
          previousTeams,
          achievements,
          bio,
          availabilityWeekdays,
          availabilityWeekends,
          availabilityEvenings,
        ],
      );
    }

    res.json({
      message: "Profile updated successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      error: "Failed to update profile",
      message: "An error occurred while updating your profile",
    });
  }
});

// Get profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT up.*, u.first_name, u.last_name, u.email, u.phone, u.date_of_birth
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `,
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "User not found", message: "User profile not found" });
    }
    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: "Failed to get profile",
      message: "An error occurred while fetching your profile",
    });
  }
});

// GDPR: Export all user data
router.get("/gdpr/export", authenticateToken, async (req, res) => {
  try {
    const userData = {};

    // 1. User records
    const userRes = await query("SELECT * FROM users WHERE id = $1", [
      req.user.id,
    ]);
    userData.user = userRes.rows[0];

    // 2. Profile
    const profileRes = await query(
      "SELECT * FROM user_profiles WHERE user_id = $1",
      [req.user.id],
    );
    userData.profile = profileRes.rows[0];

    // 3. Players associated
    const playersRes = await query("SELECT * FROM players WHERE user_id = $1", [
      req.user.id,
    ]);
    userData.players = playersRes.rows;

    // 4. Payments
    const playerIds = userData.players.map((p) => p.id);
    if (playerIds.length > 0) {
      const paymentsRes = await query(
        "SELECT * FROM payments WHERE player_id = ANY($1)",
        [playerIds],
      );
      userData.payments = paymentsRes.rows;
    }

    // 5. Notifications
    const notificationsRes = await query(
      "SELECT * FROM notifications WHERE user_id = $1",
      [req.user.id],
    );
    userData.notifications = notificationsRes.rows;

    res.setHeader(
      "Content-disposition",
      "attachment; filename=clubhub-data-export.json",
    );
    res.setHeader("Content-type", "application/json");
    res.send(JSON.stringify(userData, null, 2));
  } catch (error) {
    console.error("GDPR Export error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

// GDPR: Delete account
router.delete("/gdpr/delete", authenticateToken, async (req, res) => {
  try {
    await withTransaction(async (client) => {
      // Cascading deletes should handle most, but let's be thorough if needed
      await client.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    });
    res.json({
      message: "Account and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("GDPR Delete error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// ========================================
// FORGOT PASSWORD & RESET
// ========================================

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      const userResult = await query("SELECT * FROM users WHERE email = $1", [
        email.toLowerCase(),
      ]);

      // Always return success to prevent email enumeration
      if (userResult.rows.length === 0) {
        return res.json({
          message: "If that email exists, a reset link has been sent",
        });
      }

      const user = userResult.rows[0];
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await query(
        "UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3",
        [resetToken, resetExpires, user.id],
      );

      await sendPasswordResetEmail(email, user.first_name, resetToken);

      res.json({ message: "If that email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  },
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;

      const userResult = await query(
        "SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()",
        [token],
      );

      if (userResult.rows.length === 0) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }

      const user = userResult.rows[0];
      const hashedPassword = await bcrypt.hash(password, 10);

      await query(
        "UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2",
        [hashedPassword, user.id],
      );

      await sendPasswordResetConfirmationEmail(user.email, user.first_name);

      res.json({
        message:
          "Password reset successful. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  },
);

// ========================================
// ACCOUNT SETTINGS
// ========================================

router.put("/profile-personal", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const result = await query(
      "UPDATE users SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
      [firstName, lastName, phone, req.user.id],
    );

    res.json({ message: "Profile updated successfully", user: result.rows[0] });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post(
  "/change-password",
  authenticateToken,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const userResult = await query("SELECT * FROM users WHERE id = $1", [
        req.user.id,
      ]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userResult.rows[0];
      const validPassword = await bcrypt.compare(
        currentPassword,
        user.password,
      );

      if (!validPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await query(
        "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
        [hashedPassword, req.user.id],
      );

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  },
);

router.put("/settings", authenticateToken, async (req, res) => {
  try {
    const { emailNotifications, pushNotifications, marketingEmails, theme } =
      req.body;

    // Update user_preferences table
    await query(
      `INSERT INTO user_preferences (user_id, email_notifications, push_notifications, preferences, theme, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET 
         email_notifications = EXCLUDED.email_notifications,
         push_notifications = EXCLUDED.push_notifications,
         preferences = EXCLUDED.preferences,
         theme = EXCLUDED.theme,
         updated_at = NOW()`,
      [
        req.user.id,
        emailNotifications !== false,
        pushNotifications !== false,
        JSON.stringify({ marketingEmails: !!marketingEmails }),
        theme || "dark",
      ],
    );

    res.json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      "SELECT email_notifications, push_notifications, preferences, theme FROM user_preferences WHERE user_id = $1",
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.json({
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false,
        theme: "dark",
      });
    }

    const prefs = result.rows[0];
    res.json({
      emailNotifications: prefs.email_notifications,
      pushNotifications: prefs.push_notifications,
      marketingEmails: prefs.preferences?.marketingEmails || false,
      theme: prefs.theme,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.delete("/account", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Use transaction to ensure all user data is removed
    await withTransaction(async (client) => {
      // 1. Delete organization memberships (cascades usually, but let's be safe)
      await client.query(
        "DELETE FROM organization_members WHERE user_id = $1",
        [userId],
      );

      // 2. Delete user preferences
      await client.query("DELETE FROM user_preferences WHERE user_id = $1", [
        userId,
      ]);

      // 3. Delete user profiles
      await client.query("DELETE FROM user_profiles WHERE user_id = $1", [
        userId,
      ]);

      // 4. Delete the user
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
    });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;
