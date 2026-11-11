#!/usr/bin/env node

/**
 * Database Initialization Script
 * Creates the database if it doesn't exist and runs migrations
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'panggung_lokal';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;

async function initDatabase() {
  console.log('🔧 Initializing database...');
  console.log(`📦 Database: ${DB_NAME}`);
  console.log(`👤 User: ${DB_USER}`);
  console.log(`🏠 Host: ${DB_HOST}:${DB_PORT}`);
  
  try {
    // Check if database exists
    console.log('\n📊 Checking if database exists...');
    const checkCmd = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -lqt | cut -d \\| -f 1 | grep -qw ${DB_NAME}`;
    
    try {
      await execAsync(checkCmd);
      console.log('✅ Database already exists');
    } catch (error) {
      // Database doesn't exist, create it
      console.log('📝 Creating database...');
      const createCmd = `createdb -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} ${DB_NAME}`;
      await execAsync(createCmd);
      console.log('✅ Database created successfully');
    }
    
    // Run migrations
    console.log('\n🚀 Running migrations...');
    const { stdout, stderr } = await execAsync('npm run migrate');
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('\n✅ Database initialization complete!');
    console.log('\nNext steps:');
    console.log('  1. Start the server: npm run dev');
    console.log('  2. Check health: curl http://localhost:3000/health');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure PostgreSQL is running');
    console.error('  2. Check your .env file for correct credentials');
    console.error('  3. Ensure the database user has CREATE DATABASE permissions');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
