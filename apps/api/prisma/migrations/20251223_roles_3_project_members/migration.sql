-- ROLES-3: True Multi-User Projects & Approval Chains
-- This migration adds the ProjectMember model and extends GovernanceAuditEventType

-- CreateEnum: ProjectMemberRole
CREATE TYPE "ProjectMemberRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- Add new values to GovernanceAuditEventType enum
ALTER TYPE "GovernanceAuditEventType" ADD VALUE 'PROJECT_MEMBER_ADDED';
ALTER TYPE "GovernanceAuditEventType" ADD VALUE 'PROJECT_MEMBER_REMOVED';
ALTER TYPE "GovernanceAuditEventType" ADD VALUE 'PROJECT_MEMBER_ROLE_CHANGED';

-- CreateTable: ProjectMember
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint on (projectId, userId)
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex: for listing members by project
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex: for resolving role by (projectId, userId)
CREATE INDEX "ProjectMember_projectId_userId_idx" ON "ProjectMember"("projectId", "userId");

-- CreateIndex: for listing projects by user
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- AddForeignKey: ProjectMember -> Project (cascade delete)
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ProjectMember -> User (cascade delete)
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- DATA BACKFILL: Create OWNER membership for every existing project
-- For each Project, insert a ProjectMember row with:
--   userId = Project.userId
--   role = 'OWNER'
--   createdAt = now()
-- This backfill is idempotent (ON CONFLICT DO NOTHING prevents duplicates)
-- ============================================================================
INSERT INTO "ProjectMember" ("id", "projectId", "userId", "role", "createdAt")
SELECT
    gen_random_uuid()::text,
    p."id",
    p."userId",
    'OWNER'::"ProjectMemberRole",
    CURRENT_TIMESTAMP
FROM "Project" p
ON CONFLICT ("projectId", "userId") DO NOTHING;
