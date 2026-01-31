# TODO: Full E2E Suite Green

**Current Status:** 112 passed / 271 failed / 3 skipped (386 total)
**Smoke Tests:** All 10 passing ✓
**Last Run:** January 31, 2026

---

## Executive Summary

The smoke tests (10 critical user journeys) are all green and serve as the merge gate. The remaining 271 failing tests fall into several categories that need systematic attention.

---

## Category 1: Missing Testkit Seeding Endpoints (High Priority)

Many tests fail because they expect specific data states that aren't being seeded. The testkit controller needs additional endpoints.

### Action Items

- [ ] **Add `seed-product-with-draft` endpoint**
  - Used by: `draft-clarity-and-action-trust-1.spec.ts`, `draft-diff-clarity-1.spec.ts`, `draft-field-coverage-1.spec.ts`
  - Returns: `{ projectId, productId, accessToken }` with a product that has an unsaved draft

- [ ] **Add `seed-product-with-saved-draft` endpoint**
  - Used by: `apply-action-governance-1.spec.ts`, `draft-list-parity-1.spec.ts`
  - Returns: Product with draft in SAVED state ready to apply

- [ ] **Add `seed-product-with-ai-suggestion` endpoint**
  - Used by: `ai-advisory-only.spec.ts`, `draft-ai-entrypoint-clarity-1.spec.ts`
  - Returns: Product with AI-generated suggestion available

- [ ] **Add `seed-pages-with-drafts` endpoint**
  - Used by: `draft-field-coverage-1.spec.ts`, `draft-list-parity-1.spec.ts`, `assets-pages-1-1.spec.ts`
  - Returns: Pages asset with draft state

- [ ] **Add `seed-collections-with-drafts` endpoint**
  - Used by: `draft-field-coverage-1.spec.ts`, `draft-list-parity-1.spec.ts`
  - Returns: Collections asset with draft state

- [ ] **Add `seed-playbook-with-preview` endpoint**
  - Used by: `automation-entry-1.spec.ts`, `automation-playbook-concepts.spec.ts`, `trust-routing-1.spec.ts`
  - Returns: Project with playbook in preview-ready state

- [ ] **Add `seed-multi-user-project` endpoint**
  - Used by: `roles-2.spec.ts`, `roles-3.spec.ts`
  - Returns: Project with OWNER, EDITOR, and VIEWER users

- [ ] **Add `seed-blocked-product` endpoint**
  - Used by: `error-blocked-state-ux-1.spec.ts`, `list-actions-clarity-1.spec.ts`
  - Returns: Product in blocked state (e.g., pending approval)

- [ ] **Add `seed-governance-enabled-project` endpoint**
  - Used by: `apply-action-governance-1.spec.ts`, `governance-viewer.spec.ts`
  - Returns: Project with governance/approval workflow enabled

- [ ] **Add `seed-blog-posts` endpoint**
  - Used by: `blogs-asset-sync-coverage-1.spec.ts`
  - Returns: Project with synced blog articles

---

## Category 2: Timeout Issues (Medium Priority)

Tests timing out at 30s waiting for elements. These need investigation for:
1. Missing API responses in E2E mode
2. UI components not rendering
3. Incorrect selectors

### Affected Test Files

- [ ] `auth-security.spec.ts` - 3 tests timing out on signup URL sanitization
- [ ] `automation-playbook-concepts.spec.ts` - 4 tests timing out on automation panel
- [ ] `dashboard-signal-rewrite-1.spec.ts` - 1 test timing out on keyboard accessibility
- [ ] `enterprise-geo-1.spec.ts` - 1 test timing out on governance settings
- [ ] `roles-2.spec.ts` - 8 tests timing out on role-based UI
- [ ] `roles-3.spec.ts` - 9 tests timing out on multi-user workflows
- [ ] `self-service-1.spec.ts` - 10 tests timing out on settings pages

### Investigation Steps

1. Run individual test with `--debug` flag to see where it stalls
2. Check if required API endpoint is E2E-aware
3. Verify selector matches current UI implementation
4. Consider increasing timeout for legitimately slow operations

---

## Category 3: Selector Mismatches (Medium Priority)

Tests failing because selectors don't match current UI. Common patterns:

### Action Items

- [ ] **Review button text changes**
  - "Apply" vs "Apply to Shopify" vs "Apply changes"
  - "Generate" vs "Generate preview" vs "Generate suggestions"
  - "Save" vs "Save draft" vs "Save changes"

- [ ] **Review chip/badge text changes**
  - Status chips: "Optimized", "Needs attention", "Draft saved", "Blocked"
  - Role labels: "Project Owner", "Editor", "Viewer"

- [ ] **Review heading text changes**
  - Page headings may have changed case or wording

- [ ] **Add data-testid attributes** where stable selectors are needed
  - Priority areas: buttons with dynamic text, status indicators, navigation elements

---

## Category 4: Feature-Specific Fixes (Lower Priority)

### First DEO Win Flow (`first-deo-win.spec.ts`)

- [ ] **TEST-2 happy path** - Seed data doesn't match expected crawl/review/optimize flow
- [ ] **AUTO-PB-1.1** - Per-item results after apply not rendering
- [ ] **AUTO-PB-1.2** - Zero-eligibility state guardrails

### Count Integrity (`count-integrity-1*.spec.ts`)

- [ ] **CANON-004** - byPillar breakdown API response format
- [ ] **CANON-010** - affectedItemsCount for collections beyond cap

### Route Integrity (`route-integrity-1.spec.ts`)

- [ ] Store Health → Issues Engine routing with scope banner
- [ ] Products list filter preservation on back navigation
- [ ] Work Queue → Playbooks → Back navigation

### View Affected Routing (`view-affected-routing-1.spec.ts`)

- [ ] issueType filter on Products list
- [ ] ScopeBanner with issueType chip
- [ ] Back navigation to Issues Engine

### Keyboard/Focus (`keyboard-focus-integrity-1.spec.ts`)

- [ ] Enter key activation in command palette
- [ ] Theme dropdown selection
- [ ] Tab order through form fields
- [ ] Focus trap prevention

---

## Category 5: Feature Not Implemented Yet

Some tests may be for features not yet fully implemented:

- [ ] **Billing upgrade flow** (`billing-gtm-1.smoke.spec.ts`) - Requires Stripe test mode
- [ ] **Blog posts sync** (`blogs-asset-sync-coverage-1.spec.ts`) - May need feature flag
- [ ] **Automation safety rails** (`automation-safety-rails-1.spec.ts`) - Guard conditions

---

## Implementation Plan

### Phase 1: Seeding Infrastructure (Est. 2-3 days)
1. Implement missing testkit endpoints in `e2e-testkit.controller.ts`
2. Add proper cleanup between test runs
3. Ensure all endpoints return consistent response shapes

### Phase 2: Timeout Investigation (Est. 1-2 days)
1. Run failing tests individually with `--debug`
2. Add missing E2E mode handlers to API endpoints
3. Increase specific timeouts where justified

### Phase 3: Selector Updates (Est. 1-2 days)
1. Audit button/chip/heading text across failing tests
2. Add data-testid attributes for stability
3. Update selectors to match current UI

### Phase 4: Feature Tests (Est. 2-3 days)
1. Fix first-deo-win flow tests
2. Fix count integrity tests
3. Fix routing tests

---

## Quick Wins (Can Fix Now)

These tests likely just need minor selector fixes:

1. **`nav-ia-consistency-1.spec.ts`** - account dropdown labels (2 tests)
2. **`products-list-2-0.smoke.spec.ts`** - navigation to product detail (1 test)
3. **`scope-clarity-1.spec.ts`** - pillar chip rendering (3 tests)
4. **`shopify-integration-lifecycle-integrity-1.spec.ts`** - disconnect flow (4 tests)

---

## Testing Commands

```bash
# Run all E2E tests
pnpm --filter web test:e2e

# Run specific test file
pnpm --filter web test:e2e tests/e2e/first-deo-win.spec.ts

# Run with debug mode
pnpm --filter web test:e2e --debug

# Run with UI mode (interactive)
pnpm --filter web test:e2e:ui

# Run only smoke tests (merge gate)
pnpm --filter web test:e2e:smoke
```

---

## Success Metrics

| Milestone | Target | Current |
|-----------|--------|---------|
| Smoke tests green | 10/10 | 10/10 ✓ |
| Core flows green | 50% | 29% |
| Full suite green | 100% | 29% |

---

## Files to Modify

| File | Purpose |
|------|---------|
| `apps/api/src/testkit/e2e-testkit.controller.ts` | Add new seeding endpoints |
| `apps/web/tests/e2e/*.spec.ts` | Update selectors and assertions |
| Various UI components | Add data-testid attributes |

---

## Notes

- The smoke tests are the **merge gate** - keep those green
- Other tests are aspirational until infrastructure is complete
- Consider marking WIP tests as `test.skip()` with TODO comments
- Run `pnpm test:e2e:smoke` before every PR merge
