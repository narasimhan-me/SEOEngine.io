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

- **UI:** Issues display in three stacked sections: Actionable now (first, comfortable density), Blocked (collapsible, dense), Informational (collapsible, dense)
- **UI:** DataTable columns: Issue (with meta line), Asset Scope, Pillar, Severity (dot+label), Actions
- **UI:** Status column removed (section membership now communicates status)
- **UI:** Hover state visible (token-based: no bg-white flashes)
- **UI:** Focus ring visible when tabbing through rows
- **UI:** No literal palette classes (no bg-white, bg-gray-*, text-gray-* in dark mode)
- **UI:** TripletDisplay shows "Actionable now" first with token-only highlight (bg-primary/10, text-primary)

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

### Scenario 8: RCP Issue Details Content (FIXUP-3)

**ID:** HP-008

**Preconditions:**

- Project has at least one issue with full metadata (whyItMatters, affectedProducts or affectedPages)

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on an issue row to open RCP
3. Observe all sections in the panel

**Expected Results:**

- **UI:** RCP displays these sections in order:
  - **Issue Summary:** Title + description (plain text)
  - **Pillar:** Pillar name
  - **Severity:** Critical/Warning/Info badge
  - **Why This Matters:** issue.whyItMatters text (or fallback)
  - **Actionability:** Label + guidance text
  - **Affected Assets:** List of products/pages (max 6 each)
  - **Affected Items:** Count summary with asset type badges
- **UI:** No navigation occurs when issue is selected (row click updates RCP only)
- **UI:** All sections use token-only styling

---

### Scenario 9: Blocked Issue Shows Non-Speculative Guidance (FIXUP-3/FIXUP-4)

**ID:** HP-009

**Preconditions:**

- User has VIEWER role on a project with actionable issues
- Or: Project has an issue where isActionableNow is false or undefined

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on a blocked issue row to open RCP
3. Observe the Actionability section

**Expected Results:**

- **UI:** Actionability label shows "Blocked — not actionable in this context"
- **UI:** Guidance text is non-speculative and references Work Canvas for more information
- **UI:** No "Fix" or "Apply" wording present
- **UI:** No buttons, CTAs, or links in the guidance
- **UI:** No speculative claims about permissions or elevated access

---

### Scenario 10: Informational Issue Shows Outside-Control Guidance (FIXUP-3)

**ID:** HP-010

**Preconditions:**

- Project has at least one informational issue (actionability='informational')

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on an informational issue row to open RCP
3. Observe the Actionability section

**Expected Results:**

- **UI:** Actionability label shows "Informational — outside EngineO.ai control"
- **UI:** Guidance text explains EngineO.ai cannot act directly, references Work Canvas
- **UI:** No urgency language or CTAs present

---

### Scenario 11: Three-Section Decision Engine Hierarchy (FIXUP-5)

**ID:** HP-011

**Preconditions:**

- Project has issues in all three categories: actionable, blocked, and informational

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Observe the section ordering and visual hierarchy
3. Toggle between "Actionable now" and "All detected" modes

**Expected Results:**

- **UI:** Sections render in order: Actionable now → Blocked → Informational
- **UI:** Actionable now section is visually dominant with comfortable density
- **UI:** Blocked and Informational sections use dense density
- **UI:** In Actionable mode, Blocked and Informational sections are collapsed by default
- **UI:** In All detected mode, all sections are expanded
- **UI:** Section headings show counts: "Actionable now (N)", "Blocked (N)", "Informational (N)"

---

### Scenario 12: Sorting and Priority Signaling (FIXUP-5)

**ID:** HP-012

**Preconditions:**

- Project has multiple issues with different severities and impact levels

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Observe the Actionable now section
3. Check the ordering of issues

**Expected Results:**

- **UI:** Issues sorted by severity (critical → warning → info)
- **UI:** Within same severity, higher impact issues (more affected assets) appear first
- **UI:** Issue column displays compact meta line showing: Severity, Fixability (AI/Manual/Automation), Impact (N affected)
- **UI:** Critical issues visually prioritized at top of each section

---

### Scenario 13: Action Column Semantics (FIXUP-5)

**ID:** HP-013

**Preconditions:**

- Project has actionable issues, diagnostic issues, and blocked issues

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Observe the Actions column across different issue types
3. Interact with action buttons

**Expected Results:**

- **UI:** Actionable issues show one of: "Fix now" action (button for inline AI preview flows; otherwise link), or "Review" link (for diagnostic and "View affected" flows)
- **UI:** "View affected" displays as "Review" with title/tooltip preserving original meaning ("View affected")
- **UI:** "Fix with AI", "Open", "Sync" display as "Fix now" with title preserving original specific action
- **UI:** Blocked issues show non-clickable "Blocked" pill with tooltip "Not actionable in this context"
- **UI:** "Fix next" button renamed to "Fix now" (button id preserved for focus restore)

---

### Scenario 14: Mode Toggle Copy Update (FIXUP-5)

**ID:** HP-014

**Preconditions:**

- Project has both actionable and detected issues

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Observe the mode toggle buttons
3. Click between modes

**Expected Results:**

- **UI:** Toggle buttons read "Actionable now" and "All detected" (not "Actionable" and "Detected")
- **UI:** Mode toggle behavior unchanged - filters issues appropriately

---

### Scenario 15: TripletDisplay Token-Only Enforcement (FIXUP-5)

**ID:** HP-015

**Preconditions:**

- Project has canonical count triplet data

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Observe the TripletDisplay component
3. Inspect with browser DevTools in dark mode

**Expected Results:**

- **UI:** "Actionable now" renders first with highlight wrapper (bg-primary/10, text-primary)
- **UI:** All labels use text-muted-foreground (no text-gray-600 literals)
- **UI:** Dark mode shows no unexpected gray flashes or literal palette classes

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

### EC-004: Issue Without whyItMatters (FIXUP-3)

**Description:** Issue that does not have whyItMatters field populated

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on an issue that has no whyItMatters metadata
3. Observe the "Why This Matters" section in RCP

**Expected Behavior:**

- Section renders with neutral text: "Not available for this issue."
- Does NOT fall back to showing issue.description (avoids duplication)
- Uses muted token styling (text-muted-foreground)

---

### EC-005: Issue Without Affected Asset Lists (FIXUP-3)

**Description:** Issue that has counts but no affectedProducts or affectedPages arrays

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on an issue that has no affected asset lists
3. Observe the "Affected Assets" section in RCP

**Expected Behavior:**

- Section renders with neutral text: "No affected asset list available."
- Affected Items (counts) section still displays separately
- Uses muted token styling

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
