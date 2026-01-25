# EngineO.ai – Manual Testing: COMMAND-PALETTE-IMPLEMENTATION-1

> Derived from MANUAL_TESTING_TEMPLATE.md

---

## Overview

- **Purpose of the feature/patch:**
  Add a global Command Palette accessible via keyboard shortcut or top-bar trigger. Provides quick navigation and entity jump commands without destructive/write/apply/run/generate actions. Token-only styling, dark-mode native, Shopify iframe safe.

- **High-level user impact and what "success" looks like:**
  Users can press Cmd+K (Mac) or Ctrl+K (Windows/Linux) or click the search bar to open a centered command palette. The palette shows navigation commands, entity jump placeholders, and utility commands. Users can navigate with arrow keys and execute with Enter. The palette closes via ESC, outside click, or command execution. Focus is properly restored after closing.

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase COMMAND-PALETTE-IMPLEMENTATION-1

- **Related documentation:**
  - docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md
  - docs/DESIGN_SYSTEM_ALIGNMENT.md
  - docs/manual-testing/LAYOUT-SHELL-IMPLEMENTATION-1.md
  - docs/manual-testing/RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md

---

## Preconditions

- **Environment requirements:**
  - apps/web running locally
  - Dark mode enabled (set localStorage.engineo_theme = "dark" or use in-app theme controls if present)
  - For Shopify embedded verification: NEXT_PUBLIC_SHOPIFY_API_KEY configured

- **Test accounts and sample data:**
  - Any authenticated account
  - Admin account (role === 'ADMIN' with adminRole present) for admin command visibility tests

- **Required user roles or subscriptions:**
  - Standard user for most tests
  - Admin user for admin command visibility test

---

## Test Scenarios (Happy Path)

### Scenario 1: Open via keyboard shortcut (Cmd+K / Ctrl+K)

**ID:** HP-001

**Preconditions:**

- [ ] Logged in and on any shell page (e.g., /dashboard, /projects)
- [ ] Command palette is closed

**Steps:**

1. Press Cmd+K (Mac) or Ctrl+K (Windows/Linux).
2. Observe the palette appearance.

**Expected Results:**

- UI: Command palette overlay appears centered on screen with search input auto-focused.
- API: N/A
- Logs: N/A

---

### Scenario 2: Open via top-bar trigger click

**ID:** HP-002

**Preconditions:**

- [ ] Logged in and on any shell page
- [ ] Command palette is closed

**Steps:**

1. Click the search bar / "Search..." button in the top bar.
2. Observe the palette appearance.

**Expected Results:**

- UI: Command palette overlay appears centered with search input auto-focused.
- API: N/A

---

### Scenario 3: Close via ESC key

**ID:** HP-003

**Preconditions:**

- [ ] Command palette is open

**Steps:**

1. Press ESC.
2. Observe the palette behavior.

**Expected Results:**

- UI: Command palette closes. Focus returns to the element that was focused before opening (e.g., the search trigger button).
- API: N/A

---

### Scenario 4: Close via outside click

**ID:** HP-004

**Preconditions:**

- [ ] Command palette is open

**Steps:**

1. Click anywhere on the scrim (semi-transparent overlay outside the dialog).
2. Observe the palette behavior.

**Expected Results:**

- UI: Command palette closes. Focus returns to the opener element.
- API: N/A

---

### Scenario 5: Focus restoration after close

**ID:** HP-005

**Preconditions:**

- [ ] On any shell page
- [ ] Command palette is closed

**Steps:**

1. Focus the search trigger button (Tab to it or click it then close).
2. Press Cmd+K to open palette.
3. Press ESC to close.
4. Observe which element has focus.

**Expected Results:**

- UI: Focus returns to the element that had focus before opening (the search trigger button).
- API: N/A

---

### Scenario 6: Arrow navigation and Enter execution

**ID:** HP-006

**Preconditions:**

- [ ] Command palette is open with default commands visible

**Steps:**

1. Press ArrowDown twice to move selection.
2. Observe selection highlight changes.
3. Press ArrowUp once.
4. Observe selection highlight changes.
5. Press Enter.
6. Observe navigation.

**Expected Results:**

- UI: Selection highlight moves with arrow keys. Enter executes the selected command and closes the palette. Browser navigates to the command's destination.
- API: N/A

---

### Scenario 7: Navigation commands route correctly (project context)

**ID:** HP-007

**Preconditions:**

- [ ] Logged in and on a project detail page (e.g., /projects/[id]/overview)
- [ ] Command palette is closed

**Steps:**

1. Open command palette with Cmd+K.
2. Select "Go to Assets" and press Enter.
3. Observe the navigation.

**Expected Results:**

- UI: Browser navigates to /projects/[id]/assets/pages (preserves project context).
- API: N/A

---

### Scenario 8: Navigation commands route correctly (non-project fallback)

**ID:** HP-008

**Preconditions:**

- [ ] Logged in and on a non-project page (e.g., /dashboard or /settings)
- [ ] Command palette is closed

**Steps:**

1. Open command palette with Cmd+K.
2. Select "Go to Assets" and press Enter.
3. Observe the navigation.

**Expected Results:**

- UI: Browser navigates to /projects (safe fallback when not in project context).
- API: N/A

---

### Scenario 9: Admin command visibility (admin user)

**ID:** HP-009

**Preconditions:**

- [ ] Logged in as admin user (role === 'ADMIN' AND adminRole present)
- [ ] Command palette is closed

**Steps:**

1. Open command palette with Cmd+K.
2. Look for "Go to Admin" command in the Navigation section.

**Expected Results:**

- UI: "Go to Admin" command is visible in the command list.
- API: N/A

---

### Scenario 10: Admin command visibility (non-admin user)

**ID:** HP-010

**Preconditions:**

- [ ] Logged in as standard user (role !== 'ADMIN' OR adminRole not present)
- [ ] Command palette is closed

**Steps:**

1. Open command palette with Cmd+K.
2. Look for "Go to Admin" command in the Navigation section.

**Expected Results:**

- UI: "Go to Admin" command is NOT visible in the command list (role-gated).
- API: N/A

---

### Scenario 11: Unsaved changes confirm blocks navigation when canceled

**ID:** HP-011

**Preconditions:**

- [ ] On a page with unsaved changes (e.g., editing a product's SEO fields)
- [ ] Command palette is closed

**Steps:**

1. Make a change that triggers unsaved changes state.
2. Open command palette with Cmd+K.
3. Select "Go to Overview" and press Enter.
4. When confirmation dialog appears, click Cancel.
5. Observe behavior.

**Expected Results:**

- UI: Confirmation dialog appears with "You have unsaved changes..." message. Clicking Cancel keeps the palette open and prevents navigation. User remains on the current page with their unsaved changes intact.
- API: N/A

---

### Scenario 12: Unsaved changes confirm allows navigation when confirmed

**ID:** HP-012

**Preconditions:**

- [ ] On a page with unsaved changes
- [ ] Command palette is closed

**Steps:**

1. Make a change that triggers unsaved changes state.
2. Open command palette with Cmd+K.
3. Select "Go to Overview" and press Enter.
4. When confirmation dialog appears, click OK/Continue.
5. Observe behavior.

**Expected Results:**

- UI: Confirmation dialog appears. Clicking OK clears unsaved changes state and navigates to the destination. Palette closes.
- API: N/A

---

### Scenario 13: Dark mode verification

**ID:** HP-013

**Preconditions:**

- [ ] Dark mode enabled (localStorage.engineo_theme = "dark")
- [ ] Command palette is closed

**Steps:**

1. Open command palette with Cmd+K.
2. Inspect the palette for any white backgrounds or hover leaks.
3. Hover over command options.
4. Use arrow keys to navigate.

**Expected Results:**

- UI: No white backgrounds appear. Scrim uses foreground/50 opacity. Panel surface uses --surface-raised token. Hover states use menu-hover-bg token. Focus rings are visible.
- API: N/A

---

### Scenario 14: Shopify embedded iframe behavior

**ID:** HP-014

**Preconditions:**

- [ ] App running inside Shopify Admin embedded context (iframe)
- [ ] Any shell page loaded

**Steps:**

1. Press Cmd+K to open command palette.
2. Observe the overlay positioning.
3. Select a navigation command and execute.

**Expected Results:**

- UI: Overlay is container-contained (not viewport-fixed). No horizontal overflow. Commands execute and navigate within the embedded frame. No window.top usage errors.
- API: N/A

---

### Scenario 15: Search/filter commands

**ID:** HP-015

**Preconditions:**

- [ ] Command palette is open

**Steps:**

1. Type "admin" in the search input.
2. Observe the filtered results.
3. Clear the input.
4. Type "help".
5. Observe the filtered results.

**Expected Results:**

- UI: Commands are filtered by search query (case-insensitive). Typing "admin" shows "Go to Admin" (if user is admin). Typing "help" shows "Open Help / Docs". Clearing input shows all commands.
- API: N/A

---

### Scenario 16: Small screen trigger

**ID:** HP-016

**Preconditions:**

- [ ] Browser window resized to small width (< 768px)
- [ ] Command palette is closed

**Steps:**

1. Observe the top bar search control.
2. Click the search icon button.
3. Observe the palette.

**Expected Results:**

- UI: Small screen shows a search icon button instead of the full search bar. Clicking opens the command palette normally.
- API: N/A

---

### Scenario 17: Open Feedback routes correctly

**ID:** HP-017

**Preconditions:**

- [ ] Logged in and on any shell page
- [ ] Command palette is closed

**Steps:**

1. Open command palette with Cmd+K.
2. Select "Open Feedback" from the Utility section and press Enter.
3. Observe the navigation.

**Expected Results:**

- UI: Browser navigates to /settings/help. Command palette closes after execution.
- API: N/A

---

## Edge Cases

### EC-001: Double keyboard shortcut toggle

**Description:** Pressing Cmd+K twice in quick succession should toggle open then close.

**Steps:**

1. Palette is closed.
2. Press Cmd+K to open.
3. Immediately press Cmd+K again.

**Expected Behavior:**

- Palette opens then closes. No flicker or broken state.

---

### EC-002: ESC with RCP open

**Description:** When both Command Palette and Right Context Panel are open, ESC should close the palette first (modal semantics).

**Steps:**

1. Open the Right Context Panel via the Details button.
2. Open the Command Palette with Cmd+K.
3. Press ESC.

**Expected Behavior:**

- Command Palette closes. RCP remains open (command palette has modal semantics: role="dialog" aria-modal="true").

---

### EC-003: No commands found state

**Description:** Searching for a non-existent command shows appropriate empty state.

**Steps:**

1. Open command palette.
2. Type "xyznonexistent".

**Expected Behavior:**

- Shows "No commands found" message in the results area.

---

## Error Handling

### ERR-001: Admin API failure

**Scenario:** User role API call fails when checking admin status.

**Steps:**

1. Simulate network error on /users/me endpoint.
2. Open command palette.

**Expected Behavior:**

- Admin command is hidden (safe default). No error shown to user. Other commands work normally.

---

## Limits

### LIM-001: Command set

**Scenario:** Commands are limited to navigation/entity-jump/utility only.

**Steps:**

1. Open command palette.
2. Review all available commands.

**Expected Behavior:**

- No destructive commands (delete, remove, etc.)
- No write commands (create, update, save, etc.)
- No apply commands (apply draft, apply fix, etc.)
- No run/generate commands (run automation, generate AI, etc.)

---

## Regression

### Areas potentially impacted:

- [ ] Right Context Panel (ESC handling with modal semantics)
- [ ] Layout Shell (top bar search control replaced with trigger)
- [ ] Focus management across shell components
- [ ] Keyboard accessibility

### Quick sanity checks:

- [ ] RCP still opens/closes normally
- [ ] ESC closes RCP when palette is not open
- [ ] Left rail is icon-only always (no expand/collapse toggle) — regression sanity check [FIXUP-2]
- [ ] Dark mode toggle still works
- [ ] Theme selector dropdown still works

---

## Post-Conditions

### Data cleanup steps:

- [ ] None (read-only navigation feature)
