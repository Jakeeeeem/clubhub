#!/usr/bin/env node

/**
 * API-Based Data Seeding Script
 * Uses the running backend API to create test data
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const PASSWORD = 'Demo@123';

let authTokens = {};

async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    console.log(`   ✅ Logged in: ${email}`);
    return response.data.token;
  } catch (error) {
    console.error(`   ❌ Login failed for ${email}:`, error.response?.data?.error || error.message);
    return null;
  }
}

async function register(userData) {
  try {
    console.log(`   🔄 Registering: ${userData.email}...`);
    const response = await axios.post(`${API_BASE}/auth/register`, userData);
    console.log(`   ✅ Registered: ${userData.email}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`   ℹ️  User already exists: ${userData.email}`);
      return { email: userData.email, alreadyExists: true };
    }
    console.error(`   ❌ Registration failed for ${userData.email}:`);
    console.error(`      Status: ${error.response?.status}`);
    console.error(`      Error:`, JSON.stringify(error.response?.data, null, 2));
    return null;
  }
}

async function createChild(token, childData) {
  try {
    const response = await axios.post(`${API_BASE}/players/child`, childData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`      ✅ Added child: ${childData.firstName} ${childData.lastName}`);
    return response.data.player;
  } catch (error) {
    console.error(`      ❌ Failed to add child ${childData.firstName}:`, error.response?.data || error.message);
    return null;
  }
}

async function seedData() {
  console.log('🌱 Starting API-based data seed...\n');
  console.log('📡 Testing API connection...');
  
  try {
    const healthCheck = await axios.get(`${API_BASE}/health`);
    console.log('✅ Backend is healthy\n');
  } catch (error) {
    console.error('❌ Backend is not responding. Make sure the server is running on port 3000');
    process.exit(1);
  }

  // ============================================================
  // 1. CREATE PARENT ACCOUNTS WITH CHILDREN
  // ============================================================
  console.log('👨‍👩‍👧‍👦 Creating parent accounts...\n');

  // Parent 1 - James Anderson (2 children)
  console.log('Parent 1: James Anderson');
  const parent1Result = await register({
    email: 'parent1@demo.com',
    password: PASSWORD,
    firstName: 'James',
    lastName: 'Anderson',
    accountType: 'adult'
  });

  if (parent1Result) {
    const parent1Token = await login('parent1@demo.com', PASSWORD);
    if (parent1Token) {
      authTokens['parent1'] = parent1Token;
      console.log('   👶 Adding children:');
      
      await createChild(parent1Token, {
        firstName: 'Oliver',
        lastName: 'Anderson',
        dateOfBirth: '2012-03-15',
        gender: 'male',
        sport: 'Football',
        position: 'Forward',
        location: 'London, UK'
      });

      await createChild(parent1Token, {
        firstName: 'Emma',
        lastName: 'Anderson',
        dateOfBirth: '2014-07-22',
        gender: 'female',
        sport: 'Football',
        position: 'Midfielder',
        location: 'London, UK'
      });
    }
  }

  console.log('');

  // Parent 2 - Sarah Williams (1 child)
  console.log('Parent 2: Sarah Williams');
  const parent2Result = await register({
    email: 'parent2@demo.com',
    password: PASSWORD,
    firstName: 'Sarah',
    lastName: 'Williams',
    accountType: 'adult'
  });

  if (parent2Result) {
    const parent2Token = await login('parent2@demo.com', PASSWORD);
    if (parent2Token) {
      authTokens['parent2'] = parent2Token;
      console.log('   👶 Adding children:');
      
      await createChild(parent2Token, {
        firstName: 'Noah',
        lastName: 'Williams',
        dateOfBirth: '2010-11-08',
        gender: 'male',
        sport: 'Football',
        position: 'Defender',
        location: 'London, UK'
      });
    }
  }

  console.log('');

  // Parent 3 - Michael Brown (1 child)
  console.log('Parent 3: Michael Brown');
  const parent3Result = await register({
    email: 'parent3@demo.com',
    password: PASSWORD,
    firstName: 'Michael',
    lastName: 'Brown',
    accountType: 'adult'
  });

  if (parent3Result) {
    const parent3Token = await login('parent3@demo.com', PASSWORD);
    if (parent3Token) {
      authTokens['parent3'] = parent3Token;
      console.log('   👶 Adding children:');
      
      await createChild(parent3Token, {
        firstName: 'Sophia',
        lastName: 'Brown',
        dateOfBirth: '2013-05-19',
        gender: 'female',
        sport: 'Football',
        position: 'Goalkeeper',
        location: 'London, UK'
      });
    }
  }

  console.log('\n✨ Data seeding complete!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════════');
  console.log('👨‍👩‍👧 Parent Accounts:');
  console.log('   parent1@demo.com (2 children: Oliver, Emma)');
  console.log('   parent2@demo.com (1 child: Noah)');
  console.log('   parent3@demo.com (1 child: Sophia)');
  console.log('   Password: Demo@123');
  console.log('═══════════════════════════════════════════════════\n');
}

// Run the seed
seedData()
  .then(() => {
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
