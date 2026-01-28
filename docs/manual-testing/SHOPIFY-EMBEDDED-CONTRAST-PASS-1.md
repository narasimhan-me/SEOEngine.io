# EngineO.ai – Manual Testing: SHOPIFY-EMBEDDED-CONTRAST-PASS-1

> **This is a per-feature manual testing doc cloned from `docs/MANUAL_TESTING_TEMPLATE.md`.**

---

## Overview

- **Purpose of the feature/patch:**
  - Ensure EngineO UI remains readable and usable when rendered inside Shopify Admin iframe
  - Add embedded-only CSS refinements for contrast, dropdowns, focus rings, and scrollbars
  - Provide deterministic `data-shopify-embedded` flag for conditional CSS styling
  - Embedded contrast hardening via scoped overrides of existing tokens (`--muted-foreground`, `--border`) within `html[data-shopify-embedded="1"]`

- **High-level user impact and what "success" looks like:**
  - Users viewing EngineO inside Shopify Admin see UI that doesn't clash with Shopify's chrome
  - Focus rings are visible and don't disappear into the background
  - Dropdowns/popovers have solid backgrounds (not transparent/inherited)
  - Scrollbars are subtle but usable
  - Standalone users experience no change (embedded styles only apply with flag)

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Entry 6.89 (SHOPIFY-EMBEDDED-CONTRAST-PASS-1)
  - Entry 6.81–6.85 (SHOPIFY-EMBEDDED-SHELL-1 and fixups)
  - Entry 6.86–6.88 (DARK-MODE-SYSTEM-1 and polish patches)

- **Related documentation:**
  - SHOPIFY_INTEGRATION.md (root, canonical)
  - SHOPIFY-EMBEDDED-SHELL-1.md (embedded shell behavior)
  - DARK-MODE-SYSTEM-1.md (theme system)

---

## Preconditions

- **Environment requirements:**
  - [ ] `NEXT_PUBLIC_SHOPIFY_API_KEY` env var set (for App Bridge)
  - [ ] Backend services running (API, database)
  - [ ] Shopify Partner app configured with correct App URL and embedded home URL

- **Test accounts and sample data:**
  - [ ] Test Shopify development store with app installed
  - [ ] Test user account with connected Shopify store

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with a connected Shopify store

---

## Test Scenarios (Happy Path)

### Scenario 1: Embedded Flag Detection on Initial Load

**ID:** HP-001

**Preconditions:**

- App is installed on Shopify development store
- User is logged in to Shopify Admin

**Steps:**

1. Open EngineO app from Shopify Admin (Apps section)
2. Open browser DevTools and inspect the `<html>` element
3. Check for `data-shopify-embedded="1"` attribute

**Expected Results:**

- **UI:** App loads inside Shopify Admin iframe without blank screen
- **DOM:** `<html data-shopify-embedded="1">` attribute is present
- **Logs:** No console errors related to embedded detection

---

### Scenario 2: Embedded Flag Persists Through SPA Navigation

**ID:** HP-002

**Preconditions:**

- App is open inside Shopify Admin iframe
- `data-shopify-embedded="1"` is present on initial load

**Steps:**

1. Navigate to Projects page (client-side navigation)
2. Navigate to Settings page
3. Navigate back to Dashboard
4. Check `<html>` element after each navigation

**Expected Results:**

- **UI:** Navigation works smoothly, no page reloads
- **DOM:** `data-shopify-embedded="1"` remains present throughout
- **API:** No extra network requests for embedded detection

---

### Scenario 3: Dropdown Contrast in Embedded Dark Mode

**ID:** HP-003

**Preconditions:**

- App is open inside Shopify Admin iframe
- Theme is set to "Dark" in EngineO

**Steps:**

1. Click the theme dropdown in TopNav
2. Observe dropdown background and border
3. Click the account dropdown (user menu)
4. Observe dropdown background and border

**Expected Results:**

- **UI:** Dropdowns have solid dark backgrounds (not transparent)
- **UI:** Dropdown borders are visible but subtle
- **UI:** Dropdown text is readable against background
- **UI:** Hover states on menu items are visible

---

### Scenario 4: Focus Ring Visibility in Embedded Context

**ID:** HP-004

**Preconditions:**

- App is open inside Shopify Admin iframe
- Any theme (light or dark)

**Steps:**

1. Tab through form inputs on Settings page
2. Observe focus ring on each input
3. Tab through buttons in a form
4. Observe focus ring on buttons

**Expected Results:**

- **UI:** Focus rings are clearly visible (thicker ring with offset)
- **UI:** Focus rings don't blend into Shopify Admin background
- **UI:** Focus rings have appropriate color for light/dark mode

---

### Scenario 5: Scrollbar Styling in Embedded Context

**ID:** HP-005

**Preconditions:**

- App is open inside Shopify Admin iframe
- Page has scrollable content (e.g., long product list)

**Steps:**

1. Navigate to a page with scrollable content
2. Scroll vertically and observe scrollbar
3. Hover over scrollbar thumb
4. Switch between light and dark mode

**Expected Results:**

- **UI:** Scrollbar is subtle (8px width, rounded thumb)
- **UI:** Scrollbar thumb darkens on hover
- **UI:** Scrollbar track is transparent (doesn't clash with Shopify)
- **UI:** Scrollbar color adapts to light/dark mode

---

### Scenario 6: Standalone Mode Unaffected

**ID:** HP-006

**Preconditions:**

- App is open in standalone mode (direct navigation to app.engineo.ai)
- No embedded query params in URL
- **Important:** Clear `sessionStorage.shopify_host` and `sessionStorage.shopify_shop` first to avoid false positives from prior embedded sessions

**Steps:**

1. Open DevTools → Application → Session Storage → Clear `shopify_host` and `shopify_shop` keys if present
2. Open app directly at app.engineo.ai (not from Shopify Admin)
3. Inspect `<html>` element
4. Test dropdowns, focus rings, scrollbars in both light and dark mode

**Expected Results:**

- **DOM:** `data-shopify-embedded` attribute is NOT present
- **UI:** Standard styling applies (not embedded overrides)
- **UI:** All UI elements function normally

---

### Scenario 7: Embedded Navigation Screen Sweep (FIXUP-1)

**ID:** HP-007

**Preconditions:**

- App is open inside Shopify Admin iframe
- Theme is set to "Dark" in EngineO
- Project exists with products and issues

**Steps:**

For each of the following screens, perform the checks listed below:

**Screens to visit:**

1. **Store Health** (`/projects/[id]`)
2. **Work Queue** (`/projects/[id]/work-queue`)
3. **Products List** (`/projects/[id]/products`)
4. **Product Workspace** (`/projects/[id]/products/[productId]`)
5. **Issues List / Engine View** (`/projects/[id]/issues`)
6. **Playbooks** (`/projects/[id]/playbooks`)
7. **Project Settings** (`/projects/[id]/settings`)
8. **Admin Users** (`/admin/users`) - if admin role
9. **Admin Projects** (`/admin/projects`) - if admin role

**Checks per screen:**

- [ ] Primary text (headings, labels) is readable
- [ ] Secondary text (timestamps, descriptions, helper text) is readable
- [ ] Borders/dividers are visible for card/table separation
- [ ] No "white leak" surfaces (cards, rows, modals showing white in dark mode)
- [ ] Tab through interactive elements to verify focus ring visibility

**Expected Results:**

- **UI:** All screens pass the readability checks
- **UI:** No white surfaces in dark mode (all use token-based surfaces)
- **UI:** Focus rings visible on keyboard navigation
- **UI:** Surface separation is clear (cards distinct from page background)

---

### Scenario 8: Embedded Dropdown/Menu Verification Beyond TopNav (FIXUP-1)

**ID:** HP-008

**Preconditions:**

- App is open inside Shopify Admin iframe
- Theme is set to "Dark" in EngineO

**Steps:**

Test dropdowns/menus in the following locations (beyond TopNav):

1. **Project Settings page:**
   - Find any `<select>` elements (timezone, locale, etc.)
   - Click to open native dropdown
   - Use mouse hover to highlight options
   - Use keyboard arrows to navigate options
   - Observe background and highlight colors

2. **Governance Audit / Filters:**
   - Navigate to any page with filter dropdowns
   - Open filter dropdown
   - Observe background and hover states

3. **Admin Tables (if admin role):**
   - Navigate to Admin → Users or Projects
   - Find any filter/sort dropdowns
   - Open and interact with dropdowns

4. **Toolbar/Header selects:**
   - Find any toolbar or header dropdowns
   - Test opening and navigation

**Expected Results:**

- **UI:** Native `<select>` dropdowns have dark backgrounds in dark mode
- **UI:** Mouse hover highlight is visible (dark, not white)
- **UI:** Keyboard navigation highlight is visible (dark, not white)
- **UI:** Custom dropdown menus (role="menu", role="listbox") have solid dark backgrounds
- **UI:** No white flash when opening any dropdown
- **UI:** Dropdown text is readable against background

---

## Edge Cases

### EC-001: Embedded Flag with Only sessionStorage Host (Inside Iframe)

**Description:** User navigates to deep link inside iframe where URL doesn't have embedded=1 or host param, but sessionStorage has stored host from prior navigation. Since we're still in the iframe, embedded mode should activate.

**Steps:**

1. Open app from Shopify Admin (stores host in sessionStorage)
2. Navigate to a deep link inside the iframe (e.g., /projects/123/settings)
3. Refresh the page (URL won't have host param, but still in iframe)
4. Check `data-shopify-embedded` attribute

**Expected Behavior:**

- Init script detects iframe context + stored host → sets `data-shopify-embedded="1"`
- CSS embedded overrides apply correctly

---

### EC-002: sessionStorage Access Throws

**Description:** In some privacy modes or sandboxed iframes, sessionStorage access may throw.

**Steps:**

1. Test with browser privacy mode that blocks sessionStorage
2. Open app from Shopify Admin with embedded=1 in URL

**Expected Behavior:**

- Init script catches error and continues
- Embedded detection falls back to URL params
- No console errors, no blank screen

---

### EC-003: Stale sessionStorage Does NOT Trigger Embedded in Standalone (REVIEW-3)

**Description:** User has stale `sessionStorage.shopify_host` from a prior embedded session, but is now browsing in standalone mode (top-level window, not in iframe). Embedded mode should NOT activate.

**Steps:**

1. Open DevTools → Application → Session Storage
2. Manually set `shopify_host` to any value (e.g., `test-host`)
3. Navigate to app.engineo.ai directly (no embedded=1, no host param in URL)
4. Inspect `<html>` element

**Expected Behavior:**

- `<html>` does NOT have `data-shopify-embedded="1"` attribute
- Embedded-only contrast CSS does NOT apply
- Standard standalone styling is active

**Why This Matters:**

- [REVIEW-3] Stored host is only used for embedded continuity when running in an iframe
- Prevents embedded-only styling from leaking into top-level standalone sessions
- Stale sessionStorage from prior embedded usage should not affect standalone experience

---

## Error Handling

### ERR-001: Missing Shopify API Key

**Scenario:** `NEXT_PUBLIC_SHOPIFY_API_KEY` not set

**Steps:**

1. Remove or unset `NEXT_PUBLIC_SHOPIFY_API_KEY` env var
2. Open app from Shopify Admin

**Expected Behavior:**

- Bootstrap error fallback shown ("Unable to load inside Shopify")
- Link to standalone mode provided
- Embedded flag still set (CSS applies regardless)

---

## Limits

### LIM-001: N/A

This patch has no entitlement or quota limits.

---

## Regression

### Areas potentially impacted:

- [ ] **Standalone UI:** Verify embedded styles don't leak to standalone mode
- [ ] **Dark mode:** Verify DARK-MODE-SYSTEM-1 still works correctly
- [ ] **Shopify embedded shell:** Verify existing fallback flows unaffected

### Quick sanity checks:

- [ ] Open app standalone → no `data-shopify-embedded` attribute
- [ ] Open app from Shopify Admin → `data-shopify-embedded="1"` present
- [ ] Theme toggle works in both standalone and embedded contexts
- [ ] Dropdowns work in both standalone and embedded contexts

---

## Post-Conditions

### Data cleanup steps:

- [ ] No data cleanup required (CSS-only changes)

### Follow-up verification:

- [ ] Confirm no new console errors in embedded context
- [ ] Confirm no styling regressions in standalone context

---

## Known Issues

- **Intentionally accepted issues:**
  - Scrollbar styling is webkit-only (Firefox/Safari may show native scrollbars)
  - Color scheme inheritance from Shopify Admin is not possible (we apply our own)

- **Out-of-scope items:**
  - Shopify Admin's own dark mode detection (we use our own theme system)
  - Polaris component styling (EngineO uses custom components)

- **TODOs:**
  - [ ] None

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
