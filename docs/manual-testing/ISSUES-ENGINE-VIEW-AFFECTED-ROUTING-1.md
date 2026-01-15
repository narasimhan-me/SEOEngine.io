# Manual Testing: ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1

> "View affected" routes to filtered Products list

## Overview

This phase ensures that clicking "View affected" on an issue card in the Issues Engine routes users to the Products list (filtered by issue type), rather than a single product detail page. This provides a better UX for multi-product issues and enables server-authoritative filtering.

## Prerequisites

- Access to a project with detected issues
- Products with multi-product issues (e.g., `missing_metadata` / "Missing titles or descriptions" affecting multiple products)
- Or use existing seed: `POST /testkit/e2e/seed-first-deo-win`

---

## Key Behavior Changes

| Before | After |
|--------|-------|
| "View affected" → Product detail (first affected product) | "View affected" → Products list filtered by issueType |
| No issueType URL param | issueType param enables server-authoritative filtering |
| returnTo often missing | returnTo always present for back navigation |

---

## Test Scenarios

### Scenario 1: View affected routes to Products list

**Route:** `/projects/{projectId}/issues`

1. Navigate to the Issues Engine
2. Locate an issue card with "View affected" CTA
3. Click "View affected"
4. **Verify:**
   - [ ] Browser navigates to `/projects/{projectId}/products`
   - [ ] URL does NOT contain a product ID (not `/products/{productId}`)
   - [ ] URL contains `issueType={issueKey}` param
   - [ ] URL contains `from=issues_engine` param
   - [ ] URL contains `returnTo=` param (encoded Issues Engine URL)

---

### Scenario 2: ScopeBanner shows issueType chip

**Route:** `/projects/{projectId}/products?issueType=missing_seo_title&from=issues_engine`

1. Navigate to Products list with issueType filter (via View affected or direct URL)
2. **Verify:**
   - [ ] ScopeBanner (`data-testid="scope-banner"`) is visible
   - [ ] Issue Type chip is shown (`data-scope-chip-type="issueType"`)
   - [ ] Chip displays human-readable issue name

---

### Scenario 3: Server-authoritative issueType filtering

**Route:** `/projects/{projectId}/products?issueType=missing_seo_title&from=issues_engine`

1. Navigate to Products list filtered by `issueType=missing_seo_title`
2. **Verify:**
   - [ ] Only products affected by `missing_seo_title` are shown
   - [ ] Products with complete SEO metadata are NOT shown
   - [ ] Product 4 (DIAGNOSTIC test product with complete SEO) is NOT in the list

---

### Scenario 4: Back navigation returns to Issues Engine

**Route:** `/projects/{projectId}/products?issueType=missing_seo_title&from=issues_engine&returnTo={encodedIssuesUrl}`

1. Navigate to Products list from Issues Engine "View affected"
2. Click the "Back" link in the ScopeBanner
3. **Verify:**
   - [ ] Browser navigates back to Issues Engine
   - [ ] Original pillar and mode filters are preserved in URL
   - [ ] Issues list is still filtered correctly

---

### Scenario 5: Clear filters removes issueType

**Route:** `/projects/{projectId}/products?issueType=missing_seo_title&from=issues_engine`

1. Navigate to filtered Products list
2. Click "Clear filters" button (in filtered empty state or controls)
3. **Verify:**
   - [ ] URL no longer contains `issueType=` param
   - [ ] `from` and `returnTo` params are preserved
   - [ ] All products are now shown (unfiltered)

---

## Critical Invariants

1. **"View affected" NEVER routes to product detail** - Always routes to Products list
2. **issueType filtering is server-authoritative** - Products API filters by affected products, not client-side
3. **returnTo is always present** - Enables reliable back navigation to Issues Engine
4. **from=issues_engine identifies origin** - ScopeBanner uses this for display and back link
5. **Secondary "View affected →" in IssuesList also routes correctly** - The secondary link inside expanded affected-items sections (IssuesList details) routes to filtered Products list with `issueType=…` and preserves `from` + `returnTo` params

---

## Test Coverage

- Playwright E2E: `apps/web/tests/view-affected-routing-1.spec.ts`
  - VAR1-001: View affected routes to Products list with issueType filter (deterministic targeting, no conditional skip)
  - VAR1-002: Products list shows ScopeBanner with issueType chip
  - VAR1-003: issueType filtering excludes non-affected products (asserts non-empty list)
  - VAR1-004: [AUDIT-1] Back returns to Issues Engine with same filters
  - ILVAC1-001: [ISSUESLIST-VIEW-AFFECTED-CONTEXT-1] Secondary "View affected →" link in IssuesList details preserves issueType + from + returnTo

---

## Notes

- The `issueType` filter uses canonical DEO issues from `getIssuesForProjectReadOnly()`
- If no matching issue is found, the Products list returns empty (deterministic result)
- Single-product issues with specific fix types (aiFix, manualFix) still route to product detail
- Multi-product issues (count > 1 without primaryProductId) always use "View affected"
