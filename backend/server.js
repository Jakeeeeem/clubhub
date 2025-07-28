const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB, pool } = require('./config/database');
const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/clubs');
const playerRoutes = require('./routes/players');
const staffRoutes = require('./routes/staff');
const teamRoutes = require('./routes/teams');
const eventRoutes = require('./routes/events');
const paymentRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const { errorHandler } = require('./middleware/errorHandler');
const invitesRoutes = require('./routes/invites');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting (if behind nginx/cloudflare)
app.set('trust proxy', 1);

// Security middleware with Stripe support
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'", 
        "https://api.stripe.com", 
        "https://js.stripe.com",
        "https://api.clubhubsports.net",
        "http://localhost:3000"
      ],
      scriptSrc: [
        "'self'", 
        "https://js.stripe.com", 
        "'unsafe-inline'"
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// 🔥 ENHANCED CORS - Fixed for payment system
app.use(cors({
  origin: [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:3000',      // Added common dev port
    'http://127.0.0.1:3000',      // Added common dev port
    'http://localhost:5000',      // Added another common port
    'http://127.0.0.1:5000',
    'https://clubhubsports.net',           
    'https://www.clubhubsports.net',       
    process.env.FRONTEND_URL || 'http://localhost:8000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-HTTP-Method-Override'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

// 🔥 RATE LIMITING - Protect your payment endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment-specific rate limiting
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 payment attempts per IP per 15 minutes
  message: {
    error: 'Too many payment requests',
    message: 'Please wait before making another payment attempt'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/payments/create-intent', paymentLimiter);
app.use('/api/payments/confirm-payment', paymentLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`${timestamp} - ${method} ${url} - ${ip}`);
  next();
});

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 🔥 ENHANCED API health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'ClubHub API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    database_configured: !!process.env.DATABASE_URL || !!(process.env.DB_HOST && process.env.DB_NAME),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/payments', paymentRoutes); // 🔥 Your payment routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/notifications', notificationRoutes);


// Handle 404 for API routes specifically
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/clubs',
      'POST /api/payments/create-intent',
      'POST /api/payments/confirm-payment',
      'GET /api/payments/public/:id'
    ]
  });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await connectDB();
    console.log('✅ Database connected successfully');
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 ClubHub API server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8000'}`);
      console.log(`💾 Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API Health check: http://localhost:${PORT}/api/health`);
      
      // 🔥 TEST STRIPE CONNECTION
      if (process.env.STRIPE_SECRET_KEY) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        stripe.balance.retrieve()
          .then((balance) => {
            console.log('✅ Stripe connection successful');
            console.log(`💰 Stripe mode: ${process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'LIVE' : 'TEST'}`);
            if (balance.available && balance.available.length > 0) {
              console.log(`💰 Available balance: ${balance.available[0].amount / 100} ${balance.available[0].currency.toUpperCase()}`);
            }
          })
          .catch(err => {
            console.error('❌ Stripe connection failed:', err.message);
            if (err.code === 'api_key_invalid') {
              console.error('🔑 Invalid Stripe API key - check your .env file');
              console.error('🔑 Make sure you are using the SECRET key (sk_test_... or sk_live_...)');
            }
          });
      } else {
        console.warn('⚠️ STRIPE_SECRET_KEY not configured - payments will not work');
        console.warn('🔑 Add STRIPE_SECRET_KEY=sk_test_... to your .env file');
      }
    });
    
    return server;
   
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️ Shutting down server...');
  
  try {
    await pool.end();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log('📍 Route:', r.route.path)
  } else if (r.name === 'router') {
    r.handle.stack.forEach(function(rr){
      if (rr.route) {
        console.log('📍 Route:', r.regexp.source + rr.route.path);
      }
    });
  }
});

// Start the server
startServer();