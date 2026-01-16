const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'clubhub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: (process.env.DB_SSL === 'true' || (process.env.NODE_ENV === 'production' && process.env.DB_HOST !== 'db')) ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool error handling
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
  process.exit(-1);
});

pool.on('connect', (client) => {
  console.log('🔗 New client connected to database');
});

pool.on('remove', (client) => {
  console.log('📤 Client removed from pool');
});

// Test database connection
async function connectDB() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('📅 Database time:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

// Helper function to execute queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('⚡ Query executed:', { 
      text: text.substring(0, 50) + '...', 
      duration: `${duration}ms`, 
      rows: res.rowCount 
    });
    return res;
  } catch (error) {
    console.error('❌ Query failed:', { 
      text: text.substring(0, 50) + '...', 
      error: error.message 
    });
    throw error;
  }
}

// Helper function to get a client from the pool
async function getClient() {
  return await pool.connect();
}

// Transaction helper
async function withTransaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Database health check
async function healthCheck() {
  try {
    const result = await query('SELECT 1 as health_check');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connection: 'active'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

// Common query builders
const queries = {
  // User queries
  findUserByEmail: 'SELECT * FROM users WHERE email = $1',
  findUserById: 'SELECT id, email, first_name, last_name, account_type, org_types, created_at FROM users WHERE id = $1',
  createUser: `
    INSERT INTO users (email, password_hash, first_name, last_name, account_type, org_types)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, first_name, last_name, account_type, org_types, created_at
  `,
  
  // Club queries
  findClubsByOwner: 'SELECT * FROM clubs WHERE owner_id = $1 ORDER BY created_at DESC',
  findAllClubs: 'SELECT * FROM clubs ORDER BY created_at DESC',
  findClubById: 'SELECT * FROM clubs WHERE id = $1',
  createClub: `
    INSERT INTO clubs (name, description, location, philosophy, website, types, sport, owner_id, established)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `,
  
  // Player queries
  findPlayersByClub: 'SELECT * FROM players WHERE club_id = $1 ORDER BY created_at DESC',
  findPlayerById: 'SELECT * FROM players WHERE id = $1',
  createPlayer: `
    INSERT INTO players (first_name, last_name, email, phone, date_of_birth, position, club_id, monthly_fee)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `,
  
  // Staff queries
  findStaffByClub: `
    SELECT s.*, t.name as team_name, t.id as team_id, om.status
    FROM staff s 
    LEFT JOIN teams t ON s.id = t.coach_id 
    LEFT JOIN organization_members om ON s.user_id = om.user_id AND s.club_id = om.organization_id
    WHERE s.club_id = $1 
    ORDER BY s.created_at DESC
  `,
  findStaffById: 'SELECT * FROM staff WHERE id = $1',
  createStaff: `
    INSERT INTO staff (first_name, last_name, email, phone, role, permissions, club_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `,
  
  // Team queries
  findTeamsByClub: 'SELECT * FROM teams WHERE club_id = $1 ORDER BY created_at DESC',
  findTeamById: 'SELECT * FROM teams WHERE id = $1',
  createTeam: `
    INSERT INTO teams (name, age_group, sport, description, coach_id, club_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,
  
  // Event queries
  findEventsByClub: 'SELECT * FROM events WHERE club_id = $1 ORDER BY event_date DESC',
  findAllEvents: 'SELECT * FROM events ORDER BY event_date DESC',
  findEventById: 'SELECT * FROM events WHERE id = $1',
  createEvent: `
    INSERT INTO events (title, description, event_type, event_date, event_time, location, price, capacity, spots_available, club_id, team_id, opponent, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `,
  
  // Payment queries
  findPaymentsByPlayer: 'SELECT * FROM payments WHERE player_id = $1 ORDER BY due_date DESC',
  findPaymentsByClub: 'SELECT * FROM payments WHERE club_id = $1 ORDER BY due_date DESC',
  createPayment: `
    INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,
  
  // Application queries
  findApplicationsByClub: 'SELECT * FROM club_applications WHERE club_id = $1 ORDER BY submitted_at DESC',
  findApplicationsByUser: 'SELECT * FROM club_applications WHERE user_id = $1 ORDER BY submitted_at DESC',
  createApplication: `
    INSERT INTO club_applications (club_id, user_id, message, preferred_position, experience_level, availability)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,

  // Notification queries
  findNotificationsByUser: 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
  markNotificationAsRead: 'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
  markAllNotificationsAsRead: 'UPDATE notifications SET is_read = true WHERE user_id = $1 RETURNING *',
  createNotification: `
    INSERT INTO notifications (user_id, title, message, notification_type, action_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `
};

module.exports = {
  pool,
  query,
  getClient,
  connectDB,
  withTransaction,
  healthCheck,
  queries
};