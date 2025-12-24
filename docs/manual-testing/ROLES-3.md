# ROLES-3: True Multi-User Projects & Approval Chains

## Overview

ROLES-3 extends the role-based access control foundations from ROLES-2 to support true multi-user projects:
- **ProjectMember model**: Real project memberships with OWNER/EDITOR/VIEWER roles
- **Multi-user access**: Non-owner members can access projects they're added to
- **Locked capability matrix**: EDITOR cannot apply; must request approval
- **Approval chain enforcement**: EDITOR requests approval, OWNER approves and applies
- **Auto-apply blocking for multi-user projects**: Preserves "no-AI-at-Apply" invariant
- **Membership management API**: OWNER-only member add/remove/role-change

**Key Change from ROLES-2:** In ROLES-2, roles were emulated via `User.accountRole` for single-user projects. In ROLES-3, the `ProjectMember` table is the source of truth for multi-user projects.

## Critical Paths

- **CP-001 (Auth & Authorization)**: Project membership + role enforcement is real
- **CP-012 (Automation Engine)**: Multi-user projects do NOT auto-apply
- **CP-018 (ROLES-2)**: Single-user projects preserve existing behavior
- **CP-019 (ROLES-3)**: True multi-user project flows

## Test Scenarios

### 1. Multi-User Membership: Non-Owner Can View Project

**Preconditions:**
- User A is project OWNER
- User B exists in the system but is not a member of the project

**Steps:**
1. As User A, navigate to Project Settings > Members
2. Add User B by email with EDITOR role
3. Verify User B appears in member list
4. Log in as User B
5. Navigate to Projects list
6. Verify the project appears in User B's project list
7. Click to open the project

**Expected Results:**
- [ ] Member is added successfully with EDITOR role
- [ ] Project appears in User B's project list
- [ ] User B can view project dashboard
- [ ] User B sees role label "You are the Editor"
- [ ] Audit event `PROJECT_MEMBER_ADDED` is created

### 2. EDITOR Cannot Apply Automation Playbooks

**Preconditions:**
- User has EDITOR role in the project (via ProjectMember)
- Project has automation playbooks available

**Steps:**
1. Navigate to Automation Playbooks page
2. Verify role label shows "Editor"
3. Select a playbook (e.g., "Fix missing SEO titles")
4. Generate a preview (should succeed)
5. Attempt to click Apply button

**Expected Results:**
- [ ] Role label shows "You are the Editor"
- [ ] Preview generation works normally
- [ ] Apply button is disabled or shows "Request Approval"
- [ ] Message shows "Editors cannot apply. Request approval from an Owner."
- [ ] API call to apply returns 403 with message about OWNER requirement

### 3. VIEWER Cannot Generate Drafts or Apply

**Preconditions:**
- User has VIEWER role in the project (via ProjectMember)

**Steps:**
1. Navigate to Automation Playbooks page
2. Verify role label shows "Viewer"
3. Attempt to generate preview
4. Attempt to apply

**Expected Results:**
- [ ] Role label shows "You are the Viewer"
- [ ] Draft generation buttons disabled
- [ ] Apply button disabled
- [ ] Read-only banner: "You have view-only access to this project."
- [ ] Export/view operations work normally

### 4. Approval Chain: EDITOR Requests, OWNER Approves, OWNER Applies

**Preconditions:**
- User A is project OWNER
- User B is project EDITOR
- Governance policy has `requireApprovalForApply: true`

**Steps:**
1. As User B (EDITOR), navigate to Automation Playbooks
2. Generate a preview
3. Click "Request Approval" button
4. As User A (OWNER), check pending approvals
5. Approve the request
6. As User A (OWNER), click "Apply"

**Expected Results:**
- [ ] EDITOR can generate preview
- [ ] EDITOR sees "Request Approval" button (not "Apply")
- [ ] Approval request is created with `PENDING_APPROVAL` status
- [ ] OWNER sees pending approval notification
- [ ] OWNER can approve the request
- [ ] After approval, OWNER can apply
- [ ] Audit events: `APPROVAL_REQUESTED`, `APPROVAL_APPROVED`, `APPLY_EXECUTED`
- [ ] Attribution shows who requested, who approved, who applied

### 5. Multi-User Project Blocks Auto-Apply

**Preconditions:**
- Project has 2+ members (multi-user)
- Auto-apply eligible plan (Pro/Business)
- New product synced from Shopify

**Steps:**
1. Add a second member to the project
2. Trigger a new product sync from Shopify
3. Check if SEO metadata was auto-applied

**Expected Results:**
- [ ] New product has missing metadata suggestion created
- [ ] Auto-apply is BLOCKED (not executed)
- [ ] Log message indicates "Multi-user project: auto-apply blocked, requiring OWNER approval"
- [ ] Suggestion status remains unapplied

### 6. Single-User Project Preserves Existing Auto-Apply Behavior

**Preconditions:**
- Project has only 1 member (single-user)
- Auto-apply eligible plan (Pro/Business)
- New product synced from Shopify

**Steps:**
1. Ensure project has only one member
2. Trigger a new product sync from Shopify
3. Check if SEO metadata was auto-applied

**Expected Results:**
- [ ] New product has SEO metadata auto-applied (Pro/Business plan)
- [ ] Suggestion is marked as applied
- [ ] Existing ROLES-2 behavior preserved

### 7. Membership Management: Add/Remove/Role Change

**Preconditions:**
- User A is project OWNER
- User B and User C exist in the system

**Steps:**
1. Navigate to Project Settings > Members
2. Add User B as EDITOR
3. Add User C as VIEWER
4. Change User B's role to VIEWER
5. Remove User C from the project
6. Verify final member list

**Expected Results:**
- [ ] Members added successfully with correct roles
- [ ] Role change succeeds
- [ ] Member removal succeeds
- [ ] Audit events created for each action:
  - `PROJECT_MEMBER_ADDED` (x2)
  - `PROJECT_MEMBER_ROLE_CHANGED`
  - `PROJECT_MEMBER_REMOVED`

### 8. Cannot Remove Last Owner

**Preconditions:**
- Project has exactly 1 OWNER member

**Steps:**
1. Attempt to change last OWNER to EDITOR
2. Attempt to remove last OWNER

**Expected Results:**
- [ ] Role change fails with error: "Cannot remove the last owner"
- [ ] Remove fails with error: "Projects must have at least one owner"
- [ ] Project remains with at least one OWNER

### 9. Non-Owner Cannot Manage Members

**Preconditions:**
- User has EDITOR or VIEWER role in the project

**Steps:**
1. Navigate to Project Settings > Members
2. Attempt to add a new member
3. Attempt to change another member's role
4. Attempt to remove a member

**Expected Results:**
- [ ] Members list is visible (read-only)
- [ ] Add/Edit/Remove controls are hidden or disabled
- [ ] API calls return 403 Forbidden
- [ ] Message indicates "Owner role is required for this action"

### 10. Data Migration: Existing Projects Have OWNER Membership

**Preconditions:**
- Run ROLES-3 migration on database with existing projects

**Steps:**
1. Check ProjectMember table for existing projects
2. Verify each project has exactly one OWNER member
3. Verify OWNER userId matches Project.userId

**Expected Results:**
- [ ] Every existing project has a ProjectMember record
- [ ] All migrated memberships have role = OWNER
- [ ] userId matches the legacy Project.userId
- [ ] No duplicate memberships exist

## API Endpoints

| Endpoint | ROLES-3 Changes |
|----------|-----------------|
| `GET /projects` | Returns projects where user is a member |
| `GET /projects/:id` | Membership check (not just ownership), includes memberRole |
| `PUT /projects/:id` | OWNER-only |
| `DELETE /projects/:id` | OWNER-only |
| `POST /projects/:id/automation-playbooks/apply` | OWNER-only |
| `GET /projects/:id/members` | List members (all members can view) |
| `POST /projects/:id/members` | Add member (OWNER-only) |
| `PUT /projects/:id/members/:memberId` | Change role (OWNER-only) |
| `DELETE /projects/:id/members/:memberId` | Remove member (OWNER-only) |
| `GET /projects/:id/role` | Get current user's role + capabilities |

## Database Changes

### New Enum: ProjectMemberRole
```prisma
enum ProjectMemberRole {
  OWNER
  EDITOR
  VIEWER
}
```

### New Model: ProjectMember
```prisma
model ProjectMember {
  id        String            @id @default(cuid())
  project   Project           @relation(...)
  projectId String
  user      User              @relation(...)
  userId    String
  role      ProjectMemberRole
  createdAt DateTime          @default(now())

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}
```

### Extended Enum: GovernanceAuditEventType
- `PROJECT_MEMBER_ADDED`
- `PROJECT_MEMBER_REMOVED`
- `PROJECT_MEMBER_ROLE_CHANGED`

## Frontend Changes

- New Members management page at `/projects/:id/settings/members`
- Role-based UI controls on Automation Playbooks page
- "Request Approval" button for EDITOR role
- Read-only banner for VIEWER role
- Member list visible to all members (controls hidden for non-owners)

## Capability Matrix

| Capability | OWNER | EDITOR | VIEWER |
|------------|-------|--------|--------|
| View data | Yes | Yes | Yes |
| Generate drafts | Yes | Yes | No |
| Request approval | Yes | Yes | No |
| Approve actions | Yes | No | No |
| Apply changes | Yes | No | No |
| Modify settings | Yes | No | No |
| Manage members | Yes | No | No |
| Export/view reports | Yes | Yes | Yes |

## Test Data Setup

To add a member via SQL:
```sql
INSERT INTO "ProjectMember" (id, "projectId", "userId", role, "createdAt")
VALUES (gen_random_uuid()::text, 'project-id', 'user-id', 'EDITOR', NOW());
```

To simulate multi-user for auto-apply testing:
```sql
-- Add a second member to make project multi-user
INSERT INTO "ProjectMember" (id, "projectId", "userId", role, "createdAt")
VALUES (gen_random_uuid()::text, 'project-id', 'second-user-id', 'EDITOR', NOW());
```

## Related Documentation

- [ROLES-2.md](./ROLES-2.md) - Role foundations and single-user emulation
- [ENTERPRISE-GEO-1.md](./ENTERPRISE-GEO-1.md) - Approval workflow foundations

## Automated Test Coverage

- Backend: `apps/api/test/integration/roles-3.test.ts`
- Frontend: `apps/web/tests/roles-3.spec.ts`

---

## ROLES-3 FIXUP-1 (December 2025)

This fixup patch ensures ROLES-3 works end-to-end:

### Changes Made

**PATCH 1: Membership-aware access for governance services**
- `approvals.service.ts`: Uses `RoleResolutionService` for access control
  - `createRequest`: EDITOR-only (OWNER allowed for single-user backward compat)
  - `approve/reject`: OWNER-only via `assertOwnerRole()`
  - `getApprovalStatus/listRequests`: Any ProjectMember via `assertProjectAccess()`
- `governance.service.ts`: Uses `RoleResolutionService`
  - `getPolicy`: Any ProjectMember can view
  - `updatePolicy`: OWNER-only
- `audit-events.service.ts`: Uses `RoleResolutionService`
  - `listEvents`: Any ProjectMember can view

**PATCH 2: Role resolution correctness**
- Added `assertCanGenerateDrafts()` method for VIEWER blocking
- Existing methods already support ROLES-2/ROLES-3 compatibility

**PATCH 3: Automation Playbooks service role enforcement**
- `previewPlaybook`: OWNER/EDITOR can generate (VIEWER blocked)
- `generateDraft`: OWNER/EDITOR can generate (VIEWER blocked)
- `getLatestDraft`: Any ProjectMember can view
- `estimatePlaybook`: Any ProjectMember can view
- `applyPlaybook`: OWNER-only
- `setAutomationEntryConfig`: OWNER-only

**PATCH 4: Products service membership access**
- `getProductsForProject`: Any ProjectMember can view
- `getProduct`: Any ProjectMember can view
- Added `RoleResolutionService` to products module

**PATCH 5: Frontend updates**
- Automation Playbooks page:
  - Uses `projectsApi.getUserRole()` instead of `accountApi.getProfile()`
  - Added `canGenerateDrafts` check for preview button disabling
  - Added VIEWER mode banner with view-only message
- New Members management page at `/projects/:id/settings/members`:
  - List all project members with roles
  - Add new members (OWNER-only)
  - Change member roles (OWNER-only)
  - Remove members (OWNER-only)
  - Role permissions reference section
- Settings page now links to Members management

### Test Verification

Run the following scenarios to verify FIXUP-1:

1. **VIEWER cannot generate previews**: Log in as VIEWER, go to Playbooks, verify button is disabled with tooltip
2. **EDITOR can generate but not apply**: Log in as EDITOR, generate preview, verify Apply is blocked
3. **OWNER can do everything**: Log in as OWNER, verify full functionality
4. **Products visible to all members**: All roles can view products in project
5. **Members page access**: OWNER sees full controls, EDITOR/VIEWER see read-only list

---

## ROLES-3 FIXUP-2: Strict Matrix Enforcement (December 2025)

This fixup enforces the strict approval-chain matrix and completes membership access sweep.

### Key Changes

**PATCH 1: Strict Approval-Chain Matrix**
- `approvals.service.ts`: OWNER cannot create approval requests in multi-user projects
  - Multi-user projects: EDITOR-only can request approvals (OWNER must apply directly)
  - Single-user projects: OWNER allowed for ROLES-2 backward compatibility
  - VIEWER blocked in all cases

**PATCH 2: Role Simulation Correctness**
- `role-resolution.service.ts`: Multi-user projects ignore `User.accountRole`
  - Multi-user: ProjectMember role is authoritative
  - Single-user: accountRole emulation preserved for ROLES-2 compatibility
- `assertCanRequestApproval()`: Strict matrix enforcement (EDITOR-only in multi-user)

**PATCH 3: isMultiUserProject API Extension**
- `GET /projects/:id/role` now returns `isMultiUserProject: boolean`
- Frontend can differentiate approval flow behavior based on project type

**PATCH 5: Members UX Copy**
- Changed "Invite member" to "Add member"
- Changed "Add existing user by email" form heading
- Changed success message from "Invited" to "Added"

**PATCH 6: Answer Block OWNER-Only Mutations**
- `POST /products/:id/answer-blocks` enforces OWNER-only via `assertOwnerRole()`
- `GET /products/:id/answer-blocks` remains membership-readable

### Approval-Chain Matrix (FIXUP-2)

| Action | Multi-User Project | Single-User Project |
|--------|-------------------|---------------------|
| Create approval request | EDITOR only | OWNER allowed (ROLES-2 compat) |
| Approve/reject request | OWNER only | OWNER only |
| Apply directly | OWNER only | OWNER only |

### Test Verification

Run the following scenarios to verify FIXUP-2:

1. **Multi-user OWNER cannot create requests**:
   - Add a second member to project
   - As OWNER, try to create approval request → Should get 403 "apply directly instead"

2. **Multi-user EDITOR can request approval**:
   - As EDITOR in multi-user project, generate preview
   - Click "Request Approval" → Should succeed

3. **Single-user OWNER can still create requests**:
   - In single-user project (only OWNER member)
   - Create approval request → Should succeed (ROLES-2 backward compat)

4. **isMultiUserProject in API response**:
   - Call `GET /projects/:id/role`
   - Verify response includes `isMultiUserProject: true/false`

5. **Answer Block mutations OWNER-only**:
   - As EDITOR, try to save answer blocks → Should get 403
   - As OWNER, save answer blocks → Should succeed

6. **Members page wording**:
   - Verify button says "Add member" (not "Invite")
   - Verify success toast says "Added X as Y" (not "Invited")

---

## ROLES-3 FIXUP-3: Strict Matrix + Derived State Correction (December 2025)

This fixup enforces the correct approval-chain behavior where **EDITOR can NEVER apply, even if approved**.

### Key Changes

**PATCH 4.1: Remove Client-Only "approvalRequested" Flag**
- Deleted `approvalRequested` React state (ephemeral flag violation)
- All approval UI decisions now derive from server-sourced `pendingApproval` object

**PATCH 4.2: isMultiUserProject State**
- Frontend fetches and stores `isMultiUserProject` from `getUserRole()` response
- Used to determine OWNER behavior in multi-user vs single-user projects

**PATCH 4.3: EDITOR Never Applies (Even If Approved)**
- `handleApplyPlaybook` completely rewritten with strict role enforcement:
  - EDITOR: Can only request approval (if `requireApprovalForApply=true`)
  - EDITOR: Shows informational message based on approval status (pending/approved)
  - EDITOR: **Cannot call applyAutomationPlaybook API**, even with approved approval
  - OWNER: Must apply after approval is granted
  - OWNER in multi-user project: Cannot self-request; must wait for EDITOR request

**PATCH 4.4: CTA Copy + Disabled States from Server Truth**
- All button text and disabled states derived from `pendingApproval?.status`:
  - `PENDING_APPROVAL`: EDITOR sees "Pending approval" (disabled), OWNER sees "Approve and apply"
  - `APPROVED`: EDITOR sees "Approved — Owner applies" (disabled), OWNER sees "Apply playbook"
  - No approval: EDITOR sees "Request approval", OWNER sees contextual text
- Multi-user OWNER with no pending request: disabled with "Waiting for Editor request"

### Corrected Approval-Chain Flow

| Step | Actor | Action | Result |
|------|-------|--------|--------|
| 1 | EDITOR | Click "Request approval" | Creates PENDING_APPROVAL request |
| 2 | EDITOR | (Waiting) | Button disabled, shows "Pending approval" |
| 3 | OWNER | Click "Approve and apply" | Approves request AND applies playbook |
| 4 | - | Complete | Playbook applied, approval consumed |

**Key Invariant:** EDITOR requests approval; **OWNER approves AND applies**. EDITOR never calls apply API.

### Test Verification

Run the following scenarios to verify FIXUP-3:

1. **EDITOR cannot apply even after approval**:
   - As EDITOR, request approval
   - As OWNER, approve the request (without applying)
   - As EDITOR, verify button shows "Approved — Owner applies" and is disabled
   - API: `POST /projects/:id/automation-playbooks/apply` as EDITOR returns 403

2. **OWNER approves and applies in one action**:
   - As EDITOR, request approval
   - As OWNER, click "Approve and apply"
   - Verify playbook is applied successfully
   - Verify approval is consumed

3. **Multi-user OWNER cannot self-request**:
   - In multi-user project (2+ members), enable approval requirement
   - As OWNER, try to apply when no pending approval exists
   - Verify error message: "An Editor must request approval first"

4. **Single-user OWNER preserves ROLES-2 convenience**:
   - In single-user project, enable approval requirement
   - As OWNER, click "Approve and apply"
   - Verify OWNER can create + approve + apply in one flow

5. **UI derives from server state (no ephemeral flags)**:
   - Navigate to Step 3 (Apply) with approval required
   - Approval status is automatically fetched once `scopeId` is available (no CTA click required)
   - Request approval as EDITOR
   - Refresh the page
   - Verify approval status is still shown correctly (prefetched from `getApprovalStatus`)
   - Switch playbooks → approval state resets (stale-state prevention)

6. **Approval status types**:
   - Verify UI handles `PENDING_APPROVAL` (not `PENDING`)
   - Verify UI handles `APPROVED` with `consumed: false`
   - Verify UI handles `REJECTED` and `consumed: true` as "needs new request"

---

## ROLES-3 FIXUP-4: Membership + Role Enforcement Beyond projects/* (December 2025)

This fixup eliminates legacy `project.userId` ownership gates in services outside `apps/api/src/projects/*`, replacing them with membership-aware access control using RoleResolutionService.

### Key Changes

**PATCH 1: AI Controller - Membership + Matrix Enforcement**
- `ai.controller.ts`: Injected `RoleResolutionService`
  - Draft generation endpoints use `assertCanGenerateDrafts()` (OWNER/EDITOR only)
  - Usage/quota endpoints use `assertProjectAccess()` (any ProjectMember)
  - Removed legacy `project.userId === userId` checks

**PATCH 2: ProductIssueFixService - OWNER-only Apply**
- `product-issue-fix.service.ts`: Injected `RoleResolutionService`
  - `applyFix()` method uses `assertOwnerRole()` (OWNER-only for mutations)
  - Replaced legacy ownership check

**PATCH 3: SEO Scan Service - View vs Mutation Role Rules**
- `seo-scan.service.ts`: Injected `RoleResolutionService`
  - `startScan()` uses `assertOwnerRole()` (mutations are OWNER-only)
  - `scanProductPage()` uses `assertOwnerRole()` (mutations are OWNER-only)
  - `getResults()` uses `assertProjectAccess()` (any member can view)
  - Removed legacy ownership check

**PATCH 4: Integrations Controller - Members View, OWNER Mutates**
- `integrations.controller.ts`: Injected `RoleResolutionService`
  - GET endpoints use `assertProjectAccess()` (any member can view)
  - POST/PUT/DELETE endpoints use `assertOwnerRole()` (OWNER-only)
  - Removed `validateProjectOwnership()` helper method

**PATCH 4.1: Integrations Module Wiring**
- `integrations.module.ts`: Added `forwardRef(() => ProjectsModule)` import
  - Enables RoleResolutionService injection via ProjectsModule exports

**PATCH 5: Shopify SEO Update - OWNER-only**
- `shopify.service.ts`: Injected `RoleResolutionService`
  - `updateProductSeo()` uses `assertOwnerRole()` (OWNER-only for mutations)
  - Replaced legacy ownership check

**PATCH 6: Integration Tests - ROLES-3 Coverage**
- `roles-3.test.ts`: Added FIXUP-4 test blocks
  - AI Usage endpoints: all ProjectMembers can view, non-member blocked
  - Integrations endpoints: all members can view, only OWNER can mutate
  - SEO Scan endpoints: all members can view results, only OWNER can start scan

### Role Resolution Method Summary

| Method | Access Level | Use Case |
|--------|--------------|----------|
| `assertProjectAccess(projectId, userId)` | Any ProjectMember | Read/view operations |
| `assertOwnerRole(projectId, userId)` | OWNER only | Mutations (apply, update, delete) |
| `assertCanGenerateDrafts(projectId, userId)` | OWNER or EDITOR | AI draft generation |
| `assertCanRequestApproval(projectId, userId)` | EDITOR only (multi-user) | Approval request creation |

### Test Verification

Run the following scenarios to verify FIXUP-4:

1. **AI Usage - All members can view**:
   - As VIEWER, call `GET /ai/usage?projectId=X` → Should succeed (200)
   - As EDITOR, call `GET /ai/runs?projectId=X` → Should succeed (200)
   - As non-member, call same endpoints → Should fail (403)

2. **AI Draft Generation - OWNER/EDITOR only**:
   - As VIEWER, call `POST /ai/generate-product-seo` → Should fail (403)
   - As EDITOR, call same endpoint → Should succeed (200)
   - As OWNER, call same endpoint → Should succeed (200)

3. **Integrations - Members view, OWNER mutates**:
   - As VIEWER, call `GET /integrations?projectId=X` → Should succeed (200)
   - As EDITOR, call `POST /integrations` → Should fail (403)
   - As OWNER, call `POST /integrations` → Should succeed (201)

4. **SEO Scan - Members view, OWNER mutates**:
   - As VIEWER, call `GET /seo-scan/:projectId/results` → Should succeed (200)
   - As EDITOR, call `POST /seo-scan/:projectId/start` → Should fail (403)
   - As OWNER, call `POST /seo-scan/:projectId/start` → Should succeed

5. **Shopify SEO Update - OWNER only**:
   - As EDITOR, call `PUT /shopify/products/:id/seo` → Should fail (403)
   - As OWNER, call same endpoint → Should succeed (200)

6. **Apply Fix From Issue - OWNER only**:
   - As EDITOR, call `POST /ai/apply-fix-from-issue/:issueId` → Should fail (403)
   - As OWNER, call same endpoint → Should succeed

### Files Modified

- `apps/api/src/ai/ai.controller.ts`
- `apps/api/src/ai/product-issue-fix.service.ts`
- `apps/api/src/seo-scan/seo-scan.service.ts`
- `apps/api/src/integrations/integrations.controller.ts`
- `apps/api/src/integrations/integrations.module.ts`
- `apps/api/src/shopify/shopify.service.ts`
- `apps/api/test/integration/roles-3.test.ts`
