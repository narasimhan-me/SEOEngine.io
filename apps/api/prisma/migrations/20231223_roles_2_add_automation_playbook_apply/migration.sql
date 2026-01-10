-- [ROLES-2] Add AUTOMATION_PLAYBOOK_APPLY to ApprovalResourceType enum
-- This migration extends the ApprovalResourceType enum to include the new
-- AUTOMATION_PLAYBOOK_APPLY value for approval gating on automation playbooks.

ALTER TYPE "ApprovalResourceType" ADD VALUE IF NOT EXISTS 'AUTOMATION_PLAYBOOK_APPLY';
