-- CreateTable
CREATE TABLE "DeoScoreSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "contentScore" INTEGER,
    "entityScore" INTEGER,
    "technicalScore" INTEGER,
    "visibilityScore" INTEGER,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "metadata" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeoScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeoScoreSnapshot_projectId_computedAt_idx" ON "DeoScoreSnapshot"("projectId", "computedAt" DESC);

-- AddForeignKey
ALTER TABLE "DeoScoreSnapshot"
ADD CONSTRAINT "DeoScoreSnapshot_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add denormalized current DEO score on projects
ALTER TABLE "Project"
ADD COLUMN "currentDeoScore" INTEGER,
ADD COLUMN "currentDeoScoreComputedAt" TIMESTAMP(3);

