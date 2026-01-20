# EngineO.ai – Dashboard v1.2 Diagnostics Drawer – Manual Testing

## Overview

- **Purpose of the feature/patch:**
  - Turn the Project Dashboard “Diagnostics & reference” area into a true, visually muted drawer while reducing issue/product redundancy on the overview, using existing data and behavior only.

- **High-level user impact and what "success" looks like:**
  - DEOs see a clearer primary narrative (“What Matters Right Now” and “Top blockers”) with diagnostics and system details available on demand in a slim drawer, no duplicated issue or product callouts, and no change to underlying navigation or workflows.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase DASH-1 – Project Dashboard v1 (First DEO Win & AEO Status)
  - Phase DASH-1.1 – Project Dashboard v1.1 (UX Polish Pass)
  - Phase DASH-1.2 – Project Dashboard v1.2 (Diagnostics Drawer & Redundancy Cleanup)

- **Related documentation:**
  - docs/manual-testing/phase-dashboard-v1-first-deo-win.md
  - docs/manual-testing/phase-dashboard-v1-1-ux-polish.md
  - ARCHITECTURE.md

---

## Preconditions

- **Environment requirements:**
  - [ ] NEXT.js frontend running with access to a test project’s Overview dashboard
  - [ ] API and database running with seeded projects/products, DEO scores, and issues
  - [ ] Shopify dev store connected for at least one project (for Shopify Integration card)

- **Test accounts and sample data:**
  - [ ] At least one “mid-activation” project:
    - Connected Shopify (or other) integration
    - At least one crawl and DEO Score available
    - Some DEO issues present
  - [ ] At least one “rich data” project:
    - Multiple crawls
    - DEO Score and detailed signals
    - Issues, Answer Blocks, Auto Crawl enabled
    - More than 3 issues and more than 3 affected products (to verify caps)

- **Required user roles or subscriptions:**
  - [ ] Standard project owner or equivalent with access to the Project Overview dashboard

---

## Test Scenarios (Happy Path)

### Scenario 1: Diagnostics drawer collapsed/expanded behavior

**ID:** DASH1.2-HP-001

**Preconditions:**

- A project matching the “mid-activation” profile above.

**Steps:**

1. Log in as a user with access to the project.
2. Navigate to the Project Overview dashboard.
3. Scroll to the bottom of the page and locate the “Diagnostics & system details” row.
4. Confirm the drawer is collapsed by default.
5. Click “Show details” to expand the drawer.
6. Observe the layout and content when expanded.
7. Click “Hide details” to collapse the drawer again.

**Expected Results:**

- **UI:**
  - Collapsed state:
    - Shows a single, slim row/card with:
      - Title: “Diagnostics & system details”.
      - Helper text: “Signals, integrations, crawl tools, and auto-crawl configuration.”
      - A right-aligned toggle labeled “Show details”.
  - Expanded state:
    - Drawer expands directly below the row while the header row remains visible.
    - The inner content uses a 2-column grid on large screens (`lg:grid-cols-2`):
      - Left column (Evidence): “Signals summary” card plus crawl tools/DEO issues controls.
      - Right column (System): Shopify Integration card, Active Integrations, Auto Crawl, and Project Stats cards.
    - All diagnostics cards appear visually muted relative to “What Matters Right Now” and “Top blockers”:
      - Smaller text (`text-sm` headers).
      - Light borders/backgrounds and no heavy drop shadows.
      - No new red accents besides existing error/broken states.
  - Toggle text switches correctly between “Show details” and “Hide details”.
- **API:**
  - No new API calls are introduced by expanding/collapsing the drawer; behavior matches previous DASH-1/DASH-1.1 calls.
- **Logs:**
  - No new logging behavior is required; existing diagnostics behavior remains unchanged.

---

### Scenario 2: No loss of diagnostics functionality (links and actions)

**ID:** DASH1.2-HP-002

**Preconditions:**

- A project matching the “rich data” profile (multiple crawls, integrations, Auto Crawl enabled).

**Steps:**

1. Open the Project Overview dashboard.
2. Scroll to the “Diagnostics & system details” drawer and click “Show details”.
3. In the left column:
   1. Validate “Signals summary” and Project Health cards render as before.
   2. Use the “Run Crawl” button to start a crawl (or observe loading state in dev).
   3. Click “View Crawl Details” to navigate to the Issues page.
4. In the right column:
   1. From the Shopify Integration card:
      - If connected, click “View products” and confirm navigation to the Products page.
      - If not connected, fill in a test shop domain and click “Connect Shopify Store” (in dev/sandbox environment).
   2. If Active Integrations are present, verify each listed integration is rendered with its label and status icon.
   3. In the Auto Crawl card, click “Configure” and confirm navigation to Project Settings.
   4. Verify Project Stats numbers (crawl count, issue count, products, products with SEO) display without layout issues.

**Expected Results:**

- **UI:**
  - All previously-available actions remain present and clickable inside the expanded diagnostics drawer.
  - “Run Crawl” still shows loading/disabled states when a crawl is running.
  - “View Crawl Details” still routes to the project’s Issues page.
  - Shopify Integration “View products” and “Connect Shopify Store” behave exactly as before v1.2.
  - “Configure” in Auto Crawl routes to the existing Project Settings screen.
  - Project Stats values update as expected based on existing data; only the visual container has changed.
  - No CTAs or links are removed compared to DASH-1.1; only layout and styling are different.
- **API:**
  - All actions rely on the same endpoints and flows used prior to v1.2 (no new routes or payloads).

---

### Scenario 3: Issues and Top Products are not duplicated

**ID:** DASH1.2-HP-003

**Preconditions:**

- A project with:
  - More than 3 DEO issues.
  - At least 4 products that would qualify for “Top Products to Fix” under existing logic.

**Steps:**

1. Open the Project Overview dashboard for this project.
2. Scroll through the page, from top to bottom, noting all places where issues and top products are surfaced.
3. Observe the “Top blockers” panel in the DEO Score & Issues section.
4. Observe the “What Matters Right Now” section and its “Top Products to Fix” card.

**Expected Results:**

- **UI:**
  - Issues:
    - The main dashboard issues panel is labeled “Top blockers”.
    - The panel shows at most 3 issues (even if more exist).
    - Issues are described using the existing outcome-style helper text (`formatIssueOutcome`), not duplicating them elsewhere on the dashboard.
    - There is a single primary issues CTA on the dashboard: the “View all issues” button in the “Top blockers” panel (the “View Crawl Details” link inside the diagnostics drawer remains crawl-specific, not a duplicate of the main CTA).
  - Top Products:
    - “Top Products to Fix” appears only once on the dashboard, inside the “What Matters Right Now” section.
    - The card shows at most 3 products even when more qualify.
    - Each product remains clickable to its product optimization workspace.
  - Expanding “Diagnostics & system details” does not introduce any additional issues or top-products lists; it only surfaces tools, integrations, stats, and signals.
- **API:**
  - No new API calls are introduced to compute caps; existing slices and ranking logic are reused.

---

## Edge Cases

### EC-001: Diagnostics drawer with minimal data

**Description:**

- Project with no crawls yet, limited or no integrations, and shallow signals data.

**Steps:**

1. Create or identify a project with no crawls and only a Shopify connection (or no integrations at all).
2. Open the dashboard and expand the “Diagnostics & system details” drawer.

**Expected Behavior:**

- Signals summary and Project Health cards either show empty/placeholder states or minimal information without errors.
- “Crawl & DEO Issues” card copy reflects that no crawl has been run yet and still offers the “Run Crawl” CTA.
- Active Integrations and Auto Crawl cards gracefully handle missing data (e.g., no integrations list, disabled auto-crawl).
- Layout remains stable, with no collapsed/overlapping content even when some cards are effectively empty.

---

### EC-002: Narrow screens and responsive behavior

**Description:**

- Diagnostics drawer viewed on smaller screens (mobile/tablet).

**Steps:**

1. View the dashboard on a mobile or small tablet viewport (or use browser dev tools to simulate).
2. Expand the “Diagnostics & system details” drawer.

**Expected Behavior:**

- The drawer stacks content vertically in a single column on small screens while still using 2 columns on large screens.
- Cards remain visually muted and readable; no horizontal scrollbars appear.
- All buttons/links are accessible and not clipped or hidden off-screen.

---

## Error Handling

### ERR-001: API failure for diagnostics-related data

**Scenario:**

- Overview or diagnostics-related API calls (signals, status, issues) fail or return errors while loading the dashboard.

**Steps:**

1. In a dev environment, temporarily force diagnostics/overview endpoints to fail or return 500s.
2. Load the Project Overview dashboard and expand the diagnostics drawer.

**Expected Behavior:**

- Existing error handling from DASH-1/DASH-1.1 still applies (banner or inline error states where applicable).
- Drawer layout remains stable; it does not introduce new broken UI states.
- No additional error messaging is required for v1.2; the drawer behaves as a container for existing diagnostics behavior.

---

### ERR-002: Permission failures

**Scenario:**

- A non-owner user attempts to access a project overview URL directly.

**Steps:**

1. Log in as a user without permission to access the target project.
2. Attempt to navigate directly to `/projects/[id]/overview`.

**Expected Behavior:**

- Existing auth/permission handling remains unchanged (redirect or error message).
- The presence of the diagnostics drawer does not alter how unauthorized users are handled.

---

### ERR-003: Navigation interruptions while diagnostics drawer is open

**Scenario:**

- User expands the diagnostics drawer and then navigates away using a CTA inside the drawer.

**Steps:**

1. Open the dashboard and expand the diagnostics drawer.
2. Click:
   - “View Crawl Details”.
   - “View products”.
   - “Configure” in Auto Crawl.

**Expected Behavior:**

- Navigation occurs as before v1.2; no partial renders or stuck overlays.
- Returning to the dashboard (via Back or navigation) shows the drawer in its default collapsed state.

---

## Limits

### LIM-001: Many issues and products

**Scenario:**

- Project with a large number of DEO issues and many AI-fixable products.

**Steps:**

1. Open the dashboard for this high-volume project.
2. Observe “Top blockers”, “Top Products to Fix”, and the diagnostics drawer.

**Expected Behavior:**

- “Top blockers” shows at most 3 issues; overflow is still accessible via “View all issues” or the Issues page.
- “Top Products to Fix” shows at most 3 products; additional products remain reachable from the Products/Issues flows.
- Diagnostics drawer continues to load quickly and render correctly; the visual hierarchy does not degrade with large data volumes.

---

### LIM-002: Many integrations and frequent crawls

**Scenario:**

- Project with several integrations connected and frequent auto-crawls configured.

**Steps:**

1. Open the dashboard and expand the diagnostics drawer.
2. Inspect Active Integrations, Auto Crawl, and Project Stats cards.

**Expected Behavior:**

- Active Integrations list renders all configured integrations clearly within the muted card, without overflowing.
- Auto Crawl and Project Stats remain readable and do not visually dominate primary dashboard content.

---

## Regression

### Areas potentially impacted:

- [ ] First DEO Win checklist visibility and status logic
- [ ] “What Matters Right Now” section (AEO Status and Top Products to Fix)
- [ ] DEO Score card and recomputation behavior
- [ ] Top blockers panel and “View all issues” CTA
- [ ] Diagnostics & system details drawer (signals, crawl tools, integrations, auto-crawl, stats)
- [ ] Navigation to Issues, Products, and Settings from dashboard CTAs

### Quick sanity checks:

- [ ] “Top blockers” still shows outcome-style descriptions and a single “View all issues” CTA.
- [ ] “Top Products to Fix” still shows up to 3 products and appears only once.
- [ ] Diagnostics drawer can be expanded/collapsed repeatedly without layout glitches.
- [ ] Crawl run, Shopify integration, Active Integrations, Auto Crawl, and Project Stats interactions behave as before.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove or reset any temporary test projects created to generate high issue/product counts.
- [ ] Revert any temporary configuration changes made to simulate integration or auto-crawl states.

### Follow-up verification:

- [ ] Confirm no visual regressions on small and large screen sizes for the diagnostics drawer and primary dashboard sections.
- [ ] Confirm dark/light mode (if applicable) still renders legibly after drawer layout changes.

---

## Known Issues

- **Intentionally accepted issues:**
  - None identified at initial rollout; update this section if any design tradeoffs are explicitly accepted (e.g., muted diagnostics cards sharing similar styling with other secondary cards).

- **Out-of-scope items:**
  - Adding new charts or metrics to the dashboard.
  - Any backend, data model, or API changes.
  - Changing how DEO issues or Top Products are computed.

- **TODOs:**
  - [ ] Consider future personalization of diagnostics content per role or plan tier (out of scope for v1.2).

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
