# AUTOMATION-ENTRY-1: Playbook Entry UX — Manual Testing Guide

**Feature:** Playbook Entry UX (trust contract)
**Critical Path:** CP-012 (Automation Engine). Secondary surfaces: CP-003 (Products, Product Details).
**Date:** [YYYY-MM-DD]

---

## Overview

- **Purpose of the feature/patch:**
  - Add a trust-first "Automation Entry" screen that makes automations feel intentional, predictable, and assistive.
  - Enforce explicit scope + run timing before any AI configuration.
  - Require preview-first before enablement.
  - Ensure enablement is not execution, and drafts are always reviewable before apply.

- **High-level user impact and what success looks like:**
  - Users understand what the automation will do (plain-English summary).
  - Users can verify scope (scrollable product list) before generating previews.
  - Users cannot enable without seeing a sample preview.
  - "Enable playbook" persists configuration but does not execute anything immediately.
  - Users can disable instantly without lock-in.

- **Related phases/sections in `IMPLEMENTATION_PLAN.md`:**
  - `AUTOMATION-ENTRY-1 – Automation Playbook Entry UX (Contract)`

- **Related documentation:**
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-012)
  - `docs/manual-testing/phase-automation-1-playbooks.md`
  - `docs/manual-testing/auto-pb-1-2-playbooks-ux-coherence.md`
  - `docs/manual-testing/auto-pb-1-3-scope-binding.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] Web app running
  - [ ] API running
  - [ ] User account with a test project containing products

- **Test data requirements:**
  - [ ] At least 1 product missing SEO title OR SEO description
  - [ ] At least 3 products missing metadata (to exercise bulk scope list and 1–3 sample preview)

- **Required plans / entitlements:**
  - Manual trigger-only enablement should be testable on all plans.
  - Bulk apply behavior remains subject to existing plan gating (do not change in this phase).

---

## Test Scenarios (Happy Path)

### HP-001 — Products Page (Bulk Context) → Entry Screen

**Steps:**

1. Open Products page for a project that has "Fix missing metadata (N products)".
2. Click "Fix missing metadata (N products)".
3. Confirm you land on the Automation Entry screen.
4. Verify "What products does this apply to?" is visible before any AI configuration.
5. Verify default scope is "Only selected products".
6. Verify the scrollable product list is shown and matches the bulk affected set.

**Expected Results:**

- Entry screen is single-purpose (not a form dump).
- Scope is explicit and visible first.
- Product list is present for scope verification.

---

### HP-002 — Product Details (Single Context) → Entry Screen

**Steps:**

1. Open a Product Details page for a product missing metadata.
2. In the header action area, click "Automate this fix".
3. Confirm you land on the Automation Entry screen.
4. Verify scope is exactly one product and the list shows only that product.

**Expected Results:**

- Single-product entry scopes to exactly one product.

---

### HP-003 — Playbooks Page (Intent-First) → Entry Screen

**Steps:**

1. Open Playbooks page.
2. Click "Create playbook".
3. Confirm you land on the Automation Entry screen.

**Expected Results:**

- Entry is available from Playbooks page via an explicit CTA.

---

### HP-004 — Preview Requirement Is Enforced

**Steps:**

1. On the Entry screen, confirm "Enable playbook" is disabled before preview.
2. Generate a sample preview.
3. Verify preview samples are labeled exactly: "Sample draft — not applied".
4. Verify "Enable playbook" becomes enabled only after preview exists.

**Expected Results:**

- Preview-first is enforced; no enablement without preview.

---

### HP-005 — Enablement Is Not Execution

**Steps:**

1. On the Entry screen (after preview), click "Enable playbook".
2. Confirm the post-enable confirmation appears.
3. Confirm no full drafts are generated automatically.
4. Confirm nothing is applied automatically.

**Expected Results:**

- Enable persists configuration only.
- No immediate execution.
- No auto-apply.

---

### HP-006 — Disable Is Always Available

**Steps:**

1. After enabling, click "Disable playbook".
2. Confirm UI reflects disabled state immediately.
3. Re-open Entry and confirm it remains disabled.

**Expected Results:**

- Disable is instant and discoverable.
- No lock-in.

---

## Edge Cases

### EC-001 — Unsupported Triggers Shown As Disabled

**Steps:**

1. On Entry, inspect "When should this run?"
2. Verify "On product creation" and "On scheduled review" are disabled unless already supported end-to-end.

**Expected Results:**

- Users can't select unsupported triggers.

---

### EC-002 — Non-metadata Recommended Actions

**Steps:**

1. Open a product whose top recommended action is not "Fix missing metadata".
2. Click "Automate this fix".
3. Verify Entry screen communicates "Coming soon" and disables enablement for unsupported intents.

**Expected Results:**

- No broken flows; no accidental enablement.

---

## Regression

- [ ] Entry screen does not change existing Automation Engine semantics (CP-012).
- [ ] Existing Playbooks preview → estimate → apply flow remains functional (no replacement in v1).
- [ ] Existing plan gating behavior remains unchanged.

---

## Approval

- [ ] Manual test run completed
- [ ] Any failures logged as issues with repro steps
