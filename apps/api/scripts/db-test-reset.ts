import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { getTestDatabaseUrl } from '../src/config/test-env-guard';

// Load test env vars from apps/api/.env.test
dotenv.config({ path: '.env.test' });

// Ensure we are in test mode
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.ENGINEO_ENV = process.env.ENGINEO_ENV || 'test';

// Resolve and validate the test database URL
const dbUrl = getTestDatabaseUrl('db-test-reset');
process.env.DATABASE_URL = dbUrl;

// Drop and recreate schema + apply migrations for a clean test DB
execSync(
  './node_modules/.bin/prisma migrate reset --force --skip-generate --schema prisma/schema.prisma',
  {
    stdio: 'inherit',
  },
);

