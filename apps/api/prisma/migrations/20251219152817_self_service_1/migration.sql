-- CreateEnum
CREATE TYPE "CustomerAccountRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('USER_LOGIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountRole" "CustomerAccountRole" NOT NULL DEFAULT 'OWNER',
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "locale" TEXT,
ADD COLUMN     "organizationName" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "tokenInvalidBefore" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notifyQuotaWarnings" BOOLEAN NOT NULL DEFAULT true,
    "notifyRunFailures" BOOLEAN NOT NULL DEFAULT true,
    "notifyWeeklyDeoSummary" BOOLEAN NOT NULL DEFAULT true,
    "autoOpenIssuesTab" BOOLEAN NOT NULL DEFAULT false,
    "preferredPillarLanding" TEXT,
    "additionalPrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL DEFAULT 'USER_LOGIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccountAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "UserAccountAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserSession_userId_createdAt_idx" ON "UserSession"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "UserAccountAuditLog_actorUserId_createdAt_idx" ON "UserAccountAuditLog"("actorUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserAccountAuditLog_actionType_createdAt_idx" ON "UserAccountAuditLog"("actionType", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccountAuditLog" ADD CONSTRAINT "UserAccountAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
