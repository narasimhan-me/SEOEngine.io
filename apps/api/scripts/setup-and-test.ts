#!/usr/bin/env ts-node
/**
 * Script to set up test database and run integration tests
 */
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.test if it exists
const envTestPath = path.join(__dirname, '../.env.test');
dotenv.config({ path: envTestPath });

console.log('🔧 Setting up test database for integration tests...\n');

// Default test database configuration
const DB_NAME = 'engineo_test';
const DB_USER = process.env.USER || 'postgres';
const DB_HOST = 'localhost';
const DB_PORT = '5432';
const DB_URL = `postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

// Ensure .env.test exists and has DATABASE_URL_TEST
function ensureEnvTest() {
  let envContent = '';
  
  if (fs.existsSync(envTestPath)) {
    envContent = fs.readFileSync(envTestPath, 'utf-8');
  }

  // Check if DATABASE_URL_TEST is already set
  if (envContent.includes('DATABASE_URL_TEST')) {
    console.log('✅ DATABASE_URL_TEST already set in .env.test');
    // Extract the existing value
    const match = envContent.match(/DATABASE_URL_TEST=(.+)/);
    if (match) {
      console.log(`   Current value: ${match[1]}`);
      return match[1];
    }
  }

  // Add or update DATABASE_URL_TEST
  if (!envContent.includes('DATABASE_URL_TEST')) {
    envContent += `\n# Test database URL\nDATABASE_URL_TEST=${DB_URL}\n`;
  } else {
    envContent = envContent.replace(
      /DATABASE_URL_TEST=.*/,
      `DATABASE_URL_TEST=${DB_URL}`
    );
  }

  // Ensure NODE_ENV and ENGINEO_ENV are set
  if (!envContent.includes('NODE_ENV=test')) {
    envContent = `NODE_ENV=test\nENGINEO_ENV=test\n${envContent}`;
  }

  fs.writeFileSync(envTestPath, envContent);
  console.log(`✅ Updated .env.test with DATABASE_URL_TEST=${DB_URL}`);
  
  return DB_URL;
}

// Try to create database using psql
function createTestDatabase() {
  console.log(`\n📦 Creating test database: ${DB_NAME}...`);
  
  try {
    // Try to create database (ignore error if it already exists)
    execSync(
      `psql -d postgres -c "CREATE DATABASE ${DB_NAME};"`,
      { stdio: 'pipe' }
    );
    console.log(`✅ Test database '${DB_NAME}' created`);
  } catch (error: any) {
    const errorMsg = error.stdout?.toString() || error.stderr?.toString() || '';
    if (errorMsg.includes('already exists')) {
      console.log(`✅ Test database '${DB_NAME}' already exists`);
    } else {
      console.log(`⚠️  Could not create database automatically: ${errorMsg}`);
      console.log(`   Please create it manually: psql -d postgres -c "CREATE DATABASE ${DB_NAME};"`);
      return false;
    }
  }
  
  return true;
}

// Run migrations
function runMigrations() {
  console.log('\n🔄 Running database migrations...');
  
  try {
    // Set environment variables for migration
    process.env.NODE_ENV = 'test';
    process.env.ENGINEO_ENV = 'test';
    process.env.DATABASE_URL = ensureEnvTest();
    
    execSync('pnpm db:test:migrate', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('✅ Migrations completed');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

// Run integration tests
function runTests() {
  console.log('\n🧪 Running critical integration tests...\n');
  
  try {
    execSync('pnpm test:api:critical', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('\n✅ All integration tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Integration tests failed');
    return false;
  }
}

// Main execution
async function main() {
  ensureEnvTest();
  
  const dbCreated = createTestDatabase();
  if (!dbCreated) {
    console.log('\n⚠️  Please create the database manually and run this script again.');
    process.exit(1);
  }
  
  const migrationsOk = runMigrations();
  if (!migrationsOk) {
    console.log('\n❌ Setup incomplete. Please fix migration errors.');
    process.exit(1);
  }
  
  const testsOk = runTests();
  if (!testsOk) {
    console.log('\n❌ Tests failed. Please review the errors above.');
    process.exit(1);
  }
  
  console.log('\n✅ Test database setup and integration tests completed successfully!');
}

main().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

