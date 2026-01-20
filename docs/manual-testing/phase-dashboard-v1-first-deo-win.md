# Phase Dashboard v1 – Shopify Project Home / First DEO Win (Manual Testing)

> Manual testing guide for the Project-level Dashboard v1 focused on guiding Shopify users to their first DEO win using existing data only.

---

## Overview

- **Purpose of the feature/patch:**
  Provide a focused Project Home that walks Shopify users through the canonical "First DEO Win" steps.
  Surface AEO (Answer Blocks) status, top issues, and top products to fix using existing DEO and product data.

- **High-level user impact and what "success" looks like:**
  New and returning users can immediately see where they are in the First DEO Win journey.
  Users can quickly identify and navigate to the highest-impact issues and products without extra configuration.

---

## Preconditions

- **Environment:**
  - Backend API (apps/api) running with access to the project database.
  - Frontend app (apps/web) running with authentication enabled.
  - Redis / queues running for any background DEO operations (if applicable), but not strictly required just to render the dashboard.

- **Test accounts and sample data:**
  - At least one test user with:
    - A Free plan (for edge cases).
    - A Pro or Business plan (for the primary scenarios).
  - At least one Shopify-connected project with:
    - Products synced from Shopify.
    - A completed crawl and DEO score in some scenarios.
    - Products with and without applied SEO/Answer Blocks.

---

## Test Scenarios (Happy Path)

### Scenario DASH1-HP-001: Brand-new project (no integration)

**Preconditions:**

- [ ] New project created with no integrations configured.
- [ ] No crawl has been run; no DEO score exists.

**Steps:**

1. Log in as a Pro or Business user.
2. Create a new project or select a project with no integrations and no crawl history.
3. Navigate to /projects/:id/overview.

**Expected Results:**

- The "First DEO win" checklist appears at the top of the Project Overview.
- Step 1 ("Connect your store") is marked as Not started; all other steps show Not started as well.
- Project Stats card shows:
  - Total Crawls = 0
  - Issues Found = 0
  - Products = 0
  - Products with SEO = 0
- AEO Status card:
  - Products with Answer Blocks = 0
  - Shopify Sync: Off
  - Last Answer Blocks sync: "No sync yet"
- Top Issues and Top Products to Fix sections either:
  - Show a clear empty-state message, or
  - Are not rendered when there is no data.

---

### Scenario DASH1-HP-002: Connected but no crawl

**Preconditions:**

- [ ] Project has a Shopify integration connected (Integration row exists).
- [ ] No crawl results; ProjectOverview.crawlCount = 0.
- [ ] No DEO score snapshots.

**Steps:**

1. Connect a Shopify store for the project via the Shopify integration flow.
2. Navigate to /projects/:id/overview.

**Expected Results:**

- First DEO win checklist:
  - Step 1 ("Connect your store") is Completed.
  - Step 2 ("Run your first crawl") is marked In progress (first incomplete step).
  - Steps 3 and 4 remain Not started.
- The Shopify Integration card shows the connected store details.
- Project Stats:
  - Total Crawls = 0
  - Issues Found = 0
- AEO Status card:
  - Products with Answer Blocks = 0 (or matches any seeded Answer Blocks).
  - Shopify Sync: On/Off reflects project setting.
  - Last Answer Blocks sync: "No sync yet" if no Answer Block sync has occurred.
- Clicking the checklist "Run crawl" CTA scrolls to the crawl section and makes it obvious how to start a crawl.

---

### Scenario DASH1-HP-003: Crawled but no DEO score

**Preconditions:**

- [ ] Project connected to Shopify with products synced.
- [ ] A crawl has been run at least once (crawl results exist).
- [ ] DEO score snapshot not yet computed or intentionally cleared.

**Steps:**

1. Ensure at least one crawl run has completed for the project.
2. Navigate to /projects/:id/overview.

**Expected Results:**

- First DEO win checklist:
  - Step 1 ("Connect your store") = Completed.
  - Step 2 ("Run your first crawl") = Completed.
  - Step 3 ("Review your DEO Score") is In progress (first incomplete step).
  - Step 4 ("Optimize 3 key products") = Not started.
- Project Stats:
  - Total Crawls ≥ 1.
  - Issues Found ≥ 0, reflecting crawl-derived issues count.
- DEO Score card:
  - Either shows a "no DEO score yet" state or a clear CTA to compute it.
- Top Issues card:
  - Shows up to 5 issues (if available) ordered as returned by the DEO Issues API.
  - Each issue entry links (or CTA) into the Issues Engine.

---

### Scenario DASH1-HP-004: DEO score exists but fewer than 3 products optimized

**Preconditions:**

- [ ] Project with:
  - At least one crawl.
  - At least one DEO score snapshot (overall score set).
  - Fewer than 3 products with applied SEO (ProjectOverview.productsWithAppliedSeo < 3).

**Steps:**

1. Navigate to /projects/:id/overview.
2. Confirm DEO Score card shows a latest score.
3. Confirm there are fewer than 3 products with applied SEO on the Products page or via test data.

**Expected Results:**

- First DEO win checklist:
  - Steps 1–3 are Completed.
  - Step 4 ("Optimize 3 key products") is In progress / Not started depending on prior optimizations.
- Project Stats:
  - Products with SEO reflects the same number as the Products view (deterministic).
- Top Products to Fix:
  - Shows up to 3 products derived from DEO issues and product list.
  - Each product row:
    - Displays product title.
    - Shows brief reasons (e.g., missing metadata or AI-fixable issues).
    - Clicking a product row navigates to /projects/:id/products/:productId.

---

### Scenario DASH1-HP-005: Fully completed First DEO Win (all steps done, stepper collapsed)

**Preconditions:**

- [ ] Project with:
  - Shopify connected.
  - At least one crawl.
  - At least one DEO score snapshot.
  - At least 3 products with applied SEO (via metadata optimizations).

**Steps:**

1. Navigate to /projects/:id/overview.
2. Confirm that at least 3 products are considered optimized (as per the Products view).

**Expected Results:**

- First DEO win checklist:
  - All four steps are Completed.
  - The checklist component auto-collapses (not rendered) once all steps are complete.
- First DEO win confirmation card:
  - Shows a "completed" message indicating the First DEO Win path is done.
  - Provides follow-on CTAs (e.g., daily crawls, Issues Engine).
- AEO Status card:
  - Products with Answer Blocks shows a non-zero number if Answer Blocks exist.
  - Last Answer Blocks sync timestamp and status (succeeded/failed/skipped) match the latest AnswerBlockAutomationLog entry with action answer_blocks_synced_to_shopify.
- Top Issues and Top Products to Fix:
  - Still render (if data exists) and remain consistent with DEO issues and product data.

---

## Edge Cases

### DASH1-EC-001: Mixed integrations and non-Shopify projects

**Steps:**

1. Create a project configured as a non-Shopify integration (e.g., custom website).
2. Navigate to /projects/:id/overview.

**Expected Results:**

- First DEO win checklist still behaves deterministically based on:
  - Integrations count.
  - Crawl history.
  - DEO score presence.
  - Products with applied SEO.
- Shopify-specific labels in the checklist and Shopify Integration card remain accurate (or clearly inapplicable) for non-Shopify-only projects.

### DASH1-EC-002: No DEO issues returned

**Steps:**

1. Configure a project such that the DEO Issues API returns an empty issues array.
2. Navigate to /projects/:id/overview.

**Expected Results:**

- IssuesSummaryCard shows zero or an appropriate empty state.
- Top Issues card shows a succinct message indicating no issues rather than rendering empty rows.
- Top Products to Fix either:
  - Is not shown, or
  - Shows an empty-state message if no AI-fixable product issues are present.

---

## Error Handling

### DASH1-ERR-001: API failures (overview / issues / products)

**Steps:**

1. Temporarily misconfigure the backend or simulate failures for:
   - /projects/:id/overview
   - /projects/:id/deo-issues
   - /projects/:id/products
2. Reload /projects/:id/overview.

**Expected Results:**

- Each failed API call surfaces a non-technical, user-friendly error message.
- The rest of the dashboard degrades gracefully (e.g., some cards can render while others show an inline error).
- No uncaught errors appear in the browser console for expected failure modes.

---

## Regression

Areas to sanity check for regressions:

- [ ] Existing project overview metrics (crawls, issues, average SEO score) still match pre-existing behavior.
- [ ] Issues Engine still opens and lists issues correctly via the "View all" and "Top Issues" CTAs.
- [ ] Products and product-level optimization flows remain unchanged when accessed from the Products page.
- [ ] AEO Answer Blocks and Shopify metafield sync flows continue to function as previously tested in Phase AEO-2.

---

## Approval

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| Tester Name    | [Name]                                |
| Date           | [YYYY-MM-DD]                          |
| Overall Status | [ ] Passed / [ ] Blocked / [ ] Failed |
| Notes          | [Any additional notes]                |
