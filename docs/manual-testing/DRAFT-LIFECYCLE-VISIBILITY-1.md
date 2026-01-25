# Manual Testing: DRAFT-LIFECYCLE-VISIBILITY-1

> Draft Lifecycle State Visibility and Trust

## Overview

This phase ensures that draft lifecycle states (NO_DRAFT, GENERATED_UNSAVED, SAVED_NOT_APPLIED, APPLIED) are consistently visible across all Issues Engine surfaces without silent transitions.

## Prerequisites

- Access to a project with detected issues
- Products with AI-fixable issues (e.g., `missing_seo_title`, `missing_seo_description`)
- Or use existing seed: `POST /testkit/e2e/seed-first-deo-win`

---

## Draft Lifecycle States

| State               | Meaning                                | Row Indicator      | Apply Button State    | Banner Copy                    |
| ------------------- | -------------------------------------- | ------------------ | --------------------- | ------------------------------ |
| `NO_DRAFT`          | No draft exists for this issue/product | (none)             | N/A                   | N/A                            |
| `GENERATED_UNSAVED` | Draft generated but not saved          | "Draft not saved"  | Disabled              | "Draft — not applied"          |
| `SAVED_NOT_APPLIED` | Draft saved but not applied to Shopify | "Draft saved"      | Enabled               | "Draft saved — not applied"    |
| `APPLIED`           | Draft has been applied to Shopify      | "Applied"          | Hidden (chip shown)   | "Applied to Shopify on [date]" |

---

## Test Scenarios

### Scenario 1: NO_DRAFT State

**Route:** `/projects/{projectId}/issues`

**Setup:** Navigate to Issues Engine with an issue that has no draft

1. Navigate to Issues Engine
2. Locate an issue row that has NOT been previewed
3. Click on the issue row to open RCP
4. **Verify:**
   - [ ] No draft indicator shown next to CTA (row is clean)
   - [ ] CTA shows "Review AI fix" or appropriate action label
   - [ ] RCP Actionability section shows draft line: "Draft: No draft exists"

   > [FIXUP-1] RCP now always displays the draft lifecycle line for complete state visibility.

---

### Scenario 2: GENERATED_UNSAVED State

**Route:** `/projects/{projectId}/issues`

**Setup:** Click "Review AI fix" on an issue but do NOT save the draft

1. Navigate to Issues Engine
2. Click "Review AI fix" on an actionable issue
3. Wait for AI preview to generate
4. **Verify:**
   - [ ] Draft state banner shows "Draft — not applied" (warning styling)
   - [ ] "Save draft" button is visible
   - [ ] "Apply saved draft to Shopify" button is disabled
   - [ ] Apply button tooltip shows "Save draft before applying"
   - [ ] Row indicator shows "(Draft not saved)" next to CTA
   - [ ] Cancel button is visible

---

### Scenario 3: SAVED_NOT_APPLIED State

**Route:** `/projects/{projectId}/issues`

**Setup:** Click "Review AI fix", generate preview, then save draft

1. Navigate to Issues Engine
2. Click "Review AI fix" on an actionable issue
3. Wait for AI preview to generate
4. Click "Save draft"
5. **Verify:**
   - [ ] Draft state banner shows "Draft saved — not applied" (primary styling)
   - [ ] "Save draft" button is hidden (already saved)
   - [ ] "Apply saved draft to Shopify" button is enabled
   - [ ] Apply button tooltip shows "Applies saved draft only. Does not use AI."
   - [ ] Row indicator shows "(Draft saved)" next to CTA
   - [ ] Cancel button is visible

---

### Scenario 4: APPLIED State

**Route:** `/projects/{projectId}/issues`

**Setup:** Complete the full flow: generate → save → apply

1. Navigate to Issues Engine
2. Click "Review AI fix" on an actionable issue
3. Wait for AI preview to generate
4. Click "Save draft"
5. Click "Apply saved draft to Shopify"
6. Wait for apply to complete
7. **Verify:**
   - [ ] Draft state banner shows "Applied to Shopify on [date/time]" (success styling)
   - [ ] "Apply saved draft to Shopify" button is replaced with "Applied" chip
   - [ ] Applied chip is non-interactive (no button, no link)
   - [ ] "Cancel" button is replaced with "Close" button
   - [ ] Row indicator shows "(Applied)" next to CTA

---

### Scenario 5: RCP Actionability Echoes Draft State

**Route:** `/projects/{projectId}/issues` → click any issue row

1. Navigate to Issues Engine
2. Generate and save a draft for an issue (SAVED_NOT_APPLIED state)
3. Click on the issue row to open RCP
4. Observe the Actionability section
5. **Verify:**
   - [ ] Actionability section shows "Draft: Draft saved" line
   - [ ] Line has tooltip "Draft is saved locally. Apply it to Shopify to update your store."
   - [ ] No buttons/CTAs/links in the RCP body

---

### Scenario 6: Consistency Between Surfaces

**Route:** `/projects/{projectId}/issues`

**Setup:** Generate and save a draft for an issue

1. Navigate to Issues Engine
2. Click "Review AI fix" on an issue
3. Generate preview and save draft
4. Observe:
   - Row indicator in table
   - Inline preview banner
   - RCP Actionability section
5. **Verify:**
   - [ ] All three surfaces show "Draft saved" or equivalent
   - [ ] States are consistent (not showing different states)
   - [ ] Closing and reopening preview maintains state

---

## Critical Invariants

1. **No silent transitions**: User must explicitly save before Apply is enabled
2. **Apply only when SAVED_NOT_APPLIED**: Apply button is only clickable when draft is saved but not applied
3. **Applied confirmation is non-interactive**: No accidental re-apply possible
4. **State persistence**: Saved drafts persist in sessionStorage until applied or canceled
5. **Dev-time warnings**: Console warns if Apply is enabled but state is not SAVED_NOT_APPLIED

---

## Dev-Time Guardrails

In development mode, console warnings appear when:

1. Apply button is enabled but derived state is not `SAVED_NOT_APPLIED`
2. "Applied" state is shown but `appliedAt` signal is not set
3. Row indicator state disagrees with inline preview derived state for active preview

---

## Test Coverage

- Playwright E2E: (manual testing only for this phase per Design System v1.5)

---

## Notes

- Draft lifecycle state is derived from existing UI signals (no new backend calls)
- `checkSavedDraftInSessionStorage()` uses existing draft key scheme
- All existing `data-testid` selectors preserved for backward compatibility
- Token-only styling used throughout

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
