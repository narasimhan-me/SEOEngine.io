import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { getTestDatabaseUrl } from '../src/config/test-env-guard';

// Load test env vars from apps/api/.env.test
dotenv.config({ path: '.env.test' });

// Ensure we are in test mode
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.ENGINEO_ENV = process.env.ENGINEO_ENV || 'test';

// Resolve and validate the test database URL
const dbUrl = getTestDatabaseUrl('db-test-migrate');
process.env.DATABASE_URL = dbUrl;

// Run Prisma migrations against the test database
execSync(
  './node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma',
  {
    stdio: 'inherit',
  }
);
