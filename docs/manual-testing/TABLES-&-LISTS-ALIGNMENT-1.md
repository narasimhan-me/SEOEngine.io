# EngineO.ai – Manual Testing: TABLES-&-LISTS-ALIGNMENT-1

> Derived from MANUAL_TESTING_TEMPLATE.md

---

## Overview

- **Purpose of the feature/patch:**
  Introduce canonical DataTable and DataList components aligned with Design System v1.5. Token-only styling, dark-mode native, Shopify iframe safe. Row interaction contract: no row-click navigation, explicit "View details" action only, RCP integration via onOpenContext callback.

- **High-level user impact and what "success" looks like:**
  Tables and lists have consistent visual styling that works in dark mode without white backgrounds. Users interact with row details via an explicit action button (eye icon), which opens the Right Context Panel. Keyboard navigation (Tab, Arrow keys, Enter/Space) works reliably.

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase TABLES-&-LISTS-ALIGNMENT-1

- **Related documentation:**
  - `docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md`
  - `docs/DESIGN_SYSTEM_ALIGNMENT.md`
  - `docs/manual-testing/RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md`

---

## Preconditions

- **Environment requirements:**
  - apps/web running locally
  - Dark mode enabled (set localStorage.engineo_theme = "dark" or use in-app theme controls if present)
  - For Shopify embedded verification: NEXT_PUBLIC_SHOPIFY_API_KEY configured

- **Test accounts and sample data:**
  - Any authenticated account that can reach /demo/tables-lists

- **Required user roles or subscriptions:**
  - None for component validation

---

## Test Scenarios (Happy Path)

### Scenario 1: Row hover visual verification (dark mode)

**ID:** HP-001

**Preconditions:**

- [ ] Dark mode active
- [ ] /demo/tables-lists route loaded

**Steps:**

1. Navigate to /demo/tables-lists.
2. Hover over each row in the DataTable.
3. Hover over each row in the DataList.

**Expected Results:**

- UI: Hover state shows subtle highlight (menu-hover-bg token at 0.14 alpha); no white backgrounds appear.
- API: N/A
- Logs: N/A

---

### Scenario 2: Row focus/active state verification (keyboard)

**ID:** HP-002

**Preconditions:**

- [ ] Dark mode active
- [ ] /demo/tables-lists route loaded

**Steps:**

1. Tab into the DataTable until a row receives focus.
2. Verify focus ring is visible.
3. Tab into the DataList until a row receives focus.
4. Verify focus ring is visible.

**Expected Results:**

- UI: Focus ring (primary color) is clearly visible on the focused row in dark mode.
- API: N/A

---

### Scenario 3: Context action opens RCP (explicit action only)

**ID:** HP-003

**Preconditions:**

- [ ] /demo/tables-lists route loaded
- [ ] Right Context Panel is closed

**Steps:**

1. Click anywhere on a DataTable row (not on the eye icon).
2. Verify the RCP does NOT open.
3. Click the "View details" eye icon on a row.
4. Verify the RCP opens with the correct row data.

**Expected Results:**

- UI: Row click does nothing; only the explicit eye icon action opens the RCP. RCP shows the correct title, subtitle, and metadata for the clicked row.
- API: N/A

---

### Scenario 4: Switching rows updates RCP content (A → B)

**ID:** HP-004

**Preconditions:**

- [ ] /demo/tables-lists route loaded
- [ ] RCP is open showing row A details

**Steps:**

1. Click the "View details" eye icon on row A to open RCP.
2. Verify RCP shows row A data.
3. Click the "View details" eye icon on row B (different row).
4. Observe RCP content update.

**Expected Results:**

- UI: RCP content switches from row A to row B without closing/reopening (no flicker); no navigation occurs; URL does not change.
- API: N/A

---

### Scenario 5: Keyboard - Tab into table/list

**ID:** HP-005

**Preconditions:**

- [ ] /demo/tables-lists route loaded

**Steps:**

1. Press Tab repeatedly until focus enters the DataTable.
2. Verify a row receives focus.
3. Continue tabbing to exit and re-enter the DataList.
4. Verify a row receives focus.

**Expected Results:**

- UI: Tab key allows entering and exiting table/list focus; first/previous focused row receives focus.
- API: N/A

---

### Scenario 6: Keyboard - ArrowUp/ArrowDown moves focused row

**ID:** HP-006

**Preconditions:**

- [ ] DataTable row is focused

**Steps:**

1. Focus a row in the DataTable.
2. Press ArrowDown.
3. Verify focus moves to the next row.
4. Press ArrowUp.
5. Verify focus moves to the previous row.

**Expected Results:**

- UI: Arrow keys move focus between rows within the table; focus ring moves visibly.
- API: N/A

---

### Scenario 7: Keyboard - Enter/Space opens RCP for focused row

**ID:** HP-007

**Preconditions:**

- [ ] DataTable row is focused
- [ ] RCP is closed

**Steps:**

1. Focus a row in the DataTable using Tab and Arrow keys.
2. Press Enter.
3. Verify RCP opens with the focused row's data.
4. Close RCP.
5. Focus a different row.
6. Press Space.
7. Verify RCP opens with that row's data.

**Expected Results:**

- UI: Enter and Space both trigger the primary context action (open RCP) for the focused row.
- API: N/A

---

### Scenario 8: Shopify embedded iframe - no horizontal overflow

**ID:** HP-008

**Preconditions:**

- [ ] App running inside Shopify Admin as embedded app (iframe)
- [ ] /demo/tables-lists route loaded

**Steps:**

1. Open /demo/tables-lists inside the Shopify Admin embedded context.
2. Inspect the DataTable and DataList for horizontal overflow.
3. Resize to narrow widths if possible.

**Expected Results:**

- UI: No horizontal scrollbar appears on the table or list; content truncates or wraps as configured; states (hover, focus) remain visible against Shopify chrome.
- API: N/A

---

### Scenario 9: DataList row interaction

**ID:** HP-009

**Preconditions:**

- [ ] /demo/tables-lists route loaded

**Steps:**

1. Click anywhere on a DataList row (not on the eye icon).
2. Verify RCP does NOT open.
3. Click the "View details" eye icon on a DataList row.
4. Verify RCP opens with correct data.

**Expected Results:**

- UI: Same interaction contract as DataTable - row click does nothing, explicit action opens RCP.
- API: N/A

---

## Edge Cases

### EC-001: ESC key with focus in text input

**Description:** ESC key should NOT close the RCP when focus is in the test input field.

**Steps:**

1. Open RCP via any row's "View details" action.
2. Click into the "ESC Key Test Input" text field.
3. Press ESC.

**Expected Behavior:**

- RCP remains open; ESC does not close panel when focus is in editable element.

---

### EC-002: Rapid context action clicks

**Description:** Rapidly clicking different rows' context actions should not cause visual glitches.

**Steps:**

1. Click "View details" on row 1.
2. Immediately click "View details" on row 2.
3. Immediately click "View details" on row 3.

**Expected Behavior:**

- RCP content updates smoothly to each row; no flicker or duplicate panels.

---

### EC-003: Same row re-click

**Description:** Re-clicking the same row's context action should not cause remount/flicker.

**Steps:**

1. Click "View details" on row 1.
2. Click "View details" on row 1 again.

**Expected Behavior:**

- RCP remains open with row 1 data; no visual change (descriptor-stability).

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

### Scenario 10: /projects page uses canonical DataTable

**ID:** HP-010

**Preconditions:**

- [ ] Logged in with at least one project
- [ ] On /projects page

**Steps:**

1. Navigate to /projects.
2. Observe the projects table.
3. Hover over a row.
4. Tab into the table to focus a row.

**Expected Results:**

- UI: Table uses DataTable component (token-based surfaces: bg-[hsl(var(--surface-card))], text-foreground, hover:bg-[hsl(var(--menu-hover-bg)/0.14)]).
- UI: No gray/white legacy styling (no bg-gray-*, bg-white on hover).
- UI: Focus ring visible on focused row.

---

### Scenario 11: /dashboard page uses canonical DataTable

**ID:** HP-011

**Preconditions:**

- [ ] Logged in with at least one project
- [ ] On /dashboard page

**Steps:**

1. Navigate to /dashboard.
2. Scroll to "Your Projects" section.
3. Observe the projects table.
4. Hover over a row.

**Expected Results:**

- UI: Table uses DataTable component with token-based styling.
- UI: Columns display: Project (name + domain), SEO Score, Scans, Products, Action.
- UI: No gray/white legacy styling.

---

### Scenario 12: /admin/users page uses canonical DataTable with RCP

**ID:** HP-012

**Preconditions:**

- [ ] Logged in with admin role
- [ ] On /admin/users page

**Steps:**

1. Navigate to /admin/users.
2. Observe the users table.
3. Click the "View details" eye icon on a user row.
4. Observe RCP opens with user details.

**Expected Results:**

- UI: Table uses DataTable component with token-based styling.
- UI: Eye icon (View details) in Actions column opens RCP.
- UI: RCP shows user email as title, name as subtitle.

---

### Scenario 13: Keyboard guard prevents hijacking in-row interactive elements

**ID:** HP-013

**Preconditions:**

- [ ] On /admin/subscriptions page (or any page with in-row <select>)

**Steps:**

1. Navigate to /admin/subscriptions.
2. Focus the "Change Plan" select dropdown in a row.
3. Press ArrowDown or Enter to interact with the select.
4. Observe behavior.

**Expected Results:**

- UI: ArrowDown/Enter interact with the select dropdown (native browser behavior).
- UI: DataTable does NOT hijack these keys (no row navigation occurs).
- UI: The [data-no-row-keydown] attribute on the select prevents DataTable keyboard handling.

---

### Scenario 14: /admin/runs page filter selects work with keyboard

**ID:** HP-014

**Preconditions:**

- [ ] Logged in with admin role
- [ ] On /admin/runs page

**Steps:**

1. Navigate to /admin/runs.
2. Focus one of the filter select dropdowns (Run Type, Status, AI Used).
3. Use keyboard (ArrowDown, Enter) to select a filter value.

**Expected Results:**

- UI: Filter select responds to keyboard input normally.
- UI: Selected filter value is applied; table data filters accordingly.
- UI: DataTable does NOT hijack keyboard events in filter selects.

---

## Regression

### Areas potentially impacted:

- [ ] Right Context Panel integration (RCP should work with DataTable/DataList)
- [ ] Dark mode surfaces (no white backgrounds on hover/focus)
- [ ] Keyboard accessibility
- [ ] Shopify embedded iframe scroll behavior

### Quick sanity checks:

- [ ] Existing tables elsewhere in app unaffected (no changes to feature tables in this phase)
- [ ] RCP still works from LayoutShell demo button
- [ ] Dark mode toggle still works
- [ ] Left Nav collapse/expand unaffected

---

### Scenario 15: /admin/audit-log uses canonical DataTable

**ID:** HP-015

**Preconditions:**

- [ ] Logged in with admin role
- [ ] On /admin/audit-log page

**Steps:**

1. Navigate to /admin/audit-log.
2. Observe the audit log table.
3. Hover over a row.
4. Tab into the table to focus a row.

**Expected Results:**

- UI: Table uses DataTable component with token-based styling.
- UI: Columns display: Time, Actor, Role, Action, Target.
- UI: No gray/white legacy styling (no bg-gray-*, bg-white on hover).
- UI: Empty state rendered outside table (no colSpan rows).

---

### Scenario 16: /admin/governance-audit uses canonical DataTable

**ID:** HP-016

**Preconditions:**

- [ ] Logged in with admin role
- [ ] On /admin/governance-audit page

**Steps:**

1. Navigate to /admin/governance-audit.
2. Observe the governance audit table.
3. Hover over a row.

**Expected Results:**

- UI: Table uses DataTable component with token-based styling.
- UI: Columns display: Time, Event Type, Actor, Project, Resource, Details.
- UI: Empty state rendered outside DataTable with token-based styling.

---

### Scenario 17: /admin/projects uses canonical DataTable

**ID:** HP-017

**Preconditions:**

- [ ] Logged in with admin role
- [ ] On /admin/projects page

**Steps:**

1. Navigate to /admin/projects.
2. Observe the projects table.
3. Click a Resync button if available.

**Expected Results:**

- UI: Table uses DataTable component with token-based styling.
- UI: Columns display: User, Project, Shopify, DEO, Products, Last Sync, Last Run, Actions.
- UI: Resync button in Actions column functions correctly.

---

### Scenario 18: /admin/users/[id] Recent Runs uses canonical DataTable

**ID:** HP-018

**Preconditions:**

- [ ] Logged in with admin role
- [ ] On /admin/users/[id] page with a user that has recent runs

**Steps:**

1. Navigate to /admin/users, click on a user.
2. Scroll to "Recent Runs" section.
3. Observe the runs table.

**Expected Results:**

- UI: Table uses DataTable component with token-based styling.
- UI: Columns display: Run Type, Status, AI Used, Created.
- UI: Card container uses token-based styling (bg-[hsl(var(--surface-card))], border-border).

---

### Scenario 19: /projects/[id]/assets/pages uses canonical DataTable

**ID:** HP-019

**Preconditions:**

- [ ] Logged in with project access
- [ ] On /projects/[id]/assets/pages page with synced pages

**Steps:**

1. Navigate to a project's Assets > Pages.
2. Observe the pages table.
3. Hover over a row.

**Expected Results:**

- UI: Table uses DataTable component with token-based styling.
- UI: Columns display: Health, Path, Title, Action.
- UI: RowStatusChip renders correctly for health status.
- UI: Empty state uses token-based styling.

---

### Scenario 20: /projects/[id]/assets/collections uses canonical DataTable

**ID:** HP-020

**Preconditions:**

- [ ] Logged in with project access
- [ ] On /projects/[id]/assets/collections page with synced collections

**Steps:**

1. Navigate to a project's Assets > Collections.
2. Observe the collections table.
3. Hover over a row.

**Expected Results:**

- UI: Table uses DataTable component with token-based styling.
- UI: Columns display: Health, Handle, Title, Action.
- UI: Handle column shows extracted collection handle (not full path).
- UI: Empty state uses token-based styling.

---

### Scenario 21: /projects/[id]/assets/blogs uses canonical DataTable

**ID:** HP-021

**Preconditions:**

- [ ] Logged in with project access
- [ ] On /projects/[id]/assets/blogs page with synced blog posts

**Steps:**

1. Navigate to a project's Assets > Blog posts.
2. Observe the blog posts table.
3. Click "Open" link on a row.

**Expected Results:**

- UI: Table uses DataTable component with token-based styling.
- UI: Columns display: Status, Handle, Title, Updated, Open.
- UI: Status column shows Published/Draft badge.
- UI: Open link opens blog post in new tab.

---

### Scenario 22: /projects/[id]/settings/governance uses canonical DataTable (3 tables)

**ID:** HP-022

**Preconditions:**

- [ ] Logged in with project access
- [ ] On /projects/[id]/settings/governance page

**Steps:**

1. Navigate to a project's Settings > Governance.
2. Click through Approvals, Audit Log, and Sharing tabs.
3. Observe each table.

**Expected Results:**

- UI: All 3 tables (Approvals, Audit, Sharing) use DataTable component.
- UI: Approvals columns: Resource, Requested By, Status, Date, Actions.
- UI: Audit columns: Event, Actor, Resource, Time, Actions.
- UI: Sharing columns: Title/Report, Created By, Audience, Status, Views, Actions.
- UI: Empty states rendered outside DataTable with token-based styling.

---

### Scenario 23: /projects/[id]/automation/playbooks per-product results use canonical DataTable (dense)

**ID:** HP-023

**Preconditions:**

- [ ] Logged in with project access
- [ ] On /projects/[id]/automation/playbooks page after running a playbook

**Steps:**

1. Navigate to a project's Automation > Playbooks.
2. Run a playbook to completion (or view completed results).
3. Expand per-product results section.
4. Observe the results table implementation and styling.

**Expected Results:**

- UI: Per-product results use canonical DataTable component (not legacy `<table>` markup).
- UI: DataTable uses `density="dense"` for compact presentation.
- UI: No legacy gray/white table utility stack (no divide-gray-*, bg-gray-*, bg-white used for table styling).
- UI: Columns display: Product, Status, Message.
- UI: Product column links use text-primary and navigate via handleNavigate interception.
- UI: Status badges preserve existing styling (UPDATED=green, SKIPPED=muted, LIMIT_REACHED=amber, error=red).
- UI: Message column uses text-muted-foreground.
- UI: Rows render with non-empty cells (Product/Status/Message visible; not blank due to missing cell renderer).

---

## Post-Conditions

### Data cleanup steps:

- [ ] None
