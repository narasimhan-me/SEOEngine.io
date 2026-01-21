# EngineO.ai – Manual Testing Template

> **This is the single source of truth for manual testing structure.**
>
> - Claude must **clone** this template (not edit it directly) when creating per-feature or per-patch manual testing docs.
> - Per-feature docs should live under `docs/manual-testing/` with descriptive filenames.
> - All sections must remain present in cloned docs (even if marked "N/A").
> - Claude should adapt the content to the specific patch but preserve the section ordering.

---

## Overview

- **Purpose of the feature/patch:**
  - Align the Project Overview dashboard (Dashboard v1.2) UX so that “What matters right now” remains the primary action surface, diagnostics live in a muted drawer, and AEO “Sync now” on the AEO Status card calls the real AEO-2 manual sync endpoint with clear feedback.

- **High-level user impact and what "success" looks like:**
  - DEOs immediately see AEO status and the top products to fix, without competition from diagnostics or redundant issue/product stats.
  - Diagnostics and system details are available on demand via a drawer that feels secondary in visual hierarchy.
  - AEO “Sync now” from the dashboard actually triggers the Answer Blocks → Shopify metafield manual sync flow (AEO-2) and surfaces success/skip/error states clearly.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase DASH-1 – Project Dashboard v1 (First DEO Win & AEO Status)
  - Phase DASH-1.1 – Project Dashboard v1.1 (UX Polish Pass)
  - Phase DASH-1.2 – Project Dashboard v1.2 (Diagnostics Drawer & Redundancy Cleanup)
  - Phase AEO-2 – Shopify Metafields Sync for Answer Blocks

- **Related documentation:**
  - `docs/manual-testing/phase-dashboard-v1-first-deo-win.md`
  - `docs/manual-testing/phase-dashboard-v1-1-ux-polish.md`
  - `docs/manual-testing/phase-dashboard-v1-2-diagnostics-drawer.md`
  - `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`
  - `SHOPIFY_INTEGRATION.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] NEXT.js web app running (`apps/web`)
  - [ ] API/server running (`apps/api`)
  - [ ] Feature flags/entitlements for AEO-2 enabled in the environment
  - [ ] Shopify test store connected for at least one project

- **Test accounts and sample data:**
  - [ ] Test DEO user on Free plan
  - [ ] Test DEO user on Pro or Business plan
  - [ ] Project with Shopify connected, crawls run, DEO Score computed, and at least a few products with Answer Blocks and DEO issues
  - [ ] (Optional) Project without crawls / issues for empty-state checks

- **Required user roles or subscriptions:**
  - [ ] Pro/Business plan required to validate successful AEO-2 “Sync now”
  - [ ] Free plan required to validate entitlement-gated error states

---

## Test Scenarios (Happy Path)

### Scenario 1: Primary section visually dominates

**ID:** DASH12-HP-001

**Preconditions:**

- [ ] Project has at least one crawl, a DEO Score, and a few products with issues and Answer Blocks.

**Steps:**

1. Log in as a Pro or Business user.
2. Navigate to the Project Overview page for the prepared project.
3. Scroll from the top of the page and visually inspect the “First DEO Win” ribbon (if present), “What Matters Right Now”, DEO Score, Top blockers, and Diagnostics drawer.

**Expected Results:**

- **UI:** “What Matters Right Now” appears as the primary highlighted section immediately under the First DEO Win ribbon, with the AEO Status card and “Top Products to Fix” card as the main actionable surfaces.
- **UI:** DEO Score, Top blockers, and Diagnostics drawer appear visually secondary (smaller headers, lighter styling) and do not visually overpower the primary section.

---

### Scenario 2: Diagnostics drawer collapses/expands correctly

**ID:** DASH12-HP-002

**Preconditions:**

- [ ] Same project as Scenario DASH12-HP-001.

**Steps:**

1. On the Project Overview page, locate the “Diagnostics & system details” row near the bottom.
2. Confirm the row appears collapsed by default with helper copy about signals, integrations, crawl config, and system status.
3. Click “Show details” to expand the drawer.
4. Inspect the two-column layout: Evidence (left) and System (right).
5. Click “Hide details” to collapse the drawer.
6. Repeat expand/collapse a few times.

**Expected Results:**

- **UI:** Collapsed state shows a slim, muted row with the title “Diagnostics & system details”, helper copy, and a “Show details” / “Hide details” toggle.
- **UI:** Expanded state uses a 2-column layout on large screens:
  - Left column: Signals summary and crawl / DEO issues controls (Run Crawl button).
  - Right column: Shopify Integration, Active Integrations, Auto Crawl, and Project Stats cards.
- **UI:** Diagnostics cards are visually muted relative to “What Matters Right Now” (smaller headers, softer borders/backgrounds, no new red states).
- **UI:** Expand/collapse works consistently without layout glitches.

---

### Scenario 3: No duplication of issues or products

**ID:** DASH12-HP-003

**Preconditions:**

- [ ] Project with at least 3 DEO issues and 3 products with DEO issues and Answer Blocks.

**Steps:**

1. Open the Project Overview page.
2. Verify the “Top blockers” card and its contents.
3. Verify the “Top Products to Fix” card inside “What Matters Right Now”.
4. Inspect the Diagnostics drawer, especially the Project Stats card and any issue-related content.

**Expected Results:**

- **UI:** “Top blockers” shows at most 3 issues with outcome-style descriptions and a single CTA labeled “View all issues”.
- **UI:** “Top Products to Fix” appears only once, inside “What Matters Right Now”, and lists at most 3 products.
- **UI:** Project Stats no longer shows a raw “Issues Found” count; issue counts or category breakdowns do not compete with “Top blockers” as the main issue surface.
- **UI:** No other sections duplicate the “Top Products to Fix” list or introduce competing issue panels.

---

### Scenario 4: Dashboard “Sync now” triggers AEO-2 manual sync and shows feedback

**ID:** DASH12-HP-004

**Preconditions:**

- [ ] Project with Shopify connected and AEO-2 enabled (Answer Blocks → Shopify metafields flag ON).
- [ ] Project on Pro or Business plan.
- [ ] At least one product with persisted Answer Blocks and DEO issues so that “Top Products to Fix” is populated.

**Steps:**

1. Open the Project Overview page for the prepared project.
2. In “What Matters Right Now”, locate the AEO Status card.
3. Confirm that the card shows Shopify Sync ON, products with Answer Blocks, and last sync timestamp/status (if any).
4. Click the “Sync now” button on the AEO Status card.
5. Wait for the loading state to clear.
6. Optionally, open the relevant product(s) in Product Workspace → Answers (AEO) and Shopify Admin to inspect metafields.

**Expected Results:**

- **UI:** “Sync now” enters a loading state (“Syncing…”) and disables while the request is in flight.
- **UI:** After completion, a success toast appears (e.g., “Synced N Answer Blocks to Shopify metafields.”) when the manual sync succeeds.
- **API/Logs:** The existing AEO-2 manual sync endpoint is called (`/products/:id/answer-blocks/sync-to-shopify`), and AnswerBlockAutomationLog entries record `triggerType = 'manual_sync'` and `action = 'answer_blocks_synced_to_shopify'` for the affected product.
- **Shopify Admin:** For products with Answer Blocks, engineo.\* metafields reflect the latest Answer Block content.

---

### Scenario 5: Error and entitlement states surface correctly

**ID:** DASH12-HP-005

**Preconditions:**

- [ ] Projects and users set up to cover:
  - Free plan (no AEO-2 entitlement).
  - Pro/Business plan with AEO-2 toggle OFF.
  - Pro/Business plan with AEO-2 toggle ON but daily cap forced / reached (if feasible).

**Steps:**

1. **Free plan:**
   1. Log in as a Free-plan user for a project with Shopify connected and Answer Blocks.
   2. Open Project Overview and click “Sync now” on the AEO Status card.
2. **Toggle OFF:**
   1. As a Pro/Business user, ensure the project’s “Sync Answer Blocks to Shopify metafields” toggle is OFF in Settings.
   2. Open Project Overview and click “Sync now”.
3. **Daily cap reached:**
   1. As a Pro/Business user with the toggle ON, simulate or reach the daily AI cap for Shopify Answer Block sync.
   2. Attempt “Sync now” again from the AEO Status card.

**Expected Results:**

- **Free plan:**
  - UI shows an upgrade/limit-style toast (via existing limit feedback system) indicating Shopify Answer Block metafield sync is available on paid plans.
  - Manual sync either is not attempted or returns `status = 'skipped', reason = 'plan_not_entitled'`; no Shopify writes occur.
- **Toggle OFF:**
  - UI surfaces a clear info toast that sync is disabled in Project Settings and indicates how to enable it.
  - Manual sync returns `status = 'skipped', reason = 'sync_toggle_off'`; no Shopify writes occur.
- **Daily cap reached:**
  - UI surfaces a limit/upgrade-style toast indicating the daily sync limit has been reached.
  - Manual sync returns `status = 'skipped', reason = 'daily_cap_reached'`; no additional Shopify writes occur.

---

## Edge Cases

### EC-001: No Top Products to Fix

**Description:** Project has Shopify connected and Answer Blocks, but no DEO issues that qualify for “Top Products to Fix”.

**Steps:**

1. Prepare or identify a project with Answer Blocks but no high-impact, AI-fixable DEO issues.
2. Open Project Overview and inspect “What Matters Right Now” and the AEO Status card.
3. Click “Sync now”.

**Expected Behavior:**

- **UI:** “Top Products to Fix” shows the empty-state helper text and does not appear elsewhere on the page.
- **UI:** “Sync now” still triggers a manual sync attempt and surfaces a clear info toast if there are no products/Answer Blocks to sync.

---

### EC-002: No diagnostics data yet

**Description:** New project with Shopify connected but no crawls, DEO Score, or integrations configured.

**Steps:**

1. Create or select a new project with Shopify connected but without running any crawl.
2. Open Project Overview.
3. Expand the Diagnostics drawer.

**Expected Behavior:**

- **UI:** Diagnostics drawer renders muted cards with appropriate empty-state copy (e.g., encouraging running the first crawl) without errors or broken layouts.
- **UI:** No issue counts or duplicate issue surfaces appear outside of the Top blockers card.

---

## Error Handling

### ERR-001: API failure during dashboard “Sync now”

**Scenario:** The AEO-2 manual sync endpoint returns an error or fails mid-request when triggered from the AEO Status card.

**Steps:**

1. In a test or staging environment, inject a failure into `/products/:id/answer-blocks/sync-to-shopify` (e.g., force an exception in the backend or mock a 5xx).
2. Open Project Overview and click “Sync now” on the AEO Status card.

**Expected Behavior:**

- **UI:** Shows a clear error toast indicating that syncing Answer Blocks to Shopify failed and the user should try again.
- **UI:** Button exits the loading state and can be retried.
- **Logs:** AnswerBlockAutomationLog entries record `status = 'failed'` with an error message; no unexpected crashes occur in the worker or API.

---

### ERR-002: Diagnostics drawer content load issues

**Scenario:** Underlying data for signals, crawl results, or project overview fails to load while interacting with the Diagnostics drawer.

**Steps:**

1. In a controlled environment, simulate failures for DEO signals or crawl results APIs.
2. Open Project Overview and expand/collapse the Diagnostics drawer.

**Expected Behavior:**

- **UI:** Any failures result in graceful degradation (e.g., partial content, existing inline error copy), but the drawer layout still renders and can be toggled.
- **UI:** No red, high-emphasis error cards appear that visually compete with “What Matters Right Now”.

---

## Regression

### Areas potentially impacted:

- [ ] First DEO Win checklist visibility and status logic
- [ ] “What Matters Right Now” section (AEO Status and Top Products to Fix)
- [ ] DEO Score card and recomputation behavior
- [ ] Top blockers panel and “View all issues” CTA
- [ ] Diagnostics & system details drawer (signals, crawl tools, integrations, auto-crawl, stats)
- [ ] AEO-2 manual “Sync now” flows from both Product Workspace and Project Overview
- [ ] Navigation to Issues, Products, and Settings from dashboard CTAs

### Quick sanity checks:

- [ ] “Top blockers” still shows outcome-style descriptions and a single “View all issues” CTA.
- [ ] “Top Products to Fix” still shows up to 3 products and appears only once.
- [ ] Diagnostics drawer can be expanded/collapsed repeatedly without layout glitches.
- [ ] Crawl run, Shopify integration, Active Integrations, Auto Crawl, and Project Stats interactions behave as before.
- [ ] Product-level Answer Blocks panel “Sync now” behavior (AEO-2) remains unchanged and continues to pass its existing manual tests.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove or reset any temporary test projects created for testing Dashboard v1.2 UX alignment.
- [ ] Revert any temporary configuration changes made to simulate plan/entitlement states or daily caps.

### Follow-up verification:

- [ ] Confirm no visual regressions on small and large screen sizes for the primary dashboard sections and diagnostics drawer.
- [ ] Confirm that AEO-2 flows (manual sync and automation-driven sync) continue to function end-to-end after the dashboard wiring changes.

---

## Known Issues

- **Intentionally accepted issues:**
  - None identified at this time; update this section if any UX compromises are explicitly accepted (e.g., per-product scope of the dashboard “Sync now” button).

- **Out-of-scope items:**
  - Changes to DEO scoring or issue selection logic.
  - New backend endpoints or AEO-2 behavior changes beyond wiring the existing endpoint into the dashboard.
  - New charts or metrics beyond existing overview data.

- **TODOs:**
  - [ ] Consider future enhancements to show richer per-product sync status without adding redundancy to the primary dashboard surfaces.

---

## Approval

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| Tester Name    | [Name]                                |
| Date           | [YYYY-MM-DD]                          |
| Overall Status | [ ] Passed / [ ] Blocked / [ ] Failed |
| Notes          | [Any additional notes]                |
