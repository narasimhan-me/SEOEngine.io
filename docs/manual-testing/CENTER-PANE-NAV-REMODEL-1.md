# EngineO.ai – Manual Testing: CENTER-PANE-NAV-REMODEL-1

> Derived from MANUAL_TESTING_TEMPLATE.md

---

## Overview

- **Purpose of the feature/patch:**
  Center header standardization and scoped nav demotion. Introduces `CenterPaneHeaderProvider` for per-page shell header customization. Issues and Playbooks pages migrate their in-canvas headers to the shell header. Product detail uses `hideHeader` to avoid duplicate headers. ProjectSideNav is demoted to a low-emphasis contextual index to avoid competing with Global Nav.

- **High-level user impact and what "success" looks like:**
  Users see a consistent header structure across pages (breadcrumbs/title/description/actions). No duplicate headers appear on Issues, Playbooks, or Product detail routes. The scoped section menu (ProjectSideNav) reads as a quiet contextual index rather than a second primary navigation. RCP remains autonomous with no new toggles/modes introduced.

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase CENTER-PANE-NAV-REMODEL-1

- **Related documentation:**
  - `docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md`
  - `docs/manual-testing/RIGHT-CONTEXT-PANEL-AUTONOMY-1.md`

---

## Preconditions

- **Environment requirements:**
  - apps/web running locally
  - At least one project with products and issues

- **Test accounts and sample data:**
  - Any authenticated account with access to /projects/:id

- **Required user roles or subscriptions:**
  - Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario 1: No duplicate headers on Issues page

**ID:** HP-001

**Preconditions:**

- [ ] Navigate to `/projects/:projectId/issues`

**Steps:**

1. Observe the shell header area (breadcrumbs bar at top of center pane).
2. Scan the main content area below for any additional h1/title/actions.

**Expected Results:**

- Shell header shows: breadcrumbs (small, secondary) → "Issues" title (primary) → project name description (muted) → "Re-scan Issues" button (right-aligned).
- No in-canvas h1 "Issues Engine" or duplicate "Re-scan" button exists below the shell header.
- ScopeBanner, filters, triplet summary, and DataTable remain visible.

---

### Scenario 2: No duplicate headers on Playbooks page

**ID:** HP-002

**Preconditions:**

- [ ] Navigate to `/projects/:projectId/automation/playbooks`

**Steps:**

1. Observe the shell header area.
2. Scan the main content area for any breadcrumb nav or h1 header block.

**Expected Results:**

- Shell header shows: breadcrumbs → "Playbooks" title → description → role label (right-aligned, muted).
- No in-canvas `<nav>` breadcrumb block exists.
- No in-canvas h1 "Playbooks" + description block exists.
- If assetType is not PRODUCTS, an inline badge appears at the top of content (not in header).
- ScopeBanner, playbook cards, and flow UI remain visible.

---

### Scenario 3: Product detail shows only one header (hideHeader)

**ID:** HP-003

**Preconditions:**

- [ ] Navigate to `/projects/:projectId/products/:productId`

**Steps:**

1. Observe if the shell header area is visible.
2. Check for any in-canvas breadcrumb nav block.
3. Verify the sticky workspace header + tabs are present.

**Expected Results:**

- Shell center-pane header is NOT rendered (hideHeader: true).
- No in-canvas breadcrumb nav exists at top of page.
- Sticky workspace header (product title, actions, tabs) renders as the only header.
- All product tabs (SEO, AI Suggestions, etc.) work correctly.

---

### Scenario 4: Header structure order and scanability

**ID:** HP-004

**Preconditions:**

- [ ] Navigate to `/projects/:projectId/issues`

**Steps:**

1. Inspect the shell header structure visually.
2. Verify order: breadcrumbs line → title line → description line (if present) → actions (right-aligned).

**Expected Results:**

- Breadcrumbs appear as small, secondary text (text-xs, muted).
- Title appears as primary text (text-sm, font-semibold).
- Description (project name) appears below title in muted, smaller text.
- Actions (button) appear right-aligned, minimal styling.

---

### Scenario 5: ProjectSideNav reads as low-emphasis index

**ID:** HP-005

**Preconditions:**

- [ ] Navigate to any project section (e.g., `/projects/:projectId/issues`)

**Steps:**

1. Observe the ProjectSideNav on desktop (left side of content).
2. Compare visual weight to Global Nav in the main left sidebar.
3. Check active state styling.
4. Hover over inactive items.

**Expected Results:**

- Section headings are very light (text-[10px], font-normal, 60% opacity).
- Item text is smaller (text-xs) and muted.
- Active state shows only a thin accent bar (before pseudo-element) with readable text - no heavy background block.
- Hover state is calm: no background color, just slight text emphasis.
- Overall, ProjectSideNav does NOT compete visually with Global Nav.

---

### Scenario 6: RCP remains autonomous (no new toggles/modes)

**ID:** HP-006

**Preconditions:**

- [ ] Navigate to Issues or Playbooks page.

**Steps:**

1. Look for any "Action/Details" toggle or RCP mode controls in the shell header.
2. Verify RCP still opens autonomously when selecting an entity (issue, playbook).

**Expected Results:**

- No RCP toggle/mode controls appear in the shell header.
- RCP opens autonomously when clicking on an issue or playbook.
- RCP behavior unchanged from RIGHT-CONTEXT-PANEL-AUTONOMY-1.

---

### Scenario 7: Shopify embedded iframe sanity

**ID:** HP-007

**Preconditions:**

- [ ] Load app in Shopify Admin embedded mode (or simulate with `?embedded=true&host=...`)

**Steps:**

1. Navigate to Issues, Playbooks, and Product detail pages.
2. Check for overflow, scrollbar issues, or layout regressions.

**Expected Results:**

- No horizontal overflow or double scrollbars.
- Layout renders correctly within Shopify Admin iframe constraints.
- Shell header and content area fit within iframe bounds.

---

## Test Scenarios (Happy Path) - FIXUP-1 (Pillar Pages & Additional Surfaces)

### Scenario 8: No duplicate headers on pillar pages (Search & Intent, Performance, Media, etc.)

**ID:** HP-008

**Preconditions:**

- [ ] Navigate to any pillar insight page (e.g., `/projects/:projectId/keywords`, `/projects/:projectId/performance`, `/projects/:projectId/media`, `/projects/:projectId/competitors`, `/projects/:projectId/local`)

**Steps:**

1. Observe the shell header area (breadcrumbs bar at top of center pane).
2. Scan the main content area below for any additional h1/title or breadcrumb nav.

**Expected Results:**

- Shell header shows: breadcrumbs (`Projects > {projectName} > Insights`) → pillar title (e.g., "Search & Intent") → pillar description (muted).
- No in-canvas `<nav>` breadcrumb block exists.
- No in-canvas h1 header block exists.
- InsightsPillarsSubnav (pillar tabs) renders as first content item below header.
- "Why It Matters" callout and pillar-specific content remain visible.

---

### Scenario 9: No duplicate headers on Members settings page

**ID:** HP-009

**Preconditions:**

- [ ] Navigate to `/projects/:projectId/settings/members`

**Steps:**

1. Observe the shell header area.
2. Scan the main content area for any breadcrumb nav or h1 header block.

**Expected Results:**

- Shell header shows: breadcrumbs (`Projects > {projectName} > Settings`) → "Team Members" title → description.
- No in-canvas breadcrumb nav exists.
- No in-canvas h1 "Team Members" + description block exists.
- Role info and "Add member" button remain visible in content area.
- Members list and permissions reference render correctly.

---

### Scenario 10: No duplicate headers on New Playbook entry page

**ID:** HP-010

**Preconditions:**

- [ ] Navigate to `/projects/:projectId/automation/playbooks/entry`

**Steps:**

1. Observe the shell header area.
2. Scan the main content area for any breadcrumb nav or h1 header block.

**Expected Results:**

- Shell header shows: breadcrumbs (`Playbooks`) → "New Playbook" title → intent summary description.
- No in-canvas breadcrumb nav exists.
- No in-canvas h1 "New Playbook" + description block exists.
- "Open Playbooks" and "Back to playbooks" action buttons render in content area.
- Scope, trigger, and preview sections render correctly.

---

### Scenario 11: No duplicate headers on Content Workspace page

**ID:** HP-011

**Preconditions:**

- [ ] Navigate to `/projects/:projectId/content/:pageId`

**Steps:**

1. Observe the shell header area.
2. Scan the main content area for any breadcrumb nav or h1 header block.

**Expected Results:**

- Shell header shows: breadcrumbs (`Projects > {projectName} > Content`) → "Content Optimization Workspace" title → page path description.
- No in-canvas breadcrumb nav exists.
- No in-canvas h1 "Content Optimization Workspace" + description block exists.
- "← Back to Content" link and page type badge render in content area.
- Three-panel layout (Overview, AI Suggestions/Editor, DEO Insights) renders correctly.

---

### Scenario 12: Media pillar route activates Insights in ProjectSideNav

**ID:** HP-012

**Preconditions:**

- [ ] Navigate to `/projects/:projectId/media`

**Steps:**

1. Observe the ProjectSideNav on desktop.
2. Check which item has the active state.

**Expected Results:**

- The "Insights" item in the INSIGHTS section shows the active state (thin accent bar).
- No other items appear active.
- This confirms `/media` is properly included in `insightsPillarRoutes`.

---

### Scenario 13: No duplicate headers on GEO Insights page (FIXUP-2)

**ID:** HP-013

**Preconditions:**

- [ ] Navigate to `/projects/:projectId/insights/geo-insights`

**Steps:**

1. Observe the shell header area (breadcrumbs bar at top of center pane).
2. Verify the "Export Report" action appears in the shell header.
3. Scan the main content area below for any breadcrumb nav block.
4. Scan the main content area for any h1 header block.

**Expected Results:**

- Breadcrumbs read `Projects > {Project Name} > Insights` (no placeholder "Project" text).
- Title reads "GEO Insights".
- "Export Report" action appears in shell header (right-aligned).
- No in-canvas `<nav>` breadcrumb block exists.
- No in-canvas h1 "GEO Insights" + "Export Report" header block exists.
- InsightsSubnav and InsightsPillarsSubnav render as first content items below header.
- All GEO metrics sections (Overview, Attribution Readiness, Intent Coverage, etc.) remain visible.

---

## Edge Cases

### Edge Case 1: Mobile drawer trigger styling

**ID:** EC-001

**Preconditions:**

- [ ] Resize browser to mobile breakpoint (< md)

**Steps:**

1. Observe the mobile trigger button for ProjectSideNav.
2. Open the drawer and inspect styling.

**Expected Results:**

- Mobile trigger is low-emphasis: small text ("Sections"), no heavy button styling.
- Drawer header shows "Sections" label (not "Navigation" or competing text).
- Drawer content uses same low-emphasis ProjectSideNav styling.

---

### Edge Case 2: Deep-link with panel params on hideHeader route

**ID:** EC-002

**Preconditions:**

- [ ] Product page URL with panel deep-link params

**Steps:**

1. Navigate to `/projects/:projectId/products/:productId?panel=details&entityType=product&entityId=<id>`

**Expected Results:**

- Shell header remains hidden (hideHeader: true).
- RCP opens with the specified entity.
- No duplicate headers appear.

---

## Post-Test Checklist

- [ ] All happy path scenarios pass (HP-001 through HP-013).
- [ ] No duplicate headers on Issues, Playbooks, or Product detail.
- [ ] No duplicate headers on pillar pages (keywords, performance, media, competitors, local).
- [ ] No duplicate headers on Members, New Playbook entry, or Content Workspace pages.
- [ ] No duplicate headers on GEO Insights page (FIXUP-2).
- [ ] Header structure follows order: breadcrumbs → title → description → actions.
- [ ] ProjectSideNav demoted to low-emphasis index (no competition with Global Nav).
- [ ] `/media` route activates "Insights" item in ProjectSideNav.
- [ ] RCP autonomy preserved (no new toggles/modes).
- [ ] Shopify embedded mode has no layout regressions.
- [ ] Mobile drawer works correctly with low-emphasis styling.

---

## Notes

- **CenterPaneHeaderProvider**: New context provider at shell level for per-page header customization.
- **useCenterPaneHeader()**: Hook for pages to set/reset header state (title, description, actions, hideHeader).
- **hideHeader**: When true, shell header is not rendered at all (used by Product detail).
- **No feature logic changes**: This is a UI/navigation remodel only.

### FIXUP-1 Changes

- **Pillar pages**: keywords, performance, media, competitors, local now use shell header integration.
- **Additional surfaces**: Members settings, New Playbook entry, Content Workspace now use shell header.
- **ProjectSideNav**: Added `/media` to `insightsPillarRoutes` for correct active-state coverage.
- **In-canvas removal**: Breadcrumb nav blocks and h1/description header blocks removed from all updated surfaces.

### FIXUP-2 Changes

- **GEO Insights page**: Now uses shell header integration with breadcrumbs/title/description and "Export Report" action.
- **In-canvas removal**: Breadcrumb nav block and h1/action header block removed from GEO Insights page.
