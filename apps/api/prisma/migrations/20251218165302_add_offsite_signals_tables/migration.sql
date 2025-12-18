-- CreateEnum
CREATE TYPE "OffsiteSignalType" AS ENUM ('BRAND_MENTION', 'AUTHORITATIVE_LISTING', 'TRUST_PROOF', 'REFERENCE_CONTENT');

-- CreateEnum
CREATE TYPE "OffsiteGapType" AS ENUM ('MISSING_BRAND_MENTIONS', 'MISSING_TRUST_PROOF', 'MISSING_AUTHORITATIVE_LISTING', 'COMPETITOR_HAS_OFFSITE_SIGNAL');

-- CreateEnum
CREATE TYPE "OffsiteFixDraftType" AS ENUM ('OUTREACH_EMAIL', 'PR_PITCH', 'BRAND_PROFILE_SNIPPET', 'REVIEW_REQUEST_COPY');

-- CreateEnum
CREATE TYPE "OffsiteFixApplyTarget" AS ENUM ('NOTES', 'CONTENT_WORKSPACE', 'OUTREACH_DRAFTS');

-- CreateEnum
CREATE TYPE "OffsitePresenceStatus" AS ENUM ('LOW', 'MEDIUM', 'STRONG');

-- CreateTable
CREATE TABLE "ProjectOffsiteSignal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "signalType" "OffsiteSignalType" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "url" TEXT,
    "evidence" TEXT NOT NULL,
    "merchantProvided" BOOLEAN NOT NULL DEFAULT false,
    "knownPlatform" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectOffsiteSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectOffsiteCoverage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "coverageData" JSONB NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "status" "OffsitePresenceStatus" NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectOffsiteCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectOffsiteFixDraft" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "productId" TEXT,
    "gapType" "OffsiteGapType" NOT NULL,
    "signalType" "OffsiteSignalType" NOT NULL,
    "focusKey" TEXT NOT NULL,
    "draftType" "OffsiteFixDraftType" NOT NULL,
    "draftPayload" JSONB NOT NULL,
    "aiWorkKey" TEXT NOT NULL,
    "reusedFromWorkKey" TEXT,
    "generatedWithAi" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectOffsiteFixDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectOffsiteFixApplication" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "productId" TEXT,
    "draftId" TEXT NOT NULL,
    "appliedByUserId" TEXT NOT NULL,
    "gapType" "OffsiteGapType" NOT NULL,
    "signalType" "OffsiteSignalType" NOT NULL,
    "focusKey" TEXT NOT NULL,
    "applyTarget" "OffsiteFixApplyTarget" NOT NULL,
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectOffsiteFixApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectOffsiteSignal_projectId_signalType_idx" ON "ProjectOffsiteSignal"("projectId", "signalType");

-- CreateIndex
CREATE INDEX "ProjectOffsiteCoverage_projectId_computedAt_idx" ON "ProjectOffsiteCoverage"("projectId", "computedAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectOffsiteFixDraft_projectId_gapType_signalType_focusKe_idx" ON "ProjectOffsiteFixDraft"("projectId", "gapType", "signalType", "focusKey");

-- CreateIndex
CREATE INDEX "ProjectOffsiteFixDraft_aiWorkKey_idx" ON "ProjectOffsiteFixDraft"("aiWorkKey");

-- CreateIndex
CREATE INDEX "ProjectOffsiteFixDraft_projectId_expiresAt_idx" ON "ProjectOffsiteFixDraft"("projectId", "expiresAt");

-- CreateIndex
CREATE INDEX "ProjectOffsiteFixApplication_projectId_appliedAt_idx" ON "ProjectOffsiteFixApplication"("projectId", "appliedAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectOffsiteFixApplication_appliedByUserId_appliedAt_idx" ON "ProjectOffsiteFixApplication"("appliedByUserId", "appliedAt" DESC);

-- AddForeignKey
ALTER TABLE "ProjectOffsiteSignal" ADD CONSTRAINT "ProjectOffsiteSignal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOffsiteCoverage" ADD CONSTRAINT "ProjectOffsiteCoverage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOffsiteFixDraft" ADD CONSTRAINT "ProjectOffsiteFixDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOffsiteFixApplication" ADD CONSTRAINT "ProjectOffsiteFixApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOffsiteFixApplication" ADD CONSTRAINT "ProjectOffsiteFixApplication_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ProjectOffsiteFixDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOffsiteFixApplication" ADD CONSTRAINT "ProjectOffsiteFixApplication_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
