# EngineO.ai – Dashboard v1.1 UX Polish – Manual Testing

## Overview

- **Purpose of the feature/patch:**
  Refine the Project Dashboard v1 to improve visual hierarchy and clarity using existing data only, introducing a status ribbon, a "What Matters Right Now" primary focus area, simplified DEO Score and Issues sections, and muted diagnostics.

- **High-level user impact and what "success" looks like:**
  New and existing Shopify projects see a clearer narrative: primary focus on Answer Blocks and the most important products to fix, with DEO Score and diagnostics still available but visually secondary.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase DASH-1 – Project Dashboard v1 (First DEO Win & AEO Status)
  - Phase DASH-1.1 – Project Dashboard v1.1 (UX Polish Pass)

- **Related documentation:**
  - docs/manual-testing/phase-dashboard-v1-first-deo-win.md
  - docs/ENGINEO_AI_INSTRUCTIONS.md

---

## Preconditions

- **Environment requirements:**
  - NEXT.js frontend running with a test project available
  - API and database running with seeded projects/products
  - Shopify dev store connected for at least one project (for AEO status card)

- **Test accounts and sample data:**
  - Free, Pro, and Business test accounts (any one plan is sufficient for visual checks; Pro/Business recommended)
  - At least one project with Answer Blocks and Shopify sync history
  - At least one project with DEO Score and issues created

- **Required user roles or subscriptions:**
  - Standard project owner access (no special role required beyond dashboard access)

---

## Test Scenarios (Happy Path)

### Scenario 1: New user (no data)

**ID:** DASH1.1-HP-001

**Preconditions:**

- A brand-new project with:
  - No integrations
  - No crawls
  - No DEO score
  - No Answer Blocks

**Steps:**

1. Log in as the test user.
2. Navigate to the new project's Overview dashboard.

**Expected Results:**

- UI:
  - First DEO Win checklist is visible with initial steps marked "Not started".
  - No status ribbon is visible (First DEO Win not yet completed).
  - "What Matters Right Now" section is present, but AEO metrics and Top Products to Fix either show zero values or helpful placeholder copy.
  - DEO Score card shows empty/placeholder state; breakdown is collapsed and can be expanded via "View full DEO Score".
  - Diagnostics & reference section is collapsed by default with a "Show details" toggle.
- API: No new API calls beyond existing overview/deo/issue/product fetches.

---

### Scenario 2: Mid-activation user

**ID:** DASH1.1-HP-002

**Preconditions:**

- Project with:
  - Shopify integration connected
  - At least one crawl completed
  - DEO Score available
  - Some issues present
  - Fewer than 3 products optimized

**Steps:**

1. Log in as a user with access to this project.
2. Open the Project Overview dashboard.

**Expected Results:**

- UI:
  - First DEO Win checklist shows some steps "In progress" and later steps "Not started".
  - No "First DEO Win" status ribbon yet (because not all steps are complete).
  - "What Matters Right Now" section:
    - AEO Status card shows Shopify Sync ON/OFF, products with Answer Blocks count, and last sync status/timestamp (or "No sync yet").
    - Top Products to Fix card shows up to 3 products with "Needs fix" labels, or a clear placeholder if none qualify.
  - DEO Score section appears secondary, with:
    - Interpretation line: "Your biggest growth opportunities are Answer Readiness and Visibility."
    - Breakdown hidden by default and expandable with "View full DEO Score".
  - Top blockers list shows up to 3 issues, phrased as outcomes (using recommendedFix/description text).
  - Diagnostics & reference remains collapsed until expanded.
- API: Same endpoints as DASH-1; no new calls introduced by v1.1.

---

### Scenario 3: Completed First DEO Win

**ID:** DASH1.1-HP-003

**Preconditions:**

- Project with:
  - Connected integration
  - At least one successful crawl
  - DEO Score computed
  - At least 3 products optimized (First DEO Win path completed)

**Steps:**

1. Open the Project Overview dashboard for this project.

**Expected Results:**

- UI:
  - First DEO Win checklist is no longer shown (or all steps marked completed).
  - A slim status ribbon appears near the top with copy:
    - "You've completed your first DEO win. Your visibility is improving."
  - Ribbon CTAs (e.g., "Set up daily crawls", "View issues") are link-style and visually de-emphasized.
  - "What Matters Right Now" section and DEO Score / Top blockers behave as in Scenario 2.
- API: No changes relative to DASH-1; only presentation differs.

---

### Scenario 4: Power user sanity check (details still accessible)

**ID:** DASH1.1-HP-004

**Preconditions:**

- Project with:
  - Multiple crawls
  - DEO Score and detailed signals
  - Answer Blocks, issues, and Auto Crawl enabled

**Steps:**

1. Open the Project Overview dashboard.
2. Expand the Diagnostics & reference section.
3. Interact with:
   - Signals summary
   - Project Health cards
   - Crawl & DEO Issues actions
   - Shopify Integration card
   - Project Stats
   - Auto Crawl card

**Expected Results:**

- UI:
  - Diagnostics & reference is visually muted compared to "What Matters Right Now".
  - All prior functionality (links, buttons, details) remains accessible once expanded.
  - No hard-blocking of existing flows (e.g., can still run crawls, navigate to issues, view integrations).
- API: Same calls as DASH-1 when expanding diagnostics; no new backend behavior.

---

## Edge Cases

### EC-001: No issues but products to fix present

**Description:**

- Project where AI-optimizable products exist but DEO issues list is empty or minimal.

**Steps:**

1. Prepare or identify such a project.
2. Open the dashboard.

**Expected Behavior:**

- Top Products to Fix still shows up to 3 products if derivable from existing logic.
- Top blockers panel shows a friendly "No major blockers found yet" message.

---

### EC-002: AEO sync never run

**Description:**

- Project with Answer Blocks but no Shopify metafield sync yet.

**Steps:**

1. Open the dashboard for this project.

**Expected Behavior:**

- AEO Status card shows:
  - Products with Answer Blocks > 0.
  - Last Answer Blocks sync: "No sync yet".
  - Last sync status omitted if not available.

---

## Error Handling

### ERR-001: API failure for overview/DEO/issues

**Scenario:**

- Simulate API failure for overview or issues endpoints (e.g., temporarily misconfigure or intercept responses in dev).

**Steps:**

1. Trigger the failure while loading the dashboard.

**Expected Behavior:**

- Error banner appears (existing behavior from DASH-1).
- No new, broken UI states are introduced by v1.1 (layout remains robust even when some cards cannot load).

---

### ERR-002: Permission failures

**Scenario:**

- Non-owner user attempts to access a project dashboard.

**Steps:**

1. Log in as a user without access to the project.
2. Attempt to open the project overview URL.

**Expected Behavior:**

- Existing auth/permission handling remains unchanged (redirect or error message).
- v1.1 UX changes do not alter permission behavior.

---

## Limits

### LIM-001: Many issues and products

**Scenario:**

- Project with a large number of issues and affected products.

**Steps:**

1. Open the dashboard and observe:
   - Top blockers list
   - Top Products to Fix

**Expected Behavior:**

- Dashboard still shows only:
  - Top 3 blockers
  - Top 3 products to fix
- No overflow or layout breakage; additional issues/products are reachable via "View all issues" and product navigation.

---

## Regression

### Areas potentially impacted:

- [ ] First DEO Win checklist visibility and status logic
- [ ] DEO Score card and recomputation behavior
- [ ] AEO Status card data (values, sync status)
- [ ] Issues engine entry points from dashboard
- [ ] Shopify Integration card and crawl tools

### Quick sanity checks:

- [ ] Can still navigate to Issues page from dashboard.
- [ ] Can still navigate to Products and Answer Blocks from dashboard CTAs.
- [ ] Can still run a crawl from the dashboard where previously possible.
- [ ] Auto Crawl configuration link still routes to Project Settings.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove or reset any temporary test projects created for visual checks.
- [ ] Reset any feature flags or environment tweaks used for testing error/edge states.

### Follow-up verification:

- [ ] Confirm no visual regressions on small and large screen sizes.
- [ ] Confirm dark/light mode (if applicable) still renders legibly after layout changes.

---

## Known Issues

- **Intentionally accepted issues:**
  - None identified at initial rollout; update this section if any UX compromises are intentionally accepted.

- **Out-of-scope items:**
  - Adding charts or new metrics.
  - Backend or analytics changes.
  - New onboarding flows beyond existing First DEO Win checklist.

- **TODOs:**
  - Future phase may introduce more personalization or per-role dashboard variants; out of scope for v1.1.

---

## Approval

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| Tester Name    | [Name]                                |
| Date           | [YYYY-MM-DD]                          |
| Overall Status | [ ] Passed / [ ] Blocked / [ ] Failed |
| Notes          | [Any additional notes]                |
