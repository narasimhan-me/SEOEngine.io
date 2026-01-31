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

async function safeDelete(tableName: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}" WHERE 1=1`);
  } catch (error: any) {
    // Ignore errors for tables that don't exist (e.g., schema not migrated)
    if (error?.code === '42P01') {
      // Table does not exist - this is OK for test databases that may not have all migrations
      return;
    }
    throw error;
  }
}

export async function cleanupTestDb(): Promise<void> {
  // Delete in order to respect FK constraints
  // [ADMIN-OPS-1] Admin audit and quota reset tables (FK to User)
  await safeDelete('AdminAuditLog');
  await safeDelete('AiMonthlyQuotaReset');
  // [SELF-SERVICE-1] Customer self-service tables (FK to User)
  await safeDelete('UserAccountAuditLog');
  await safeDelete('UserSession');
  await safeDelete('UserPreferences');
  // Tables with FK to Product must be deleted first
  await safeDelete('AnswerBlock');
  await safeDelete('AnswerBlockAutomationLog');
  // Competitive Positioning tables (COMPETITIVE-1)
  await safeDelete('ProductCompetitiveFixApplication');
  await safeDelete('ProductCompetitiveFixDraft');
  await safeDelete('ProductCompetitiveCoverage');
  await safeDelete('ProductCompetitor');
  // Search Intent tables (SEARCH-INTENT-1)
  await safeDelete('ProductIntentFixApplication');
  await safeDelete('ProductIntentFixDraft');
  await safeDelete('ProductIntentCoverage');
  // Media Accessibility tables (MEDIA-1)
  await safeDelete('ProductMediaFixApplication');
  await safeDelete('ProductMediaFixDraft');
  await safeDelete('ProductImage');
  // GEO Fix tables (GEO-1)
  await safeDelete('ProductGeoFixApplication');
  await safeDelete('ProductGeoFixDraft');
  // Tables with FK to Project must be deleted next
  await safeDelete('Integration');
  await safeDelete('DeoScoreSnapshot');
  await safeDelete('CrawlResult');
  // Off-site Signals tables (OFFSITE-1)
  await safeDelete('ProjectOffsiteFixApplication');
  await safeDelete('ProjectOffsiteFixDraft');
  await safeDelete('ProjectOffsiteCoverage');
  await safeDelete('ProjectOffsiteSignal');
  // Local Discovery tables (LOCAL-1)
  await safeDelete('ProjectLocalFixApplication');
  await safeDelete('ProjectLocalFixDraft');
  await safeDelete('ProjectLocalCoverage');
  await safeDelete('ProjectLocalSignal');
  await safeDelete('ProjectLocalConfig');
  await safeDelete('Product');
  // Governance and Audit tables (ENTERPRISE-GEO-1)
  await safeDelete('GovernanceAuditEvent');
  await safeDelete('AutomationSuggestion');
  // Approval and Share Link tables (GOVERNANCE-VIEWER-1)
  await safeDelete('ApprovalRequest');
  await safeDelete('GeoReportShareLink');
  // AI Usage tracking (FK to User and Project)
  await safeDelete('AiUsageEvent');
  // ProjectMember (FK to Project and User)
  await safeDelete('ProjectMember');
  // Now delete Project (which has FK to User)
  await safeDelete('Project');
  // Delete Subscription (FK to User) before User
  await safeDelete('Subscription');
  // Finally delete User
  await safeDelete('User');
}

export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}

export { prisma as testPrisma };
