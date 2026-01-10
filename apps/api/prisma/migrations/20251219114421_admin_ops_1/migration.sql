-- CreateEnum
CREATE TYPE "InternalAdminRole" AS ENUM ('SUPPORT_AGENT', 'OPS_ADMIN', 'MANAGEMENT_CEO');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "adminRole" "InternalAdminRole";

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedByUserId" TEXT NOT NULL,
    "performedByAdminRole" "InternalAdminRole" NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetProjectId" TEXT,
    "targetRunId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMonthlyQuotaReset" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "monthStart" TIMESTAMP(3) NOT NULL,
    "aiRunsOffset" INTEGER NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "AiMonthlyQuotaReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminAuditLog_performedByUserId_createdAt_idx" ON "AdminAuditLog"("performedByUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminAuditLog_actionType_createdAt_idx" ON "AdminAuditLog"("actionType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_createdAt_idx" ON "AdminAuditLog"("targetUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetProjectId_createdAt_idx" ON "AdminAuditLog"("targetProjectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiMonthlyQuotaReset_userId_monthStart_idx" ON "AiMonthlyQuotaReset"("userId", "monthStart");

-- CreateIndex
CREATE INDEX "AiMonthlyQuotaReset_createdAt_idx" ON "AiMonthlyQuotaReset"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetProjectId_fkey" FOREIGN KEY ("targetProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMonthlyQuotaReset" ADD CONSTRAINT "AiMonthlyQuotaReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMonthlyQuotaReset" ADD CONSTRAINT "AiMonthlyQuotaReset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
