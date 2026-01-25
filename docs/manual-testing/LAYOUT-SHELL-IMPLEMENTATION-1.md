# EngineO.ai – Manual Testing: LAYOUT-SHELL-IMPLEMENTATION-1

> Derived from MANUAL_TESTING_TEMPLATE.md

---

## Overview

- **Purpose of the feature/patch:**
  Establish the canonical EngineO.ai UI shell (Top Bar + Collapsible Left Nav + Center Work Canvas) per Design System v1.5, with layout-only placeholders.

- **High-level user impact and what "success" looks like:**
  The app has a stable structural frame that does not scroll the Top Bar or Left Nav, and page content mounts cleanly inside the Center Work Canvas with internal scroll containment.

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase LAYOUT-SHELL-IMPLEMENTATION-1

- **Related documentation:**
  - ENGINEERING_IMPLEMENTATION_CONTRACT.md
  - UI_SHELL_DIRECTIONS.md
  - UI_SHELL_WALKTHROUGH.md
  - DARK-MODE-SYSTEM-1.md
  - SHOPIFY_INTEGRATION.md

---

## Preconditions

- **Environment requirements:**
  - apps/web running locally
  - Dark mode enabled (set localStorage.engineo_theme = "dark" or use in-app theme controls if present)
  - For Shopify embedded verification: NEXT_PUBLIC_SHOPIFY_API_KEY configured and Shopify embedded app set up per SHOPIFY_INTEGRATION.md

- **Test accounts and sample data:**
  - Any authenticated account that can reach /dashboard and /projects
  - (Optional) Admin-capable account to reach /admin

- **Required user roles or subscriptions:**
  - None for layout validation; role impacts only route access

---

## Test Scenarios (Happy Path)

### Scenario 1: Standalone shell renders with Top Bar + Left Nav + Canvas

**ID:** HP-001

**Preconditions:**

- [ ] App loads in standalone web context (not Shopify iframe)
- [ ] Dark mode active

**Steps:**

1. Navigate to /dashboard.
2. Confirm Top Bar is visible and does not scroll away.
3. Confirm Left Navigation is visible on the left.
4. Scroll page content.

**Expected Results:**

- UI: Top Bar remains visible; Left Nav remains visible; only Center Work Canvas scrolls.
- API: N/A
- Logs: N/A

---

### Scenario 2: Left Nav is icon-only always (OBSOLETE - see WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1)

**ID:** HP-002

> ⚠️ **OBSOLETE**: This scenario is superseded by WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1.
> The left rail is now icon-only always with no collapse/expand toggle.
> See `docs/manual-testing/WORK-CANVAS-ARCHITECTURE-LOCK-1.md` for current test scenarios.

**Preconditions:**

- [ ] Shell is visible (e.g., /dashboard)

**Steps:**

1. ~~Click the Left Nav toggle to collapse.~~ (Toggle removed)
2. Confirm left rail shows icons only (no labels visible).
3. Confirm no collapse/expand toggle exists.
4. Confirm left rail width is fixed at 72px.
5. Refresh the page.
6. Confirm left rail remains icon-only (no state change).

**Expected Results:**

- UI: Left rail is always icon-only; no collapse/expand toggle; no localStorage persistence needed.
- API: N/A

---

### Scenario 3: Dark mode surface integrity (no unexpected white)

**ID:** HP-003

**Preconditions:**

- [ ] Dark mode active

**Steps:**

1. Visit /dashboard, /projects, and (if authorized) /admin.
2. Inspect Top Bar, Left Nav, Canvas header, and Canvas background.
3. Hover over nav items and placeholder controls.

**Expected Results:**

- UI: No unexpected white surfaces in dark mode; hover states do not turn white; borders and text remain readable.
- API: N/A

---

### Scenario 4: Shopify embedded iframe layout integrity

**ID:** HP-004

**Preconditions:**

- [ ] App opened from Shopify Admin as embedded app (iframe)
- [ ] Dark mode active

**Steps:**

1. Open the app inside Shopify Admin.
2. Confirm Top Bar and Left Nav render correctly within the iframe.
3. Scroll content within the Center Work Canvas.

**Expected Results:**

- UI: Scroll is contained to the Center Work Canvas; no double-scrollbars; Top Bar and Left Nav do not scroll away.
- API: N/A

---

## Edge Cases

### EC-001: Laptop width responsiveness (no overlap)

**Description:** Verify common laptop widths do not cause overlaps between Top Bar, Left Nav, and Canvas.

**Steps:**

1. Resize to ~1024px width (or similar).
2. ~~Collapse and expand Left Nav.~~ (Toggle removed per WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1)
3. Verify left rail remains icon-only at fixed 72px width.

**Expected Behavior:**

- No overlap; Canvas remains usable; header and nav remain visible; left rail is icon-only.

---

## Error Handling

### ERR-001: External Service Failure (Stripe/Shopify/AI Provider)

**Scenario:** N/A (layout-only phase)

**Steps:**

1. N/A

**Expected Behavior:**

- N/A

---

### ERR-002: Validation Errors

**Scenario:** N/A (layout-only phase)

**Steps:**

1. N/A

**Expected Behavior:**

- N/A

---

### ERR-003: Permission Failures

**Scenario:** Non-admin user attempts to access /admin.

**Steps:**

1. Navigate to /admin as a non-admin user.

**Expected Behavior:**

- Redirects away per existing authorization logic; shell should not cause blank/overlapping layout.

---

## Limits

### LIM-001: Entitlement/Quota Limit

**Scenario:** N/A (layout-only phase)

**Steps:**

1. N/A

**Expected Behavior:**

- N/A

---

### LIM-002: [Another Limit Scenario]

**Scenario:** N/A (layout-only phase)

**Steps:**

1. N/A

**Expected Behavior:**

- N/A

---

## Regression

### Areas potentially impacted:

- [ ] Standalone rendering: Root layout backgrounds and loading fallback theming
- [ ] Shopify embedded rendering: Verify shell does not introduce double-scrollbars
- [ ] Dark mode: Token-driven surfaces remain correct

### Quick sanity checks:

- [ ] /login and marketing routes still render without the shell
- [ ] /projects and /dashboard render with shell
- [ ] ~~Left Nav toggle persists after refresh~~ (OBSOLETE - toggle removed per WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1)
- [ ] Left rail is icon-only always (no expand state)

---

## Post-Conditions

### Data cleanup steps:

- [ ] None
