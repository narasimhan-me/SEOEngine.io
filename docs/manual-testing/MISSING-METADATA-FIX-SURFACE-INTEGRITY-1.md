# Manual Testing: MISSING-METADATA-FIX-SURFACE-INTEGRITY-1

> Metadata issue anchor mapping corrected

## Overview

This phase fixes the "Fix surface not available" error that occurred when navigating to fix Missing Metadata issues. The root cause was incorrect anchor testids (`product-metadata-seo-title-module`, etc.) that did not exist in the DOM. All metadata issues now use the real anchor `seo-editor-anchor`.

## Prerequisites

- Access to a project with metadata issues
- Products with missing SEO title or description
- Or use existing seed: `POST /testkit/e2e/seed-first-deo-win`

---

## Key Behavior Changes

| Before | After |
|--------|-------|
| fixAnchorTestId: `product-metadata-seo-title-module` | fixAnchorTestId: `seo-editor-anchor` |
| "Fix surface not available" banner shown | SEO editor scrolls into view and highlights |
| User stranded on page | User lands exactly on fix surface |

---

## Affected Issue Types

The following issue types had incorrect anchor mappings that are now fixed:

| Issue Type | Old Anchor (incorrect) | New Anchor (correct) |
|------------|------------------------|----------------------|
| `missing_seo_title` | `product-metadata-seo-title-module` | `seo-editor-anchor` |
| `missing_seo_description` | `product-metadata-seo-description-module` | `seo-editor-anchor` |
| `weak_title` | `product-metadata-seo-title-module` | `seo-editor-anchor` |
| `weak_description` | `product-metadata-seo-description-module` | `seo-editor-anchor` |
| `missing_metadata` | `product-metadata-seo-title-module` | `seo-editor-anchor` |

---

## Test Scenarios

### Scenario 1: missing_seo_title lands on SEO editor

**Route:** `/projects/{projectId}/products/{productId}?tab=metadata&from=issues_engine&issueId=missing_seo_title&fixAnchor=seo-editor-anchor`

1. Navigate to a product with `missing_seo_title` issue context
2. **Verify:**
   - [ ] SEO editor (`data-testid="seo-editor-anchor"`) is visible
   - [ ] Page scrolls to SEO editor section
   - [ ] "Fix surface not available" message is NOT shown
   - [ ] Issue fix context banner shows "You're here to fix:"

---

### Scenario 2: missing_seo_description lands on SEO editor

**Route:** `/projects/{projectId}/products/{productId}?tab=metadata&from=issues_engine&issueId=missing_seo_description&fixAnchor=seo-editor-anchor`

1. Navigate to a product with `missing_seo_description` issue context
2. **Verify:**
   - [ ] SEO editor (`data-testid="seo-editor-anchor"`) is visible
   - [ ] "Fix surface not available" message is NOT shown
   - [ ] User can immediately edit the SEO description field

---

### Scenario 3: missing_metadata lands on SEO editor

**Route:** `/projects/{projectId}/products/{productId}?tab=metadata&from=issues_engine&issueId=missing_metadata&fixAnchor=seo-editor-anchor`

1. Navigate to a product with `missing_metadata` issue context
2. **Verify:**
   - [ ] SEO editor (`data-testid="seo-editor-anchor"`) is visible
   - [ ] "Fix surface not available" message is NOT shown
   - [ ] Issue fix banner shows "Add the missing metadata below"

---

### Scenario 4: weak_title lands on SEO editor

**Route:** `/projects/{projectId}/products/{productId}?tab=metadata&from=issues_engine&issueId=weak_title&fixAnchor=seo-editor-anchor`

1. Navigate to a product with `weak_title` issue context
2. **Verify:**
   - [ ] SEO editor is visible
   - [ ] Issue fix banner shows "Improve the SEO title below"
   - [ ] "Fix surface not available" is NOT shown

---

### Scenario 5: weak_description lands on SEO editor

**Route:** `/projects/{projectId}/products/{productId}?tab=metadata&from=issues_engine&issueId=weak_description&fixAnchor=seo-editor-anchor`

1. Navigate to a product with `weak_description` issue context
2. **Verify:**
   - [ ] SEO editor is visible
   - [ ] Issue fix banner shows "Improve the SEO description below"
   - [ ] "Fix surface not available" is NOT shown

---

## Critical Invariants

1. **Metadata issues NEVER show "Fix surface not available"** - All use `seo-editor-anchor` which exists in DOM
2. **Fix language remains "fix" (EDIT)** - No fixKind reclassification (these are not DIAGNOSTIC)
3. **highlightTarget matches fixAnchorTestId** - Both are `seo-editor-anchor` for consistency

---

## Test Coverage

- Playwright E2E: `apps/web/tests/view-affected-routing-1.spec.ts`
  - MMFSI1-001: [AUDIT-1] App-generated metadata issue link includes correct anchor (real-link assertion, not direct URL)
  - MMFSI1-002: missing_metadata issue uses seo-editor-anchor (explicit fixAnchor URL assertion)

---

## Notes

- The `seo-editor-anchor` testid is defined in the Metadata tab component
- Scroll and highlight behavior depends on the `fixAnchor` URL param
- The fix path is derived from `ISSUE_FIX_PATH_MAP` in `issue-to-fix-path.ts`
- No changes were made to the routing contract (no new URL params)
