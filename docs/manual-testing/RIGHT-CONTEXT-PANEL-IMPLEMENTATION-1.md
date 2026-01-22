# EngineO.ai – Manual Testing: RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1

> Derived from MANUAL_TESTING_TEMPLATE.md

---

## Overview

- **Purpose of the feature/patch:**
  Implement the Right Context Panel (RCP) shell-level system with extended ContextDescriptor, panel view tabs, pin/width controls, and kind-specific content rendering. Integrates with ProductTable, admin/users, and ActionBundleCard via eye-icon Details triggers.

- **High-level user impact and what "success" looks like:**
  Users can view contextual details in a slide-in panel without leaving their current view. Panel supports pinning (persists across navigation within same section), width toggle (default/wide), and four view tabs (Details, Recommendations, History, Help). Eye-icon buttons in tables/cards open the panel with kind-specific content.

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1

- **Related documentation:**
  - docs/RIGHT_CONTEXT_PANEL_CONTRACT.md
  - docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md
  - docs/DESIGN_SYSTEM_ALIGNMENT.md

---

## Preconditions

- **Environment requirements:**
  - apps/web running locally
  - Dark mode toggle available for dark mode verification
  - At least one project with synced products

- **Test accounts and sample data:**
  - Any authenticated account with project access
  - Project with synced products (for ProductTable tests)
  - Admin account for admin/users page tests

- **Required user roles or subscriptions:**
  - Standard user for most tests
  - Admin role for admin/users page tests

---

## Test Scenarios (Happy Path)

### Scenario 1: RCP opens from ProductTable eye icon

**ID:** HP-001

**Preconditions:**

- [ ] Logged in and on /projects/[id]/products
- [ ] Products list is visible with products

**Steps:**

1. Locate the eye icon (View details) button in the right column of a product row.
2. Click the eye icon.
3. Observe the Right Context Panel.

**Expected Results:**

- UI: RCP slides in from the right with product details.
- UI: Panel header shows product title and health state subtitle.
- UI: Details tab shows: Handle/ID, Last Synced, SEO Title (with status chip + actual value if set), SEO Description (with status chip + actual value if set), Recommended Action.
- UI: "Open full page" link in header navigates to /projects/[id]/products/[productId].

---

### Scenario 2: RCP view tabs switch content

**ID:** HP-002

**Preconditions:**

- [ ] RCP is open with a product descriptor

**Steps:**

1. Observe the four tabs: Details, Recommendations, History, Help.
2. Click "Recommendations" tab.
3. Observe content change.
4. Click "History" tab.
5. Click "Help" tab.
6. Click "Details" tab.

**Expected Results:**

- UI: Each tab becomes active (border-b-2 border-primary).
- UI: Content area updates to show tab-specific content.
- UI: Details shows kind-specific metadata blocks.
- UI: Recommendations shows "Recommendations (based on detected issues)" header with recommendedAction if available, otherwise "No recommendations available for this item."
- UI: History shows "History" header with "No history available." message.
- UI: Help shows "Help" header with "Help content is not yet available for this item." and a link to Help Center.

---

### Scenario 3: RCP pin toggle persists across navigation

**ID:** HP-003

**Preconditions:**

- [ ] RCP is open
- [ ] Currently on /projects/[id]/products

**Steps:**

1. Click the pin icon (thumbtack) in the panel header.
2. Observe the pin button state change (filled icon, bg-primary/10).
3. Navigate to a different page within the same section (e.g., /projects/[id]/work-queue).
4. Observe the RCP.
5. Navigate to a different section (e.g., /dashboard).
6. Observe the RCP.

**Expected Results:**

- UI: Pin button shows active state when pinned (filled icon, primary background tint).
- UI: When pinned, RCP stays open during navigation within same URL segment.
- UI: When navigating to different first-segment (projects -> dashboard), RCP stays open (pinned ignores auto-close).
- UI: Unpinned panel would close on first-segment change.
- UI: [FIXUP-4] When pinned and navigating outside /projects/[id] (e.g., to /dashboard or /admin), panel shows "Unavailable in this project context." instead of stale details.

---

### Scenario 4: RCP width toggle changes panel width

**ID:** HP-004

**Preconditions:**

- [ ] RCP is open
- [ ] Desktop viewport (>=1024px)

**Steps:**

1. Observe the panel width (default: w-80).
2. Click the width toggle icon (double-arrow).
3. Observe the panel width change.
4. Click the width toggle again.
5. Observe the panel return to default width.

**Expected Results:**

- UI: Default width is w-80 (320px).
- UI: Wide mode width is w-96 lg:w-[28rem] (384px / 448px on larger screens).
- UI: Width toggle cycles between default and wide.

---

### Scenario 5: RCP close via X button, ESC key, Cmd+.

**ID:** HP-005

**Preconditions:**

- [ ] RCP is open

**Steps:**

1. Click the X button in the panel header.
2. Verify panel closes.
3. Reopen the panel via eye icon.
4. Press ESC key.
5. Verify panel closes.
6. Reopen the panel.
7. Press Cmd+. (Mac) or Ctrl+. (Windows/Linux).
8. Verify panel closes.

**Expected Results:**

- UI: X button closes panel.
- UI: ESC key closes panel (unless focus is in editable element or modal is open).
- UI: Cmd/Ctrl+. closes panel.
- UI: Focus returns to the element that was active before panel opened.

---

### Scenario 6: RCP opens from admin/users eye icon

**ID:** HP-006

**Preconditions:**

- [ ] Logged in with admin role
- [ ] On /admin/users page
- [ ] Users list is visible

**Steps:**

1. Locate the eye icon in the Actions column of a user row.
2. Click the eye icon.
3. Observe the RCP.

**Expected Results:**

- UI: RCP opens with user details (email as title, name as subtitle).
- UI: Metadata shows: Role (with adminRole chip if present), Plan, Account Status, Last Activity, Projects count, AI Usage, Quota Usage (renders as "N%"), Two-Factor Auth (renders as "Enabled"/"Disabled"), Created date.
- UI: adminRole chip only appears if user has an admin role (not shown as "None").
- UI: "Open full page" link navigates to /admin/users/[userId].

---

### Scenario 7: RCP opens from ActionBundleCard eye icon

**ID:** HP-007

**Preconditions:**

- [ ] On /projects/[id]/work-queue page
- [ ] Work queue has at least one action bundle

**Steps:**

1. Locate the eye icon in the header row of an ActionBundleCard.
2. Click the eye icon.
3. Observe the RCP.

**Expected Results:**

- UI: RCP opens with work_item (bundle) details.
- UI: Title shows recommendedActionLabel.
- UI: Subtitle shows "HEALTH - State" format.
- UI: Metadata shows: Type (bundleType), State, Health, Scope Type, Scope (actionable count + detected count if different), AI Usage, AI Disclosure text (if present), Approval Status.

---

### Scenario 8: RCP "Open full page" link navigates correctly

**ID:** HP-008

**Preconditions:**

- [ ] RCP is open with a product descriptor

**Steps:**

1. Click the external link icon in the panel header.
2. Observe navigation.

**Expected Results:**

- UI: Browser navigates to /projects/[id]/products/[productId].
- URL: URL changes to the product detail page.

---

### Scenario 9: RCP overlay mode on narrow viewports

**ID:** HP-009

**Preconditions:**

- [ ] RCP is open
- [ ] Browser window resized to <1024px

**Steps:**

1. Observe the RCP positioning.
2. Observe the scrim (overlay background).
3. Click the scrim area.
4. Observe the RCP.

**Expected Results:**

- UI: Panel is absolutely positioned within the container (not viewport-fixed).
- UI: Scrim (bg-foreground/50) covers the content area.
- UI: Clicking scrim closes the panel.

---

### Scenario 10: RCP scope project mismatch handling

**ID:** HP-010

**Preconditions:**

- [ ] RCP is open with a product descriptor from Project A
- [ ] Navigate to Project B

**Steps:**

1. Open RCP from ProductTable in Project A.
2. Pin the panel.
3. Navigate to /projects/[projectB]/products.
4. Observe the RCP content.

**Expected Results:**

- UI: RCP shows "Unavailable in this project context." message in Details tab.
- UI: Panel title still shows the original product title.
- UI: This prevents displaying stale/wrong data in different project context.
- UI: [FIXUP-4] Also applies when pinned panel is open and navigating outside /projects/[id] entirely (e.g., to /dashboard) - panel renders safe "Unavailable" state instead of stale details.

---

## Edge Cases

### EC-001: ESC key with modal dialog open

**Description:** ESC should not close RCP if a modal dialog is open.

**Steps:**

1. Open RCP.
2. Open a modal dialog (e.g., Command Palette with Cmd+K).
3. Press ESC.

**Expected Behavior:**

- Modal closes, but RCP stays open.

---

### EC-002: ESC key with focus in input field

**Description:** ESC should not close RCP if focus is in an editable element.

**Steps:**

1. Open RCP.
2. Focus an input field in the main content area.
3. Press ESC.

**Expected Behavior:**

- Input field loses focus (browser default), but RCP stays open.

---

### EC-003: Multiple rapid panel opens

**Description:** Opening panel with same descriptor should be no-op.

**Steps:**

1. Click eye icon for Product A.
2. Rapidly click the same eye icon again.

**Expected Behavior:**

- Panel opens once, no flicker. Second click is no-op (same kind+id).

---

### EC-004: Opening panel with different descriptor while open

**Description:** Panel should update content without closing/reopening.

**Steps:**

1. Open RCP for Product A.
2. Click eye icon for Product B.

**Expected Behavior:**

- Panel stays open, content updates to Product B.
- View resets to Details tab.

---

## Error Handling

### ERR-001: ContextDescriptor with missing required fields

**Scenario:** Descriptor missing kind or id.

**Steps:**

1. (Development scenario) Pass descriptor with missing fields.

**Expected Behavior:**

- Panel should not crash. Fallback content displayed.

---

## Limits

### LIM-001: Very long title/subtitle

**Scenario:** Product with very long title.

**Steps:**

1. Open RCP for a product with 200+ character title.

**Expected Behavior:**

- Title truncates with text-ellipsis.
- Tooltip or scroll reveals full title.

---

## Regression

### Areas potentially impacted:

- [ ] Command Palette z-index (should still be above RCP at z-50)
- [ ] Modal dialogs (should still work with RCP open)
- [ ] ProductTable row expansion (should work independently of RCP)
- [ ] Dark mode styling (RCP uses token-based surfaces)
- [ ] Keyboard navigation in tables (should not conflict with RCP shortcuts)

### Quick sanity checks:

- [ ] Command Palette opens above RCP (Cmd+K)
- [ ] ESC closes Command Palette before RCP
- [ ] Left Nav collapse/expand unaffected
- [ ] Product row click still expands/collapses row
- [ ] DataTable eye icon still opens RCP

---

## Post-Conditions

### Data cleanup steps:

- [ ] None (read-only UI feature)

---

## Known Issues

- Recommendations, History, Help tabs show placeholder content (future implementation).
- Scope project mismatch detection requires scopeProjectId to be set in descriptor.

---

## Approval

- [ ] QA verified all Happy Path scenarios
- [ ] Edge cases reviewed
- [ ] Regression areas checked
