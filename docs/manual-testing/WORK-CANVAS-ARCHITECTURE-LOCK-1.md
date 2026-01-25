# Manual Testing Checklist: WORK-CANVAS-ARCHITECTURE-LOCK-1

**Phase**: WORK-CANVAS-ARCHITECTURE-LOCK-1
**Date**: 2026-01-23
**Tester**: ******\_\_\_******

## Purpose

Validate the structural contracts and visual hierarchy established in WORK-CANVAS-ARCHITECTURE-LOCK-1. This checklist ensures the layout system maintains clear boundaries between components.

---

## Pre-Test Setup

- [ ] Application is running locally or on staging
- [ ] Browser DevTools available for inspection
- [ ] Test on desktop viewport (≥1024px)
- [ ] Test on narrow viewport (<1024px) where applicable

---

## 1. Left Rail (Global Scope)

### Icon-Only Always [FIXUP-1]

- [ ] Left rail shows icons only at ALL times (no expanded label state)
- [ ] No collapse/expand toggle button exists
- [ ] No "Navigation" heading label visible
- [ ] Tooltip/title appears on hover for each nav item (accessibility)
- [ ] Each nav item has `aria-label` for screen reader accessibility
- [ ] No badges or counters visible on any nav item
- [ ] Active state is clear (primary color treatment)
- [ ] Left rail width is fixed at 72px

### Domain Reset

- [ ] Clicking left rail nav item navigates to top-level domain view
- [ ] Left rail maintains visual separation from center pane (border visible)

### Visual Check

- [ ] Left rail background is `surface-card` token (slightly elevated from canvas)
- [ ] Right border clearly separates left rail from center pane

---

## 2. Center Pane (Work Canvas)

### Visual Hierarchy

- [ ] Center pane reads as "first-class" surface (primary workspace)
- [ ] Background is stable `background` token (main canvas)
- [ ] Clear visual distinction from side surfaces (left rail, RCP)

### Header Structure

- [ ] Breadcrumbs appear above title (small, secondary styling)
- [ ] Title is prominent (larger, semibold)
- [ ] Description (if present) is muted, below title
- [ ] Actions (if present) are right-aligned

### No Ambiguous Global Action

- [ ] Center pane header does NOT contain a generic "Action" button
- [ ] Any action buttons are context-specific to the current view

### Breadcrumb Format

- [ ] Project routes show: `Projects > {Project Name} > {Scoped Area}`
- [ ] Admin routes show: `Admin > {Section}`
- [ ] Breadcrumbs are visually secondary to title

---

## 3. Scoped Navigation (ProjectSideNav)

### Distinct Container

- [ ] Scoped nav is wrapped in a distinct container surface
- [ ] Container has `surface-card` background with border
- [ ] Container visually separates scoped nav from center content
- [ ] Container does NOT compete visually with left rail

### Active State Affordance

- [ ] Active item has visible accent bar (left edge)
- [ ] Active item has increased font weight (semibold)
- [ ] Active state is subtle relative to global nav
- [ ] No icons visible in scoped nav items
- [ ] No counters/badges visible in scoped nav items

### "Inside This Project" Cue

- [ ] Scoped nav clearly reads as "inside the current project"
- [ ] Visual hierarchy: Global nav > Scoped nav

---

## 4. Right Context Panel (RCP)

### No Navigation/Mode Controls

- [ ] Only close button (X) is visible in header
- [ ] No view tabs visible
- [ ] No mode switching controls visible
- [ ] No width toggle visible

### Navigation Affordance

- [ ] External-link icon is visible in header (when applicable)
- [ ] External-link opens full page (navigates away)
- [ ] This is the ONLY navigation affordance in RCP

### RCP Does Not Change Route

- [ ] Interacting with RCP content does NOT change the URL path
- [ ] RCP displays context only, does not navigate

### Visual Separation

- [ ] Left border clearly separates RCP from center pane
- [ ] RCP background is `surface-raised` token (elevated surface)

### Title Hierarchy

- [ ] Center pane title is visually primary
- [ ] RCP title is visually secondary (smaller, less prominent)

---

## 5. Shopify Embedded Iframe Sanity

### No Overflow Issues

- [ ] When RCP is open, no horizontal scrollbar appears
- [ ] Content does not overflow layout boundaries
- [ ] No nested-frame visual artifacts

### Layout Stability

- [ ] Opening/closing RCP does not cause layout jank
- [ ] Center pane content remains stable when RCP toggles

---

## 6. Divider Clarity

### Left Rail → Center Pane

- [ ] Vertical border is visible between left rail and center pane
- [ ] Border uses `border-border` token (consistent color)

### Center Pane → RCP

- [ ] Vertical border is visible between center pane and RCP
- [ ] Border uses `border-border` token (consistent color)

### Header Dividers

- [ ] Top header has bottom border (global header)
- [ ] Center pane header has bottom border (separates from content)

---

## Test Results Summary

| Section       | Pass | Fail | Notes |
| ------------- | ---- | ---- | ----- |
| Left Rail     |      |      |       |
| Center Pane   |      |      |       |
| Scoped Nav    |      |      |       |
| RCP           |      |      |       |
| Iframe Sanity |      |      |       |
| Dividers      |      |      |       |

---

## Issues Found

| Issue # | Description | Severity | Screenshot |
| ------- | ----------- | -------- | ---------- |
|         |             |          |            |

---

## Sign-Off

- [ ] All critical checks pass
- [ ] No blocking issues identified
- [ ] Ready for phase completion

**Tester Signature**: ******\_\_\_******
**Date**: ******\_\_\_******
