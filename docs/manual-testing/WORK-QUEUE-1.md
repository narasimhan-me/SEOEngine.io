# WORK-QUEUE-1 – Unified Action Bundle Work Queue Manual Testing

> **Cloned from MANUAL_TESTING_TEMPLATE.md**
>
> This document covers manual testing for the WORK-QUEUE-1 feature, which provides a unified Work Queue page that derives action bundles from existing persisted artifacts.

---

## Overview

- **Purpose of the feature/patch:**
  - Provide a unified Work Queue page that displays prioritized action items derived from existing persisted artifacts (DEO issues, automation playbook drafts, GEO share links, approval requests).
  - No new storage tables - all bundles are derived at request time.
  - State-driven CTAs that respect role-based access control (ROLES-2/3).

- **High-level user impact and what "success" looks like:**
  - Users see a single prioritized list of actions organized by tabs (Critical, Needs Attention, Pending Approval, Drafts Ready, Applied Recently).
  - Cards display health status, scope, AI usage disclosure, and appropriate CTAs.
  - Apply buttons are disabled for non-OWNER roles with clear inline reasons.
  - Approval workflow integrates seamlessly with existing governance.
  - No jitter in timestamps or sorting between page refreshes.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase WORK-QUEUE-1
  - Phase ASSETS-PAGES-1 (scopeType filter extension)

- **Related documentation:**
  - API_SPEC.md (GET /projects/:id/work-queue, scopeType param)
  - ASSETS-PAGES-1.md (Pages/Collections visibility testing)
  - CRITICAL_PATH_MAP.md (CP-018, ENTERPRISE-GEO-1)
  - ENTERPRISE_GEO_GOVERNANCE.md

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with database connection
  - [ ] Redis available (for queue operations if applicable)
  - [ ] Web app running and connected to API

- **Test accounts and sample data:**
  - [ ] Pro/Business tier user account (for automation features)
  - [ ] Multi-user project with OWNER, EDITOR, VIEWER members
  - [ ] Project with products having missing SEO titles/descriptions
  - [ ] Project with governance policy enabling approval requirements

- **Required user roles or subscriptions:**
  - [ ] OWNER: Full access to all actions
  - [ ] EDITOR: Can generate drafts, cannot apply
  - [ ] VIEWER: Read-only access

---

## Test Scenarios (Happy Path)

### Scenario 1: View Work Queue as OWNER

**ID:** HP-001

**Preconditions:**

- User is OWNER of a project with products missing SEO metadata

**Steps:**

1. Login as OWNER
2. Navigate to project
3. Click "Work Queue" in sidebar navigation
4. Observe the page layout

**Expected Results:**

- **UI:**
  - Page title "Work Queue" visible
  - Tab bar with Critical, Needs Attention, Pending Approval, Drafts Ready, Applied Recently
  - Role indicator shows "OWNER"
  - Action bundle cards displayed with health pills, scope info, AI badges
- **API:** GET /projects/:id/work-queue returns 200 with items array and viewer object
- **Logs:** No errors in console

---

### Scenario 2: Automation Bundle Appears for Missing Metadata

**ID:** HP-002

**Preconditions:**

- Project has 5+ products with missing SEO titles

**Steps:**

1. Navigate to Work Queue page
2. Look for "Fix missing SEO titles" or similar automation bundle

**Expected Results:**

- **UI:**
  - Automation bundle card visible with bundleType=AUTOMATION_RUN
  - Scope shows "Applies to N products"
  - AI badge shows "AI for Drafts"
  - CTA shows "Generate Drafts" (if NEW state)
- **API:** Bundle includes draft subschema with draftStatus

---

### Scenario 3: Tab Filtering Works Correctly

**ID:** HP-003

**Preconditions:**

- Project has bundles in various states

**Steps:**

1. Click "Critical" tab
2. Verify only CRITICAL health bundles shown
3. Click "Needs Attention" tab
4. Verify only NEEDS_ATTENTION health bundles shown
5. Click "Applied Recently" tab
6. Verify only APPLIED state bundles shown (or empty message)

**Expected Results:**

- **UI:** Tab becomes active, URL updates with ?tab= param, cards filter correctly
- **API:** Each request includes tab param and returns filtered results

---

### Scenario 3b: Scope Type Filtering Works Correctly [ASSETS-PAGES-1]

**ID:** HP-003b

**Preconditions:**

- Project has bundles with different scopeTypes (PRODUCTS, PAGES, COLLECTIONS)

**Steps:**

1. Navigate to /projects/:id/work-queue?scopeType=PAGES
2. Verify only PAGES bundles shown
3. Navigate to /projects/:id/work-queue?scopeType=COLLECTIONS
4. Verify only COLLECTIONS bundles shown
5. Navigate to /projects/:id/work-queue?scopeType=PRODUCTS
6. Verify only PRODUCTS bundles shown

**Expected Results:**

- **UI:** Only bundles matching scopeType filter are displayed
- **URL:** scopeType param preserved in URL
- **API:** GET /projects/:id/work-queue?scopeType=PAGES returns only PAGES bundles
- **Network:** No POST/PUT/DELETE requests fired (filter is read-only)

---

### Scenario 4: State Transition from NEW to DRAFTS_READY

**ID:** HP-004

**Preconditions:**

- Automation bundle in NEW state

**Steps:**

1. Click "Generate Drafts" on NEW automation bundle
2. Complete draft generation flow in Automation page
3. Return to Work Queue
4. Verify bundle now shows DRAFTS_READY state

**Expected Results:**

- **UI:** Card state badge changes to "Drafts Ready", CTA changes to "Apply Changes"
- **API:** Bundle state changes, draft subschema shows draftStatus=READY

---

### Scenario 5: Apply Changes as OWNER

**ID:** HP-005

**Preconditions:**

- Automation bundle in DRAFTS_READY state
- User is OWNER

**Steps:**

1. Find bundle with DRAFTS_READY state
2. Click "Apply Changes" CTA
3. Complete apply flow
4. Return to Work Queue and check Applied Recently tab

**Expected Results:**

- **UI:** Bundle moves to Applied Recently tab with APPLIED state
- **API:** Bundle appliedAt timestamp set, state=APPLIED

---

## Edge Cases

### EC-001: Empty Work Queue

**Description:** Project with no issues, no automation needs, no GEO bundles

**Steps:**

1. Create new project with no products
2. Navigate to Work Queue

**Expected Behavior:**

- Empty state message displayed: "All caught up!"
- No error messages

---

### EC-002: Very Large Scope Preview List

**Description:** Bundle affects 100+ products

**Steps:**

1. Create project with 150 products missing metadata
2. Navigate to Work Queue
3. Check scope preview list

**Expected Behavior:**

- Shows first 5 product names + "+145 more"
- No UI overflow or layout issues

---

### EC-003: Stable Timestamps (No Jitter)

**Description:** Verify timestamps don't change on refresh

**Steps:**

1. Navigate to Work Queue
2. Note createdAt/updatedAt of a bundle
3. Refresh page
4. Compare timestamps

**Expected Behavior:**

- Timestamps remain identical between refreshes
- Derived from persisted artifacts (lastDeoComputedAt, draft updatedAt, etc.)

---

## Error Handling

### ERR-001: API Failure

**Scenario:** Work Queue endpoint returns 500

**Steps:**

1. Simulate API error (network disconnect or server down)

**Expected Behavior:**

- Error message displayed with "Try again" button
- User not left on blank page

---

### ERR-002: Unauthorized Access

**Scenario:** Non-member tries to view Work Queue

**Steps:**

1. Login as user not member of project
2. Navigate directly to /projects/:id/work-queue

**Expected Behavior:**

- 403 Forbidden response
- Redirect to projects list or access denied page

---

### ERR-003: Permission Failures for Apply

**Scenario:** EDITOR tries to apply changes

**Steps:**

1. Login as EDITOR
2. Navigate to Work Queue
3. Find DRAFTS_READY bundle
4. Observe Apply button

**Expected Behavior:**

- Apply button disabled or shows inline reason
- Message: "Only owners can apply changes"

---

## Limits

### LIM-001: Viewer Role Restrictions

**Scenario:** VIEWER cannot trigger any mutations

**Steps:**

1. Login as VIEWER
2. Navigate to Work Queue
3. Attempt any action CTA

**Expected Behavior:**

- All CTAs are view-only ("View Details", "View Drafts")
- No mutation CTAs visible (Generate Drafts, Apply, Approve)

---

### LIM-002: Approval Required Gating

**Scenario:** Apply requires approval in governed project

**Steps:**

1. Enable requireApprovalForApply in governance policy
2. Login as EDITOR
3. Navigate to Work Queue with DRAFTS_READY bundle

**Expected Behavior:**

- Apply disabled with message "Approval required before apply"
- CTA shows "Request Approval" instead

---

## Regression

### Areas potentially impacted:

- [ ] **Project Overview:** Health cards now link to Work Queue
- [ ] **Automation Page:** Draft generation linked from Work Queue
- [ ] **GEO Export:** Bundles route to export page
- [ ] **Approval Workflow:** Status reflected in Work Queue

### Quick sanity checks:

- [ ] Project sidebar navigation includes Work Queue item
- [ ] Health cards on Overview are clickable and route correctly
- [ ] Automation flow still works end-to-end
- [ ] GEO export page loads without triggering mutations from Work Queue

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup needed (Work Queue is derived, no new storage)
- [ ] If testing applied drafts, those persist normally

### Follow-up verification:

- [ ] Verify no orphaned records created
- [ ] Check audit logs if applicable

---

## Known Issues

- **Intentionally accepted issues:**
  - GEO bundle always shows as NEW (no state progression in v1)
  - Issue-derived bundles always show as NEW (no PREVIEWED persistence)

- **Out-of-scope items:**
  - Bulk actions across multiple bundles
  - Real-time updates (requires page refresh)

- **TODOs:**
  - [ ] Add data-testid attributes for E2E automation
  - [ ] Implement Playwright tests fully

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
