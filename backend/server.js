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
const { startBillingScheduler } = require('./services/billing-service');
const productRoutes = require('./routes/products');
const campaignRoutes = require('./routes/campaigns');
const listingsRoutes = require('./routes/listings');
const talentIdRoutes = require('./routes/talent-id');

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
        "https://clubhub-dev.onrender.com",
        "https://clubhubsports-dev.onrender.com",
        "http://localhost:3000",
        "http://localhost:8000"
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

app.use(cors({
  origin: [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:3000',      // Added common dev port
    'http://127.0.0.1:3000',      // Added common dev port
    'http://localhost:5000',      // Added another common port
    'http://127.0.0.1:5000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'https://clubhubsports.net',           
    'https://www.clubhubsports.net',
    'https://api.clubhubsports.net',
    'https://clubhubsports-dev.onrender.com',
    'https://clubhub-dev.onrender.com',
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files with CORS headers
const path = require('path');
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
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

// Temporary Public Debug Endpoint (Restored)
app.get('/api/public-debug/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT id, name, logo_url, images, description, sport, location 
            FROM organizations WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', require('./routes/auth-context'));  // Enhanced auth with org context
app.use('/api/organizations', require('./routes/organizations'));  // New unified system
app.use('/api/invitations', require('./routes/invitations'));  // Invitation system
app.use('/api/platform-admin', require('./routes/platform-admin'));  // Platform admin routes
app.use('/api/clubs', clubRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stripe-payouts', require('./routes/stripe-payouts'));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/debug', require('./routes/debug')); // Register debug routes
app.use('/api/talent-id', talentIdRoutes);
app.use('/api/venues', require('./routes/venues'));  // Venue booking system
app.use('/api/leagues', require('./routes/leagues'));  // League management system
app.use('/api/polls', require('./routes/polls'));  // Voting/Polls system




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
    
    // Run pending migrations
    const { runMigrations } = require('./services/migration-service');
    await runMigrations();
    
    // Seed demo users (only if flag is set or in development)
    if (process.env.SEED_DEMO_USERS === 'true' || (process.env.NODE_ENV === 'development' && process.env.AUTO_SEED === 'true')) {
      try {
        console.log('🌱 Seeding demo users...');
        const { seedDemoUsers } = require('./scripts/seed-demo-users');
        await seedDemoUsers();
        console.log('✅ Demo users seeded successfully');
      } catch (error) {
        console.warn('⚠️ Demo user seeding failed (may already exist):', error.message);
        // Don't fail startup if seeding fails - users might already exist
      }
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 ClubHub API server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8000'}`);
      console.log(`💾 Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API Health check: http://localhost:${PORT}/api/health`);
      
      // Start recurring billing scheduler
      startBillingScheduler();
      console.log('⏰ Recurring billing scheduler started');
      
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

// Export app for testing
module.exports = app;

// Start the server if run directly
if (require.main === module) {
  startServer();
}
