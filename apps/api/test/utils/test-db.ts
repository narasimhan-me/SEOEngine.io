import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { getTestDatabaseUrl } from '../../src/config/test-env-guard';

// Load test environment variables (from apps/api/.env.test)
dotenv.config({ path: '.env.test' });

// Safety check: compute a safe test DATABASE_URL and refuse to run if it looks unsafe
const dbUrl = getTestDatabaseUrl('prisma-test-db');

const pool = new Pool({
  connectionString: dbUrl,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function cleanupTestDb(): Promise<void> {
  // Delete in order to respect FK constraints
  // Tables with FK to Product must be deleted first
  await prisma.$executeRawUnsafe('DELETE FROM "AnswerBlock" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "AnswerBlockAutomationLog" WHERE 1=1');
  // Tables with FK to Project must be deleted next
  await prisma.$executeRawUnsafe('DELETE FROM "Integration" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "DeoScoreSnapshot" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "CrawlResult" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "Product" WHERE 1=1');
  // Now delete Project (which has FK to User)
  await prisma.$executeRawUnsafe('DELETE FROM "Project" WHERE 1=1');
  // Delete Subscription (FK to User) before User
  await prisma.$executeRawUnsafe('DELETE FROM "Subscription" WHERE 1=1');
  // Finally delete User
  await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE 1=1');
}

export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}

export { prisma as testPrisma };
