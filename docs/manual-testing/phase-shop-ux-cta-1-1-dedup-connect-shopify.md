# Phase SHOP-UX-CTA-1.1 – Deduplicate Connect Shopify Actions (Direct OAuth, No Scroll)

> Manual testing checklist for deduplicated "Connect Shopify" actions on the Project Overview page, ensuring a single canonical CTA that always starts Shopify OAuth directly.

---

## Overview

- **Purpose of the feature/patch:**
  - Eliminate confusing no-op "Connect Shopify" interactions by making all Connect CTAs route through a single canonical OAuth start handler, without relying on hidden Diagnostics UI.

- **High-level user impact and what "success" looks like:**
  - Users always see exactly one primary "Connect Shopify" CTA on the Project Overview when not connected.
  - Clicking the CTA immediately starts the Shopify OAuth redirect using the saved store domain when available, or a prompted domain when missing.
  - The CTA shows a clear "Connecting…" disabled state during redirect, and shows an error toast if OAuth cannot be initiated.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase SHOP-UX-CTA-1 – Connect Shopify CTA Fix
  - Phase SHOP-UX-CTA-1.1 – Deduplicate Connect Shopify Actions (Direct OAuth, No Scroll)

- **Related documentation:**
  - docs/testing/shopify-integration.md
  - docs/testing/product-sync.md
  - docs/testing/metadata-sync-seo-fields.md
  - docs/testing/sync-status-and-progress-feedback.md
  - docs/manual-testing/phase-shop-ux-cta-1-connect-shopify.md

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with Shopify OAuth credentials configured
  - [ ] Web app (apps/web) running against the same API base URL
  - [ ] Shopify partner app configured with valid OAuth redirect URIs

- **Test accounts and sample data:**
  - [ ] Test user with at least two projects:
    - One project with project.domain saved and no Shopify integration yet
    - One project without any domain saved and no Shopify integration yet
  - [ ] Shopify development store for OAuth testing

- **Required user roles or subscriptions:**
  - [ ] Standard test account with access to create projects and connect Shopify

---

## Test Scenarios (Happy Path)

### Scenario 1: Connect Shopify with saved project domain (no scroll)

**ID:** HP-001

**Preconditions:**

- [ ] Project has project.domain set to a valid Shopify store domain (or equivalent) at creation time.
- [ ] status.shopify.connected === false and no existing Shopify integration.

**Steps:**

1. Log in and navigate to the project overview.
2. Confirm the Diagnostics & system details drawer is collapsed by default.
3. Locate the First DEO Win checklist and the "Connect your store" step.
4. Click the "Connect {storeDomain}" CTA.

**Expected Results:**

- **UI:**
  - [ ] Only one primary connect CTA is visible on the page (inside First DEO Win).
  - [ ] Clicking the CTA does not scroll or focus the Diagnostics Shopify Integration card.
  - [ ] Button label briefly changes to "Connecting…" and becomes disabled while redirecting.
- **Behavior:**
  - [ ] Browser is redirected immediately to the Shopify OAuth URL for the saved domain.
  - [ ] After completion and redirect back, checklist "Connect your store" step is marked completed and Shopify Integration shows connected state.

---

### Scenario 2: Connect Shopify when no domain is saved (prompt + direct OAuth)

**ID:** HP-002

**Preconditions:**

- [ ] Project has no project.domain and no Shopify integration.
- [ ] Diagnostics drawer remains collapsed.

**Steps:**

1. Navigate to the project overview for this project.
2. Confirm only one primary "Connect Shopify" CTA is visible in the First DEO Win checklist.
3. Click the "Connect Shopify" button.
4. When prompted, enter a valid Shopify store domain (e.g., my-store or my-store.myshopify.com) and confirm.

**Expected Results:**

- **UI:**
  - [ ] A minimal prompt appears requesting the Shopify store domain.
  - [ ] After providing a domain, the button shows "Connecting…" and is disabled while redirecting.
- **Behavior:**
  - [ ] The entered domain is normalized to \*.myshopify.com if needed.
  - [ ] Browser redirects directly to Shopify OAuth without relying on Diagnostics scroll/focus.
  - [ ] After successful OAuth, the project shows Shopify as connected.

---

### Scenario 3: Connected projects show non-conflicting Shopify state

**ID:** HP-003

**Preconditions:**

- [ ] Project with an already connected Shopify integration (status.shopify.connected === true).

**Steps:**

1. Navigate to the connected project's overview.
2. Inspect the First DEO Win checklist.
3. Inspect the Diagnostics & system details section.

**Expected Results:**

- **UI:**
  - [ ] "Connect your store" step is marked completed and does not show a primary connect CTA.
  - [ ] Shopify Integration card (within Diagnostics) shows connected status, store domain, and "View products" link.
  - [ ] No second primary "Connect Shopify" button appears anywhere on the page.
- **Behavior:**
  - [ ] Clicking "View products" navigates to the Products page without starting OAuth.

---

## Edge Cases

### EC-001: Diagnostics drawer collapsed but connect still works

**Description:** Ensure connect flow does not rely on the Diagnostics drawer being expanded.

**Steps:**

1. With a project not yet connected to Shopify, ensure Diagnostics & system details remains collapsed.
2. Click the First DEO Win "Connect Shopify" CTA.

**Expected Behavior:**

- [ ] OAuth starts as in HP-001/HP-002 regardless of Diagnostics visibility.
- [ ] No scrolling or focusing behavior targets the hidden Shopify Integration card.

---

### EC-002: User cancels domain prompt or leaves it blank

**Description:** User dismisses the domain prompt without entering a value.

**Steps:**

1. Use a project with no saved domain.
2. Click "Connect Shopify" in First DEO Win.
3. When prompted for a domain, cancel the prompt or submit an empty value.

**Expected Behavior:**

- [ ] No redirect to Shopify occurs.
- [ ] Button returns to its normal enabled state (no "Connecting…" state stuck).
- [ ] A toast appears: "Couldn't start Shopify connection. Try again."

---

## Error Handling

### ERR-001: OAuth initiation failure (client-side)

**Scenario:** Client cannot start OAuth because required data (token or domain) is missing or invalid.

**Steps:**

1. (If possible) Simulate missing token or an invalid environment (e.g., tamper with local storage or API URL).
2. Click "Connect Shopify" in the checklist.

**Expected Behavior:**

- [ ] Button does not remain stuck in "Connecting…" state.
- [ ] Toast message appears: "Couldn't start Shopify connection. Try again."
- [ ] User can retry by clicking the button again after fixing the underlying issue.

---

### ERR-002: Shopify OAuth cancelled or fails server-side

**Scenario:** User cancels OAuth in Shopify admin or Shopify rejects the installation.

**Steps:**

1. Start OAuth from First DEO Win.
2. Cancel or fail the installation in Shopify.
3. Return to the EngineO project overview.

**Expected Behavior:**

- [ ] Project remains in "not connected" state.
- [ ] First DEO Win "Connect your store" step remains incomplete and retryable.
- [ ] No inconsistent or partial connected state is displayed.

---

## Limits

### LIM-001: Multiple attempts to connect the same project

**Scenario:** User clicks connect multiple times after a failed attempt.

**Steps:**

1. Attempt to start OAuth and cause a failure (ERR-001 or ERR-002).
2. Retry by clicking "Connect Shopify" again.

**Expected Behavior:**

- [ ] Button can be clicked again after failure.
- [ ] "Connecting…" state only shows during an active redirect attempt.
- [ ] No duplicate redirects or overlapping OAuth windows are created.

---

## Regression

### Areas potentially impacted:

- [ ] Shopify OAuth flow initiation (/shopify/install)
- [ ] Project Overview First DEO Win checklist
- [ ] Diagnostics & system details layout and visibility
- [ ] Existing Shopify-connected projects

### Quick sanity checks:

- [ ] Projects without Shopify continue to show the First DEO Win checklist correctly.
- [ ] Connecting Shopify via the checklist does not break other checklist steps (crawl, DEO Score, optimize).
- [ ] Connected projects still sync products and SEO metadata as expected.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Disconnect test Shopify integrations if necessary.
- [ ] Remove or reset any test projects created for this phase.
- [ ] Restore any modified environment or feature flag settings.

### Follow-up verification:

- [ ] Confirm that no orphaned integrations or inconsistent connection states exist in the database.
- [ ] Verify that other Shopify flows (product sync, metadata sync) still pass their respective manual tests.

---

## Known Issues

- **Intentionally accepted issues:**
  - None identified for this phase.

- **Out-of-scope items:**
  - Auto-starting OAuth on project creation.
  - Redesigning the Diagnostics & system details section.
  - Non-Shopify integrations (WooCommerce, BigCommerce, Magento, custom websites).

- **TODOs:**
  - [ ] Add automated tests around the canonical Shopify OAuth start handler in the future.

---

## Approval

| Field              | Value                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| **Tester Name**    | [Pending]                                                                |
| **Date**           | [YYYY-MM-DD]                                                             |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                                    |
| **Notes**          | Phase SHOP-UX-CTA-1.1 Deduplicate Connect Shopify Actions manual testing |
