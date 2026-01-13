/**
 * Generate Password Hashes for Demo Users
 * Run this first, then copy the hashes into the SQL script or use in the seed script
 */

const bcrypt = require('bcryptjs');

const passwords = {
  'Super Admin': 'Super@123',
  'Club Admin': 'Admin@123',
  'Coach': 'Coach@123',
  'Player': 'Player@123'
};

async function generateHashes() {
  console.log('🔐 Generating Password Hashes for Demo Users\n');
  console.log('═══════════════════════════════════════════════════\n');
  
  for (const [role, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${role}:`);
    console.log(`  Password: ${password}`);
    console.log(`  Hash:     ${hash}\n`);
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('Copy these hashes into your seed script or SQL file');
}

generateHashes();
