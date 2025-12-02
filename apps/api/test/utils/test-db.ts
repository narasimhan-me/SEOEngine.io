import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanupTestDb(): Promise<void> {
  // Delete in order to respect FK constraints
  await prisma.$executeRawUnsafe('DELETE FROM "DeoScoreSnapshot" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "CrawlResult" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "Product" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "Project" WHERE 1=1');
  await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE 1=1');
}

export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma as testPrisma };
