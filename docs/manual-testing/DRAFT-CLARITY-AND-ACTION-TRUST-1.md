# DRAFT-CLARITY-AND-ACTION-TRUST-1: UX Trust Hardening Manual Testing Guide

**Phase:** DRAFT-CLARITY-AND-ACTION-TRUST-1
**Status:** Complete
**Date:** 2026-01-07

## Overview

- **Purpose of the feature/patch:**
  - This patch batch hardens UX trust by establishing a clear 3-state draft lifecycle for SEO metadata, clarifying action semantics (Generate/Preview uses AI, Apply never uses AI), fixing internal ID leakage, adding inline education for GEO/AEO, and improving automation history transparency.

- **High-level user impact and what "success" looks like:**
  - Users clearly understand when their work is unsaved, saved, or applied
  - Users trust that "Apply" will never call AI or change their saved content
  - Users see human-readable explanations instead of internal IDs
  - Users understand what GEO and Citation Confidence mean
  - Users can filter and understand automation history

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase DRAFT-CLARITY-AND-ACTION-TRUST-1

- **Related documentation:**
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-003, CP-006, CP-008)
  - `apps/web/tests/draft-clarity-and-action-trust-1.spec.ts`

---

## Preconditions

- **Environment requirements:**
  - [ ] Local development environment running (web + API)
  - [ ] Test Shopify store connected (for Apply to Shopify tests)
  - [ ] Test project with products that have DEO issues

- **Test accounts and sample data:**
  - [ ] User with at least one project and connected Shopify store
  - [ ] Products with missing SEO metadata (title, description)
  - [ ] Products with AI-generated Answer Blocks

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user can test draft lifecycle
  - [ ] Pro/Business plan for automation history tests

---

## Test Scenarios (Happy Path)

### Scenario 1: Draft Lifecycle State Transitions (Product Metadata)

**ID:** HP-001

**Preconditions:**
- Navigate to a product optimization page with existing SEO metadata

**Steps:**
1. Navigate to `/projects/{projectId}/products/{productId}`
2. Wait for Metadata tab to load
3. Observe the draft state banner shows "Applied to Shopify on {date}" (if previously applied)
4. Modify the SEO title field
5. Observe banner changes to "Draft — not applied"
6. Click "Save draft" button
7. Observe banner changes to "Draft saved — not applied"
8. Click "Apply to Shopify" button (now enabled)
9. Observe banner changes to "Applied to Shopify on {timestamp}"

**Expected Results:**
- **UI:** Banner transitions through all 3 states correctly
- **UI:** "Apply to Shopify" button disabled when draft state is "unsaved"
- **UI:** "Apply to Shopify" button enabled only when draft state is "saved"
- **API:** Apply endpoint does NOT call AI (verify via network tab - no AI endpoint calls)

---

### Scenario 2: Draft Persistence Across Navigation

**ID:** HP-002

**Preconditions:**
- Have unsaved changes in SEO editor

**Steps:**
1. Make changes to SEO title (creating unsaved draft)
2. Navigate to Overview tab
3. Navigate back to Metadata tab
4. Observe draft state is preserved

**Expected Results:**
- **UI:** SEO title shows the modified value
- **UI:** Draft banner shows correct state
- **Storage:** sessionStorage contains draft values

---

### Scenario 3: Unsaved Changes Navigation Blocking

**ID:** HP-003

**Preconditions:**
- Have unsaved changes in SEO editor

**Steps:**
1. Make changes to SEO title (creating unsaved draft)
2. Click on a link to navigate to another page (e.g., Projects list)
3. Browser shows confirmation dialog

**Expected Results:**
- **UI:** Dialog message contains "unsaved changes"
- **UI:** Dismissing dialog keeps user on current page
- **UI:** Accepting dialog allows navigation

---

### Scenario 4: AI Suggestions Panel Semantics

**ID:** HP-004

**Preconditions:**
- Navigate to product optimization page

**Steps:**
1. Observe AI Suggestions panel
2. Verify inline guidance text is present
3. Observe "Add to draft" buttons (not "Apply to editor")
4. Click "Generate Suggestions" if available
5. Click "Add to draft" on a suggestion

**Expected Results:**
- **UI:** Guidance text shows: "Generating creates a draft (uses AI)", "Draft must be saved before you can Apply", "Apply never uses AI and does not auto-save"
- **UI:** Buttons labeled "Add to draft" (not "Apply to editor")
- **UI:** After clicking "Add to draft", SEO editor scrolls into view and shows the value

---

### Scenario 5: GEO Explainer Panels

**ID:** HP-005

**Preconditions:**
- Navigate to product optimization page with GEO tab

**Steps:**
1. Navigate to GEO tab
2. Locate "What is GEO?" collapsible section
3. Click to expand
4. Observe explanation content
5. Locate "What is Citation Confidence?" collapsible section
6. Click to expand
7. Observe explanation content

**Expected Results:**
- **UI:** "What is GEO?" explains Generative Engine Optimization
- **UI:** "What is Citation Confidence?" explains it's not a guarantee, and uses hedged language
- **UI:** Collapsibles can be toggled open/closed

---

### Scenario 6: Automation History Filters

**ID:** HP-006

**Preconditions:**
- Navigate to product with automation history

**Steps:**
1. Navigate to product optimization page
2. Locate Automation History panel
3. Click "View full history" to expand
4. Observe Status and Initiator filter dropdowns
5. Select "Skipped" from Status filter
6. Observe filtered results
7. Verify skipped rows show human-readable explanation
8. Select "Manual" from Initiator filter
9. Observe filtered results

**Expected Results:**
- **UI:** Filter dropdowns have data-testid="automation-status-filter" and data-testid="automation-initiator-filter"
- **UI:** Skipped rows show explanation in yellow banner (e.g., "Skipped because the Free plan does not include Answer Block automation.")
- **UI:** Filtering works correctly and shows "No runs match the current filters" when empty

---

### Scenario 7: Issues Page Draft Lifecycle

**ID:** HP-007

**Preconditions:**
- Navigate to Issues page with AI-fixable issues

**Steps:**
1. Navigate to `/projects/{projectId}/issues`
2. Click "Fix next" on an AI-fixable issue
3. Wait for preview to load
4. Observe draft state banner
5. Verify Apply button is disabled
6. Click "Save draft" button
7. Observe state transitions to "saved"
8. Verify Apply button is now enabled

**Expected Results:**
- **UI:** Draft state banner shows "Draft — not applied" initially
- **UI:** Apply button disabled until draft is saved
- **UI:** After save, Apply button becomes enabled
- **API:** Apply calls Shopify directly (not AI) when clicked

---

### Scenario 8: No Internal ID Leakage

**ID:** HP-008

**Preconditions:**
- Navigate to pages with DEO issues displayed

**Steps:**
1. Navigate to Product DEO Insights panel
2. Observe issue display
3. Navigate to Content DEO Insights panel
4. Observe issue display
5. Inspect for any raw issue IDs (like "missing_seo_title")

**Expected Results:**
- **UI:** All issues show human-readable labels (e.g., "Missing SEO Title")
- **UI:** No internal IDs like `missing_seo_title`, `weak_title` are visible
- **UI:** Fallback uses `issue.title ?? 'Issue detected'`, never `issue.id`

---

## Edge Cases

### EC-001: Draft Expires (sessionStorage Cleared)

**Description:** User clears browser storage while on product page

**Steps:**
1. Create unsaved draft
2. Open DevTools → Application → Session Storage
3. Clear session storage
4. Refresh page

**Expected Behavior:**
- Draft values are lost (expected behavior)
- Page shows default/current values from server

---

### EC-002: Rapid Tab Navigation

**Description:** User rapidly switches between tabs

**Steps:**
1. Create unsaved draft
2. Rapidly click Overview → Metadata → Overview → Metadata

**Expected Behavior:**
- Draft state should be preserved correctly
- No race conditions or state corruption

---

### EC-003: Empty Automation History

**Description:** Product with no automation runs

**Steps:**
1. Navigate to product with no automation history

**Expected Behavior:**
- Panel shows "No Answer Block automation runs have been recorded for this product yet."
- Filters are not visible (no history to filter)

---

## Error Handling

### ERR-001: Shopify API Failure on Apply

**Scenario:** Shopify API returns error when applying SEO changes

**Steps:**
1. Disconnect network or simulate Shopify API failure
2. Click "Apply to Shopify" after saving draft

**Expected Behavior:**
- Error toast displayed with actionable message
- Draft remains saved (not lost)
- User can retry

---

### ERR-002: AI Generation Failure

**Scenario:** AI fails to generate suggestions

**Steps:**
1. Simulate AI service failure
2. Click "Generate Suggestions"

**Expected Behavior:**
- Error message displayed
- Existing draft state preserved
- User can retry

---

## Limits

### LIM-001: Free Plan Automation Limit

**Scenario:** Free plan user sees automation skipped

**Steps:**
1. As Free plan user, trigger automation
2. Check automation history

**Expected Behavior:**
- Automation marked as skipped
- Explanation shows: "Skipped because the Free plan does not include Answer Block automation."

---

## Regression

### Areas potentially impacted:

- [ ] **Product Optimization Page:** Verify existing SEO editing workflow still functions
- [ ] **Issues Page:** Verify existing issue fix workflow still functions
- [ ] **AI Suggestions Panel:** Verify AI generation still works
- [ ] **GEO Panel:** Verify existing GEO functionality preserved
- [ ] **Automation History:** Verify existing history display not broken

### Quick sanity checks:

- [ ] Can still edit SEO metadata manually
- [ ] Can still generate AI suggestions
- [ ] Can still apply changes to Shopify
- [ ] Can still view automation history
- [ ] GEO tab loads correctly

---

## Post-Conditions

### Data cleanup steps:

- [ ] Reset any test product SEO fields if modified
- [ ] Clear browser session storage

### Follow-up verification:

- [ ] Playwright tests pass: `pnpm test:e2e apps/web/tests/draft-clarity-and-action-trust-1.spec.ts`

---

## Known Issues

- **Intentionally accepted issues:**
  - Draft state stored in sessionStorage (not persisted across browser sessions by design)

- **Out-of-scope items:**
  - Server-side draft persistence (deferred to future phase)

- **TODOs:**
  - [ ] None

---

## Data-TestID Reference

| Test ID | Component | Purpose |
|---------|-----------|---------|
| `draft-state-banner` | ProductSeoEditor | Draft lifecycle state indicator |
| `save-draft-button` | ProductSeoEditor | Save draft action |
| `apply-to-shopify-button` | ProductSeoEditor | Apply to Shopify action |
| `seo-editor-anchor` | ProductSeoEditor | Scroll target anchor |
| `automation-status-filter` | ProductAutomationHistoryPanel | Status filter dropdown |
| `automation-initiator-filter` | ProductAutomationHistoryPanel | Initiator filter dropdown |
| `skipped-row-explanation` | ProductAutomationHistoryPanel | Skip reason explanation |
| `issue-preview-draft-panel` | Issues Page | Issue fix preview panel |
| `issue-draft-state-banner` | Issues Page | Issue draft state banner |
| `issue-save-draft-button` | Issues Page | Issue save draft button |
| `issue-apply-to-shopify-button` | Issues Page | Issue apply button |

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | [Any additional notes] |
