// Global error handling middleware

function errorHandler(err, req, res, next) {
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
    if (err.detail && err.detail.includes('email')) {
      message = 'Email already exists';
    }
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Invalid reference to related resource';
  } else if (err.code === '23502') { // PostgreSQL not null violation
    statusCode = 400;
    message = 'Required field is missing';
  } else if (err.code === '22P02') { // PostgreSQL invalid input syntax
    statusCode = 400;
    message = 'Invalid input format';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Database connection failed';
  } else if (err.message) {
    // Use the error message if available
    message = err.message;
    
    // Set appropriate status codes based on message
    if (message.toLowerCase().includes('not found')) {
      statusCode = 404;
    } else if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('invalid credentials')) {
      statusCode = 401;
    } else if (message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('access denied')) {
      statusCode = 403;
    } else if (message.toLowerCase().includes('validation') || message.toLowerCase().includes('invalid')) {
      statusCode = 400;
    }
  }

  // Prepare error response
  const errorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = details || err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

// 404 handler for unmatched routes
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
}

// Async error wrapper to catch errors in async route handlers
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};