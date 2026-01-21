# GOV-AUDIT-VIEWER-1: Governance Audit & Approvals Viewer - Manual Testing Guide

**Feature:** Read-only Governance Viewer for Approvals, Audit Events, and Share Links
**Status:** Complete
**Date:** 2025-12-24

---

## Overview

The Governance Viewer provides a read-only interface for project members to view:

- **Approvals:** Pending and historical approval requests
- **Audit Log:** Allowlist-filtered governance events (approvals and share links only)
- **Sharing & Links:** Share link status, views, and history

**Key Invariants:**

1. All endpoints are read-only (no mutations)
2. Audit events are STRICTLY filtered by ALLOWED_AUDIT_EVENT_TYPES allowlist
3. Passcode is NEVER returned, only passcodeLast4
4. Any project member (VIEWER, EDITOR, OWNER) can access

---

## Prerequisites

1. Local development environment running (API on port 3001, Web on port 3000)
2. Test user account with a project
3. Database seeded with test data (optional: use E2E seeder)
4. Some approval requests, audit events, and share links in the database

### Navigation Access

**Location:** Project Settings → Governance

The Governance Viewer is accessible via the project settings navigation:

- Navigate to any project → Settings → Governance
- Direct URL: `/projects/{projectId}/settings/governance`

**Role Access:** All project members can view:

- **VIEWER** — Read-only access to all governance data
- **EDITOR** — Read-only access to all governance data
- **OWNER** — Read-only access to all governance data

> **Note:** This is a read-only viewer. No mutations (create, update, delete) are available through this interface.

---

## Test Scenarios

### 0. Navigation Entry Verification (Prerequisite Check)

**Purpose:** Verify the Governance link exists in project settings navigation and is reachable without direct URL entry.

**Steps:**

1. Login to the application
2. Navigate to any project dashboard (`/projects/{id}`)
3. Click "Settings" in the project navigation
4. Look for "Governance" link in the settings sidebar/menu
5. Click the "Governance" link

**Expected Results:**

- [ ] "Governance" link is visible in project settings navigation
- [ ] Link is clickable without requiring manual URL entry
- [ ] Clicking the link navigates to `/projects/{id}/settings/governance`
- [ ] No 404 or routing errors occur

> **IMPORTANT:** If the Governance link is missing from the settings navigation, the navigation component needs to be updated. Check `apps/web/src/app/projects/[id]/settings/layout.tsx` or the settings nav component.

---

### 1. Governance Viewer Navigation

**Purpose:** Verify navigation to the Governance Viewer page works correctly.

**Steps:**

1. Login to the application
2. Navigate to Project Settings (`/projects/{id}/settings`)
3. Click on "Governance" link or navigate directly to `/projects/{id}/settings/governance`
4. Verify page loads with three tabs

**Expected Results:**

- [ ] Governance page loads at `/projects/{id}/settings/governance`
- [ ] Three tabs visible: "Approvals", "Audit Log", "Sharing & Links"
- [ ] Default tab is "Approvals"
- [ ] Page title shows "Governance"

---

### 2. Approvals Tab - Empty State

**Purpose:** Verify empty state displays correctly when no approvals exist.

**Steps:**

1. Navigate to Governance page
2. Click "Approvals" tab (or confirm it's selected)
3. Verify empty state message

**Expected Results:**

- [ ] Empty state shows "No pending approvals" for pending filter
- [ ] Empty state shows "No approval history" for history filter
- [ ] Status filter buttons (Pending, History) are visible

---

### 3. Approvals Tab - Data Display

**Purpose:** Verify approval requests display correctly with all fields.

**Steps:**

1. Create some approval requests via API or E2E seeder
2. Navigate to Governance > Approvals tab
3. Verify table displays correctly
4. Click "View details" on an approval

**Expected Results:**

- [ ] Table shows columns: Resource, Requested By, Status, Date, Actions
- [ ] Status badges show correct colors (Pending=yellow, Approved=green, Rejected=red)
- [ ] User names resolve correctly (not just user IDs)
- [ ] "View details" opens drawer with full approval information
- [ ] Drawer shows deep-link fields (playbookId, assetType) when present

---

### 4. Approvals Tab - Status Filter

**Purpose:** Verify status filtering works correctly.

**Steps:**

1. Have both pending and historical approvals in database
2. Navigate to Governance > Approvals tab
3. Click "Pending" filter button
4. Verify only pending approvals show
5. Click "History" filter button
6. Verify only approved/rejected approvals show

**Expected Results:**

- [ ] "Pending" shows only PENDING_APPROVAL status
- [ ] "History" shows APPROVED and REJECTED statuses
- [ ] Filter buttons have active state styling
- [ ] Data refreshes when filter changes

---

### 5. Audit Log Tab - Allowlist Enforcement

**Purpose:** Verify only allowed event types are displayed.

**Steps:**

1. Create audit events of various types (allowed and not allowed)
2. Navigate to Governance > Audit Log tab
3. Verify only allowed event types appear

**Allowed Event Types:**

- APPROVAL_REQUESTED
- APPROVAL_APPROVED
- APPROVAL_REJECTED
- SHARE_LINK_CREATED
- SHARE_LINK_REVOKED
- SHARE_LINK_EXPIRED

**Expected Results:**

- [ ] Info banner shows: "Showing approval and share link events only"
- [ ] Only allowed event types appear in the list
- [ ] POLICY_CHANGED, DATA_MODIFIED, etc. are NOT displayed
- [ ] Event type badges show correct colors and labels

---

### 6. Audit Log Tab - Event Details

**Purpose:** Verify audit event detail drawer works correctly.

**Steps:**

1. Navigate to Governance > Audit Log tab
2. Click "View details" on an audit event
3. Verify drawer content

**Expected Results:**

- [ ] Drawer opens with event details
- [ ] Event type badge displayed correctly
- [ ] Actor name resolved (not just user ID)
- [ ] Resource type and ID shown when available
- [ ] Metadata displayed as formatted JSON when present
- [ ] Timestamp formatted correctly

---

### 7. Sharing Tab - Status Derivation

**Purpose:** Verify share link status is derived correctly from data.

**Steps:**

1. Create share links with different states:
   - Active (not expired, not revoked)
   - Expired (expiresAt in past)
   - Revoked (status=REVOKED)
2. Navigate to Governance > Sharing & Links tab
3. Verify status is derived correctly

**Expected Results:**

- [ ] Active links show green "Active" badge
- [ ] Expired links show yellow "Expired" badge
- [ ] Revoked links show red "Revoked" badge
- [ ] Status is derived from data, not stored status field

---

### 8. Sharing Tab - Passcode Security

**Purpose:** Verify passcode hash is NEVER returned to the client.

**Steps:**

1. Create a passcode-protected share link
2. Navigate to Governance > Sharing & Links tab
3. Click "View details" on the passcode link
4. Inspect the data (browser devtools)

**Expected Results:**

- [ ] passcodeLast4 is shown (e.g., "\*\*\*\*5678")
- [ ] passcode and passcodeHash are NOT in the response
- [ ] Audience badge shows "Passcode (\*\*\*\*XXXX)"

---

### 9. Sharing Tab - Status Filter

**Purpose:** Verify status filtering works correctly.

**Steps:**

1. Have share links with different statuses in database
2. Navigate to Governance > Sharing & Links tab
3. Test each filter button: All, Active, Expired, Revoked

**Expected Results:**

- [ ] "All" shows all share links
- [ ] "Active" shows only active links
- [ ] "Expired" shows only expired links
- [ ] "Revoked" shows only revoked links
- [ ] Filter buttons have active state styling

---

### 10. Tab Navigation via URL

**Purpose:** Verify URL-based tab navigation works correctly.

**Steps:**

1. Navigate directly to `/projects/{id}/settings/governance?tab=audit`
2. Verify Audit Log tab is selected
3. Navigate to `/projects/{id}/settings/governance?tab=sharing`
4. Verify Sharing & Links tab is selected
5. Click different tabs and verify URL updates

**Expected Results:**

- [ ] URL parameter controls which tab is active
- [ ] Clicking tabs updates the URL
- [ ] Browser back/forward works correctly with tabs

---

### 11. Access Control - Any Member Can View

**Purpose:** Verify any project member can access the governance viewer.

**Steps:**

1. Login as project VIEWER (not EDITOR or OWNER)
2. Navigate to Governance page
3. Verify all tabs and data are accessible

**Expected Results:**

- [ ] VIEWER can access all three tabs
- [ ] Data loads correctly for VIEWER role
- [ ] No mutations are available (read-only)

---

### 12. Cursor Pagination

**Purpose:** Verify cursor-based pagination works for large datasets.

**Steps:**

1. Create 100+ records of each type (approvals, events, links)
2. Navigate to each tab
3. Scroll or click "Load more" to load additional pages
4. Verify stable ordering (timestamp DESC, id DESC)

**Expected Results:**

- [ ] First page loads with limit items (default 50)
- [ ] "Load more" or infinite scroll loads additional items
- [ ] Items maintain stable ordering across pages
- [ ] No duplicates when paginating

---

## API Endpoints

| Endpoint                                              | Method | Description                           |
| ----------------------------------------------------- | ------ | ------------------------------------- |
| `/projects/:projectId/governance/viewer/approvals`    | GET    | List approvals with cursor pagination |
| `/projects/:projectId/governance/viewer/audit-events` | GET    | List allowlist-filtered audit events  |
| `/projects/:projectId/governance/viewer/share-links`  | GET    | List share links with derived status  |

### Query Parameters

**Approvals:**

- `status`: 'pending' or 'history'
- `cursor`: Pagination cursor
- `limit`: Max items per page (default 50)

**Audit Events:**

- `types`: Comma-separated event types (must be in allowlist)
- `actor`: Filter by actorUserId
- `from`: ISO timestamp (date range start)
- `to`: ISO timestamp (date range end)
- `cursor`: Pagination cursor
- `limit`: Max items per page (default 50)

**Share Links:**

- `status`: 'ACTIVE', 'EXPIRED', 'REVOKED', or 'all'
- `cursor`: Pagination cursor
- `limit`: Max items per page (default 50)

---

## Files Modified/Created

### Shared Package

- `packages/shared/src/governance.ts` - DTOs and ALLOWED_AUDIT_EVENT_TYPES allowlist
- `packages/shared/src/index.ts` - Exports for governance types

### API

- `apps/api/src/projects/governance-viewer.service.ts` - Read-only viewer service
- `apps/api/src/projects/governance.controller.ts` - Added viewer endpoints
- `apps/api/src/projects/projects.module.ts` - Registered GovernanceViewerService

### Web App

- `apps/web/src/lib/api.ts` - API client methods for viewer endpoints
- `apps/web/src/app/projects/[id]/settings/governance/page.tsx` - Governance Viewer UI

### Tests

- `apps/api/test/e2e/governance-viewer.e2e-spec.ts` - API E2E tests
- `apps/web/tests/governance-viewer.spec.ts` - Playwright smoke tests

---

## Related Documentation

- [ENTERPRISE-GEO-1.md](./ENTERPRISE-GEO-1.md) - Enterprise Governance & Approvals

---

## Document History

| Version | Date       | Author                   | Changes                                                                   |
| ------- | ---------- | ------------------------ | ------------------------------------------------------------------------- |
| 1.0     | 2025-12-24 | Narasimhan Mahendrakumar | Initial documentation for GOV-AUDIT-VIEWER-1                              |
| 1.1     | 2025-12-24 | Narasimhan Mahendrakumar | Added navigation prerequisite note and Test #0 for nav entry verification |
