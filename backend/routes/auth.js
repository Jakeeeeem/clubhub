const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query, queries, withTransaction } = require('../config/database');

let authenticateToken;
try {
  const authMiddleware = require('../middleware/auth');
  authenticateToken = authMiddleware.authenticateToken;
} catch (error) {
  console.error('Failed to import auth middleware:', error);
  // Create a fallback authenticateToken function
  authenticateToken = (req, res, next) => {
    res.status(500).json({ error: 'Authentication middleware not available' });
  };
}

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('accountType').isIn(['adult', 'organization']).withMessage('Invalid account type'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Helper function to generate JWT token
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

// Register new user
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, accountType, orgTypes = [] } = req.body;

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

    // Create user and club (if organization) in transaction
    const result = await withTransaction(async (client) => {
      // Create user
      const userResult = await client.query(queries.createUser, [
        email,
        passwordHash,
        firstName,
        lastName,
        accountType,
        orgTypes
      ]);

      const newUser = userResult.rows[0];

      // If organization, create a club
      if (accountType === 'organization' && orgTypes.length > 0) {
        const clubName = `${firstName} ${lastName}'s ${orgTypes.join(', ')}`;
        const clubResult = await client.query(queries.createClub, [
          clubName,
          'New organization created with ClubHub',
          'To be updated',
          null, // philosophy
          null, // website
          orgTypes,
          null, // sport
          newUser.id,
          new Date().getFullYear().toString()
        ]);

        newUser.club = clubResult.rows[0];
      }

      return newUser;
    });

    // Generate token
    const token = generateToken(result);

    // Return success response
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

// Login user
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const userResult = await query(queries.findUserByEmail, [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
  return res.status(401).json({
    error: 'Incorrect password',
    message: 'The password you entered is incorrect. Please try again.',
    field: 'password'
  });
}


    // Generate token
    const token = generateToken(user);

    // Return success response (exclude password hash)
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        account_type: user.account_type,
        org_types: user.org_types
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred while logging in'
    });
  }
});

// Get current user (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await query(queries.findUserById, [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    const user = userResult.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      account_type: user.account_type,
      org_types: user.org_types,
      created_at: user.created_at
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An error occurred while fetching user data'
    });
  }
});

// Logout (client-side token removal, but we can track this server-side later)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more advanced setup, you might want to blacklist the token
    // For now, we just return success and let the client remove the token
    
    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred while logging out'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generate new token
    const token = generateToken(req.user);

    res.json({
      message: 'Token refreshed',
      token
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'An error occurred while refreshing token'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user with password hash
    const userResult = await query(queries.findUserByEmail, [req.user.email]);
    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'An error occurred while changing password'
    });
  }
});

module.exports = router;