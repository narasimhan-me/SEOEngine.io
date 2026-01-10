-- CreateEnum
CREATE TYPE "GeoIssueType" AS ENUM ('MISSING_DIRECT_ANSWER', 'ANSWER_TOO_VAGUE', 'POOR_ANSWER_STRUCTURE', 'ANSWER_OVERLY_PROMOTIONAL', 'MISSING_EXAMPLES_OR_FACTS');

-- CreateEnum
CREATE TYPE "GeoCitationConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "GeoReportShareLinkStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- AlterEnum
ALTER TYPE "AutomationPlaybookRunType" ADD VALUE 'GEO_FIX_PREVIEW';

-- CreateTable
CREATE TABLE "ProductGeoFixDraft" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "issueType" "GeoIssueType" NOT NULL,
    "draftPayload" JSONB NOT NULL,
    "aiWorkKey" TEXT NOT NULL,
    "reusedFromWorkKey" TEXT,
    "generatedWithAi" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductGeoFixDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductGeoFixApplication" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "appliedByUserId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "issueType" "GeoIssueType" NOT NULL,
    "beforeConfidence" "GeoCitationConfidenceLevel" NOT NULL,
    "afterConfidence" "GeoCitationConfidenceLevel" NOT NULL,
    "beforeIssuesCount" INTEGER NOT NULL,
    "afterIssuesCount" INTEGER NOT NULL,
    "issuesResolvedCount" INTEGER NOT NULL,
    "resolvedIssueTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductGeoFixApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoReportShareLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "GeoReportShareLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "GeoReportShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductGeoFixDraft_productId_questionId_issueType_idx" ON "ProductGeoFixDraft"("productId", "questionId", "issueType");

-- CreateIndex
CREATE INDEX "ProductGeoFixDraft_aiWorkKey_idx" ON "ProductGeoFixDraft"("aiWorkKey");

-- CreateIndex
CREATE INDEX "ProductGeoFixDraft_productId_expiresAt_idx" ON "ProductGeoFixDraft"("productId", "expiresAt");

-- CreateIndex
CREATE INDEX "ProductGeoFixApplication_productId_appliedAt_idx" ON "ProductGeoFixApplication"("productId", "appliedAt" DESC);

-- CreateIndex
CREATE INDEX "ProductGeoFixApplication_appliedByUserId_appliedAt_idx" ON "ProductGeoFixApplication"("appliedByUserId", "appliedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "GeoReportShareLink_shareToken_key" ON "GeoReportShareLink"("shareToken");

-- CreateIndex
CREATE INDEX "GeoReportShareLink_projectId_status_idx" ON "GeoReportShareLink"("projectId", "status");

-- CreateIndex
CREATE INDEX "GeoReportShareLink_shareToken_idx" ON "GeoReportShareLink"("shareToken");

-- CreateIndex
CREATE INDEX "GeoReportShareLink_expiresAt_idx" ON "GeoReportShareLink"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProductGeoFixDraft" ADD CONSTRAINT "ProductGeoFixDraft_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductGeoFixApplication" ADD CONSTRAINT "ProductGeoFixApplication_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductGeoFixApplication" ADD CONSTRAINT "ProductGeoFixApplication_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ProductGeoFixDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductGeoFixApplication" ADD CONSTRAINT "ProductGeoFixApplication_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoReportShareLink" ADD CONSTRAINT "GeoReportShareLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
