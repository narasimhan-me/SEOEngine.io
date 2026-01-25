# PLAYBOOKS-SHELL-REMOUNT-1 – Manual Testing

> **Feature:** Playbooks Shell Remount to Canonical DataTable + RCP Integration
>
> **Phase:** PLAYBOOKS-SHELL-REMOUNT-1

---

## Overview

- **Purpose of the feature/patch:**
  - Remount the Playbooks list from card-based layout to canonical DataTable component
  - Integrate Right Context Panel (RCP) playbook details view with PANEL-DEEP-LINKS-1 deep-link support
  - Selection is now in-page state (no navigation on row click)
  - Preserve existing Preview → Estimate → Apply flow step continuity
  - Enforce token-only styling (Design System v1.5) - no literal bg-white/bg-gray-*/text-gray-* classes

- **High-level user impact and what "success" looks like:**
  - Playbooks page displays playbooks in a DataTable with consistent hover/focus states
  - Row click selects playbook and highlights it (no navigation); opens step flow
  - Eye icon opens RCP with playbook details (read-only; no in-body navigation links)
  - Deep-links work: URL updates on panel open, copy/paste restores panel state + selection
  - Preview → Estimate → Apply continuity preserved (no step skipping)
  - No visual regressions in dark mode or Shopify embedded iframe

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase PLAYBOOKS-SHELL-REMOUNT-1
  - Related: PANEL-DEEP-LINKS-1, TABLES-&-LISTS-ALIGNMENT-1

- **Related documentation:**
  - docs/testing/CRITICAL_PATH_MAP.md (CP-012: Automation Engine)
  - docs/manual-testing/PANEL-DEEP-LINKS-1.md
  - docs/manual-testing/TABLES-&-LISTS-ALIGNMENT-1.md
  - docs/manual-testing/PLAYBOOK-STEP-CONTINUITY-1.md

---

## Preconditions

- **Environment requirements:**
  - [ ] Development server running (`npm run dev` or similar)
  - [ ] Backend API running with valid project data
  - [ ] At least one project with detected issues (missing SEO titles/descriptions)

- **Test accounts and sample data:**
  - [ ] Test user account with access to at least one project
  - [ ] Project with issues: some products missing SEO titles, some missing descriptions
  - [ ] Pro or Business plan for full playbook execution testing

- **Required user roles or subscriptions:**
  - [ ] Pro or Business plan for Apply testing (Free tier shows Blocked state)
  - [ ] OWNER role for apply/draft action visibility tests

---

## Test Scenarios (Happy Path)

### Scenario 1: Playbooks Page Renders Inside Shell

**ID:** HP-001

**Preconditions:**

- User is logged in with access to a project

**Steps:**

1. Navigate to `/projects/{projectId}/automation/playbooks`
2. Observe the page layout

**Expected Results:**

- **UI:** Top bar, left nav, and center canvas are visible; RCP area is present (collapsed by default)
- **API:** Playbooks data loads successfully
- **Logs:** No console errors related to rendering

---

### Scenario 2: Playbooks List Uses DataTable

**ID:** HP-002

**Preconditions:**

- Playbooks page is visible

**Steps:**

1. Navigate to `/projects/{projectId}/automation/playbooks`
2. Observe the playbooks list rendering
3. Hover over a row
4. Tab through rows using keyboard

**Expected Results:**

- **UI:** Playbooks display in a DataTable with columns: Playbook, What It Fixes, Asset Type, Availability
- **UI:** Hover state visible (token-based: no bg-white flashes)
- **UI:** Focus ring visible when tabbing through rows
- **UI:** No literal palette classes (no bg-white, bg-gray-*, text-gray-* in dark mode)

---

### Scenario 3: Row Selection Highlights Playbook (No Navigation)

**ID:** HP-003

**Preconditions:**

- Playbooks list is visible with multiple playbooks

**Steps:**

1. Navigate to `/projects/{projectId}/automation/playbooks`
2. Click on a playbook row (not on the eye icon)
3. Observe the selection state
4. Observe the URL bar

**Expected Results:**

- **UI:** Clicked row is visually highlighted (bold text in Playbook cell)
- **UI:** Step flow panel appears below the playbooks list (Preview/Estimate/Apply stepper)
- **UI:** Row does NOT navigate to a different route
- **UI:** URL does NOT add playbookId param (selection is local state)

---

### Scenario 4: Eye Icon Opens RCP with Playbook Details

**ID:** HP-004

**Preconditions:**

- Playbooks list is visible

**Steps:**

1. Navigate to `/projects/{projectId}/automation/playbooks`
2. Hover over a playbook row to reveal the eye icon (context icon)
3. Click the eye icon

**Expected Results:**

- **UI:** RCP slides open showing playbook details
- **UI:** Panel displays: What This Playbook Does, Applicable Assets, Preconditions, Availability, History stub
- **UI:** No in-body navigation links (header external-link is the only navigation affordance)
- **UI:** Header external-link navigates to canonical playbook run route: `/projects/{projectId}/playbooks/{playbookId}?step=preview&source=default`
- **UI:** URL updates with panel params

---

### Scenario 5: Playbook Switching Updates Panel

**ID:** HP-005

**Preconditions:**

- RCP is open with one playbook's details

**Steps:**

1. With RCP open showing Playbook A details, click the eye icon on Playbook B row

**Expected Results:**

- **UI:** RCP content updates to show Playbook B details
- **UI:** No flicker or full panel close/reopen

---

### Scenario 6: PANEL-DEEP-LINKS-1 for Playbooks

**ID:** HP-006

**Preconditions:**

- Project has at least one playbook

**Steps:**

1. Navigate to `/projects/{projectId}/automation/playbooks`
2. Click the eye icon on a playbook row to open RCP
3. Observe the URL bar
4. Copy the URL
5. Close the panel (ESC or close button)
6. Observe the URL bar
7. Paste the copied URL and navigate
8. Use browser back/forward buttons

**Expected Results:**

- **UI (Step 3):** URL updates to include `?panel=details&entityType=playbook&entityId={playbookId}&entityTitle={title}`
- **UI (Step 5):** URL cleans up (panel params removed)
- **UI (Step 7):** Panel reopens with the same playbook; selection in list matches the open panel
- **UI (Step 8):** Back/forward restores panel state across navigation

---

### Scenario 7: Preview → Estimate → Apply Continuity Preserved

**ID:** HP-007

**Preconditions:**

- Pro or Business plan active
- Project has products missing SEO titles or descriptions

**Steps:**

1. Navigate to `/projects/{projectId}/automation/playbooks`
2. Click on a playbook row to select it
3. Click "Generate Preview" button
4. Wait for preview to load
5. Click "Continue to Estimate" button
6. Wait for estimate to load
7. Observe the "Continue to Apply" button availability

**Expected Results:**

- **UI:** Step 1 (Preview) → Step 2 (Estimate) → Step 3 (Apply) flow works without step skipping
- **UI:** Preview generates sample drafts correctly
- **UI:** Estimate shows affected count and AI usage projection
- **UI:** "Continue to Apply" button is enabled when estimate is ready and drafts are valid

---

### Scenario 8: Zero-Actionable Estimate Shows Explicit Message

**ID:** HP-008

**Preconditions:**

- Project has no products matching the selected playbook criteria

**Steps:**

1. Navigate to `/projects/{projectId}/automation/playbooks`
2. Select a playbook where all products are already optimized
3. Observe the step flow panel

**Expected Results:**

- **UI:** Empty state shows "No applicable changes found" message
- **UI:** Stepper and Apply CTAs are hidden
- **UI:** No silent stall - explicit feedback provided

---

### Scenario 9: Blocked Playbook Messaging (Free Plan)

**ID:** HP-009

**Preconditions:**

- User is on Free plan
- Playbooks page is visible

**Steps:**

1. Navigate to `/projects/{projectId}/automation/playbooks`
2. Observe the Availability column for all playbooks
3. Click the eye icon on a playbook to open RCP
4. Observe the Availability section in the panel

**Expected Results:**

- **UI:** Availability column shows "Blocked" state with muted styling
- **UI:** RCP Availability section shows "Blocked" badge
- **UI:** Guidance text is truthful and non-urgent: "This playbook requires a Pro or Business plan."
- **UI:** No urgency language or speculative claims

---

### Scenario 10: Shopify Embedded Iframe Verification

**ID:** HP-010

**Preconditions:**

- App running inside Shopify Admin as embedded app (iframe)

**Steps:**

1. Open Playbooks page inside Shopify Admin embedded context
2. Observe the playbooks table for horizontal overflow
3. Open RCP via eye icon
4. Resize to narrow widths if possible

**Expected Results:**

- **UI:** No horizontal scrollbar appears
- **UI:** DataTable columns adapt gracefully
- **UI:** RCP is usable and doesn't overflow the iframe

---

### Scenario 11: Keyboard Navigation Sanity Check

**ID:** HP-011

**Preconditions:**

- Playbooks list is visible

**Steps:**

1. Tab into the playbooks table to focus the first row
2. Press ArrowDown to move to the next row
3. Press ArrowUp to move back
4. Press Enter on a focused row
5. Press Tab to reach the eye icon
6. Press Enter on the eye icon

**Expected Results:**

- **UI:** Arrow keys move focus between rows
- **UI:** Enter on row selects the playbook (highlights row, shows step flow)
- **UI:** Tab reaches the eye icon
- **UI:** Enter on eye icon opens RCP

---

### Scenario 12: No Auto-Navigation or Auto-Selection on Page Load

**ID:** HP-012

**Preconditions:**

- User is logged in with access to a project
- At least one playbook exists

**Steps:**

1. Navigate directly to `/projects/{projectId}/automation/playbooks` (no query params)
2. Observe the page state immediately after load
3. Observe the URL bar
4. Observe the playbooks list

**Expected Results:**

- **UI:** No playbook is auto-selected on page load
- **UI:** No row is highlighted/bold initially
- **UI:** Step flow panel is NOT visible (no Preview/Estimate/Apply stepper shown)
- **UI:** URL remains clean (no playbookId param added automatically)
- **UI:** User must explicitly click a row to select a playbook

---

## Edge Cases

### EC-001: Invalid entityId in Deep-Link

**Description:** User navigates to a URL with a non-existent playbookId in panel params

**Steps:**

1. Manually construct URL: `/projects/{projectId}/automation/playbooks?panel=details&entityType=playbook&entityId=invalid-123`
2. Navigate to this URL

**Expected Behavior:**

- Panel shows generic/fallback state (not crash)
- No JavaScript errors or crashes
- Page remains functional

---

### EC-002: Deep-Link Outside Project Route

**Description:** User navigates to a URL with playbook panel params on a non-project route

**Steps:**

1. Manually construct URL: `/settings?panel=details&entityType=playbook&entityId=missing_seo_title`
2. Navigate to this URL

**Expected Behavior:**

- Panel shows "Unavailable in this project context." state
- No crashes or API errors

---

### EC-003: Zero Playbooks State

**Description:** Hypothetical edge case where no playbooks are defined

**Steps:**

1. Navigate to playbooks page with empty playbooks array (would require code change)

**Expected Behavior:**

- Empty state message displays with token-only styling
- DataTable shows empty state gracefully

---

## Error Handling

### ERR-001: Playbooks API Failure

**Scenario:** Backend returns error when fetching playbook data

**Steps:**

1. Simulate network error or backend down
2. Navigate to `/projects/{projectId}/automation/playbooks`

**Expected Behavior:**

- Error banner displays with "Retry" button
- Toast/feedback for the error
- Page remains navigable

---

### ERR-002: Estimate API Failure

**Scenario:** Estimate request fails

**Steps:**

1. Select a playbook
2. Generate preview
3. Simulate network error during estimate request

**Expected Behavior:**

- Error message shows in step flow panel
- User can retry
- No stuck states

---

## Limits

### LIM-001: N/A

This feature does not have specific entitlement/quota limits (playbook execution has AI limits covered in PLAYBOOK-STEP-CONTINUITY-1).

---

## Regression

### Areas potentially impacted:

- [ ] **Playbooks Preview/Estimate/Apply flow:** Step continuity still works correctly
- [ ] **DataTable component:** Other pages using DataTable not affected
- [ ] **RCP system:** Other entity types (product, page, collection, issue) still render correctly
- [ ] **Deep-link system:** Existing deep-links for other entity types still work

### Quick sanity checks:

- [ ] Products list DataTable still works
- [ ] Issues list DataTable still works
- [ ] RCP product details still display correctly
- [ ] Existing Playwright tests pass

---

## Post-Conditions

### Data cleanup steps:

- [ ] No data modifications made (read-only testing for most scenarios)
- [ ] Playbook Apply creates drafts - may need cleanup if testing full flow

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
