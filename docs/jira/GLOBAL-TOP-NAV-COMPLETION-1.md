# Jira Story: EA-53 — GLOBAL-TOP-NAV-COMPLETION-1 (REFINED)

**Type:** Story  
**Priority:** Medium  
**Labels:** navigation, top-nav, uep-accepted, ready-for-execution, trust, control-plane

---

## Summary

Complete the Global Top Navigation contract by introducing clear, consistent access to primary product areas, while preserving the existing control-plane utilities.

---

## Problem

The current top navigation functions as a control-plane utility bar, but does not provide primary product navigation across major EngineO.ai areas.

Users must rely on:

- side navigation
- deep links
- back navigation

This makes the product feel fragmented and harder to reason about at scale.

---

## User Risk

- Users cannot quickly move between major product areas
- Navigation feels inconsistent across contexts
- Product feels "unfinished" despite feature completeness
- New users struggle to build a mental map of the system

---

## Intent (Authoritative)

Complete the Global Top Navigation contract by introducing clear, consistent access to primary product areas, while preserving the existing control-plane utilities.

The top nav should answer:

"Where am I, and where else can I go — safely?"

---

## Scope (IN)

### 1. Primary Product Navigation (Additive)

Introduce top-level navigation entries for:

- Projects
- Content
- Products
- Media (explicitly marked as placeholder / coming soon)
- Automations
- Performance
- Billing

These may be: text links, a segmented nav, a dropdown / overflow menu. UEP does not prescribe layout — only behavior and truthfulness.

### 2. Coexistence with Control Plane Utilities

Preserve and coexist with existing top-nav elements:

- Search
- Notifications
- Tenant selector
- User menu

No removal or regression of current utilities.

### 3. Route Integrity & Truthfulness

- Every nav item must land on a valid route
- If a section is not ready: mark as "Coming soon", do not allow dead clicks
- No placeholder that looks functional but isn't

### 4. Active State & Orientation

- Current section must be visually obvious
- Users should always know "where they are" at the top level

### 5. Responsive & Scalable Behavior

- Works on smaller screens
- Supports overflow without hiding core destinations
- Does not break keyboard or focus navigation

---

## Explicitly OUT of Scope (Hard Line)

- No new product areas
- No new features behind nav items
- No automation execution shortcuts
- No changes to governance or apply flows
- No removal of side navigation (this is additive, not a redesign)

---

## Trust Contract

The top nav must:

- Never imply execution ("Run", "Apply", "Optimize")
- Never bypass intent confirmation
- Never imply automation happens automatically

Navigation ≠ action.

---

## Acceptance Criteria

- Users can navigate between all major product areas from the top nav
- Control-plane utilities remain intact and functional
- No dead or misleading nav items
- Media is clearly labeled as non-functional if not ready
- Navigation feels calm, predictable, and complete

---

## Definition of Done (UEP)

A first-time user can understand the shape of the EngineO.ai product just by looking at the top nav — without clicking anything risky.

---

## Notes

- Supervisor: treat as **navigation completion**, not IA redesign, not feature expansion.
- Let autonomous-agent generate KAN epics/stories from this EA.
