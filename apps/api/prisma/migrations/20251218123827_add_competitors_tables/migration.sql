-- CreateEnum
CREATE TYPE "CompetitorGapType" AS ENUM ('INTENT_GAP', 'CONTENT_SECTION_GAP', 'TRUST_SIGNAL_GAP');

-- CreateEnum
CREATE TYPE "CompetitiveStatus" AS ENUM ('AHEAD', 'ON_PAR', 'BEHIND');

-- CreateEnum
CREATE TYPE "CompetitiveFixDraftType" AS ENUM ('ANSWER_BLOCK', 'COMPARISON_COPY', 'POSITIONING_SECTION');

-- CreateEnum
CREATE TYPE "CompetitiveFixApplyTarget" AS ENUM ('ANSWER_BLOCK', 'CONTENT_SECTION', 'WHY_CHOOSE_SECTION');

-- CreateTable
CREATE TABLE "ProductCompetitor" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "homepageUrl" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCompetitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCompetitiveCoverage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "coverageData" JSONB NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "areasWhereCompetitorsLead" INTEGER NOT NULL,
    "status" "CompetitiveStatus" NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCompetitiveCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCompetitiveFixDraft" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "gapType" "CompetitorGapType" NOT NULL,
    "intentType" "SearchIntentType",
    "areaId" TEXT NOT NULL,
    "draftType" "CompetitiveFixDraftType" NOT NULL,
    "draftPayload" JSONB NOT NULL,
    "aiWorkKey" TEXT NOT NULL,
    "reusedFromWorkKey" TEXT,
    "generatedWithAi" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCompetitiveFixDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCompetitiveFixApplication" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "appliedByUserId" TEXT NOT NULL,
    "gapType" "CompetitorGapType" NOT NULL,
    "intentType" "SearchIntentType",
    "areaId" TEXT NOT NULL,
    "applyTarget" "CompetitiveFixApplyTarget" NOT NULL,
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCompetitiveFixApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCompetitor_productId_idx" ON "ProductCompetitor"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCompetitiveCoverage_productId_key" ON "ProductCompetitiveCoverage"("productId");

-- CreateIndex
CREATE INDEX "ProductCompetitiveCoverage_productId_computedAt_idx" ON "ProductCompetitiveCoverage"("productId", "computedAt" DESC);

-- CreateIndex
CREATE INDEX "ProductCompetitiveFixDraft_productId_gapType_areaId_idx" ON "ProductCompetitiveFixDraft"("productId", "gapType", "areaId");

-- CreateIndex
CREATE INDEX "ProductCompetitiveFixDraft_aiWorkKey_idx" ON "ProductCompetitiveFixDraft"("aiWorkKey");

-- CreateIndex
CREATE INDEX "ProductCompetitiveFixDraft_productId_expiresAt_idx" ON "ProductCompetitiveFixDraft"("productId", "expiresAt");

-- CreateIndex
CREATE INDEX "ProductCompetitiveFixApplication_productId_appliedAt_idx" ON "ProductCompetitiveFixApplication"("productId", "appliedAt" DESC);

-- CreateIndex
CREATE INDEX "ProductCompetitiveFixApplication_appliedByUserId_appliedAt_idx" ON "ProductCompetitiveFixApplication"("appliedByUserId", "appliedAt" DESC);

-- AddForeignKey
ALTER TABLE "ProductCompetitor" ADD CONSTRAINT "ProductCompetitor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompetitiveCoverage" ADD CONSTRAINT "ProductCompetitiveCoverage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompetitiveFixDraft" ADD CONSTRAINT "ProductCompetitiveFixDraft_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompetitiveFixApplication" ADD CONSTRAINT "ProductCompetitiveFixApplication_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompetitiveFixApplication" ADD CONSTRAINT "ProductCompetitiveFixApplication_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ProductCompetitiveFixDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCompetitiveFixApplication" ADD CONSTRAINT "ProductCompetitiveFixApplication_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
