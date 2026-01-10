# ROUTE-INTEGRITY-1: Deterministic Deep Links + Scope Banner

## Manual Testing Checklist

This document provides step-by-step verification for the ROUTE-INTEGRITY-1 trust hardening feature.

---

## Prerequisites

- Logged in as OWNER or EDITOR role
- Project with products that have SEO issues
- Seeded test data via E2E testkit (optional, for consistency)

---

## Test 1: Store Health → Issues Engine → Back

### Steps

1. Navigate to `/projects/{id}/store-health`
2. Click the **Discoverability** health card
3. Verify you land on `/projects/{id}/issues` with URL params:
   - `from=store_health`
   - `returnTo=...` (encoded Store Health URL)
   - `pillar=metadata_snippet_quality`
   - `mode=detected`
4. Verify the **ScopeBanner** is visible with:
   - "Showing: Pillar: Metadata Snippet Quality"
   - "Source: Store Health"
5. Click the **Back** button in the ScopeBanner
6. Verify you return to `/projects/{id}/store-health`

### Clear Filters Test

1. Return to Issues Engine via Discoverability card
2. Click **Clear filters** in the ScopeBanner
3. Verify you land on `/projects/{id}/issues` with:
   - No `from` param
   - No `returnTo` param
   - No `pillar` param
4. Verify ScopeBanner is **not visible** (no `from` param)

---

## Test 2: Products List (with filter) → Fix Next → Back

### Steps

1. Navigate to `/projects/{id}/products?q=Missing` (or apply a search filter)
2. Find a product row with "Needs attention" status
3. Click the **Fix next** action link
4. Verify destination URL contains:
   - `from=asset_list`
   - `returnTo=` (encoded URL includes `q=Missing`)
5. Verify the **ScopeBanner** is visible with:
   - "Showing: Product · {product title}"
   - "Source: Asset list"
6. Click the **Back** button in the ScopeBanner
7. Verify you return to `/projects/{id}/products?q=Missing` with filter preserved

### Verify returnTo Encoding

1. Check that the `returnTo` param properly encodes the original filter URL
2. When clicking Back, the exact filter state should be restored

---

## Test 3: Work Queue → Playbooks → Back

### Steps

1. Navigate to `/projects/{id}/work-queue`
2. Find an action bundle card with a CTA linking to Playbooks
3. Click the playbooks link
4. Verify destination URL contains:
   - `from=work_queue`
   - `returnTo=...` (encoded Work Queue URL)
5. Verify the **ScopeBanner** is visible with:
   - "Showing: {playbook name or Playbooks}"
   - "Source: Work Queue"
6. Click the **Back** button in the ScopeBanner
7. Verify you return to `/projects/{id}/work-queue`

### Clear Filters Test

1. Return to Playbooks via Work Queue
2. Click **Clear filters** in the ScopeBanner
3. Verify you land on `/projects/{id}/automation/playbooks` with:
   - No `from` param
   - No `returnTo` param
   - No `playbookId` param (if applicable)
4. Verify ScopeBanner is **not visible**

---

## Test 4: ScopeBanner Visibility Rules

### Banner Shows When

- URL contains `from=` param with valid context value
- Valid contexts: `store_health`, `work_queue`, `asset_list`, `issues_engine`, `playbook`, etc.

### Banner Hidden When

- No `from` param in URL
- Direct navigation to page (no origin context)

### Test Steps

1. Navigate directly to `/projects/{id}/issues` (no params)
2. Verify ScopeBanner is **not visible**
3. Navigate to `/projects/{id}/issues?from=store_health&returnTo=...`
4. Verify ScopeBanner **is visible**

---

## ScopeBanner Test Hooks

For E2E test automation, verify these `data-testid` attributes:

| Element | Test ID |
|---------|---------|
| Outer container | `filter-context-banner` |
| Inner banner | `scope-banner` |
| Back button | `scope-banner-back` |
| Clear filters button | `scope-banner-clear` |

---

## Expected Behavior Summary

| Origin | Destination | from param | returnTo contains |
|--------|-------------|------------|-------------------|
| Store Health | Issues Engine | `store_health` | `/store-health` |
| Products List | Product Detail | `asset_list` | Filter params (q, status) |
| Products List | Issues Engine | `asset_list` | Filter params |
| Work Queue | Playbooks | `work_queue` | `/work-queue` |
| Work Queue | Issues Engine | `work_queue` | `/work-queue` |
| Pages List | Issues Engine | `asset_list` | Filter params |
| Collections List | Issues Engine | `asset_list` | Filter params |

---

## Regression Notes

- **TRUST-ROUTING-1**: Extended with deterministic returnTo (not just from context)
- **ISSUE-TO-FIX-PATH-1**: Uses same navigation context system
- **LIST-ACTIONS-CLARITY-1**: Row actions now include `from=asset_list`
