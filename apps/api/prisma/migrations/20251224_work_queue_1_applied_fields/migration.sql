-- WORK-QUEUE-1: Add applied fields to AutomationPlaybookDraft
-- These fields track when a draft was successfully applied for "Applied Recently" tab derivation

-- Add nullable columns to existing AutomationPlaybookDraft table
ALTER TABLE "AutomationPlaybookDraft" ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3);
ALTER TABLE "AutomationPlaybookDraft" ADD COLUMN IF NOT EXISTS "appliedByUserId" TEXT;
