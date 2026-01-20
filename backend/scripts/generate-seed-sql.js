#!/usr/bin/env node

/**
 * Direct SQL Seed Script
 * Uses the existing database connection from the running backend
 */

const bcrypt = require('bcryptjs');

// Simple query function
async function seedDirectly() {
  console.log('🌱 Starting direct SQL seed...\n');

  const passwordHash = await bcrypt.hash('Demo@123', 10);
  
  console.log('Generated password hash for Demo@123');
  console.log('Hash:', passwordHash);
  console.log('\n📋 MANUAL SEED INSTRUCTIONS:');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('Run these SQL commands in your database:\n');
  
  console.log(`-- Create Parent 1
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('parent1@demo.com', '${passwordHash}', 'James', 'Anderson', 'adult', true)
ON CONFLICT (email) DO NOTHING;

-- Create Parent 2  
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('parent2@demo.com', '${passwordHash}', 'Sarah', 'Williams', 'adult', true)
ON CONFLICT (email) DO NOTHING;

-- Create Parent 3
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('parent3@demo.com', '${passwordHash}', 'Michael', 'Brown', 'adult', true)
ON CONFLICT (email) DO NOTHING;

-- Add children for Parent 1
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, sport, gender, location)
SELECT 'Oliver', 'Anderson', '2012-03-15', 'Forward', id, 'Football', 'Male', 'London, UK'
FROM users WHERE email = 'parent1@demo.com';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, sport, gender, location)
SELECT 'Emma', 'Anderson', '2014-07-22', 'Midfielder', id, 'Football', 'Female', 'London, UK'
FROM users WHERE email = 'parent1@demo.com';

-- Add child for Parent 2
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, sport, gender, location)
SELECT 'Noah', 'Williams', '2010-11-08', 'Defender', id, 'Football', 'Male', 'London, UK'
FROM users WHERE email = 'parent2@demo.com';

-- Add child for Parent 3
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, sport, gender, location)
SELECT 'Sophia', 'Brown', '2013-05-19', 'Goalkeeper', id, 'Football', 'Female', 'London, UK'
FROM users WHERE email = 'parent3@demo.com';
`);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 LOGIN CREDENTIALS (after running SQL above)');
  console.log('═══════════════════════════════════════════════════');
  console.log('👨‍👩‍👧 Parent Accounts:');
  console.log('   parent1@demo.com (2 children: Oliver, Emma)');
  console.log('   parent2@demo.com (1 child: Noah)');
  console.log('   parent3@demo.com (1 child: Sophia)');
  console.log('   Password: Demo@123');
  console.log('═══════════════════════════════════════════════════\n');
}

seedDirectly()
  .then(() => {
    console.log('✅ SQL script generated!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
