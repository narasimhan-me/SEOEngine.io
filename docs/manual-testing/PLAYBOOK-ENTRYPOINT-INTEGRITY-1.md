# Manual Testing: PLAYBOOK-ENTRYPOINT-INTEGRITY-1

> Playbook Route Canonicalization & Banner Routing Guarantee

## Overview

This phase ensures playbook entrypoints route deterministically to the correct playbook based on eligibility counts, with canonical URL structure as the source of truth.

## Prerequisites

- Access to a project with connected Shopify store
- Products with SEO issues (missing titles and/or descriptions)
- Or use seed endpoint: `POST /testkit/e2e/seed-playbook-entrypoint-integrity-1`

---

## Canonical Route Shape

```
/projects/:projectId/playbooks/:playbookId?step=preview|estimate|apply&source=<entrypoint>
```

**Required Parameters:**
- `step`: Current workflow step (`preview`, `estimate`, or `apply`)
- `source`: Entrypoint identifier for analytics/context

**Valid Sources:**
| Source | Entrypoint |
|--------|------------|
| `banner` | Playbooks page banner CTA |
| `tile` | Playbooks page tile click |
| `work_queue` | Work Queue CTA |
| `products_list` | Products list View playbooks link |
| `next_deo_win` | Next DEO Win card CTA |
| `entry` | Entry wizard |
| `product_details` | Product details page |
| `default` | Deterministic default selection |

---

## Locked Routing Behavior (Do Not Modify Without Phase Approval)

| Entrypoint | Routes To |
|------------|-----------|
| Banner CTA | `/playbooks/:playbookId?step=preview&source=banner` |
| Tile click | `/playbooks/:playbookId?step=preview&source=tile` |
| Work Queue | `/playbooks/:playbookId?step=preview&source=work_queue` |

**Critical Invariants:**
- URL MUST contain the correct `playbookId` matching the CTA label
- Click MUST NOT trigger AI/preview side effects
- Stepper MUST be visible after navigation
- Zero-eligible empty state MUST NOT appear when eligibility > 0

---

## Test Scenarios

### Scenario 1: Banner CTA Routes to Correct Playbook

**Route:** `/projects/{projectId}/playbooks`

**Setup:** Seed data where descriptions eligibleCount > 0 AND titles eligibleCount = 0

1. Navigate to Playbooks page
2. Wait for banner to appear with "Preview missing SEO descriptions"
3. Click the banner CTA
4. **Verify:**
   - [ ] URL contains `/playbooks/missing_seo_description`
   - [ ] URL contains `step=preview`
   - [ ] URL contains `source=banner`
   - [ ] URL does NOT contain `missing_seo_title`
   - [ ] Stepper (`data-testid="playbooks-stepper"`) is visible
   - [ ] Zero-eligible empty state is NOT visible

---

### Scenario 1.1: Scoped entry (Products list / banner)

**Route (entry):** `/projects/{projectId}/playbooks?assetType=PRODUCTS&scopeAssetRefs={productId1}&scopeAssetRefs={productId2}` (also accepts comma-separated)

**Goal:** Banner eligibility + CTA landing view remain scope-consistent (no "No eligible items right now" unless scoped eligibility is 0).

1. Enter Playbooks from a scoped Products context (or use the URL above with 2 product IDs in scope).
2. Confirm the banner CTA label matches scoped eligibility (e.g., "Preview missing SEO descriptions" only if scoped descriptions eligibleCount > 0).
3. Click the banner CTA.
4. **Verify:**
   - [ ] URL contains `/playbooks/missing_seo_description` (or the playbook matching the CTA label)
   - [ ] URL contains `step=preview`
   - [ ] URL contains `source=banner`
   - [ ] URL contains `assetType=PRODUCTS`
   - [ ] URL preserves the same `scopeAssetRefs` values
   - [ ] URL includes repeated params: `scopeAssetRefs={id1}&scopeAssetRefs={id2}` (not a single comma-joined value)
   - [ ] Stepper is visible
   - [ ] "No eligible items right now" is NOT shown unless scoped eligibility is truly 0

---

### Scenario 1.2: Entry page CTA routes with explicit scope (NO AI required)

**Route:** `/projects/{projectId}/automation/playbooks/entry?source=products_bulk&intent=missing_metadata`

**Goal:** Entry page "Open Playbooks" CTA routes to Playbooks LIST which deterministically selects the correct playbook based on scoped eligibility.

**Setup:**
- Set up sessionStorage with `automationEntryContext:{projectId}` containing `selectedProductIds` array.
- Seed data where descriptions eligibleCount > 0 AND titles eligibleCount = 0 (for the scoped products).

1. Navigate to Entry page with `source=products_bulk` and `intent=missing_metadata`.
2. Ensure "Only selected products" radio is selected (should auto-select from context).
3. Click "Open Playbooks" button (`data-testid="automation-entry-open-playbooks"`).
   - **Note:** NO preview generation or enablement required.
4. **Verify:**
   - [ ] URL navigates to `/playbooks/missing_seo_description` (deterministic selection based on eligibility - descriptions > titles)
   - [ ] URL contains `step=preview`
   - [ ] URL contains `source=` (may be `default` after deterministic selection)
   - [ ] URL contains `assetType=PRODUCTS`
   - [ ] URL contains `scopeAssetRefs=` with the selected product IDs
   - [ ] Stepper is visible
   - [ ] Zero-eligible empty state is NOT visible

---

### Scenario 2: Tile Click Routes Canonically

**Route:** `/projects/{projectId}/playbooks`

1. Navigate to Playbooks page
2. Click a playbook tile (e.g., "Missing SEO Titles")
3. **Verify:**
   - [ ] URL contains `/playbooks/missing_seo_title`
   - [ ] URL contains `step=preview`
   - [ ] URL contains `source=tile`
   - [ ] Stepper is visible

---

### Scenario 3: Deterministic Default Selection

**Route:** `/projects/{projectId}/playbooks` (no playbookId in URL)

**Setup:** Both playbooks have eligible items

1. Navigate to Playbooks page with no playbookId
2. Wait for automatic default selection
3. **Verify:**
   - [ ] URL is updated to include a playbookId
   - [ ] URL contains `source=default`
   - [ ] Selected playbook has max eligibleCount
   - [ ] If tied, descriptions playbook is selected

---

### Scenario 4: Zero-Eligible Neutral State

**Route:** `/projects/{projectId}/playbooks`

**Setup:** All playbooks have eligibleCount = 0

1. Navigate to Playbooks page
2. **Verify:**
   - [ ] No automatic playbookId selection occurs
   - [ ] Tiles are visible and clickable
   - [ ] No "Generate" button in banner (banner should be neutral/informational)

---

### Scenario 5: Work Queue CTA Routes Canonically

**Route:** `/projects/{projectId}/work-queue`

1. Navigate to Work Queue
2. Find an AUTOMATION_RUN bundle
3. Click the CTA
4. **Verify:**
   - [ ] URL contains `/playbooks/:playbookId`
   - [ ] URL contains `step=preview`
   - [ ] URL contains `source=work_queue`

---

### Scenario 6: Banner CTA Does NOT Trigger AI

**Route:** `/projects/{projectId}/playbooks`

1. Navigate to Playbooks page
2. Open browser DevTools Network tab
3. Click the banner CTA
4. **Verify:**
   - [ ] No POST requests to `/suggest` or `/generate` endpoints
   - [ ] No AI preview automatically starts
   - [ ] Only navigation occurs (GET request to new URL)

---

## Routing Parity Verification

| Entrypoint | URL Contains playbookId | URL Contains step=preview | URL Contains source | No AI Side Effects |
|------------|-------------------------|---------------------------|---------------------|-------------------|
| Banner CTA | [ ] | [ ] | [ ] | [ ] |
| Tile click | [ ] | [ ] | [ ] | [ ] |
| Work Queue | [ ] | [ ] | [ ] | [ ] |
| Products list | [ ] | [ ] | [ ] | [ ] |
| Entry page (Open Playbooks CTA) | [ ] | [ ] | [ ] | [ ] (routing only, no AI dependency) |

---

## Seed Endpoint

For automated testing, use:

```
POST /testkit/e2e/seed-playbook-entrypoint-integrity-1
```

Returns:
- `user` with `id`, `email`
- `projectId` with connected Shopify store
- `productIds` array
- `accessToken` for authentication
- `expectedTitlesEligible` (should be 0)
- `expectedDescriptionsEligible` (should be > 0)

---

## Notes

- Canonical routes use `/playbooks` (not legacy `/automation/playbooks`)
- The legacy `/automation` route redirects to `/playbooks`
- Route re-exports ensure both paths render the same component
- `buildPlaybookRunHref()` is the single source of truth for URL construction
- Estimate results only merge when `estimate.playbookId` matches current `playbookId` (prevents mismatch bugs)
