# EngineO.ai – Manual Testing: RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1

> Derived from `MANUAL_TESTING_TEMPLATE.md`

---

## Overview

- **Purpose of the feature/patch:**
  Add a deterministic Right Context Panel to the UI shell that provides contextual details without blocking the main work canvas.

- **High-level user impact and what "success" looks like:**
  Users can click a "Details" button to open a slide-in panel on the right side. The panel displays contextual information, can be closed via button or ESC key, and auto-closes when navigating to a different nav section. Panel supports context switching (showing different content without close/reopen).

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1

- **Related documentation:**
  - `docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md`
  - `docs/RIGHT_CONTEXT_PANEL_CONTRACT.md`
  - `docs/UI_SHELL_DIRECTIONS.md`
  - `docs/manual-testing/LAYOUT-SHELL-IMPLEMENTATION-1.md`

---

## Preconditions

- **Environment requirements:**
  - apps/web running locally
  - Dark mode enabled (set localStorage.engineo_theme = "dark" or use in-app theme controls if present)

- **Test accounts and sample data:**
  - Any authenticated account that can reach /dashboard and /projects

- **Required user roles or subscriptions:**
  - None for panel validation; role impacts only route access

---

## Test Scenarios (Happy Path)

### Scenario 1: Panel opens via Details button

**ID:** HP-001

**Preconditions:**

- [ ] Shell is visible (e.g., /dashboard)
- [ ] Right Context Panel is closed

**Steps:**

1. Navigate to /dashboard.
2. Click the "Details" button in the canvas header.
3. Observe the panel sliding in from the right.

**Expected Results:**

- UI: Right Context Panel slides in from the right edge; displays "Demo Details A" title with subtitle and metadata.
- API: N/A
- Logs: N/A

---

### Scenario 2: Panel closes via close button

**ID:** HP-002

**Preconditions:**

- [ ] Right Context Panel is open

**Steps:**

1. Click the X (close) button in the panel header.
2. Observe the panel closing.

**Expected Results:**

- UI: Panel slides out/disappears; focus returns to previously active element.
- API: N/A

---

### Scenario 3: Panel closes via ESC key

**ID:** HP-003

**Preconditions:**

- [ ] Right Context Panel is open
- [ ] No modal dialogs are open
- [ ] Focus is NOT in a text input, textarea, select, or contenteditable element

**Steps:**

1. Press the ESC key.
2. Observe the panel closing.

**Expected Results:**

- UI: Panel closes; focus returns to previously active element.
- API: N/A

---

### Scenario 4: Panel auto-closes on nav segment change

**ID:** HP-004

**Preconditions:**

- [ ] Right Context Panel is open on /dashboard

**Steps:**

1. Click on "Projects" in the left navigation.
2. Observe the panel behavior.

**Expected Results:**

- UI: Panel automatically closes when navigating to a different nav section (/projects).
- API: N/A

---

### Scenario 5: Desktop pinned mode (≥1024px)

**ID:** HP-005

**Preconditions:**

- [ ] Browser window width ≥1024px
- [ ] Right Context Panel is open

**Steps:**

1. Verify the panel is displayed alongside the main content.
2. Verify no scrim/overlay is visible.
3. Verify main content area shrinks to accommodate panel.

**Expected Results:**

- UI: Panel is pinned; no scrim; content area adjusts width.
- API: N/A

---

### Scenario 6: Narrow overlay mode (<1024px)

**ID:** HP-006

**Preconditions:**

- [ ] Browser window width <1024px
- [ ] Right Context Panel is open

**Steps:**

1. Verify the panel overlays the content.
2. Verify a dark scrim appears behind the panel (but does NOT cover the Top Bar).
3. Click the scrim.

**Expected Results:**

- UI: Panel overlays content with scrim; scrim is contained to the content area below Top Bar; clicking scrim closes panel.
- API: N/A

---

### Scenario 7: Dark mode surface integrity

**ID:** HP-007

**Preconditions:**

- [ ] Dark mode active
- [ ] Right Context Panel is open

**Steps:**

1. Inspect panel background, borders, and text.
2. Hover over close button.

**Expected Results:**

- UI: No unexpected white surfaces; borders and text remain readable; hover states work correctly.
- API: N/A

---

### Scenario 8: Context switching (A → B while open)

**ID:** HP-008

**Preconditions:**

- [ ] Shell is visible (e.g., /dashboard)
- [ ] Right Context Panel is closed

**Steps:**

1. Click the "Details" button to open the panel with "Demo Details A".
2. Verify panel shows "Demo Details A" title.
3. Click the "Details" button again while panel is open.
4. Observe the panel content change.

**Expected Results:**

- UI: Panel switches to "Demo Details B" content without closing/reopening (no flicker, no navigation). Title changes to "Demo Details B", metadata changes to show "Pending" status and "Secondary" type.
- API: N/A
- Logs: N/A

---

### Scenario 9: Shopify embedded iframe interaction

**ID:** HP-009

**Preconditions:**

- [ ] App running inside Shopify Admin as embedded app (iframe)
- [ ] Dark mode active (optional but recommended)

**Steps:**

1. Open the app inside Shopify Admin.
2. Click the "Details" button to open the Right Context Panel.
3. Verify panel opens correctly within the iframe.
4. Scroll the main content in the Center Work Canvas.
5. Close the panel via close button or ESC.

**Expected Results:**

- UI: Panel opens/closes correctly; scroll is contained to Center Work Canvas only; no double scrollbars; panel overlay (in narrow mode) does NOT cover the persistent Top Bar; Top Bar and Left Nav remain visible and interactive.
- API: N/A

---

## Edge Cases

### EC-001: ESC key with modal dialog open

**Description:** ESC key should not close the panel when a modal dialog is active.

**Steps:**

1. Open Right Context Panel.
2. Open a modal dialog (if available in the app).
3. Press ESC.

**Expected Behavior:**

- Modal dialog closes (if it handles ESC); panel remains open.

---

### EC-002: Rapid toggle clicks

**Description:** Rapidly clicking the Details button should not cause inconsistent state.

**Steps:**

1. Click the Details button multiple times rapidly.

**Expected Behavior:**

- Panel state remains consistent (open or closed); no visual glitches.

---

### EC-003: Focus management

**Description:** Focus should return to the triggering element when panel closes.

**Steps:**

1. Focus the Details button using keyboard (Tab).
2. Press Enter to open panel.
3. Close panel via ESC.

**Expected Behavior:**

- Focus returns to the Details button.

---

### EC-004: ESC key with focus in text input

**Description:** ESC key should NOT close the panel when focus is in an editable element (input, textarea, select, contenteditable).

**Steps:**

1. Open Right Context Panel.
2. If there's a text input anywhere on the page, focus it (or add one temporarily for testing).
3. Press ESC while focus is in the text input.

**Expected Behavior:**

- Panel remains open; ESC does not close panel when focus is in editable element.

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

**Scenario:** N/A (layout-only phase)

**Steps:**

1. N/A

**Expected Behavior:**

- N/A

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

- [ ] Left Navigation collapse/expand (should not interfere)
- [ ] Main content scroll containment
- [ ] Dark mode surfaces
- [ ] Shopify embedded iframe scroll behavior

### Quick sanity checks:

- [ ] Left Nav toggle still works with panel open
- [ ] Main content scrolls independently
- [ ] Panel does not cause double scrollbars
- [ ] ESC key only closes panel when no modals are open and focus not in editable element
- [ ] Panel overlay does not cover Top Bar (container-contained)

---

## Post-Conditions

### Data cleanup steps:

- [ ] None
