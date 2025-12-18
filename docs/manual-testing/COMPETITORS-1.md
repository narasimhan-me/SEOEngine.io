# Manual Testing: COMPETITORS-1 (Competitive Coverage & Differentiation Gaps)

## Overview

This document provides manual testing procedures for the Competitive Positioning pillar implementation (COMPETITORS-1).

**Related Documentation:**
- [COMPETITORS_PILLAR.md](../COMPETITORS_PILLAR.md) — Pillar reference
- [DEO_INFORMATION_ARCHITECTURE.md](../DEO_INFORMATION_ARCHITECTURE.md) — IA and UX contracts
- [SEARCH-INTENT-1.md](./SEARCH-INTENT-1.md) — Search Intent testing (dependency)

---

## Prerequisites

1. Local development environment running (`pnpm dev`)
2. Redis server running locally
3. At least one project with Shopify products synced
4. User logged in with active account
5. SEARCH-INTENT-1 features must be working (competitive analysis reuses intent coverage)

---

## Test Scenarios

### 1. Competitive Positioning Pillar Activation

**Objective:** Verify the Competitive Positioning pillar is marked as active.

**Steps:**
1. Navigate to any project's DEO Overview page (`/projects/{id}/deo`)
2. Locate the "Competitive Positioning" pillar card

**Expected Results:**
- [ ] Pillar card does NOT show "Coming soon" badge
- [ ] Pillar card shows a competitive score (or "Not analyzed yet" if no data)
- [ ] "View issues" link is clickable

---

### 2. DEO Overview — Pillar Card

**Objective:** Verify Competitive Positioning pillar card displays correct data.

**Steps:**
1. Navigate to DEO Overview (`/projects/{id}/deo`)
2. Find the "Competitive Positioning" pillar card

**Expected Results:**
- [ ] Card shows "Competitive Positioning" label
- [ ] Score is displayed (0-100 or "--" if not computed)
- [ ] Status classification is shown (Ahead / On Par / Behind)
- [ ] "X products behind on high-impact areas" count is shown if applicable
- [ ] "Last updated" timestamp is displayed if data exists
- [ ] Clicking "View issues" navigates to Issues page with `?pillar=competitive_positioning`

---

### 3. Product Competitors Tab

**Objective:** Verify product workspace has Competitors tab.

**Steps:**
1. Navigate to a product detail page (`/projects/{id}/products/{productId}`)
2. Look for tabs in the product workspace

**Expected Results:**
- [ ] "Competitors" tab is visible
- [ ] Clicking tab shows Competitors panel
- [ ] Deep-link `?focus=competitors` selects this tab automatically

---

### 4. ProductCompetitorsPanel — Scorecard Display

**Objective:** Verify competitive scorecard is displayed correctly.

**Steps:**
1. Navigate to a product's Competitors tab
2. Review the scorecard section

**Expected Results:**
- [ ] Overall Competitive Coverage Score (0-100) is displayed
- [ ] Status classification shown (Ahead / On Par / Behind)
- [ ] "X areas where competitors lead" summary if applicable
- [ ] Competitor references list (up to 3) is shown when configured
- [ ] If no competitors configured, shows "Competitor data not configured yet" message

---

### 5. ProductCompetitorsPanel — Gap Cards

**Objective:** Verify competitive gaps are displayed with correct metadata.

**Steps:**
1. Navigate to a product's Competitors tab
2. Scroll to the gaps section

**Expected Results:**
- [ ] Each gap card shows gap type badge (Intent / Section / Trust)
- [ ] Example scenario is displayed (e.g., "Similar products answer 'Is this good for beginners?' — your page does not")
- [ ] "Why this matters" text explains discovery/conversion impact
- [ ] Competitor count is shown (how many competitors cover this area)
- [ ] Intent type badge shown for intent gaps
- [ ] Recommended action is shown (Answer Block / comparison section / etc.)
- [ ] "Preview competitive fix" button is visible for actionable gaps

---

### 6. Preview Fix — AI Draft Generation

**Objective:** Verify preview generates AI draft correctly.

**Steps:**
1. Navigate to a product with competitive gaps
2. Click "Preview competitive fix" on a gap

**Expected Results:**
- [ ] Loading state is shown while AI generates
- [ ] Preview drawer/panel opens showing the draft
- [ ] Draft content is relevant to the gap (Answer Block or comparison copy)
- [ ] Content uses neutral positioning language (no specific competitor mentions)
- [ ] "AI used" indicator is shown
- [ ] "Apply" and "Cancel" buttons are available

---

### 7. Preview Fix — CACHE/REUSE v2

**Objective:** Verify draft reuse works correctly.

**Steps:**
1. Click "Preview competitive fix" on a gap (first time)
2. Note the "AI used" indicator
3. Cancel the preview
4. Click "Preview competitive fix" on the SAME gap again

**Expected Results:**
- [ ] Second preview loads faster (cached)
- [ ] "No AI used (reused draft)" indicator is shown
- [ ] Draft content is identical to first preview
- [ ] AI quota was NOT decremented for reused preview

---

### 8. Apply Fix — Answer Block Target

**Objective:** Verify applying a fix creates an Answer Block.

**Steps:**
1. Preview a fix for a competitive gap
2. Click "Apply" with Answer Block target selected

**Expected Results:**
- [ ] No loading indicator for AI (apply doesn't call AI)
- [ ] Success toast/message is shown
- [ ] Answer Block is created for the product
- [ ] Coverage is refreshed and shows improvement
- [ ] Related gap is removed or downgraded

---

### 9. Apply Fix — Content Section Target

**Objective:** Verify applying a fix as content section works.

**Steps:**
1. Preview a fix for a competitive gap
2. Select "Content section" as target (if available)
3. Click "Apply"

**Expected Results:**
- [ ] Success message is shown
- [ ] Content is stored in designated product content field
- [ ] Coverage may improve based on content analysis

---

### 10. Issues Engine — Pillar Filtering

**Objective:** Verify competitive issues appear in Issues Engine.

**Steps:**
1. Navigate to Issues page (`/projects/{id}/issues`)
2. Click the "Competitive Positioning" pillar filter button

**Expected Results:**
- [ ] URL updates to `?pillar=competitive_positioning`
- [ ] Only competitive issues are shown
- [ ] Issue count in pillar button matches displayed issues
- [ ] Clicking "All pillars" clears the filter

---

### 11. Issues Engine — Competitive Issue Rendering

**Objective:** Verify competitive issues display correctly in Issues Engine.

**Steps:**
1. Navigate to Issues page with Competitive Positioning filter active
2. Review the issue cards

**Expected Results:**
- [ ] Each issue shows gap type badge (Intent / Section / Trust)
- [ ] Competitor count is displayed
- [ ] Intent type shown for intent gaps
- [ ] "Fix" link deep-links to product's Competitors tab
- [ ] Severity badge reflects competitor count and gap importance

---

### 12. Competitors Workspace Page

**Objective:** Verify Competitors workspace shows project-level overview.

**Steps:**
1. Navigate to Competitors page (`/projects/{id}/competitors`)

**Expected Results:**
- [ ] Page title shows "Competitive Positioning"
- [ ] Short description explains ethical, heuristic-based analysis
- [ ] Project-level scorecard card shows:
  - [ ] Overall competitive score
  - [ ] Status (Ahead / On Par / Behind)
  - [ ] Count of products behind on high-impact areas
- [ ] Products table shows:
  - [ ] Product title
  - [ ] Competitive status indicator
  - [ ] Gap count
  - [ ] "View gaps" link to product Competitors tab
- [ ] "Ethical boundaries" section is present explaining no scraping/copying

---

### 13. Products List — Competitive Status Pill

**Objective:** Verify products list shows competitive status indicator.

**Steps:**
1. Navigate to Products page (`/projects/{id}/products`)
2. Look at product rows

**Expected Results:**
- [ ] Each product row has Competitive status pill (if data exists)
- [ ] Pill shows "Ahead", "On Par", or "Behind"
- [ ] Pill is visually distinct from metadata status and DEO issues badge
- [ ] Clicking pill navigates to product's Competitors tab

---

### 14. AI Usage Quotas

**Objective:** Verify quota enforcement on preview (not apply).

**Steps:**
1. Note current AI usage in account settings
2. Click "Preview competitive fix" on a gap (new, not cached)
3. Check AI usage after preview
4. Click "Apply" on the previewed fix
5. Check AI usage after apply

**Expected Results:**
- [ ] Quota decremented after preview
- [ ] Quota NOT decremented after apply
- [ ] If quota exhausted, preview shows limit-reached message

---

### 15. Verify Flow — Gap Resolution

**Objective:** Verify gaps are resolved after applying fixes.

**Steps:**
1. Note a competitive gap for a specific product
2. Preview and apply a fix for that gap
3. Refresh the Competitors tab
4. Navigate to Issues page with Competitive Positioning filter

**Expected Results:**
- [ ] Gap count for the product decreased
- [ ] Specific gap is removed or severity reduced
- [ ] DEO Overview pillar card shows updated score
- [ ] Competitive status may improve (e.g., "Behind" to "On Par")

---

## Edge Cases

### E1. Product with No Content

**Steps:**
1. Find a product with minimal content (no description, no Answer Blocks)
2. View its Competitors tab

**Expected Results:**
- [ ] Status shows "Behind"
- [ ] Multiple gaps are generated across all categories
- [ ] Intent gaps for high-value intents have higher severity

---

### E2. Product with Full Coverage

**Steps:**
1. Find a product with rich content, Answer Blocks, and good intent coverage
2. View its Competitors tab

**Expected Results:**
- [ ] Status shows "Ahead" or "On Par"
- [ ] Few or no gaps are generated
- [ ] Score is 70+

---

### E3. No Competitors Configured

**Steps:**
1. Find a product where no competitors are configured
2. View its Competitors tab

**Expected Results:**
- [ ] Shows "Competitor data not configured yet" or similar message
- [ ] Analysis still works using industry baseline assumptions
- [ ] Gaps based on heuristic coverage expectations

---

### E4. Draft Expiry

**Steps:**
1. Preview a competitive fix
2. Wait for draft expiry (if configured with short TTL for testing)
3. Preview the same fix again

**Expected Results:**
- [ ] Second preview regenerates the draft
- [ ] "AI used" indicator is shown
- [ ] Quota is decremented

---

## Regression Checks

After implementing COMPETITORS-1, verify these existing features still work:

- [ ] DEO Overview loads without errors
- [ ] Other pillar cards (Search Intent, Metadata, Content, Technical) still display
- [ ] Issues Engine filters work for non-competitive pillars
- [ ] Product workspace other tabs (Search Intent, Metadata, DEO Insights) still work
- [ ] Answer Block creation/editing from other flows still works
- [ ] AI quota tracking for Search Intent and other features still works
- [ ] SEARCH-INTENT-1 preview/apply flows still function correctly

---

## Regression & CI (Automated Tests)

The following automated tests cover the COMPETITORS-1 feature. **Failures in these tests are treated as blocking for COMPETITORS-1 regressions.**

### Unit Tests (Jest)
- `tests/unit/competitors/competitors-shared.test.ts`
  - Competitive scoring helper functions
  - Status classification (Ahead/On par/Behind thresholds)
  - Severity calculation based on competitor count and intent importance

- `tests/unit/competitors/competitors.service.test.ts`
  - Coverage scoring for various product states
  - Issue generation with correct pillarId, gapType, competitorCount
  - Status classification edge cases

### Integration Tests (Jest)
- `tests/integration/automation/competitors-fix.integration.test.ts`
  - `GET /products/:productId/competitors` — Returns competitive data
  - `POST /products/:productId/competitors/preview` — Generates draft with AI
  - `POST /products/:productId/competitors/apply` — Applies draft without AI
  - `GET /projects/:projectId/competitors/summary` — Project-level scorecard
  - CACHE/REUSE verification (draft reuse prevents duplicate AI calls)

### E2E Tests (Playwright)
- `tests/e2e/automation/competitors-flows.spec.ts`
  - Product Competitors tab navigation
  - Preview fix flow (UI states, AI used indicator)
  - Apply fix flow and coverage refresh
  - Competitors workspace scorecard display
  - Issue resolution after fix application

### Running Tests

```bash
# Unit + Integration tests (API)
pnpm --filter api test -- --testPathPattern=competitors

# E2E tests (Web)
pnpm --filter web test:e2e -- --grep "competitors"
```

### CI Pipeline

Tests run automatically on:
- Pull requests targeting `main` or `develop`
- Merge commits to `main`

**Note:** If E2E tests are not yet implemented, the manual testing checklist above serves as the acceptance criteria until automation is in place.

---

## Known Limitations

1. Competitor identification is heuristic-based (v1) — no actual competitor website analysis
2. Coverage analysis uses industry baseline assumptions, not scraped data
3. Drafts expire after configured TTL (default 24h)
4. Max 3 competitors per product (enforced by application logic)
5. Content sections are stored locally, not synced to Shopify (same as SEARCH-INTENT-1)
6. No UI for merchant to configure competitors (v1 — seeded/heuristic only)
