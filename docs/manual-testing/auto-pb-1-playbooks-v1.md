# AUTO-PB-1 – Automation Playbooks v1 (Missing SEO Metadata)

> Manual verification checklist for the Automation Playbooks v1 feature covering the 3-step wizard: Preview, Estimate, and Apply for missing SEO titles and descriptions.

---

## Overview

- **Purpose:**
  Validate that the Automation Playbooks feature correctly identifies products with missing SEO metadata, provides accurate estimates, and applies AI-generated fixes with proper plan gating.

- **What success looks like:**
  - The Playbooks page displays available playbooks with affected product counts.
  - Preview step shows AI-generated suggestions for sample products.
  - Estimate step shows token usage and plan eligibility.
  - Apply step updates products sequentially, respecting daily AI limits.
  - Free plan users are blocked from bulk apply but can preview.
  - Pro/Business plan users can apply playbooks within their limits.

---

## Preconditions

- [ ] Local development environment running (`pnpm dev`).
- [ ] Test database with sample products (some missing SEO titles/descriptions).
- [ ] User accounts for testing:
  - Free plan user (default new signup).
  - Pro plan user (via test subscription or manual DB update).
- [ ] Shopify integration connected (optional, for sync testing).

---

## Scenario 1 – Access Playbooks from Overview (Next DEO Win)

**ID:** PB1-001

**Goal:** Verify the Next DEO Win card links to Automation Playbooks.

**Preconditions:**

- User has completed the First DEO Win checklist (connected store, ran crawl, reviewed DEO score, optimized 3 products).

**Steps:**

1. Log in and navigate to a project's Overview page.
2. Verify the "Next DEO Win" card is visible.
3. Observe the affected product counts displayed.
4. Click "Open Automation Playbooks".

**Expected Results:**

- [ ] The "Next DEO Win" card displays "Missing SEO titles: X products" and "Missing descriptions: Y products".
- [ ] Clicking the button navigates to `/projects/{projectId}/automation/playbooks?source=next_deo_win`.
- [ ] A welcome banner appears acknowledging the navigation from Next DEO Win.

---

## Scenario 2 – Playbook Selection

**ID:** PB1-002

**Goal:** Verify playbook cards display correct information.

**Steps:**

1. Navigate to `/projects/{projectId}/automation/playbooks`.
2. Observe the two playbook cards:
   - "Fix missing SEO titles"
   - "Fix missing SEO descriptions"

**Expected Results:**

- [ ] Each card shows:
  - Playbook name and description.
  - Affected product count.
  - Target field (`seoTitle` or `seoDescription`).
  - Plan eligibility badge ("Pro / Business" or "Upgrade for bulk automations").
- [ ] Selecting a card highlights it and loads its estimate.

---

## Scenario 3 – Preview Step (Step 1)

**ID:** PB1-003

**Goal:** Verify AI preview generation for sample products.

**Preconditions:**

- At least 3 products with missing SEO title or description.
- User is on a paid plan (Pro/Business) to generate previews.

**Steps:**

1. Select the "Fix missing SEO titles" playbook.
2. On Step 1, click "Generate preview".
3. Observe the loading state and generated previews.

**Expected Results:**

- [ ] Loading spinner shows "Generating AI previews for sample products…".
- [ ] Up to 3 sample products are displayed with Before/After comparison.
- [ ] Before shows current empty or missing value.
- [ ] After shows AI-generated suggestion.
- [ ] Link to "Open product →" navigates to product workspace.
- [ ] If daily AI limit is reached, an error message appears.

---

## Scenario 4 – Estimate Step (Step 2)

**ID:** PB1-004

**Goal:** Verify accurate token and eligibility estimates.

**Steps:**

1. From Step 1, click "Continue to Estimate".
2. Observe the estimate details.
3. Click "Recalculate estimate" to refresh.

**Expected Results:**

- [ ] Estimate displays:
  - Products to update (matches affected count).
  - Estimated token usage.
  - Plan ID (free/pro/business).
  - Daily AI limit usage (X/Y format or "Unlimited").
- [ ] Blocking reasons are displayed if applicable:
  - `plan_not_eligible`: "This playbook requires a Pro or Business plan."
  - `no_affected_products`: "No products currently match..."
  - `ai_daily_limit_reached`: "Daily AI limit reached..."
  - `token_cap_would_be_exceeded`: "Estimated token usage would exceed..."
- [ ] If eligible, green message: "This playbook can run safely within your current plan and daily AI limits."

---

## Scenario 5 – Apply Step (Step 3) – Free Plan Blocked

**ID:** PB1-005

**Goal:** Verify Free plan users cannot apply playbooks.

**Preconditions:**

- User is on the Free plan.
- Products exist with missing SEO metadata.

**Steps:**

1. Navigate through Preview and Estimate steps.
2. Attempt to reach Step 3.

**Expected Results:**

- [ ] The "Continue to Apply" button is disabled.
- [ ] Estimate shows `plan_not_eligible` reason.
- [ ] UI messaging indicates upgrade is required.
- [ ] User can still generate previews.

---

## Scenario 6 – Apply Step (Step 3) – Pro/Business Plan Success

**ID:** PB1-006

**Goal:** Verify playbook application updates products correctly.

**Preconditions:**

- User is on Pro or Business plan.
- At least 2 products with missing SEO titles.

**Steps:**

1. Select "Fix missing SEO titles" playbook.
2. Navigate to Step 3 (Apply).
3. Check the confirmation checkbox.
4. Click "Apply playbook".
5. Observe progress and completion.

**Expected Results:**

- [ ] Confirmation checkbox is required before Apply button is enabled.
- [ ] Progress message: "Applying Automation Playbook… This may take a moment..."
- [ ] Success result displays:
  - Updated products count.
  - Skipped products count.
  - Limit reached indicator (if applicable).
- [ ] Toast notification: "Automation Playbook applied to X product(s)."
- [ ] Products now have AI-generated SEO titles in the database.

---

## Scenario 7 – Shopify Sync After Apply

**ID:** PB1-007

**Goal:** Verify Shopify sync option after playbook application.

**Preconditions:**

- Shopify integration connected.
- User successfully applied a playbook.

**Steps:**

1. After playbook apply completes, click "Sync to Shopify".
2. Observe sync feedback.

**Expected Results:**

- [ ] Toast notification: "Shopify sync triggered for updated products."
- [ ] Products' updated metadata appears in Shopify admin.

---

## Scenario 8 – Daily AI Limit Enforcement

**ID:** PB1-008

**Goal:** Verify playbook respects daily AI limits.

**Preconditions:**

- User has nearly exhausted daily AI limit.
- Multiple products with missing SEO metadata.

**Steps:**

1. Apply a playbook when daily limit is near capacity.
2. Observe partial completion behavior.

**Expected Results:**

- [ ] Playbook stops processing when limit is reached.
- [ ] Result shows `limitReached: true`.
- [ ] Message: "Daily AI limit was reached during execution. Remaining products were not updated."
- [ ] Remaining products are not modified.

---

## Scenario 9 – Backend Integration Tests Pass

**ID:** PB1-009

**Goal:** Verify backend integration tests for playbooks.

**Steps:**

1. Run the backend test suite:
   ```bash
   pnpm test:api
   ```
2. Look for the "Automation Playbooks (e2e)" test suite.

**Expected Results:**

- [ ] All tests in `automation-playbooks.e2e-spec.ts` pass:
  - Estimate returns correct affected product counts.
  - Estimate respects project ownership.
  - Apply is blocked for free plan users.
  - Apply handles empty product sets.
  - Authentication is required for all endpoints.

---

## Scenario 10 – No Products Match Criteria

**ID:** PB1-010

**Goal:** Verify behavior when all products already have SEO metadata.

**Steps:**

1. Ensure all products have SEO titles and descriptions filled.
2. Navigate to Playbooks page.
3. Select a playbook.

**Expected Results:**

- [ ] Affected products count shows 0.
- [ ] Estimate shows `no_affected_products` reason.
- [ ] "Continue to Estimate" and "Apply playbook" buttons are disabled.
- [ ] Message indicates no products match the criteria.

---

## Regression Guardrails

- [ ] Free plan gating cannot be bypassed by API calls.
- [ ] Token usage is logged correctly after playbook apply.
- [ ] Products updated by playbook have `seoTitleAppliedAt` or `seoDescriptionAppliedAt` timestamp.
- [ ] Playbook does not affect products in other projects.
- [ ] Daily AI limits reset at midnight UTC.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Test products can be deleted via the Products page or API.
- [ ] Token usage logs are retained for billing audits.

### Follow-up verification:

- [ ] Run `pnpm test:api` to confirm all integration tests pass.
- [ ] Verify Shopify products reflect the applied SEO metadata (if sync was triggered).

---

## Known Issues

- **Intentionally accepted issues:**
  - AI suggestions may vary between preview and apply due to non-deterministic generation.
  - Large catalogs may take longer to process; progress is sequential.

- **Out-of-scope items:**
  - Bulk apply for Answer Blocks (future AUTO-PB-2).
  - Undo/rollback for applied playbooks.
  - Custom playbook creation.

- **TODOs:**
  - [ ] Add progress bar for large catalog playbook runs.
  - [ ] Add "Dry run" mode to simulate apply without saving.

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | AUTO-PB-1 Automation Playbooks v1     |
