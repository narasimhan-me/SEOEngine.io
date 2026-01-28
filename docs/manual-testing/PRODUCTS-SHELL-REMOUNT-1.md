# EngineO.ai – Manual Testing: PRODUCTS-SHELL-REMOUNT-1

> Derived from MANUAL_TESTING_TEMPLATE.md

---

## Overview

- **Purpose of the feature/patch:**
  Remount the Products list onto the canonical DataTable component with expansion support, RCP integration, and shell-safe styling. Token-only styling, dark-mode native, Shopify iframe safe.

- **High-level user impact and what "success" looks like:**
  Products list displays in a structured table format with expandable rows for progressive disclosure. Row click expands/collapses (does NOT navigate). Explicit action buttons (Fix next, Review drafts, Open) appear in the Actions column. Dark mode works correctly without white backgrounds. Loading states use container-relative positioning.

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase PRODUCTS-SHELL-REMOUNT-1

- **Related documentation:**
  - docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md
  - docs/DESIGN_SYSTEM_ALIGNMENT.md
  - docs/manual-testing/TABLES-&-LISTS-ALIGNMENT-1.md
  - docs/manual-testing/COMMAND-PALETTE-IMPLEMENTATION-1.md

---

## Preconditions

- **Environment requirements:**
  - apps/web running locally
  - Dark mode enabled (set localStorage.engineo_theme = "dark" or use in-app theme controls if present)
  - For Shopify embedded verification: NEXT_PUBLIC_SHOPIFY_API_KEY configured

- **Test accounts and sample data:**
  - Any authenticated account with access to a project
  - Project with synced products (at least 3-5 products for meaningful testing)
  - Some products with issues (Critical, Needs Attention states)

- **Required user roles or subscriptions:**
  - Standard user for most tests
  - OWNER role for apply/draft action visibility tests

---

## Test Scenarios (Happy Path)

### Scenario 1: Products list renders as DataTable

**ID:** HP-001

**Preconditions:**

- [ ] Logged in and on /projects/[id]/products
- [ ] Project has synced products

**Steps:**

1. Navigate to /projects/[id]/products.
2. Observe the products list rendering.

**Expected Results:**

- UI: Products display in a table format with columns: Product (image + title + recommended action), Status (chip), Actions (buttons + expand indicator).
- API: N/A
- Logs: N/A

---

### Scenario 2: Row click expands/collapses (progressive disclosure)

**ID:** HP-002

**Preconditions:**

- [ ] Products list is visible with multiple products
- [ ] All rows are collapsed

**Steps:**

1. Click anywhere on a product row (not on action buttons).
2. Observe the row expansion.
3. Click the same row again.
4. Observe the row collapse.

**Expected Results:**

- UI: First click expands the row to show ProductDetailPanel (handle, last synced, meta title/description, issues by category). Second click collapses. No navigation occurs. URL does not change.
- API: N/A

---

### Scenario 3: Action buttons do NOT trigger row expansion

**ID:** HP-003

**Preconditions:**

- [ ] Products list is visible
- [ ] A row has action buttons (Fix next, Review drafts, Open)

**Steps:**

1. Click on "Fix next" or "Open" button on a product row.
2. Observe behavior.

**Expected Results:**

- UI: Navigation occurs to the target destination. Row does NOT expand. This verifies the data-no-row-click attribute is working.
- API: N/A

---

### Scenario 4: Expand indicator rotates on expansion

**ID:** HP-004

**Preconditions:**

- [ ] Products list is visible

**Steps:**

1. Observe the expand indicator (chevron) on a collapsed row.
2. Click the row to expand.
3. Observe the expand indicator.

**Expected Results:**

- UI: Chevron rotates 180 degrees when row is expanded. Returns to original rotation when collapsed.
- API: N/A

---

### Scenario 5: Dark mode verification - no white backgrounds

**ID:** HP-005

**Preconditions:**

- [ ] Dark mode enabled (localStorage.engineo_theme = "dark")
- [ ] Products list is visible

**Steps:**

1. Navigate to /projects/[id]/products.
2. Inspect the products table for white backgrounds.
3. Hover over rows.
4. Expand a row.
5. Inspect the expanded content.

**Expected Results:**

- UI: No white backgrounds appear. Table uses token-based surfaces (surface-card, surface-raised). Hover states use menu-hover-bg token. Expanded content uses surface-card token.
- API: N/A

---

### Scenario 6: Loading state uses container-relative positioning

**ID:** HP-006

**Preconditions:**

- [ ] Network throttling enabled or slow connection

**Steps:**

1. Navigate to /projects/[id]/products (force a reload).
2. Observe the loading state.

**Expected Results:**

- UI: Loading spinner/text is centered within the content area using py-12, NOT min-h-screen. No viewport-based positioning.
- API: N/A

---

### Scenario 7: Product detail page sticky header token styling

**ID:** HP-007

**Preconditions:**

- [ ] Dark mode enabled
- [ ] On a product detail page (/projects/[id]/products/[productId])

**Steps:**

1. Navigate to a product detail page.
2. Scroll down to verify sticky header.
3. Observe the sticky header background.

**Expected Results:**

- UI: Sticky header uses surface-raised token with opacity (bg-[hsl(var(--surface-raised)/0.9)]). No white/90 background. Border uses border-border token.
- API: N/A

---

### Scenario 8: Command Palette "Go to Products" navigation

**ID:** HP-008

**Preconditions:**

- [ ] Logged in and on a project page (/projects/[id]/\*)
- [ ] Command palette is closed

**Steps:**

1. Press Cmd+K (Mac) or Ctrl+K (Windows/Linux).
2. Type "products".
3. Select "Go to Products" from the Navigation section.
4. Press Enter.

**Expected Results:**

- UI: Command palette shows "Go to Products" in Navigation section. Selecting it navigates to /projects/[id]/products. Command palette closes after execution.
- API: N/A

---

### Scenario 9: Command Palette "Go to Products" fallback (non-project context)

**ID:** HP-009

**Preconditions:**

- [ ] Logged in and on a non-project page (e.g., /dashboard, /settings)
- [ ] Command palette is closed

**Steps:**

1. Press Cmd+K to open command palette.
2. Select "Go to Products" and press Enter.
3. Observe navigation.

**Expected Results:**

- UI: Browser navigates to /projects (safe fallback when not in project context).
- API: N/A

---

### Scenario 10: Health filter functionality preserved

**ID:** HP-010

**Preconditions:**

- [ ] Products list visible with products in various health states

**Steps:**

1. Click "Critical" filter pill.
2. Observe filtered results.
3. Click "Needs Attention" filter pill.
4. Observe filtered results.
5. Click "All" filter pill.
6. Observe all products.

**Expected Results:**

- UI: Filters work correctly. Filter pills use token-based styling (active: bg-foreground text-background, inactive: bg-background text-foreground border-border). Count badges display correctly.
- API: N/A

---

### Scenario 11: Sort functionality preserved

**ID:** HP-011

**Preconditions:**

- [ ] Products list visible with multiple products

**Steps:**

1. Select "Sort by impact" from dropdown.
2. Observe product order (Critical first, then Needs Attention, then Healthy).
3. Select "Sort by title".
4. Observe alphabetical order.

**Expected Results:**

- UI: Impact sorting preserves the impact ladder algorithm (Critical > Needs Attention > Healthy, with within-group subcategories). Title sorting is alphabetical.
- API: N/A

---

### Scenario 12: Shopify embedded iframe - no horizontal overflow

**ID:** HP-012

**Preconditions:**

- [ ] App running inside Shopify Admin as embedded app (iframe)
- [ ] Products list loaded

**Steps:**

1. Open /projects/[id]/products inside Shopify Admin embedded context.
2. Inspect the products table for horizontal overflow.
3. Resize to narrow widths if possible.

**Expected Results:**

- UI: No horizontal scrollbar appears. Table columns adapt. Actions column may stack or truncate gracefully.
- API: N/A

---

### Scenario 13: Right Context Panel opens via eye icon

**ID:** HP-013

**Preconditions:**

- [ ] Products list is visible with products

**Steps:**

1. Locate the eye icon (View details) button at the right side of a product row.
2. Click the eye icon.
3. Observe the Right Context Panel.

**Expected Results:**

- UI: RCP slides in from the right with product details (title, handle, lastSynced, metaTitle, metaDescription, recommendedAction). Row does NOT expand. Eye icon is visible and separate from row actions (Fix next, Review drafts, Open).
- API: N/A

---

### Scenario 14: Explicit context action on keyboard

**ID:** HP-014

**Preconditions:**

- [ ] Products list is visible with products

**Steps:**

1. Tab into the products table to focus the first row.
2. Press Enter or Space on the focused row.
3. Observe the behavior.

**Expected Results:**

- UI: Row expands/collapses (progressive disclosure behavior). RCP does NOT open. This verifies rowEnterKeyBehavior="rowClick" is working correctly.
- API: N/A

---

## Edge Cases

### EC-001: Expand multiple rows

**Description:** Only one row should be expanded at a time (accordion behavior).

**Steps:**

1. Click row A to expand.
2. Click row B.

**Expected Behavior:**

- Row A collapses, row B expands. Only one row expanded at a time.

---

### EC-002: Keyboard navigation in table

**Description:** Arrow keys should navigate between rows; Enter should expand/collapse.

**Steps:**

1. Tab into the products table.
2. Press ArrowDown to move to next row.
3. Press Enter to expand.

**Expected Behavior:**

- Arrow keys move focus. Enter expands/collapses the focused row.

---

### EC-003: Empty products list with filters

**Description:** Filtered empty state shows appropriate message.

**Steps:**

1. Apply filters that result in no matching products.
2. Observe empty state.

**Expected Behavior:**

- Shows "No products match your filters." with "Clear filters" link. Uses token-based styling (text-muted-foreground, text-primary for link).

---

## Error Handling

### ERR-001: Product sync failure

**Scenario:** Sync products API call fails.

**Steps:**

1. Disconnect network or simulate API error.
2. Click "Sync Products" button.

**Expected Behavior:**

- Error message displayed with token-based error styling. Feedback toast shows error.

---

## Limits

### LIM-001: Large product list

**Scenario:** Project has 100+ products.

**Steps:**

1. Load a project with many products.
2. Scroll through the list.
3. Test expand/collapse.

**Expected Behavior:**

- List renders without performance issues. Expansion/collapse remains responsive.

---

## Regression

### Areas potentially impacted:

- [ ] DataTable component (new expansion support)
- [ ] ProductRow component (now deprecated in favor of DataTable)
- [ ] ProductDetailPanel (used as expanded content)
- [ ] Right Context Panel (descriptor pattern integration)
- [ ] Command Palette (new Products navigation command)
- [ ] Dark mode surfaces

### Quick sanity checks:

- [ ] Other tables in app unaffected (e.g., /demo/tables-lists)
- [ ] RCP still works from other tables
- [ ] Dark mode toggle still works
- [ ] Left Nav collapse/expand unaffected
- [ ] Other Command Palette navigation commands still work

---

## Post-Conditions

### Data cleanup steps:

- [ ] None (read-only navigation/display feature)
