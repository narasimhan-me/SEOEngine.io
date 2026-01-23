# ISSUES-ENGINE-REMOUNT-1 – Manual Testing

> **Feature:** Issues Engine List Remount to Canonical DataTable + RCP Issue Details Integration
>
> **Phase:** ISSUES-ENGINE-REMOUNT-1

---

## Overview

- **Purpose of the feature/patch:**
  - Remount the Issues Engine list from card-based layout to canonical DataTable component
  - Integrate Right Context Panel (RCP) issue details view with PANEL-DEEP-LINKS-1 deep-link support
  - Enforce token-only styling (Design System v1.5) - no literal bg-white/bg-gray-*/text-gray-* classes
  - Preserve existing Playwright selectors and trust + navigation behavior

- **High-level user impact and what "success" looks like:**
  - Issues page displays issues in a DataTable with consistent hover/focus states
  - Row click opens RCP with issue details; eye icon also opens RCP
  - Issue details panel shows pillar, severity, status, affected counts
  - Deep-links work: URL updates on panel open, copy/paste restores panel state
  - No visual regressions in dark mode or Shopify embedded iframe

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase ISSUES-ENGINE-REMOUNT-1
  - Related: PANEL-DEEP-LINKS-1, TABLES-&-LISTS-ALIGNMENT-1

- **Related documentation:**
  - docs/testing/CRITICAL_PATH_MAP.md (CP-009: Issue Engine Lite)
  - docs/manual-testing/PANEL-DEEP-LINKS-1.md
  - docs/manual-testing/TABLES-&-LISTS-ALIGNMENT-1.md

---

## Preconditions

- **Environment requirements:**
  - [ ] Development server running (`npm run dev` or similar)
  - [ ] Backend API running with valid project and issues data
  - [ ] At least one project with detected issues (various severities)

- **Test accounts and sample data:**
  - [ ] Test user account with access to at least one project
  - [ ] Project with issues: some actionable, some informational, various severities

- **Required user roles or subscriptions:**
  - [ ] Any plan with issues access (Free tier is sufficient for read-only testing)

---

## Test Scenarios (Happy Path)

### Scenario 1: Issues Page Renders Inside Shell

**ID:** HP-001

**Preconditions:**

- User is logged in with access to a project

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Observe the page layout

**Expected Results:**

- **UI:** Top bar, left nav, and center canvas are visible; RCP area is present (collapsed by default)
- **API:** Issues list loads successfully from API
- **Logs:** No console errors related to rendering

---

### Scenario 2: Issues List Uses DataTable

**ID:** HP-002

**Preconditions:**

- Project has at least 3 issues with varying severities

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Observe the issues list rendering
3. Hover over a row
4. Tab through rows using keyboard

**Expected Results:**

- **UI:** Issues display in a DataTable with columns: Issue, Asset Scope, Pillar, Severity, Status, Actions
- **UI:** Hover state visible (token-based: no bg-white flashes)
- **UI:** Focus ring visible when tabbing through rows
- **UI:** No literal palette classes (no bg-white, bg-gray-*, text-gray-* in dark mode)

---

### Scenario 3: Row Click Opens RCP Issue Details

**ID:** HP-003

**Preconditions:**

- Project has at least one issue

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on a row (not on a button/link inside the row)
3. Observe the Right Context Panel

**Expected Results:**

- **UI:** RCP slides open showing issue details
- **UI:** Panel displays: Issue title, Pillar, Severity badge, Status badge, Why This Matters, Affected counts
- **API:** Fetches read-only via `projectsApi.deoIssuesReadOnly(projectId)` if issue not available in-memory (no writes)

---

### Scenario 4: Eye Icon Opens RCP

**ID:** HP-004

**Preconditions:**

- Project has at least one issue

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Hover over a row to reveal the eye icon (context icon)
3. Click the eye icon

**Expected Results:**

- **UI:** RCP opens with the same issue details as row click
- **UI:** Eye icon is visible on hover/focus

---

### Scenario 5: Issue Switching Updates Panel

**ID:** HP-005

**Preconditions:**

- Project has at least 2 issues
- RCP is open with one issue

**Steps:**

1. With RCP open showing Issue A, click on Issue B row

**Expected Results:**

- **UI:** RCP content updates to show Issue B details
- **UI:** No flicker or full panel close/reopen

---

### Scenario 6: PANEL-DEEP-LINKS-1 for Issues

**ID:** HP-006

**Preconditions:**

- Project has at least one issue

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on an issue row to open RCP
3. Observe the URL bar
4. Copy the URL
5. Close the panel (ESC or close button)
6. Observe the URL bar
7. Paste the copied URL and navigate
8. Use browser back/forward buttons

**Expected Results:**

- **UI (Step 3):** URL updates to include `?panel=details&entityType=issue&entityId={issueId}&entityTitle={title}`
- **UI (Step 5):** URL cleans up (panel params removed)
- **UI (Step 7):** Panel reopens with the same issue
- **UI (Step 8):** Back/forward restores panel state across navigation

---

### Scenario 7: Actionable Issue Title Button

**ID:** HP-007

**Preconditions:**

- Project has at least one actionable issue (isActionableNow=true, has valid fixHref)

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Find an actionable issue
3. Click on the issue title (button inside the Issue cell)

**Expected Results:**

- **UI:** Navigation occurs to the fix destination (does not just open RCP)
- **UI:** Row click (outside the title button) opens RCP instead
- **API:** N/A

---

## Edge Cases

### EC-001: Invalid entityId in Deep-Link

**Description:** User navigates to a URL with a non-existent issueId in panel params

**Steps:**

1. Manually construct URL: `/projects/{projectId}/issues?panel=details&entityType=issue&entityId=invalid-123`
2. Navigate to this URL

**Expected Behavior:**

- Panel shows "Issue not found." state
- No JavaScript errors or crashes
- Page remains functional

---

### EC-002: Deep-Link Outside Project Route

**Description:** User navigates to a URL with issue panel params on a non-project route

**Steps:**

1. Manually construct URL: `/settings?panel=details&entityType=issue&entityId=some-id`
2. Navigate to this URL

**Expected Behavior:**

- Panel shows "Unavailable in this project context." state
- No crashes or API errors

---

### EC-003: Zero Issues State

**Description:** Project has no issues matching current filters

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Apply filters that result in zero matching issues

**Expected Behavior:**

- Empty state message displays with token-only styling
- Message varies based on mode: "No actionable issues" vs "No issues detected"

---

## Error Handling

### ERR-001: Issues API Failure

**Scenario:** Backend returns error when fetching issues

**Steps:**

1. Simulate network error or backend down
2. Navigate to `/projects/{projectId}/issues`

**Expected Behavior:**

- Error banner displays with "Retry" button
- Toast/feedback for the error
- Page remains navigable

---

### ERR-002: RCP Issue Fetch Failure

**Scenario:** Issue details fetch fails when opening RCP via deep-link

**Steps:**

1. Navigate to issue deep-link URL when backend is unavailable
2. Observe RCP content

**Expected Behavior:**

- Panel shows "Failed to load issue details. Please try again." state
- No crashes

---

## Limits

### LIM-001: N/A

This feature does not have entitlement/quota limits.

---

## Regression

### Areas potentially impacted:

- [ ] **Issues Engine filters:** Pillar, severity, mode filters still work correctly
- [ ] **Preview/Draft/Apply flow:** ai-fix-now expansion rows still function
- [ ] **DataTable component:** Other pages using DataTable not affected
- [ ] **RCP system:** Other entity types (product, page, collection) still render correctly

### Quick sanity checks:

- [ ] Products list DataTable still works
- [ ] Pages list DataTable still works
- [ ] RCP product details still display correctly
- [ ] Existing Playwright tests pass

---

## Post-Conditions

### Data cleanup steps:

- [ ] No data modifications made (read-only testing)

### Follow-up verification:

- [ ] Verify no console errors in production build
- [ ] Verify Shopify embedded iframe displays correctly

---

## Known Issues

- **Intentionally accepted issues:**
  - N/A

- **Out-of-scope items:**
  - Mobile responsive testing (not in scope for this patch)
  - Performance benchmarking

- **TODOs:**
  - [ ] Run full Playwright test suite after merge

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
