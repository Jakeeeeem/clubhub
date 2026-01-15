// Quick script to add images column to organizations table
const { pool } = require('./config/database');

async function addImagesColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding images column to organizations table...');
    
    // Add the images column
    await client.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
    `);
    
    console.log('✅ Images column added successfully!');
    
    // Add index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_images 
      ON organizations USING GIN(images);
    `);
    
    console.log('✅ Index created successfully!');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' AND column_name = 'images';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verification successful:', result.rows[0]);
      console.log('🎉 Migration complete! You can now upload images to organizations.');
    } else {
      console.log('⚠️ Column not found after creation. Please check manually.');
    }
    
  } catch (error) {
    console.error('❌ Error adding images column:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addImagesColumn()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
