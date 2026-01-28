# EngineO.ai – Manual Testing: NAV-HIERARCHY-POLISH-1

> Derived from `MANUAL_TESTING_TEMPLATE.md`

---

## Overview

- **Purpose of the feature/patch:**
  Styling-only polish pass to establish clear visual hierarchy across navigation surfaces: Global Nav (strongest), Section Nav (demoted), Entity Tabs (view switchers), and Right Context Panel (auxiliary).

- **High-level user impact and what "success" looks like:**
  Users can instantly distinguish which UI elements navigate to different pages (Global Nav, Section Nav) versus which switch views within a page (Entity Tabs). The Right Context Panel reads as auxiliary contextual info, not navigation.

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase NAV-HIERARCHY-POLISH-1

- **Related documentation:**
  - docs/DESIGN_SYSTEM_ALIGNMENT.md
  - docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md
  - docs/UI_SHELL_DIRECTIONS.md

---

## Preconditions

- **Environment requirements:**
  - apps/web running locally
  - Dark mode toggle available for dark mode verification
  - Desktop viewport (>=1024px) for Global Nav and Section Nav comparison
  - Mobile viewport (<768px) for mobile drawer testing

- **Test accounts and sample data:**
  - Any authenticated account with project access
  - Project with products (for entity tab testing)

- **Required user roles or subscriptions:**
  - Standard user for most tests

---

## Test Scenarios (Happy Path)

### Scenario 1: Global Nav visual weight is strongest

**ID:** HP-001

**Preconditions:**

- [ ] Logged in and viewing any page with LayoutShell

**Steps:**

1. Observe the left sidebar (Global Nav).
2. Note the font weight of nav items.
3. Click a nav item to make it active.
4. Observe the active state styling.

**Expected Results:**

- UI: Nav item text uses font-medium (base state).
- UI: Active nav item uses font-semibold with bg-primary/10 and text-primary.
- UI: Global Nav items are visibly "heavier" than Section Nav items.

---

### Scenario 2: Section Nav visually demoted vs Global Nav

**ID:** HP-002

**Preconditions:**

- [ ] Logged in and on /projects/[id]/\* page

**Steps:**

1. Observe the ProjectSideNav (section headings: OPERATE, ASSETS, AUTOMATION, INSIGHTS, PROJECT).
2. Note the section heading styling.
3. Click a section item to make it active.
4. Compare active state to Global Nav active state.

**Expected Results:**

- UI: Section headings use font-medium text-muted-foreground/80 (reduced contrast vs Global Nav's font-semibold).
- UI: Active section item uses neutral bg-muted text-foreground (NO primary color).
- UI: Active section item does NOT have border-l-2 border-primary.
- UI: Section Nav reads as subordinate to Global Nav.

---

### Scenario 3: Entity Tabs read as view switchers (not nav)

**ID:** HP-003

**Preconditions:**

- [ ] On /projects/[id]/products/[productId] (Product Detail)

**Steps:**

1. Observe the tab bar (Metadata, Answers, Search & Intent, etc.).
2. Click different tabs.
3. Observe the active/inactive styling.

**Expected Results:**

- UI: Tab bar uses border-border (token, not gray-200).
- UI: Active tab: border-primary text-foreground.
- UI: Inactive tab: border-transparent text-muted-foreground.
- UI: Hover shows border-border text-foreground.
- UI: Tabs have focus-visible ring classes.
- UI: Issues tab count badge uses neutral tokens (border-border bg-muted text-muted-foreground), not red.

---

### Scenario 4: Work Queue Tabs token-only styling

**ID:** HP-004

**Preconditions:**

- [ ] On /projects/[id]/work-queue

**Steps:**

1. Observe the Work Queue tab bar (All, Critical, Needs Attention, etc.).
2. Click different tabs.
3. Verify focus-visible ring on keyboard navigation.

**Expected Results:**

- UI: Tab bar uses border-border.
- UI: Active tab: border-primary text-foreground.
- UI: Inactive tab: border-transparent text-muted-foreground.
- UI: Tabs have focus-visible ring classes.

---

### Scenario 5: Insights Subnav token-only styling

**ID:** HP-005

**Preconditions:**

- [ ] On /projects/[id]/insights

**Steps:**

1. Observe the Insights subnav (Summary, DEO Progress, AI Efficiency, etc.).
2. Click different tabs.
3. Verify focus-visible ring on keyboard navigation.

**Expected Results:**

- UI: Subnav uses border-border.
- UI: Active tab: border-primary text-foreground.
- UI: Inactive tab: border-transparent text-muted-foreground.
- UI: Tabs have focus-visible ring classes.

---

### Scenario 6: Asset detail pages (Pages/Collections) token-only tabs

**ID:** HP-006

**Preconditions:**

- [ ] On /projects/[id]/assets/pages/[pageId] or /projects/[id]/assets/collections/[collectionId]

**Steps:**

1. Observe the tab bar (Overview, Drafts).
2. Click between tabs.
3. Verify styling consistency.

**Expected Results:**

- UI: Tab bar uses border-border.
- UI: Active tab: border-primary text-foreground.
- UI: Inactive tab: border-transparent text-muted-foreground.
- UI: Tabs have focus-visible ring classes.
- UI: Back link uses text-primary (not indigo-600).

---

### Scenario 7: Mobile drawer token-only styling

**ID:** HP-007

**Preconditions:**

- [ ] On /projects/[id]/\* page
- [ ] Browser resized to <768px (mobile)

**Steps:**

1. Observe the "Project navigation" label and Menu button.
2. Click the Menu button to open the drawer.
3. Observe the drawer scrim (overlay background).
4. Observe the drawer panel surface.
5. Click the X button to close.

**Expected Results:**

- UI: "Project navigation" label uses text-muted-foreground.
- UI: Menu button uses token-based styling (bg-[hsl(var(--surface-card))], border-border, text-foreground).
- UI: Scrim uses bg-foreground/50 (not bg-black bg-opacity-40).
- UI: Drawer panel uses bg-[hsl(var(--surface-raised))] and border-border.
- UI: Close button uses token-based hover/focus-visible ring styles.

---

### Scenario 8: Dark mode contrast verification

**ID:** HP-008

**Preconditions:**

- [ ] Dark mode enabled

**Steps:**

1. Navigate through Global Nav, Section Nav, and Entity Tabs.
2. Verify no white or over-bright hover surfaces.
3. Verify text remains readable against dark backgrounds.

**Expected Results:**

- UI: All hover states use token-based colors (no white flashes).
- UI: Active states are distinguishable without being harsh.
- UI: Text contrast remains readable in dark mode.

---

### Scenario 9: Shopify embedded iframe check

**ID:** HP-009

**Preconditions:**

- [ ] Running as Shopify embedded app (host param set)

**Steps:**

1. Navigate through the app inside Shopify Admin iframe.
2. Verify no horizontal/vertical overflow.
3. Verify hierarchy remains readable.

**Expected Results:**

- UI: No scroll overflow issues.
- UI: Global Nav > Section Nav > Entity Tabs hierarchy remains clear.
- UI: All surfaces use token-based styling.

---

### Scenario 10: Command Palette unchanged

**ID:** HP-010

**Preconditions:**

- [ ] On any page with LayoutShell

**Steps:**

1. Press Cmd+K (or Ctrl+K).
2. Observe Command Palette opens.
3. Navigate with arrow keys.
4. Press ESC to close.

**Expected Results:**

- UI: Command Palette behavior unchanged by NAV-HIERARCHY-POLISH-1.
- UI: Styling is consistent (no regression).

---

### Scenario 11: Right Context Panel unchanged behavior

**ID:** HP-011

**Preconditions:**

- [ ] RCP demo trigger available (Details button in LayoutShell canvas bar)

**Steps:**

1. Click the Details button to open RCP.
2. Verify panel opens with slide-in animation.
3. Click pin toggle, width toggle, view tabs.
4. Press ESC or click X to close.

**Expected Results:**

- UI: RCP behavior unchanged by NAV-HIERARCHY-POLISH-1.
- UI: RCP reads as auxiliary/contextual (not navigation).
- UI: No styling regression.

---

## Edge Cases

### EC-001: Nav hierarchy with all items active

**Description:** Verify visual distinction when multiple nav surfaces have active items.

**Steps:**

1. Navigate to /projects/[id]/products/[productId]?tab=issues.
2. Observe: Global Nav (Projects active), Section Nav (Products active), Entity Tabs (Issues active).

**Expected Behavior:**

- Global Nav active is most prominent (font-semibold, bg-primary/10 text-primary).
- Section Nav active is secondary (font-medium, bg-muted text-foreground, no primary).
- Entity Tabs active is tertiary (border-primary text-foreground, no background).

---

### EC-002: Focus ring consistency across nav types

**Description:** Keyboard navigation should show consistent focus rings.

**Steps:**

1. Tab through Global Nav items.
2. Tab through Section Nav items.
3. Tab through Entity Tab items.

**Expected Behavior:**

- All nav types show focus-visible:ring-2 ring-primary ring-offset-2 ring-offset-background.

---

## Error Handling

No error states introduced by this phase (styling-only).

---

## Limits

No limits introduced by this phase (styling-only).

---

## Regression

### Areas potentially impacted:

- [ ] Dark mode styling (all surfaces token-based)
- [ ] Shopify embedded mode (no overflow)
- [ ] Command Palette z-index and behavior
- [ ] Right Context Panel behavior

### Quick sanity checks:

- [ ] Global Nav: font-medium base, font-semibold active with bg-primary/10
- [ ] Section Nav: font-medium headings with /80 opacity, neutral active (no primary)
- [ ] Entity Tabs: border-primary active, border-transparent inactive, border-border hover
- [ ] Mobile drawer: token-only scrim, surface, close button
- [ ] Dark mode: no white hover surfaces

---

## Post-Conditions

### Data cleanup steps:

- [ ] None (styling-only UI feature)

---

## Known Issues

- None. This is a styling-only phase with no functional/behavioral changes.

---

## Approval

- [ ] QA verified all Happy Path scenarios
- [ ] Edge cases reviewed
- [ ] Regression areas checked
