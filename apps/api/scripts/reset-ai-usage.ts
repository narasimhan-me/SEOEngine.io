import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Load environment variables
dotenv.config({ path: '.env' });

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: ts-node scripts/reset-ai-usage.ts <userId>');
  console.error(
    'Example: ts-node scripts/reset-ai-usage.ts cmivjkz0q0000t7d1q847gagy'
  );
  process.exit(1);
}

async function resetAiUsage() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Get current UTC date start
    const now = new Date();
    const startOfDayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    // Count current usage before deletion
    const aiUsageCount = await prisma.aiUsageEvent.count({
      where: {
        userId,
        createdAt: {
          gte: startOfDayUtc,
        },
      },
    });

    const tokenUsageCount = await prisma.tokenUsage.count({
      where: {
        userId,
        createdAt: {
          gte: startOfDayUtc,
        },
      },
    });

    console.log(`User ID: ${userId}`);
    console.log(`Current daily AI usage events: ${aiUsageCount}`);
    console.log(`Current daily token usage records: ${tokenUsageCount}`);

    // Delete today's AiUsageEvent records (resets daily limit)
    const deletedAiEvents = await prisma.aiUsageEvent.deleteMany({
      where: {
        userId,
        createdAt: {
          gte: startOfDayUtc,
        },
      },
    });

    console.log(
      `\n✅ Deleted ${deletedAiEvents.count} AI usage event(s) for today`
    );

    // Optionally delete today's TokenUsage records (if you want to reset token usage too)
    // Uncomment the following if you also want to reset token usage:
    /*
    const deletedTokenUsage = await prisma.tokenUsage.deleteMany({
      where: {
        userId,
        createdAt: {
          gte: startOfDayUtc,
        },
      },
    });
    console.log(`✅ Deleted ${deletedTokenUsage.count} token usage record(s) for today`);
    */

    console.log('\n✅ AI usage limit reset complete!');
    console.log(
      'The user can now use AI features again (within their plan limits).'
    );
  } catch (error) {
    console.error('Error resetting AI usage:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

resetAiUsage();
