# ROLES-2: Project Roles & Approval Foundations

## Overview

ROLES-2 introduces role-based access control foundations for EngineO.ai, with a focus on:
- Single-user role emulation (OWNER/EDITOR/VIEWER via accountRole field)
- Explicit approval gating for Automation Playbooks apply
- Role-aware UI affordances showing current user role

**Single-User Emulation Note:** In v1, all project owners default to OWNER role. The accountRole field on User model can be set to VIEWER or EDITOR to simulate role restrictions for testing purposes.

## Test Scenarios

### 1. Owner Can Approve & Apply

**Preconditions:**
- User is the project owner
- User has OWNER role (default, or accountRole not set to VIEWER/EDITOR)
- Governance policy has `requireApprovalForApply: true`

**Steps:**
1. Navigate to Project Settings > Governance & Approvals
2. Enable "Require Approval for Apply Actions"
3. Save settings
4. Navigate to Automation Playbooks page
5. Select a playbook (e.g., "Fix missing SEO titles")
6. Generate a preview
7. Review estimate
8. Click "Approve and apply" button
9. Confirm apply

**Expected Results:**
- [ ] Settings save successfully
- [ ] Playbooks page shows "Approval required before apply" notice
- [ ] "Approve and apply" button appears (not just "Apply playbook")
- [ ] Clicking button creates approval, then applies playbook
- [ ] Products are updated
- [ ] Success toast appears

### 2. Approval Creates Audit Event

**Preconditions:**
- User is project owner with OWNER role
- Governance policy has `requireApprovalForApply: true`

**Steps:**
1. Navigate to Automation Playbooks page
2. Generate preview for a playbook
3. Click "Approve and apply"
4. Confirm apply
5. Navigate to Project Settings > Governance & Approvals
6. Check audit events (if visible in UI) or via API

**Expected Results:**
- [ ] Audit event with type `APPROVAL_APPROVED` is created
- [ ] Audit event includes `resourceType: AUTOMATION_PLAYBOOK_APPLY`
- [ ] Audit event includes correct resourceId
- [ ] Audit event timestamp is accurate

### 3. Apply Blocked Without Approval (Policy Enabled)

**Preconditions:**
- User is project owner
- Governance policy has `requireApprovalForApply: true`

**Steps:**
1. Navigate to Automation Playbooks page
2. Generate preview for a playbook
3. Attempt to apply via API directly (bypassing UI approval flow)

**Expected Results:**
- [ ] API returns **HTTP 400 Bad Request** (not 403) with structured `APPROVAL_REQUIRED` error
- [ ] Error response includes structured payload: `{ code, message, approvalStatus, approvalId, resourceType, resourceId }`
- [ ] **[FIXUP-2]** UI displays human-readable error message (not generic "Bad Request")
- [ ] **[FIXUP-2]** `err.code === 'APPROVAL_REQUIRED'` is correctly extracted by frontend
- [ ] UI does **not** auth-redirect (400 is not treated as auth failure)
- [ ] No products are modified
- [ ] UI correctly shows approval requirement before apply button is enabled

> **Note (FIXUP-1/FIXUP-2):** The 400 status code (instead of 403) is intentional to prevent frontend auth-redirect behavior while still blocking the apply action. The frontend's `buildApiError` function parses nested NestJS error payloads to extract `code` and `message` from the structured response.

### 4. Viewer Cannot Apply (Simulated via accountRole)

**Preconditions:**
- User has `accountRole: VIEWER` set in database
- User is project owner (owns the project)

**Steps:**
1. Navigate to Automation Playbooks page
2. Verify role label shows "Viewer"
3. Generate a preview (should succeed)
4. Attempt to apply

**Expected Results:**
- [ ] Role label shows "You are the Viewer"
- [ ] Preview generation works normally
- [ ] Apply button is disabled
- [ ] Message shows "Viewer role cannot apply automation playbooks. Preview and export remain available."
- [ ] API call to apply returns 403 with message containing "Viewer role cannot apply"

### 5. Viewer Cannot Approve (Simulated)

**Preconditions:**
- User has `accountRole: VIEWER` set
- Governance policy has `requireApprovalForApply: true`
- An existing pending approval request exists

**Steps:**
1. Attempt to approve an approval request via API

**Expected Results:**
- [ ] API returns 403 Forbidden
- [ ] Message indicates "Only the project Owner role can approve"
- [ ] Approval status remains PENDING_APPROVAL

### 6. Preview/Export Allowed for Viewer

**Preconditions:**
- User has `accountRole: VIEWER` set

**Steps:**
1. Navigate to Automation Playbooks page
2. Select a playbook
3. Generate preview
4. Check estimate

**Expected Results:**
- [ ] Preview generation succeeds
- [ ] Estimate endpoint returns data
- [ ] Sample products are shown
- [ ] No error messages for read-only operations

### 7. No Mutation on Preview/Export Only Navigation

**Preconditions:**
- Governance policy has `requireApprovalForApply: true`
- No pending approval requests exist

**Steps:**
1. Navigate to Automation Playbooks page
2. Select a playbook
3. View preview samples only (do not click apply)
4. Navigate away
5. Check for approval records created

**Expected Results:**
- [ ] No approval records created by view-only navigation
- [ ] No audit events created for previews
- [ ] AI usage may be recorded for preview generation (this is expected)

### 8. Role Label Visibility

**Preconditions:**
- User is logged in and on automation playbooks page

**Steps:**
1. Navigate to Automation Playbooks page
2. Check header area for role label

**Expected Results:**
- [ ] Small text shows "You are the Project Owner" (or Editor/Viewer)
- [ ] Label is non-interactive (no role switcher)
- [ ] Label updates if accountRole is changed

## API Endpoints Affected

| Endpoint | ROLES-2 Changes |
|----------|-----------------|
| `POST /projects/:id/automation-playbooks/apply` | Role check (VIEWER blocked), approval gating |
| `POST /projects/:id/governance/approvals` | Accepts `AUTOMATION_PLAYBOOK_APPLY` resource type |
| `POST /projects/:id/governance/approvals/:id/approve` | Role check (only OWNER can approve) |
| `POST /projects/:id/governance/approvals/:id/reject` | Role check (only OWNER can reject) |

## Database Changes

- `ApprovalResourceType` enum extended with `AUTOMATION_PLAYBOOK_APPLY`
- No new tables introduced
- Role resolution uses existing `User.accountRole` field (CustomerAccountRole enum)

## Frontend Changes

- Role visibility label added to Automation Playbooks page header
- Apply button text changes to "Approve and apply" when approval required
- Apply button disabled for VIEWER role with explanation message
- Governance settings copy updated to include "Automation Playbooks apply"

## Test Data Setup

To test VIEWER restrictions:
```sql
UPDATE "User" SET "accountRole" = 'VIEWER' WHERE email = 'test@example.com';
```

To reset to OWNER:
```sql
UPDATE "User" SET "accountRole" = 'OWNER' WHERE email = 'test@example.com';
```

## Related Documentation

- [ENTERPRISE-GEO-1.md](./ENTERPRISE-GEO-1.md) - Base approval workflow
- [SELF-SERVICE-1.md](./SELF-SERVICE-1.md) - Customer account roles

## Automated Test Coverage

- Backend: `apps/api/test/integration/roles-2.test.ts`
- Frontend: `apps/web/tests/roles-2.spec.ts`

## FIXUP History

### FIXUP-1 (2025-12-23)

Corrections to initial ROLES-2 implementation:
- Changed APPROVAL_REQUIRED error from 403 to 400 (BadRequestException) to prevent auth-redirect
- Fixed `hasValidApproval` return type handling (returns object, not boolean)
- Approval consumption now occurs after successful apply mutation (not before)
- Frontend resolves `effectiveRole` from account profile (not hardcoded)
- Implemented "Approve and apply" flow in frontend

### FIXUP-2 (2025-12-23)

Frontend structured error parsing:
- Enhanced `buildApiError` to parse NestJS nested error payloads
- Structured errors like `{ message: { code, message, ... } }` are now correctly extracted
- `ApiError.code` correctly set to `'APPROVAL_REQUIRED'` instead of undefined
- `ApiError.message` shows human-readable text instead of generic "Bad Request"
- No auth-redirect on 400 errors (existing behavior preserved)
