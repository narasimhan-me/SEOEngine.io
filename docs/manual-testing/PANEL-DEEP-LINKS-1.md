# EngineO.ai – Manual Testing: PANEL-DEEP-LINKS-1

> Derived from MANUAL_TESTING_TEMPLATE.md
>
> **Updated:** RIGHT-CONTEXT-PANEL-AUTONOMY-1 (Panel normalized to `details`; no view tabs)

---

## Overview

- **Purpose of the feature/patch:**
  Add shareable Right Context Panel state via URL deep-links. When the panel is opened via UI, URL params are written (replaceState semantics). When a URL with valid panel params is loaded, the panel opens deterministically. This enables copy/paste sharing of panel state and proper back/forward navigation.

- **High-level user impact and what "success" looks like:**
  Users can copy a URL while viewing a product/page/collection/user in the Right Context Panel and paste it into a new browser tab to reproduce the exact same panel state. Under RIGHT-CONTEXT-PANEL-AUTONOMY-1, the panel is normalized to `details` (legacy values are accepted but coerced). Closing the panel cleans the URL. Invalid params fail safely without crashing. Shopify embedded query params are preserved throughout.

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  Phase PANEL-DEEP-LINKS-1

- **Related documentation:**
  - `docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md`
  - `docs/manual-testing/TABLES-&-LISTS-ALIGNMENT-1.md`
  - `docs/manual-testing/RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md`

---

## Preconditions

- **Environment requirements:**
  - apps/web running locally
  - Products list with at least 2 products
  - Admin Users list accessible (admin role required)

- **Test accounts and sample data:**
  - Any authenticated account with access to /projects/:id/products
  - Admin account with access to /admin/users (for non-product proof surface)

- **Required user roles or subscriptions:**
  - Products: Any authenticated user with project access
  - Admin Users: Admin role (SUPPORT_AGENT, OPS_ADMIN, or MANAGEMENT_CEO)

---

## URL Deep-Link Schema

| Parameter     | Required | Allowed Values                                                   |
| ------------- | -------- | ---------------------------------------------------------------- |
| `panel`       | Yes      | `details` (canonical under autonomy)                             |
| `entityType`  | Yes      | `product`, `page`, `collection`, `blog`, `issue`, `user`, `playbook` |
| `entityId`    | Yes      | Any non-empty string (the entity's ID)                           |
| `entityTitle` | No       | Optional entity title (used as fallback for panel title)         |
| `panelOpen`   | No       | Accepted but not required (legacy compatibility)                 |

**Note:** [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Legacy `panel` values (`recommendations`, `history`, `help`) are accepted for backward compatibility but normalized to `details` via replaceState. No view tabs exist under autonomy.

---

## Test Scenarios (Happy Path)

### Scenario 1: UI open updates URL (Products list)

**ID:** HP-001

**Preconditions:**

- [ ] Products list loaded at `/projects/:projectId/products`
- [ ] Right Context Panel is closed
- [ ] URL has no panel-related query params

**Steps:**

1. Click the "View details" (eye icon) action on a product row.
2. Observe the URL in the browser address bar.
3. Note the product ID and title that appear in the RCP.

**Expected Results:**

- UI: RCP opens showing product details.
- URL: Updates to include `?panel=details&entityType=product&entityId=<productId>&entityTitle=<productTitle>`.
- No page reload occurs (replaceState semantics).

---

### Scenario 2: Copy/paste deep link reproduces state

**ID:** HP-002

**Preconditions:**

- [ ] Scenario HP-001 completed (RCP open with URL params)

**Steps:**

1. Copy the full URL from the browser address bar.
2. Open a new browser tab (or incognito window with same auth).
3. Paste the URL and press Enter.
4. Wait for page load.

**Expected Results:**

- UI: RCP opens automatically with the same product details visible.
- [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Panel shows Details view only (no tabs exist).
- The entity shown matches the entityId/entityTitle from the URL.

---

### Scenario 3: [UPDATED] Legacy panel value is normalized to details

**ID:** HP-003

**[RIGHT-CONTEXT-PANEL-AUTONOMY-1] Updated for autonomous behavior.**

**Preconditions:**

- [ ] Valid project with at least one issue (or any valid entity)

**Steps:**

1. Construct a URL with a legacy panel value: `/projects/:projectId/issues?panel=history&entityType=issue&entityId=<issueId>`
2. Load this URL in the browser.
3. Observe the URL and panel state.

**Expected Results:**

- UI: RCP opens showing issue details (no History tab exists under autonomy).
- URL: Updates to `panel=details` via replaceState (normalized from `history`).
- No crash, no error modal.
- Panel shows the Details view only (no tabs visible).

---

### Scenario 4: Close panel removes URL params

**ID:** HP-004

**Preconditions:**

- [ ] RCP is open
- [ ] URL contains panel params

**Steps:**

1. Close the RCP (click X button or press Escape).
2. Observe the URL.

**Expected Results:**

- UI: Panel closes.
- URL: All panel-related params (`panel`, `entityType`, `entityId`, `entityTitle`, `panelOpen`) are removed.
- Reload: Panel stays closed.

---

### Scenario 5: Back/forward restores panel state (across route navigations)

**ID:** HP-005

**Preconditions:**

- [ ] Products list loaded at `/projects/:projectId/products`, RCP closed
- [ ] Browser history is clean (no recent navigation)

**Steps:**

1. Open RCP for a product (click eye icon).
2. URL updates with panel params (via replaceState — no history entry created).
3. Navigate to another route via Left Nav (e.g., Dashboard or Projects list).
4. This creates a browser history entry (the Products URL with panel params).
5. Press browser Back button.
6. Observe panel state.
7. Press browser Forward button.
8. Observe panel state.

**Expected Results:**

- Back: Browser returns to Products URL with panel params → RCP re-opens with the product.
- Forward: Browser returns to the other route (no panel params) → RCP closes.
- Panel state tracks URL state through browser history when navigating between routes.

**Note:** Since panel-only changes use replaceState (not pushState), opening different products via UI on the same route does NOT create separate history entries. Back/forward only restores panel state when navigating between different routes.

---

### Scenario 6: Admin Users deep link (non-product proof surface)

**ID:** HP-006

**Preconditions:**

- [ ] Admin Users list loaded at `/admin/users`
- [ ] At least one user visible

**Steps:**

1. Click the "View details" (eye icon) action on a user row.
2. Observe URL updates.
3. Copy URL, open in new tab.

**Expected Results:**

- URL: Contains `panel=details&entityType=user&entityId=<userId>&entityTitle=<userEmail>`.
- New tab: RCP opens showing user details with email as title.

---

## Edge Cases

### Scenario 7: Invalid entityType fails safely

**ID:** EC-001

**Preconditions:**

- [ ] Valid products page loaded

**Steps:**

1. Manually edit URL to set `entityType=invalid_type`.
2. Reload page.

**Expected Results:**

- UI: Panel does NOT open (invalid entityType rejected).
- No crash, no error modal.
- URL params remain (not auto-cleaned).

---

### Scenario 8: Invalid panel value fails safely

**ID:** EC-002

**Preconditions:**

- [ ] Valid products page loaded

**Steps:**

1. Manually edit URL to set `panel=invalidtab`.
2. Reload page.

**Expected Results:**

- UI: Panel does NOT open (invalid panel value rejected).
- No crash, no error modal.

---

### Scenario 9: Missing required param fails safely

**ID:** EC-003

**Preconditions:**

- [ ] Valid products page loaded

**Steps:**

1. Manually edit URL to have `panel=details&entityType=product` (missing entityId).
2. Reload page.

**Expected Results:**

- UI: Panel does NOT open (required param missing).
- No crash, no error modal.

---

### Scenario 10: Shopify embedded params preserved

**ID:** EC-004

**Preconditions:**

- [ ] Shopify embedded app context (or simulated with query params)
- [ ] URL contains `?shop=mystore.myshopify.com&host=base64value`

**Steps:**

1. Open RCP for a product (click eye icon).
2. Observe URL.
3. Close RCP.
4. Observe URL.

**Expected Results:**

- Open: Panel params added alongside Shopify params (`?shop=...&host=...&panel=details&entityType=product&entityId=...`).
- Close: Panel params removed, Shopify params (`shop`, `host`) preserved.
- No blank page, no redirect loops.

---

### Scenario 11: scopeProjectId derived from route

**ID:** EC-005

**Preconditions:**

- [ ] URL is `/projects/proj123/products?panel=details&entityType=product&entityId=abc`

**Steps:**

1. Reload the page with the deep-link URL.
2. Inspect the RCP descriptor (via React DevTools or panel behavior).

**Expected Results:**

- The descriptor.scopeProjectId is set to `proj123` (derived from pathname).
- Panel shows project-scoped content.

---

### Scenario 12: Non-project route has no scopeProjectId (user entity)

**ID:** EC-006

**Preconditions:**

- [ ] URL is `/admin/users?panel=details&entityType=user&entityId=user123`

**Steps:**

1. Reload the page with the deep-link URL.
2. Inspect the RCP descriptor.

**Expected Results:**

- The descriptor.scopeProjectId is undefined (not in a /projects/:id route).
- Panel opens correctly without project scope.
- User entity type does NOT require project scope, so panel shows user details.

---

### Scenario 13: Project-scoped deep link on non-project route shows Unavailable

**ID:** EC-007

**Preconditions:**

- [ ] Admin dashboard or any non-/projects/:id route loaded (e.g., `/admin/users`)

**Steps:**

1. Manually construct URL: `/admin/users?panel=details&entityType=product&entityId=someProductId`.
2. Navigate to this URL (paste and press Enter).
3. Observe the RCP state.

**Expected Results:**

- UI: RCP opens but shows "Unavailable in this project context." message.
- No crash, no error modal.
- No project data fetch is attempted (scopeProjectId is sentinel value `__outside_project__`).
- Panel header shows the entityTitle or entityId as fallback.

**Rationale:** Product, page, collection, blog, and issue entities require project scope. Opening them outside /projects/:id routes should show the unavailable state rather than attempting to fetch invalid data.

---

## Safety Verification

### Scenario 14: URL-driven open does not trigger apply actions

**ID:** SAFE-001

**Preconditions:**

- [ ] Product with pending draft exists

**Steps:**

1. Construct URL with `panel=details&entityType=product&entityId=<productWithDraft>`.
2. Load URL in browser.

**Expected Results:**

- RCP opens showing product details.
- No apply action is triggered.
- No background job is started.
- No AI call is made.

---

## Regression Checks

### Scenario 15: ESC key still closes panel

**ID:** REG-001

**Steps:**

1. Open RCP via UI (click eye icon).
2. Press Escape key.

**Expected Results:**

- Panel closes.
- URL params are removed.
- Focus returns to previously focused element.

---

### Scenario 16: [OBSOLETE] Cmd/Ctrl+. shortcut removed

**ID:** REG-002

**[RIGHT-CONTEXT-PANEL-AUTONOMY-1] This scenario is obsolete.**

The Cmd/Ctrl+. shortcut has been removed as part of the RCP autonomy redesign.
Panel close is triggered only via close button (X), ESC key, or scrim click (narrow viewports).

---

## Sign-Off

| Scenario ID | Pass/Fail | Tester | Date | Notes |
| ----------- | --------- | ------ | ---- | ----- |
| HP-001      |           |        |      |       |
| HP-002      |           |        |      |       |
| HP-003      |           |        |      |       |
| HP-004      |           |        |      |       |
| HP-005      |           |        |      |       |
| HP-006      |           |        |      |       |
| EC-001      |           |        |      |       |
| EC-002      |           |        |      |       |
| EC-003      |           |        |      |       |
| EC-004      |           |        |      |       |
| EC-005      |           |        |      |       |
| EC-006      |           |        |      |       |
| EC-007      |           |        |      |       |
| SAFE-001    |           |        |      |       |
| REG-001     |           |        |      |       |
| REG-002     |           |        |      |       |
