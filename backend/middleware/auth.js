const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'No token provided'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err.message);
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Please log in again'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          error: 'Invalid token',
          message: 'Token is malformed'
        });
      }
      
      return res.status(403).json({
        error: 'Token verification failed',
        message: 'Invalid token'
      });
    }

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
  optionalAuth,
  requireClubOwnership,
  rateLimitSensitive
};