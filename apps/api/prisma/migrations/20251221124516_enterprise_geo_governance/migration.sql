-- CreateEnum
CREATE TYPE "ShareLinkAudience" AS ENUM ('ANYONE_WITH_LINK', 'PASSCODE', 'ORG_ONLY');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalResourceType" AS ENUM ('GEO_FIX_APPLY', 'ANSWER_BLOCK_SYNC');

-- CreateEnum
CREATE TYPE "GovernanceAuditEventType" AS ENUM ('POLICY_CHANGED', 'APPROVAL_REQUESTED', 'APPROVAL_APPROVED', 'APPROVAL_REJECTED', 'APPLY_EXECUTED', 'SHARE_LINK_CREATED', 'SHARE_LINK_REVOKED');

-- AlterTable
ALTER TABLE "GeoReportShareLink" ADD COLUMN     "audience" "ShareLinkAudience" NOT NULL DEFAULT 'ANYONE_WITH_LINK',
ADD COLUMN     "passcodeCreatedAt" TIMESTAMP(3),
ADD COLUMN     "passcodeHash" TEXT,
ADD COLUMN     "passcodeLast4" TEXT;

-- CreateTable
CREATE TABLE "ProjectGovernancePolicy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requireApprovalForApply" BOOLEAN NOT NULL DEFAULT false,
    "restrictShareLinks" BOOLEAN NOT NULL DEFAULT false,
    "shareLinkExpiryDays" INTEGER NOT NULL DEFAULT 14,
    "allowedExportAudience" "ShareLinkAudience" NOT NULL DEFAULT 'ANYONE_WITH_LINK',
    "allowCompetitorMentionsInExports" BOOLEAN NOT NULL DEFAULT false,
    "allowPIIInExports" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectGovernancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "resourceType" "ApprovalResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "requestedByUserId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceAuditEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "eventType" "GovernanceAuditEventType" NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectGovernancePolicy_projectId_key" ON "ProjectGovernancePolicy"("projectId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_projectId_resourceType_resourceId_idx" ON "ApprovalRequest"("projectId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_projectId_status_idx" ON "ApprovalRequest"("projectId", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedByUserId_createdAt_idx" ON "ApprovalRequest"("requestedByUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GovernanceAuditEvent_projectId_createdAt_idx" ON "GovernanceAuditEvent"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GovernanceAuditEvent_projectId_eventType_createdAt_idx" ON "GovernanceAuditEvent"("projectId", "eventType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GovernanceAuditEvent_actorUserId_createdAt_idx" ON "GovernanceAuditEvent"("actorUserId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ProjectGovernancePolicy" ADD CONSTRAINT "ProjectGovernancePolicy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceAuditEvent" ADD CONSTRAINT "GovernanceAuditEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
