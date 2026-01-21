# Manual Testing: SEARCH-INTENT-1 (Query Coverage & Intent Gaps)

## Overview

This document provides manual testing procedures for the Search & Intent pillar implementation (SEARCH-INTENT-1).

**Related Documentation:**

- [SEARCH_INTENT_PILLAR.md](../SEARCH_INTENT_PILLAR.md) — Pillar reference
- [DEO_INFORMATION_ARCHITECTURE.md](../DEO_INFORMATION_ARCHITECTURE.md) — IA and UX contracts

---

## Prerequisites

1. Local development environment running (`pnpm dev`)
2. Redis server running locally
3. At least one project with Shopify products synced
4. User logged in with active account

---

## Test Scenarios

### 1. Search & Intent Pillar Activation

**Objective:** Verify the Search & Intent pillar is marked as active.

**Steps:**

1. Navigate to any project's DEO Overview page (`/projects/{id}/deo`)
2. Locate the "Search & Intent" pillar card

**Expected Results:**

- [ ] Pillar card does NOT show "Coming soon" badge
- [ ] Pillar card shows a coverage score (or "Not analyzed yet" if no data)
- [ ] "View issues" link is clickable

---

### 2. DEO Overview — Pillar Card

**Objective:** Verify Search & Intent pillar card displays correct data.

**Steps:**

1. Navigate to DEO Overview (`/projects/{id}/deo`)
2. Find the "Search & Intent" pillar card

**Expected Results:**

- [ ] Card shows "Search & Intent" or "Search & Intent Fit" label
- [ ] Score is displayed (0-100 or "--" if not computed)
- [ ] "Missing high-value intents" count is shown if applicable
- [ ] "Last updated" timestamp is displayed if data exists
- [ ] Clicking "View issues" navigates to Issues page with `?pillar=search_intent_fit`

---

### 3. Product Search & Intent Tab

**Objective:** Verify product workspace has Search & Intent tab.

**Steps:**

1. Navigate to a product detail page (`/projects/{id}/products/{productId}`)
2. Look for tabs in the product workspace

**Expected Results:**

- [ ] "Search & Intent" tab is visible
- [ ] Clicking tab shows Search & Intent panel
- [ ] Deep-link `?focus=search-intent` selects this tab automatically

---

### 4. ProductSearchIntentPanel — Coverage Display

**Objective:** Verify coverage scorecard is displayed correctly.

**Steps:**

1. Navigate to a product's Search & Intent tab
2. Review the coverage scorecard section

**Expected Results:**

- [ ] Overall Intent Coverage Score (0-100) is displayed
- [ ] Per-intent-type breakdown shows coverage for each type
- [ ] "Missing high-value intents" count shows transactional/comparative gaps
- [ ] Status indicator shows "Good" or "Needs improvement"

---

### 5. ProductSearchIntentPanel — Issues List

**Objective:** Verify intent issues are displayed with correct metadata.

**Steps:**

1. Navigate to a product's Search & Intent tab
2. Scroll to the issues section

**Expected Results:**

- [ ] Each issue card shows intent type badge (Transactional, Comparative, etc.)
- [ ] Example queries are displayed for each issue
- [ ] Coverage status is shown (none/weak/partial)
- [ ] Recommended action is shown ("Add Answer Block", "Expand description", etc.)
- [ ] "Preview fix" button is visible for actionable issues

---

### 6. Preview Fix — AI Draft Generation

**Objective:** Verify preview generates AI draft correctly.

**Steps:**

1. Navigate to a product with missing intent coverage
2. Click "Preview fix" on an issue

**Expected Results:**

- [ ] Loading state is shown while AI generates
- [ ] Preview drawer/panel opens showing the draft
- [ ] Draft content is relevant to the issue (Answer Block or content snippet)
- [ ] "AI used" indicator is shown
- [ ] "Apply" and "Cancel" buttons are available

---

### 7. Preview Fix — CACHE/REUSE v2

**Objective:** Verify draft reuse works correctly.

**Steps:**

1. Click "Preview fix" on an issue (first time)
2. Note the "AI used" indicator
3. Cancel the preview
4. Click "Preview fix" on the SAME issue again

**Expected Results:**

- [ ] Second preview loads faster (cached)
- [ ] "No AI used (reused draft)" indicator is shown
- [ ] Draft content is identical to first preview
- [ ] AI quota was NOT decremented for reused preview

---

### 8. Apply Fix — Answer Block Target

**Objective:** Verify applying a fix creates an Answer Block.

**Steps:**

1. Preview a fix for a missing intent
2. Click "Apply" with Answer Block target selected

**Expected Results:**

- [ ] No loading indicator for AI (apply doesn't call AI)
- [ ] Success toast/message is shown
- [ ] Answer Block is created for the product
- [ ] Coverage is refreshed and shows improvement
- [ ] Related issue is removed or downgraded

---

### 9. Apply Fix — Content Snippet Target

**Objective:** Verify applying a fix as content snippet works.

**Steps:**

1. Preview a fix for a missing intent
2. Select "Content snippet" as target (if available)
3. Click "Apply"

**Expected Results:**

- [ ] Success message is shown
- [ ] Content is stored locally (not synced externally)
- [ ] Coverage may improve based on content analysis

---

### 10. Issues Engine — Pillar Filtering

**Objective:** Verify Search & Intent issues appear in Issues Engine.

**Steps:**

1. Navigate to Issues page (`/projects/{id}/issues`)
2. Click the "Search & Intent" pillar filter button

**Expected Results:**

- [ ] URL updates to `?pillar=search_intent_fit`
- [ ] Only Search & Intent issues are shown
- [ ] Issue count in pillar button matches displayed issues
- [ ] Clicking "All pillars" clears the filter

---

### 11. Issues Engine — Intent Issue Rendering

**Objective:** Verify intent issues display correctly in Issues Engine.

**Steps:**

1. Navigate to Issues page with Search & Intent filter active
2. Review the issue cards

**Expected Results:**

- [ ] Each issue shows intent type badge
- [ ] Example queries are displayed
- [ ] "Fix" link deep-links to product's Search & Intent tab
- [ ] Severity badge is shown (Critical for transactional/comparative)

---

### 12. Keywords Page — Search & Intent Workspace

**Objective:** Verify Keywords page shows Search & Intent overview.

**Steps:**

1. Navigate to Keywords page (`/projects/{id}/keywords`)

**Expected Results:**

- [ ] Page title references "Search & Intent" (not just "Keywords")
- [ ] Project-level summary card shows average coverage
- [ ] Top products with gaps are highlighted
- [ ] Products table shows:
  - [ ] Product name
  - [ ] Intent coverage score
  - [ ] Missing high-value intents count
  - [ ] Status chip ("Good" / "Needs improvement")
  - [ ] "View details" link to product workspace

---

### 13. ProductRow — Intent Badge

**Objective:** Verify products list shows intent coverage badge.

**Steps:**

1. Navigate to Products page (`/projects/{id}/products`)
2. Look at product rows

**Expected Results:**

- [ ] Each product row has Search & Intent badge (if data exists)
- [ ] Badge shows "Intent coverage: Good" or "Intent coverage: Needs work"
- [ ] Badge is visually distinct from metadata status chip
- [ ] Clicking badge navigates to product's Search & Intent tab

---

### 14. AI Usage Quotas

**Objective:** Verify quota enforcement on preview (not apply).

**Steps:**

1. Note current AI usage in account settings
2. Click "Preview fix" on an issue (new, not cached)
3. Check AI usage after preview
4. Click "Apply" on the previewed fix
5. Check AI usage after apply

**Expected Results:**

- [ ] Quota decremented after preview
- [ ] Quota NOT decremented after apply
- [ ] If quota exhausted, preview shows limit-reached message

---

### 15. Verify Flow — Issue Resolution

**Objective:** Verify issues are resolved after applying fixes.

**Steps:**

1. Note an issue for a specific product (e.g., "missing_transactional_intent")
2. Preview and apply a fix for that issue
3. Refresh the Search & Intent tab
4. Navigate to Issues page with Search & Intent filter

**Expected Results:**

- [ ] Issue count for the product decreased
- [ ] Specific issue is removed or severity reduced
- [ ] DEO Overview pillar card shows updated score
- [ ] Coverage status improved in product's Search & Intent tab

---

## Edge Cases

### E1. Product with No Content

**Steps:**

1. Find a product with minimal content (no description, no Answer Blocks)
2. View its Search & Intent tab

**Expected Results:**

- [ ] All intent types show "none" coverage
- [ ] Multiple issues are generated
- [ ] Transactional/comparative issues have "critical" severity

---

### E2. Product with Full Coverage

**Steps:**

1. Find a product with rich content and Answer Blocks
2. View its Search & Intent tab

**Expected Results:**

- [ ] Most/all intent types show "covered" or "partial"
- [ ] Few or no issues are generated
- [ ] Status shows "Good"

---

### E3. Draft Expiry

**Steps:**

1. Preview a fix
2. Wait for draft expiry (if configured with short TTL for testing)
3. Preview the same fix again

**Expected Results:**

- [ ] Second preview regenerates the draft
- [ ] "AI used" indicator is shown
- [ ] Quota is decremented

---

## Regression Checks

After implementing SEARCH-INTENT-1, verify these existing features still work:

- [ ] DEO Overview loads without errors
- [ ] Other pillar cards (Metadata, Content, Technical) still display
- [ ] Issues Engine filters work for non-intent pillars
- [ ] Product workspace other tabs (Metadata, DEO Insights) still work
- [ ] Answer Block creation/editing still works
- [ ] AI quota tracking for other features still works

---

## Regression & CI (Automated Tests)

The following automated tests cover the SEARCH-INTENT-1 feature. **Failures in these tests are treated as blocking for SEARCH-INTENT-1 regressions.**

### Unit Tests (Jest)

- `apps/api/src/projects/search-intent.service.spec.ts`
  - Coverage score computation (weighted average)
  - Issue generation (missing/weak queries)
  - Score threshold logic (none/weak/partial/covered)
  - High-value intent detection (transactional/comparative)

### Integration Tests (Jest)

- `apps/api/src/projects/search-intent.controller.spec.ts`
  - `GET /products/:productId/search-intent` — Returns coverage data
  - `POST /products/:productId/search-intent/preview` — Generates draft with AI
  - `POST /products/:productId/search-intent/apply` — Applies draft without AI
  - `GET /projects/:projectId/search-intent/summary` — Project-level scorecard

### E2E Tests (Playwright)

- `apps/web/e2e/search-intent.spec.ts`
  - Product Search & Intent tab navigation
  - Preview fix flow (UI states)
  - Apply fix flow and coverage refresh
  - Keywords page scorecard display

### Running Tests

```bash
# Unit + Integration tests (API)
pnpm --filter api test -- --testPathPattern=search-intent

# E2E tests (Web)
pnpm --filter web test:e2e -- --grep "search-intent"
```

### CI Pipeline

Tests run automatically on:

- Pull requests targeting `main` or `develop`
- Merge commits to `main`

**Note:** If E2E tests are not yet implemented, the manual testing checklist above serves as the acceptance criteria until automation is in place.

---

## Known Limitations

1. Coverage computation is heuristic-based, not using external SEO APIs
2. Drafts expire after configured TTL (default 24h)
3. Content snippets are stored locally, not synced to Shopify
4. Search Console data integration is optional and may not be available
