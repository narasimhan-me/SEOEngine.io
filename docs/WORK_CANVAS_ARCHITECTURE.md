# Work Canvas Architecture Contract

**Phase**: WORK-CANVAS-ARCHITECTURE-LOCK-1
**Status**: Active
**Last Updated**: 2026-01-23

## Overview

This document defines the structural contracts for the EngineO.ai Work Canvas layout system. These contracts establish clear boundaries between the Left Rail (global navigation), Center Pane (work canvas), and Right Context Panel (RCP) to ensure predictable, maintainable UI behavior.

---

## Layout Components

### 1. Left Rail (Global Scope)

**Responsibility**: Domain-level navigation across the entire application.

**Constraints**:
- Icon-only always visible (no expand/collapse toggle) [FIXUP-1]
- Labels provided via `aria-label` and `title` attributes for accessibility
- No visible label text, no badges, counters, or status indicators
- Clear active-state visual (primary color treatment)
- "Domain reset" behavior: navigating via left rail resets to top-level domain views

**Visual**:
- Background: `bg-[hsl(var(--surface-card))]`
- Border: `border-r border-border` (persistent divider from center pane)
- Width: Fixed 72px (icon-only, no expanded state) [FIXUP-1]

### 2. Center Pane (Work Canvas)

**Responsibility**: Primary workspace for viewing and manipulating content.

**Constraints**:
- First-class visual treatment (stable, distinct background)
- Contains page-specific header (breadcrumbs, title, description, actions)
- Actions are context-specific only - NO global "Action" button
- Scoped navigation (ProjectSideNav) lives within center pane content area

**Visual**:
- Background: `bg-background` (primary canvas surface)
- Clear border separation from left rail and RCP
- Header: `bg-[hsl(var(--surface-card))]` with bottom border

**Header Hierarchy**:
1. Breadcrumbs (small, secondary): `text-xs text-muted-foreground`
2. Title (primary): `text-sm font-semibold text-foreground`
3. Description (optional): `text-xs text-muted-foreground`
4. Actions (right-aligned): Context-specific buttons only

**Breadcrumb Format**:
- Project routes: `Projects > {Project Name} > {Scoped Area}`
- Admin routes: `Admin > {Section}`

### 3. Right Context Panel (RCP)

**Responsibility**: Contextual information display for the selected entity.

**Constraints**:
- NO navigation controls (no tabs, no mode switching)
- Only controls: Close button (X), ESC key, scrim click
- Header external-link is the ONLY navigation affordance
- RCP NEVER changes route - it is read-only context display
- State is DERIVED from route context (not independently routed)

**Visual**:
- Background: `bg-[hsl(var(--surface-raised))]` (elevated surface)
- Border: `border-l border-border` (persistent divider from center pane)
- Width: Fixed 320px (`w-80`)

**Content Rhythm** (top → bottom):
1. Why this matters now
2. Impact/risk/opportunity
3. What can be done next
4. Optional deep detail (expandable)

---

## Navigation Rules

### Where Navigation IS Allowed

| Component | Navigation Affordance |
|-----------|----------------------|
| Left Rail | Domain-level links (Dashboard, Projects, Settings, Help, Admin) |
| Center Pane Header | Breadcrumb links (passive, for orientation) |
| Center Pane Content | All in-content links and actions |
| Scoped Nav (ProjectSideNav) | Project-scoped section links |
| RCP Header | External-link icon only (opens full page) |

### Where Navigation IS NOT Allowed

| Component | Forbidden |
|-----------|-----------|
| Left Rail | No inline navigation within items |
| RCP | No internal navigation, no route changes, no mode switching |

---

## URL/State Policy

### URL Represents
- Current domain (dashboard, projects, settings, admin)
- Current project (when in project scope)
- Current asset/entity (when viewing detail)
- RCP panel state (via query params for deep-linking)

### RCP State Derivation
- RCP state is DERIVED from route context
- URL may reflect RCP selection (deep-links supported)
- Provider does NOT introduce new routing decisions
- Dismissal behavior: "respect intent until context meaningfully changes"

### Query Parameters
```
?panel=details&entityType={type}&entityId={id}&entityTitle={title}
```

---

## Visual Constraints

### Dividers
- Left Rail → Center Pane: `border-r border-border` on left rail
- Center Pane → RCP: `border-l border-border` on RCP

### Typography Priority
1. Center Pane title (primary)
2. RCP title (secondary)
3. All other text follows design system hierarchy

### Surface Hierarchy
1. `bg-background` - Primary canvas (center pane main area)
2. `bg-[hsl(var(--surface-card))]` - Secondary surfaces (left rail, headers, scoped nav)
3. `bg-[hsl(var(--surface-raised))]` - Elevated surfaces (RCP)

---

## Action Hierarchy

### Primary Actions
- Live in center pane header (right-aligned)
- Context-specific only (no global action bar)
- Button hierarchy: Primary → Secondary → Ghost

### Secondary Actions
- In-content buttons and links
- Table row actions
- Form submit/cancel

### RCP Actions
- External-link (opens full page) - header only
- Close (X button) - header only
- No other action buttons in RCP

---

## Out of Scope (This Phase)

The following are explicitly NOT addressed in WORK-CANVAS-ARCHITECTURE-LOCK-1:
- Content authoring within RCP
- RCP width customization
- Multi-panel layouts
- Mobile-specific navigation patterns
- Keyboard navigation enhancements
- Animation/transition refinements
- Left rail expand/collapse toggle (explicitly removed in FIXUP-1)

---

## Implementation Files

| File | Role |
|------|------|
| `LayoutShell.tsx` | Shell layout, left rail, center pane structure |
| `ProjectSideNav.tsx` | Scoped navigation within project context |
| `RightContextPanel.tsx` | RCP UI component |
| `RightContextPanelProvider.tsx` | RCP state management and autonomy logic |
| `CenterPaneHeaderProvider.tsx` | Per-page header state management |

---

## Related Documents

- `RIGHT_CONTEXT_PANEL_CONTRACT.md` - RCP-specific behavioral contract
- `UI_SHELL_DIRECTIONS.md` - UI shell design direction
- `DEO_INFORMATION_ARCHITECTURE.md` - Information architecture reference
