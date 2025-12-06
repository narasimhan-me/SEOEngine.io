-- CreateEnum
CREATE TYPE "AutomationTargetType" AS ENUM ('PRODUCT', 'PAGE');

-- CreateEnum
CREATE TYPE "AutomationIssueType" AS ENUM ('MISSING_METADATA', 'THIN_CONTENT');

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "autoSuggestMissingMetadata" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "autoSuggestThinContent" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "autoSuggestDailyCap" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "AutomationSuggestion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "targetType" "AutomationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "issueType" "AutomationIssueType" NOT NULL,
    "suggestedTitle" TEXT,
    "suggestedDescription" TEXT,
    "suggestedH1" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'automation_v1',
    "applied" BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT "AutomationSuggestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AutomationSuggestion"
ADD CONSTRAINT "AutomationSuggestion_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint to avoid duplicate suggestions per target/issue
CREATE UNIQUE INDEX "AutomationSuggestion_projectId_targetType_targetId_issueType_key"
ON "AutomationSuggestion"("projectId", "targetType", "targetId", "issueType");
