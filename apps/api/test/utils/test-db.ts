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
  // [ADMIN-OPS-1] Admin audit and quota reset tables (FK to User)
  await prisma.$executeRawUnsafe('DELETE FROM "AdminAuditLog" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "AiMonthlyQuotaReset" WHERE 1=1');
  // [SELF-SERVICE-1] Customer self-service tables (FK to User)
  await prisma.$executeRawUnsafe('DELETE FROM "UserAccountAuditLog" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "UserSession" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "UserPreferences" WHERE 1=1');
  // Tables with FK to Product must be deleted first
  await prisma.$executeRawUnsafe('DELETE FROM "AnswerBlock" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "AnswerBlockAutomationLog" WHERE 1=1');
  // Tables with FK to Project must be deleted next
  await prisma.$executeRawUnsafe('DELETE FROM "Integration" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "DeoScoreSnapshot" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "CrawlResult" WHERE 1=1');
  // Off-site Signals tables (OFFSITE-1)
  await prisma.$executeRawUnsafe('DELETE FROM "ProjectOffsiteFixApplication" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "ProjectOffsiteFixDraft" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "ProjectOffsiteCoverage" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "ProjectOffsiteSignal" WHERE 1=1');
  // Local Discovery tables (LOCAL-1)
  await prisma.$executeRawUnsafe('DELETE FROM "ProjectLocalFixApplication" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "ProjectLocalFixDraft" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "ProjectLocalCoverage" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "ProjectLocalSignal" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "ProjectLocalConfig" WHERE 1=1');
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
