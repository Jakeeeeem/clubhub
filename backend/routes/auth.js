const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query, queries, withTransaction } = require('../config/database');
const emailService = require('../services/email-service'); // Your existing email service

let authenticateToken;
try {
  const authMiddleware = require('../middleware/auth');
  authenticateToken = authMiddleware.authenticateToken;
} catch (error) {
  console.error('Failed to import auth middleware:', error);
  authenticateToken = (req, res, next) => {
    res.status(500).json({ error: 'Authentication middleware not available' });
  };
}

const router = express.Router();

// Enhanced validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('accountType').isIn(['adult', 'organization']).withMessage('Invalid account type'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date of birth'),
];

const childProfileValidation = [
  body('firstName').trim().isLength({ min: 1 }).withMessage('Child first name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Child last name is required'),
  body('dateOfBirth').isISO8601().withMessage('Child date of birth is required'),
  body('primarySport').optional().isLength({ max: 50 }),
  body('emergencyContactName').optional().isLength({ max: 255 }),
  body('emergencyContactPhone').optional().isMobilePhone(),
];

// Enhanced user registration with profile support
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      email, password, firstName, lastName, accountType, orgTypes = [],
      phone, dateOfBirth, profile = {}
    } = req.body;

    // Check if user already exists
    const existingUser = await query(queries.findUserByEmail, [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user and profile in transaction
    const result = await withTransaction(async (client) => {
      // Enhanced user creation query
      const userResult = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, account_type, org_types,
          phone, date_of_birth, email_recovery_enabled, auto_payments_enabled,
          payment_reminders_enabled, receipt_emails_enabled
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, email, first_name, last_name, account_type, org_types, phone, date_of_birth, created_at
      `, [
        email, passwordHash, firstName, lastName, accountType, orgTypes,
        phone, dateOfBirth, 
        profile.emailRecovery !== false, // Default true
        profile.autoPayments || false,
        profile.paymentReminders !== false, // Default true
        profile.receiptEmails !== false // Default true
      ]);

      const newUser = userResult.rows[0];

      // Create user profile if profile data provided
      if (profile.location || profile.primarySport || profile.position || profile.experience) {
        await client.query(`
          INSERT INTO user_profiles (
            user_id, location, primary_sport, position, experience_level,
            previous_teams, achievements, bio, availability_weekdays,
            availability_weekends, availability_evenings
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
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
          profile.availabilityEvenings !== false
        ]);
      }

      // If organization, create a club
      if (accountType === 'organization' && orgTypes.length > 0) {
        const clubName = `${firstName} ${lastName}'s ${orgTypes.join(', ')}`;
        const clubResult = await client.query(queries.createClub, [
          clubName,
          'New organization created with ClubHub',
          profile.location || 'To be updated',
          null, // philosophy
          null, // website
          orgTypes,
          profile.primarySport || null,
          newUser.id,
          new Date().getFullYear().toString()
        ]);

        newUser.club = clubResult.rows[0];

        // Create organization association
        await client.query(`
          INSERT INTO organization_associations (user_id, club_id, role, is_primary, permissions)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          newUser.id,
          clubResult.rows[0].id,
          'owner',
          true,
          ['all'] // Full permissions for owner
        ]);
      }

      return newUser;
    });

    // Generate token
    const token = generateToken(result);

    // Send welcome email using your existing email service
    try {
      await sendWelcomeEmail(result.email, result.first_name, accountType);
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError);
    }

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: result.id,
        email: result.email,
        first_name: result.first_name,
        last_name: result.last_name,
        account_type: result.account_type,
        org_types: result.org_types,
        phone: result.phone,
        date_of_birth: result.date_of_birth,
        club: result.club || null
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred while creating your account'
    });
  }
});

// Add child profile (for parent accounts)
router.post('/add-child', authenticateToken, childProfileValidation, async (req, res) => {
  try {
    if (req.user.accountType !== 'adult') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only adult accounts can manage child profiles'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      firstName, lastName, dateOfBirth, primarySport, position, school,
      emergencyContactName, emergencyContactPhone, medicalNotes
    } = req.body;

    const result = await query(`
      INSERT INTO child_profiles (
        parent_id, first_name, last_name, date_of_birth, primary_sport,
        position, school, emergency_contact_name, emergency_contact_phone, medical_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      req.user.id, firstName, lastName, dateOfBirth, primarySport,
      position, school, emergencyContactName, emergencyContactPhone, medicalNotes
    ]);

    res.status(201).json({
      message: 'Child profile created successfully',
      child: result.rows[0]
    });

  } catch (error) {
    console.error('Add child error:', error);
    res.status(500).json({
      error: 'Failed to add child profile',
      message: 'An error occurred while creating the child profile'
    });
  }
});

// Get child profiles for parent
router.get('/children', authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== 'adult') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only adult accounts can view child profiles'
      });
    }

    const result = await query(`
      SELECT * FROM child_profiles 
      WHERE parent_id = $1 AND is_active = true
      ORDER BY first_name, last_name
    `, [req.user.id]);

    res.json({
      children: result.rows
    });

  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({
      error: 'Failed to get child profiles',
      message: 'An error occurred while fetching child profiles'
    });
  }
});

// Update child profile
router.put('/children/:childId', authenticateToken, childProfileValidation, async (req, res) => {
  try {
    if (req.user.accountType !== 'adult') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only adult accounts can manage child profiles'
      });
    }

    const { childId } = req.params;
    const {
      firstName, lastName, dateOfBirth, primarySport, position, school,
      emergencyContactName, emergencyContactPhone, medicalNotes
    } = req.body;

    // Verify child belongs to this parent
    const childCheck = await query(`
      SELECT id FROM child_profiles WHERE id = $1 AND parent_id = $2
    `, [childId, req.user.id]);

    if (childCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Child not found',
        message: 'Child profile not found or access denied'
      });
    }

    const result = await query(`
      UPDATE child_profiles SET
        first_name = $1, last_name = $2, date_of_birth = $3, primary_sport = $4,
        position = $5, school = $6, emergency_contact_name = $7,
        emergency_contact_phone = $8, medical_notes = $9, updated_at = NOW()
      WHERE id = $10 AND parent_id = $11
      RETURNING *
    `, [
      firstName, lastName, dateOfBirth, primarySport, position, school,
      emergencyContactName, emergencyContactPhone, medicalNotes, childId, req.user.id
    ]);

    res.json({
      message: 'Child profile updated successfully',
      child: result.rows[0]
    });

  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({
      error: 'Failed to update child profile',
      message: 'An error occurred while updating the child profile'
    });
  }
});

// Get user organizations (for organization toggle)
router.get('/organizations', authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== 'organization') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only organization accounts can view organizations'
      });
    }

    const result = await query(`
      SELECT c.*, oa.role, oa.is_primary, oa.permissions
      FROM clubs c
      INNER JOIN organization_associations oa ON c.id = oa.club_id
      WHERE oa.user_id = $1
      ORDER BY oa.is_primary DESC, c.name
    `, [req.user.id]);

    res.json({
      organizations: result.rows
    });

  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      error: 'Failed to get organizations',
      message: 'An error occurred while fetching organizations'
    });
  }
});

// Switch primary organization
router.post('/switch-organization/:clubId', authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== 'organization') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only organization accounts can switch organizations'
      });
    }

    const { clubId } = req.params;

    await withTransaction(async (client) => {
      // Verify user has access to this organization
      const accessCheck = await client.query(`
        SELECT id FROM organization_associations 
        WHERE user_id = $1 AND club_id = $2
      `, [req.user.id, clubId]);

      if (accessCheck.rows.length === 0) {
        throw new Error('Organization not found or access denied');
      }

      // Remove primary flag from all user's organizations
      await client.query(`
        UPDATE organization_associations 
        SET is_primary = false 
        WHERE user_id = $1
      `, [req.user.id]);

      // Set new primary organization
      await client.query(`
        UPDATE organization_associations 
        SET is_primary = true 
        WHERE user_id = $1 AND club_id = $2
      `, [req.user.id, clubId]);
    });

    res.json({
      message: 'Primary organization switched successfully'
    });

  } catch (error) {
    console.error('Switch organization error:', error);
    res.status(500).json({
      error: 'Failed to switch organization',
      message: error.message || 'An error occurred while switching organizations'
    });
  }
});

// Forgot password - initiate reset
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email } = req.body;

    // Check if user exists
    const userResult = await query(queries.findUserByEmail, [email]);
    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({
        message: 'If an account with this email exists, you will receive password reset instructions.'
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store reset token
    await query(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, hashedToken, expiresAt]);

    // Send reset email using your existing email service
    try {
      await sendPasswordResetEmail(user.email, user.first_name, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return res.status(500).json({
        error: 'Failed to send reset email',
        message: 'Please try again later'
      });
    }

    res.json({
      message: 'Password reset instructions have been sent to your email.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: 'An error occurred while processing your request'
    });
  }
});

// Validate reset token
router.get('/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Reset token is required'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const tokenResult = await query(`
      SELECT prt.*, u.email
      FROM password_reset_tokens prt
      INNER JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.used = false
    `, [hashedToken]);

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'The reset token is invalid or has expired.'
      });
    }

    res.json({
      message: 'Token is valid',
      email: tokenResult.rows[0].email
    });

  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({
      error: 'Token validation failed',
      message: 'An error occurred while validating the token'
    });
  }
});

// Reset password with token
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const tokenResult = await query(`
      SELECT prt.*, u.id as user_id, u.email, u.first_name
      FROM password_reset_tokens prt
      INNER JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.used = false
    `, [hashedToken]);

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'The reset token is invalid or has expired. Please request a new password reset.'
      });
    }

    const resetRecord = tokenResult.rows[0];

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(password, saltRounds);

    await withTransaction(async (client) => {
      // Update password
      await client.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW() 
        WHERE id = $2
      `, [newPasswordHash, resetRecord.user_id]);

      // Mark token as used
      await client.query(`
        UPDATE password_reset_tokens 
        SET used = true 
        WHERE id = $1
      `, [resetRecord.id]);

      // Invalidate all other reset tokens for this user
      await client.query(`
        UPDATE password_reset_tokens 
        SET used = true 
        WHERE user_id = $1 AND used = false
      `, [resetRecord.user_id]);
    });

    // Send confirmation email
    try {
      await sendPasswordResetConfirmationEmail(resetRecord.email, resetRecord.first_name);
    } catch (emailError) {
      console.warn('Failed to send password reset confirmation:', emailError);
    }

    res.json({
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: 'An error occurred while resetting your password'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const {
      location, primarySport, position, experienceLevel, previousTeams,
      achievements, bio, availabilityWeekdays, availabilityWeekends, availabilityEvenings
    } = req.body;

    // Check if profile exists
    const existingProfile = await query(`
      SELECT id FROM user_profiles WHERE user_id = $1
    `, [req.user.id]);

    let result;
    if (existingProfile.rows.length > 0) {
      // Update existing profile
      result = await query(`
        UPDATE user_profiles SET
          location = $1, primary_sport = $2, position = $3, experience_level = $4,
          previous_teams = $5, achievements = $6, bio = $7,
          availability_weekdays = $8, availability_weekends = $9, availability_evenings = $10,
          updated_at = NOW()
        WHERE user_id = $11
        RETURNING *
      `, [
        location, primarySport, position, experienceLevel, previousTeams,
        achievements, bio, availabilityWeekdays, availabilityWeekends, availabilityEvenings,
        req.user.id
      ]);
    } else {
      // Create new profile
      result = await query(`
        INSERT INTO user_profiles (
          user_id, location, primary_sport, position, experience_level,
          previous_teams, achievements, bio, availability_weekdays,
          availability_weekends, availability_evenings
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        req.user.id, location, primarySport, position, experienceLevel,
        previousTeams, achievements, bio, availabilityWeekdays,
        availabilityWeekends, availabilityEvenings
      ]);
    }

    res.json({
      message: 'Profile updated successfully',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'An error occurred while updating your profile'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT up.*, u.first_name, u.last_name, u.email, u.phone, u.date_of_birth
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while fetching your profile'
    });
  }
});

// Helper functions using your existing email service
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      accountType: user.account_type 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function sendWelcomeEmail(email, firstName, accountType) {
  try {
    const dashboardLink = accountType === 'organization' 
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard.html`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/player-dashboard.html`;

    const emailTemplate = createWelcomeEmailTemplate({
      firstName,
      accountType,
      dashboardLink
    });

    await emailService.sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    console.log('✅ Welcome email sent to:', email);
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    throw error;
  }
}

async function sendPasswordResetEmail(email, firstName, resetToken) {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password.html?token=${resetToken}`;
    
    const emailTemplate = createPasswordResetEmailTemplate({
      firstName,
      resetUrl
    });

    await emailService.sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    console.log('✅ Password reset email sent to:', email);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw error;
  }
}

async function sendPasswordResetConfirmationEmail(email, firstName) {
  try {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/index.html`;
    
    const emailTemplate = createPasswordResetConfirmationTemplate({
      firstName,
      loginUrl
    });

    await emailService.sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    console.log('✅ Password reset confirmation sent to:', email);
  } catch (error) {
    console.error('❌ Failed to send password reset confirmation:', error);
    // Don't throw here as it's not critical
  }
}

// Email template creators
function createWelcomeEmailTemplate({ firstName, accountType, dashboardLink }) {
  const subject = `🎉 Welcome to ClubHub, ${firstName}!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to ClubHub!</h1>
          <p>Your sports management journey starts here</p>
        </div>
        
        <div class="content">
          <h2>Hello ${firstName}!</h2>
          
          <p>Welcome to ClubHub! Your ${accountType === 'organization' ? 'organization' : 'player'} account has been created successfully.</p>
          
          <div class="features">
            <h3>🚀 What's Next?</h3>
            <ul>
              ${accountType === 'organization' ? `
                <li>Set up your club profile</li>
                <li>Add team members and staff</li>
                <li>Create events and training sessions</li>
                <li>Manage payments and finances</li>
              ` : `
                <li>Complete your sports profile</li>
                <li>Find and join local clubs</li>
                <li>Book training sessions and events</li>
                <li>Connect with other players</li>
              `}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" class="cta-button">
              📊 Go to Your Dashboard
            </a>
          </div>
          
          <p>If you have any questions, our support team is here to help!</p>
          
          <p>Welcome to the ClubHub community!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🎉 Welcome to ClubHub, ${firstName}!

Your ${accountType === 'organization' ? 'organization' : 'player'} account has been created successfully.

What's Next?
${accountType === 'organization' ? `
• Set up your club profile
• Add team members and staff  
• Create events and training sessions
• Manage payments and finances
` : `
• Complete your sports profile
• Find and join local clubs
• Book training sessions and events
• Connect with other players
`}

Visit your dashboard: ${dashboardLink}

Welcome to the ClubHub community!
  `;

  return { subject, html, text };
}

function createPasswordResetEmailTemplate({ firstName, resetUrl }) {
  const subject = `🔐 Reset Your ClubHub Password`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
          <p>Reset your ClubHub password</p>
        </div>
        
        <div class="content">
          <h2>Hello ${firstName}!</h2>
          
          <p>We received a request to reset your ClubHub password. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="cta-button">
              🔑 Reset My Password
            </a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link will expire in 10 minutes</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password will remain unchanged if you don't click the link</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
          
          <p>For security reasons, this link will only work once and expires in 10 minutes.</p>
          
          <p>If you have any concerns about your account security, please contact our support team immediately.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
🔐 Password Reset Request

Hello ${firstName}!

We received a request to reset your ClubHub password. If you made this request, use the link below to reset your password:

${resetUrl}

⚠️ Important:
• This link will expire in 10 minutes
• If you didn't request this reset, please ignore this email
• Your password will remain unchanged if you don't click the link

For security reasons, this link will only work once and expires in 10 minutes.

If you have any concerns about your account security, please contact our support team immediately.
  `;

  return { subject, html, text };
}

function createPasswordResetConfirmationTemplate({ firstName, loginUrl }) {
  const subject = `✅ Your ClubHub Password Has Been Reset`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .security-tips { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Password Reset Successful</h1>
          <p>Your password has been updated</p>
        </div>
        
        <div class="content">
          <h2>Hello ${firstName}!</h2>
          
          <p>Your ClubHub password has been successfully reset. You can now log in with your new password.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="cta-button">
              🔑 Login to ClubHub
            </a>
          </div>
          
          <div class="security-tips">
            <h3>🔒 Security Tips:</h3>
            <ul>
              <li>Use a unique password for ClubHub</li>
              <li>Consider enabling two-factor authentication</li>
              <li>Never share your password with anyone</li>
              <li>Log out from shared devices</li>
            </ul>
          </div>
          
          <p>If you didn't make this change, please contact our support team immediately.</p>
          
          <p>Thank you for keeping your ClubHub account secure!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
✅ Password Reset Successful

Hello ${firstName}!

Your ClubHub password has been successfully reset. You can now log in with your new password.

Login to ClubHub: ${loginUrl}

🔒 Security Tips:
• Use a unique password for ClubHub
• Consider enabling two-factor authentication
• Never share your password with anyone
• Log out from shared devices

If you didn't make this change, please contact our support team immediately.

Thank you for keeping your ClubHub account secure!
  `;

  return { subject, html, text };
}

module.exports = router;