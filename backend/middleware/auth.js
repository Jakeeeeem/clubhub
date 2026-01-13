

const jwt = require('jsonwebtoken');

// Ensure JWT_SECRET is available
const JWT_SECRET = process.env.JWT_SECRET || 'clubhub-secret-2024-dev';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET not set in environment, using fallback (NOT SECURE FOR PRODUCTION)');
}

// Middleware to authenticate JWT tokens
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
  // Coalesce accountType and role check
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

// Optional authentication - sets user if token exists but doesn't require it
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  });
}

// Check if user owns a specific club
function requireClubOwnership(req, res, next) {
  // This middleware should be used after authenticateToken
  // It checks if the user owns the club specified in req.params.clubId
  // Implementation would require a database query to verify ownership
  next();
}

// Rate limiting for sensitive operations
function rateLimitSensitive(req, res, next) {
  // This could implement additional rate limiting for password changes, etc.
  // For now, just pass through
  next();
}

module.exports = {
  authenticateToken,
  requireOrganization,
  requireAdult,
  requirePlatformAdmin,
  optionalAuth,
  requireClubOwnership,
  rateLimitSensitive
};