# Jira Story: EA-56 — GLOBAL-NAV-RESPONSIVE-&-ACCESSIBILITY-INTEGRITY-1

**Type:** Story  
**Priority:** Medium  
**Labels:** navigation, top-nav, responsive, accessibility, trust

---

## Summary

Make the Top Nav resilient, accessible, and consistent across devices.

---

## Problem

Even a visually nice nav can fail if it's not robust on smaller screens or via keyboard.

---

## User Risk

Users experience friction (or broken flows) during critical moments like Apply, Review, and switching areas.

---

## Intent

Make the Top Nav resilient, accessible, and consistent across devices.

---

## Scope (IN)

- Responsive handling for narrower widths (no hidden-primary-nav surprise)
- Keyboard navigation correctness:
  - tab order
  - focus visibility
  - no "lost focus" in menus
- Screen reader semantics for:
  - active state
  - disabled "coming soon"

---

## Explicitly OUT of scope (HARD LINE)

- Any new interaction paradigms that add friction (no new wizards)
- Adding new nav features

---

## Acceptance Criteria

- Primary nav remains usable at common laptop widths without overflow chaos
- Keyboard users can access all nav items and utilities reliably
- Disabled items are announced correctly and don't trap focus

---

## Notes

Recommended execution order: 3 (EA-56 third — lock responsiveness + accessibility).
