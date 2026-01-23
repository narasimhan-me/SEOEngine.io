# EngineO.ai – Manual Testing: RIGHT-CONTEXT-PANEL-AUTONOMY-1

> **Autonomous Context Panel**
>
> - Cloned from `docs/MANUAL_TESTING_TEMPLATE.md`
> - Created: 2025-01-23
> - Authority: Design System v1.5 + EIC v1.5

---

## Overview

- **Purpose of the feature/patch:**
  - Implement autonomous Right Context Panel (RCP) behavior that opens/closes deterministically based on route context
  - Remove manual mode switching controls (pin, width toggle, view tabs)
  - Remove all in-body navigation CTAs (header external-link is the only navigation affordance)
  - Implement dismissal model that respects user intent until context meaningfully changes

- **High-level user impact and what "success" looks like:**
  - Panel automatically opens when navigating to entity detail routes (products, pages, collections, playbooks)
  - Panel automatically closes when navigating to list/dashboard routes without selection
  - Manual dismissal (X, ESC, scrim click) is respected until navigating to a different entity
  - URL deep-links (PANEL-DEEP-LINKS-1) continue to work correctly
  - No confusion about panel controls—simplified to close button only
  - Shopify embedded iframe compatibility maintained

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase RIGHT-CONTEXT-PANEL-AUTONOMY-1
  - Prior: PANEL-DEEP-LINKS-1, ISSUES-ENGINE-REMOUNT-1, PLAYBOOKS-SHELL-REMOUNT-1

- **Related documentation:**
  - `docs/RIGHT_CONTEXT_PANEL_CONTRACT.md`
  - `docs/manual-testing/RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md`
  - `docs/manual-testing/RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] Local dev server running (`npm run dev`)
  - [ ] Backend API running
  - [ ] At least one project with products, pages, collections, playbooks, and issues

- **Test accounts and sample data:**
  - [ ] User with access to at least one project
  - [ ] Project with at least 1 product, 1 page, 1 collection, 1 playbook
  - [ ] Project with at least 1 actionable issue

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user role (OWNER, EDITOR, VIEWER)

---

## Test Scenarios (Happy Path)

### Scenario 1: Auto-open on Product detail route

**ID:** HP-001

**Preconditions:**

- User is on projects list or dashboard

**Steps:**

1. Navigate to `/projects/{projectId}/products/{productId}`
2. Observe the Right Context Panel

**Expected Results:**

- **UI:** Panel opens automatically with product details; URL includes `?panel=details&entityType=product&entityId={productId}`
- **UI:** No view tabs, pin button, or width toggle visible
- **UI:** Only close button (X) and header external-link present in header
- **UI:** [FIXUP-3] Panel header shows product title (not raw productId) once detail data loads
- **API:** No additional API calls beyond existing page load

---

### Scenario 2: Auto-open on Playbook run route

**ID:** HP-002

**Preconditions:**

- User is on projects list or playbooks list

**Steps:**

1. Navigate to `/projects/{projectId}/playbooks/{playbookId}`
2. Observe the Right Context Panel

**Expected Results:**

- **UI:** Panel opens automatically with playbook details; URL includes `?panel=details&entityType=playbook&entityId={playbookId}`
- **UI:** Panel shows playbook information (no tabs/toggles)
- **UI:** [FIXUP-3] Panel header shows playbook name (not raw playbookId) once playbook data loads

---

### Scenario 3: Issues selection opens panel; switching issues swaps content

**ID:** HP-003

**Preconditions:**

- Project has multiple issues
- User is on issues list

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Click on Issue A row
3. Observe panel opens with Issue A details
4. Click on Issue B row (different issue)
5. Observe panel content updates

**Expected Results:**

- **UI:** Panel opens on first issue selection
- **UI:** Panel content swaps to Issue B without closing/reopening
- **UI:** URL updates to reflect new entityId
- **UI:** No route navigation (stays on /issues)

---

### Scenario 4: Auto-close on contextless list routes

**ID:** HP-004

**Preconditions:**

- Panel is open on a product detail page

**Steps:**

1. From `/projects/{projectId}/products/{productId}`, click breadcrumb to go to products list
2. Navigate to `/projects/{projectId}/products` (list without selection)
3. Observe panel state

**Expected Results:**

- **UI:** Panel closes automatically
- **UI:** URL has no panel params
- **UI:** No lingering panel params in URL

---

### Scenario 5: Auto-close on dashboard

**ID:** HP-005

**Preconditions:**

- Panel is open on any detail route

**Steps:**

1. Navigate to `/dashboard`
2. Observe panel state

**Expected Results:**

- **UI:** Panel closes automatically
- **UI:** URL is clean (no panel params)

---

### Scenario 6: Manual dismissal respected until context changes

**ID:** HP-006

**Preconditions:**

- User is on product detail route with panel open

**Steps:**

1. Navigate to `/projects/{projectId}/products/{productId}` (panel auto-opens)
2. Click close button (X) to dismiss panel
3. Refresh page (stay on same product)
4. Observe panel stays closed
5. Navigate to a different product `/projects/{projectId}/products/{otherProductId}`
6. Observe panel behavior

**Expected Results:**

- **UI:** After step 2: Panel closes, URL params removed
- **UI:** After step 3: Panel stays closed (dismissal respected for same context)
- **UI:** After step 5: Panel opens (context changed, dismissal cleared)

---

### Scenario 7: Deep-link still works (PANEL-DEEP-LINKS-1 not regressed)

**ID:** HP-007

**Preconditions:**

- Know a valid issue ID in a project

**Steps:**

1. Paste URL with panel params: `/projects/{projectId}/issues?panel=details&entityType=issue&entityId={issueId}`
2. Load the page
3. Copy the URL and share to another browser/incognito window
4. Use browser back/forward buttons

**Expected Results:**

- **UI:** Panel opens with correct issue details
- **UI:** URL restoration works (copy/paste restores state)
- **UI:** Back/forward navigation works correctly

---

### Scenario 8: Verify removal of shell Action/Details buttons

**ID:** HP-008

**Preconditions:**

- Navigate to any project page

**Steps:**

1. Look at the center canvas header (below top nav, above main content)
2. Search for "Action" or "Details" buttons

**Expected Results:**

- **UI:** No "Action" or "Details" grouped button control exists
- **UI:** Only breadcrumbs and title visible in header

---

### Scenario 9: Verify removal of RCP tabs, pin, width toggles

**ID:** HP-009

**Preconditions:**

- Panel is open

**Steps:**

1. Examine the panel header
2. Look for tab strip below header
3. Look for pin icon button
4. Look for width toggle (arrows) button

**Expected Results:**

- **UI:** No tab strip (Details/Recommendations/History/Help)
- **UI:** No pin toggle button
- **UI:** No width toggle button
- **UI:** Only header external-link (if applicable) and close button (X) present

---

### Scenario 10: Shopify embedded iframe verification

**ID:** HP-010

**Preconditions:**

- If Shopify embed environment available, or simulated narrow viewport

**Steps:**

1. Open app in Shopify admin (or resize browser to <1024px width)
2. Navigate to a route that auto-opens the panel
3. Verify no horizontal overflow
4. Verify panel is usable (can scroll, close)

**Expected Results:**

- **UI:** No horizontal overflow
- **UI:** Panel overlay mode works correctly (scrim behind panel)
- **UI:** Scrim click closes panel
- **UI:** Panel content scrollable

---

## Edge Cases

### EC-001: Navigate directly to list route with stale panel params in URL

**Description:** User has bookmarked a URL with panel params but navigates to a list route

**Steps:**

1. Visit `/projects/{projectId}/products?panel=details&entityType=product&entityId=xxx`

**Expected Behavior:**

- Panel params should be cleaned from URL (no matching context)
- Panel should not open (no selection on list page)

---

### EC-002: Invalid entityId in deep-link

**Description:** Deep-link has valid params but entity doesn't exist

**Steps:**

1. Visit `/projects/{projectId}/issues?panel=details&entityType=issue&entityId=nonexistent-id`

**Expected Behavior:**

- Panel opens and shows "Issue not found." state (existing ISSUES-ENGINE-REMOUNT-1 behavior)
- No crash or error

---

### EC-003: Rapid navigation between detail routes

**Description:** User clicks quickly between different products

**Steps:**

1. From product A detail, click to product B detail rapidly
2. Continue clicking to product C

**Expected Behavior:**

- Panel updates content correctly to final destination
- No stale content visible
- No flicker or jarring transitions

---

## Error Handling

### ERR-001: API failure when fetching panel content

**Scenario:** Backend API fails when panel tries to load content

**Steps:**

1. Simulate API failure (network tab or env)
2. Navigate to a detail route

**Expected Behavior:**

- Panel shows error state (existing error handling)
- No crash
- User can close panel

---

### ERR-002: Invalid URL params (wrong entityType)

**Scenario:** URL has unsupported entityType value

**Steps:**

1. Visit `/projects/{projectId}?panel=details&entityType=invalid&entityId=xxx`

**Expected Behavior:**

- Panel does not open (validation fails)
- URL params cleaned silently
- No error shown to user

---

## Limits

### LIM-001: N/A

This patch does not introduce entitlement or quota limits.

---

## Regression

### Areas potentially impacted:

- [ ] **PANEL-DEEP-LINKS-1:** Deep-link URLs should still work
- [ ] **ISSUES-ENGINE-REMOUNT-1:** Issue list selection should still open panel
- [ ] **PLAYBOOKS-SHELL-REMOUNT-1:** Playbook selection should still open panel
- [ ] **Issues list navigation:** Row click behavior unchanged

### Quick sanity checks:

- [ ] Can copy/paste deep-link URL and restore panel state
- [ ] Browser back/forward works with panel
- [ ] ESC key closes panel
- [ ] Scrim click closes panel (narrow viewport)
- [ ] No console errors during panel open/close

---

## Post-Conditions

### Data cleanup steps:

- [ ] No data cleanup required (UI-only changes)

### Follow-up verification:

- [ ] Verify no TypeScript errors in build
- [ ] Verify no console warnings related to panel

---

## Known Issues

- **Intentionally accepted issues:**
  - None at this time (FIXUP-3 resolved panel title hydration)

- **Out-of-scope items:**
  - New content types for panel
  - Backend API changes
  - Persisted user preferences for panel behavior

- **TODOs:**
  - [ ] None

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
