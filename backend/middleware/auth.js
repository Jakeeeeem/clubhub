
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Ensure JWT_SECRET is available
const JWT_SECRET = process.env.JWT_SECRET || 'clubhub-secret-2024-dev';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET not set in environment, using fallback (NOT SECURE FOR PRODUCTION)');
}

/**
 * Middleware to authenticate JWT tokens
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({
      error: 'Access denied',
      message: 'No token provided'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('❌ Token verification failed:', {
        error: err.message,
        name: err.name,
        token: token.substring(0, 20) + '...'
      });
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Please log in again'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          error: 'Invalid token',
          message: 'Token is malformed or invalid'
        });
      }
      
      return res.status(403).json({
        error: 'Token verification failed',
        message: 'Invalid token'
      });
    }

    console.log('✅ Token verified for user:', decoded.email || decoded.id);
    req.user = decoded;
    next();
  });
}

/**
 * Middleware to inject organizational context into the request.
 * Fetches the user's current role and organization details.
 */
async function injectOrgContext(req, res, next) {
  // Must be authenticated first
  if (!req.user) return next();

  try {
    const userId = req.user.id;
    // Check for an organization header, otherwise look up the user's current preference
    const orgHeader = req.headers['x-organization-id'];
    
    let orgId = orgHeader;
    
    if (!orgId) {
      const prefs = await pool.query('SELECT current_organization_id FROM user_preferences WHERE user_id = $1', [userId]);
      orgId = prefs.rows[0]?.current_organization_id;
    }

    if (!orgId) {
      req.orgContext = null;
      return next();
    }

    // Get membership and role
    const memberResult = await pool.query(`
      SELECT o.id as organization_id, o.name, o.logo_url, o.sport, 
             om.role, om.status, om.permissions
      FROM organizations o
      INNER JOIN organization_members om ON o.id = om.organization_id
      WHERE o.id = $1 AND om.user_id = $2 AND om.status = 'active'
    `, [orgId, userId]);

    if (memberResult.rows.length === 0) {
      req.orgContext = null;
    } else {
      req.orgContext = memberResult.rows[0];
    }
    
    next();
  } catch (error) {
    console.error('Error injecting org context:', error);
    next();
  }
}

/**
 * Enforce that the user has a specific role in the active organization.
 * @param {string|string[]} allowedRoles 
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.orgContext) {
      return res.status(403).json({
        error: 'No organization context found',
        message: 'Please select an organization before performing this action'
      });
    }

    if (!roles.includes(req.orgContext.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      });
    }

    next();
  };
}

// Middleware to check if user is an organization (admin)
function requireOrganization(req, res, next) {
  if (req.user.accountType !== 'organization') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Organization account required'
    });
  }
  next();
}

// Middleware to check if user is an adult user
function requireAdult(req, res, next) {
  if (req.user.accountType !== 'adult') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Adult account required'
    });
  }
  next();
}

// Middleware to check if user is a platform admin (Super Admin)
function requirePlatformAdmin(req, res, next) {
  const isPlatformAdmin = 
    req.user.accountType === 'platform_admin' || 
    req.user.userType === 'platform_admin' ||
    req.user.role === 'platform_admin';

  if (!isPlatformAdmin) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Platform administrator privileges required'
    });
  }
  next();
}

// Optional authentication
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  });
}

function requireClubOwnership(req, res, next) {
  next();
}

function rateLimitSensitive(req, res, next) {
  next();
}

module.exports = {
  authenticateToken,
  requireOrganization,
  requireAdult,
  requirePlatformAdmin,
  optionalAuth,
  requireClubOwnership,
  rateLimitSensitive,
  injectOrgContext,
  requireRole
};