# Phase SHOP-UX-CTA-1 – Connect Shopify CTA Fix

> Manual testing checklist for the Connect Shopify CTA improvements in the First DEO Win checklist.

---

## Overview

- **Purpose of the feature/patch:**
  - Fix the "Connect Shopify" CTA button in the First DEO Win checklist to reliably initiate OAuth flow when the store domain is already known, and provide clear UX feedback during the connection process.

- **High-level user impact and what "success" looks like:**
  - When a user's project already has a known Shopify store domain (from a previous partial connection or project setup), clicking "Connect Shopify" in the checklist immediately initiates OAuth instead of scrolling to the integration section.
  - The button label dynamically shows the store domain when available (e.g., "Connect my-store.myshopify.com").
  - The button shows a loading state ("Connecting…") while the OAuth redirect is in progress.

- **Related documentation:**
  - docs/testing/shopify-integration.md
  - docs/IMPLEMENTATION_PLAN.md (Phase SHOP-UX-CTA-1)

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with Shopify OAuth credentials configured
  - [ ] Web app running (apps/web) against the same API base URL
  - [ ] Shopify partner app configured with valid OAuth redirect URIs

- **Test accounts and sample data:**
  - [ ] Test user with a project that has NO Shopify integration yet
  - [ ] Test user with a project that has a known `shopDomain` but NOT connected (partial state)
  - [ ] Shopify development store for OAuth testing

---

## Test Scenarios (Happy Path)

### Scenario 1: Connect Shopify with known domain

**ID:** HP-001

**Preconditions:**

- [ ] Project has `shopify.shopDomain` populated (from previous attempt or project setup)
- [ ] Shopify integration NOT yet connected

**Steps:**

1. Log in and navigate to project overview.
2. Observe the First DEO Win checklist.
3. Click the "Connect {store-domain}" button.

**Expected Results:**

- [ ] Button label shows "Connect {store-domain}.myshopify.com" (personalized).
- [ ] Clicking immediately redirects to Shopify OAuth flow (no scroll/focus).
- [ ] Button shows "Connecting…" state briefly before redirect.

---

### Scenario 2: Connect Shopify without known domain (fallback)

**ID:** HP-002

**Preconditions:**

- [ ] Project has NO `shopify.shopDomain` (fresh project)
- [ ] Shopify integration NOT yet connected

**Steps:**

1. Log in and navigate to project overview.
2. Observe the First DEO Win checklist.
3. Click the "Connect Shopify" button.

**Expected Results:**

- [ ] Button label shows generic "Connect Shopify".
- [ ] Clicking scrolls to the Shopify integration section in Diagnostics.
- [ ] Store domain input is focused after scroll.

---

### Scenario 3: Successful OAuth completion

**ID:** HP-003

**Preconditions:**

- [ ] OAuth flow initiated from checklist
- [ ] Valid Shopify store credentials

**Steps:**

1. Complete OAuth flow in Shopify admin.
2. Return to EngineO app via callback.

**Expected Results:**

- [ ] "Successfully connected to Shopify!" toast appears.
- [ ] First DEO Win checklist updates: "Connect your store" step shows as completed.
- [ ] Shopify integration section shows connected status with store domain.

---

## Edge Cases

### EC-001: OAuth cancelled by user

**Description:** User starts OAuth but cancels in Shopify admin.

**Steps:**

1. Click "Connect {domain}" in checklist.
2. Cancel OAuth in Shopify admin or close the browser tab.
3. Return to EngineO project overview.

**Expected Behavior:**

- [ ] No error state persists on page reload.
- [ ] Checklist still shows "Connect your store" as incomplete.
- [ ] User can retry connection.

---

### EC-002: Invalid store domain

**Description:** Stored domain is invalid or unreachable.

**Steps:**

1. (Setup) Manually set an invalid `shopDomain` in the database.
2. Click the "Connect {invalid-domain}" button.

**Expected Behavior:**

- [ ] OAuth flow fails gracefully at Shopify.
- [ ] User returns to EngineO with appropriate error handling.

---

## Regression

### Areas potentially impacted:

- [ ] FirstDeoWinChecklist component rendering
- [ ] Project Overview page state management
- [ ] Shopify OAuth flow initiation
- [ ] Integration status API response

### Quick sanity checks:

- [ ] All 4 checklist steps render correctly.
- [ ] Completed steps show "View" button instead of CTA.
- [ ] Non-Shopify integration steps (crawl, score, optimize) unaffected.
- [ ] Diagnostics section Shopify integration form still works independently.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Disconnect test Shopify integrations if needed.
- [ ] Reset any manually modified database records.

### Follow-up verification:

- [ ] Verify product sync works after successful connection.
- [ ] Verify crawl can run after Shopify connection.

---

## Approval

| Field              | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| **Tester Name**    | [Pending]                                              |
| **Date**           | [YYYY-MM-DD]                                           |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                  |
| **Notes**          | Phase SHOP-UX-CTA-1 Connect Shopify CTA manual testing |
