# EngineO.ai – Manual Testing: DARK-MODE-SYSTEM-1

> Manual testing document for DARK-MODE-SYSTEM-1 + DARK-MODE-POLISH-1 + DARK-MODE-DROPDOWN-FIX-1 patches.
> Ensures global theme system works correctly with 3-mode selection, persistence, no-FOUC, refined dark mode polish, and native dropdown theming.

---

## Overview

- **Purpose of the feature/patch:**
  - Implement a global dark mode theme system with deterministic 3-mode selection (System/Light/Dark)
  - Provide single-source-of-truth CSS design tokens with dark palette aligned to Coming Soon direction
  - Prevent flash of unstyled content (FOUC) via early theme initialization
  - Enable broad dark mode coverage via centralized utility remaps (no mass file edits)
  - **[DARK-MODE-POLISH-1]** Refine surface separation for card/row scannability
  - **[DARK-MODE-POLISH-1]** Improve secondary text readability (~15% contrast boost)
  - **[DARK-MODE-POLISH-1]** Expand chip/badge coverage for status visibility
  - **[DARK-MODE-POLISH-1]** Clarify form input states (editable vs read-only vs disabled)
  - **[DARK-MODE-POLISH-1]** Reinforce button hierarchy and disabled readability
  - **[DARK-MODE-DROPDOWN-FIX-1]** Fix native dropdown/popover theming via color-scheme declaration
  - **[DARK-MODE-DROPDOWN-FIX-1]** Ensure custom dropdown containers use raised surface tokens

- **High-level user impact and what "success" looks like:**
  - Users can select theme preference: System (follows OS), Light, or Dark
  - Theme preference persists across refresh and navigation
  - No flash of wrong theme on page load
  - Dark mode looks cohesive across all app routes
  - Light mode remains unchanged
  - Theme toggle works in Shopify embedded iframe context
  - **[DARK-MODE-POLISH-1]** Cards/rows are visually distinct while scrolling (no "merged slab" effect)
  - **[DARK-MODE-POLISH-1]** Secondary/helper text is readable at a glance
  - **[DARK-MODE-POLISH-1]** Status chips (Critical/Warning/Healthy/New) are clearly visible
  - **[DARK-MODE-POLISH-1]** Form inputs clearly distinguish editable vs read-only vs disabled
  - **[DARK-MODE-POLISH-1]** Button hierarchy is clear (primary vs secondary vs ghost)
  - **[DARK-MODE-DROPDOWN-FIX-1]** Native dropdowns (`<select>`) render with dark backgrounds and dark hover states
  - **[DARK-MODE-DROPDOWN-FIX-1]** Custom dropdown menus (theme, account) have dark surfaces

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Entry 6.86: DARK-MODE-SYSTEM-1
  - Entry 6.87: DARK-MODE-POLISH-1
  - Entry 6.88: DARK-MODE-DROPDOWN-FIX-1

- **Related documentation:**
  - `docs/testing/CRITICAL_PATH_MAP.md` – CP-008 Frontend Global UX Feedback
  - `apps/web/src/app/globals.css` – Design tokens and utility remaps
  - `apps/web/src/components/layout/TopNav.tsx` – Theme selector component

---

## Preconditions

- **Environment requirements:**
  - [ ] Web server running (`npm run dev` in apps/web)
  - [ ] No special env vars required for theme system

- **Test accounts and sample data:**
  - [ ] Any logged-in user account
  - [ ] At least one project with products (for coverage testing)

- **Required user roles or subscriptions:**
  - [ ] Any plan/role is sufficient for theme testing

---

## Test Scenarios (Happy Path)

### Scenario 1: Theme Toggle Modes (System/Light/Dark)

**ID:** HP-001

**Preconditions:**

- User is logged in
- On any authenticated page (e.g., /projects)

**Steps:**

1. Click the theme toggle button in the top nav
2. Observe dropdown with 3 options: System, Light, Dark
3. Select "Light" – observe page uses light theme
4. Select "Dark" – observe page switches to dark theme
5. Select "System" – observe page follows OS theme

**Expected Results:**

- **UI:** Dropdown shows all 3 modes with checkmark on selected mode
- **UI:** Theme changes immediately when mode is selected
- **UI:** Icon changes based on current effective theme
- **localStorage:** `engineo_theme` key set to selected mode

---

### Scenario 2: Theme Persistence Across Refresh

**ID:** HP-002

**Preconditions:**

- User is logged in
- Theme set to "Dark"

**Steps:**

1. Set theme to "Dark"
2. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)
3. Observe theme on page load

**Expected Results:**

- **UI:** Page loads with dark theme immediately (no flash of light theme)
- **localStorage:** `engineo_theme` = "dark" persists

---

### Scenario 3: Theme Persistence Across Navigation

**ID:** HP-003

**Preconditions:**

- User is logged in
- Theme set to "Dark"

**Steps:**

1. Set theme to "Dark" on /projects
2. Navigate to /projects/[id]/store-health
3. Navigate to /projects/[id]/products
4. Navigate to /settings/profile

**Expected Results:**

- **UI:** Dark theme persists across all navigation
- **UI:** No flash of light theme during navigation

---

### Scenario 4: System Mode Follows OS Theme

**ID:** HP-004

**Preconditions:**

- User is logged in
- Theme set to "System"
- OS theme can be toggled (macOS: System Preferences > Appearance)

**Steps:**

1. Set theme to "System"
2. Set OS to light mode
3. Observe app uses light theme
4. Set OS to dark mode
5. Observe app updates to dark theme

**Expected Results:**

- **UI:** App immediately reflects OS theme change
- **UI:** Theme toggle icon shows system/computer icon when in System mode

---

### Scenario 5: Dark Mode Coverage - Projects List

**ID:** HP-005

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- At least one project exists

**Steps:**

1. Navigate to /projects
2. Observe page elements

**Expected Results:**

- **UI:** Page background is dark
- **UI:** Project cards have dark surface color
- **UI:** Text is light and readable
- **UI:** Borders are subtle but visible
- **UI:** No white/light backgrounds bleeding through

---

### Scenario 6: Dark Mode Coverage - Products List

**ID:** HP-006

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- Project with products exists

**Steps:**

1. Navigate to /projects/[id]/products
2. Observe product list table/cards

**Expected Results:**

- **UI:** Table/card backgrounds are dark
- **UI:** Text is light and readable
- **UI:** Health badges are visible with appropriate dark backgrounds
- **UI:** Status indicators use muted (not neon) colors

---

### Scenario 7: Dark Mode Coverage - Product Workspace

**ID:** HP-007

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- Product with issues exists

**Steps:**

1. Navigate to /projects/[id]/products/[productId]
2. Open workspace tabs (SEO, Answer Blocks, etc.)

**Expected Results:**

- **UI:** Workspace panels are dark
- **UI:** Input fields have dark backgrounds with visible borders
- **UI:** Buttons maintain visual hierarchy
- **UI:** Action banners (Generate, Apply) are visible

---

### Scenario 8: Dark Mode Coverage - Issues List

**ID:** HP-008

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- Project with DEO issues exists

**Steps:**

1. Navigate to /projects/[id]/work-queue (or /issues)
2. Observe issue list

**Expected Results:**

- **UI:** Issue cards/rows have dark backgrounds
- **UI:** Severity badges are visible (Critical/Warning/Info)
- **UI:** Fix buttons are visible and actionable

---

### Scenario 9: Dark Mode Coverage - Playbooks

**ID:** HP-009

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- Project with Shopify connected

**Steps:**

1. Navigate to /projects/[id]/playbooks
2. Step through playbook wizard (Step 1, 2, 3)

**Expected Results:**

- **UI:** Playbook header and steps are dark
- **UI:** Product selection checkboxes are visible
- **UI:** Preview pane has appropriate dark styling
- **UI:** Progress indicators are visible

---

### Scenario 10: Dark Mode Coverage - Shopify Banners

**ID:** HP-010

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- Shopify connection with permission notices

**Steps:**

1. Navigate to /projects/[id]/settings
2. Observe Shopify connection status and any permission banners

**Expected Results:**

- **UI:** Warning/info banners have dark semantic backgrounds
- **UI:** Banner text is readable
- **UI:** Action buttons within banners are visible

---

### Scenario 11: Dark Mode Coverage - Modals and Dropdowns

**ID:** HP-011

**Preconditions:**

- User is logged in
- Theme set to "Dark"

**Steps:**

1. Click Account dropdown in top nav
2. Observe dropdown styling
3. Open any modal (e.g., create project, confirmation dialog)

**Expected Results:**

- **UI:** Dropdown has dark elevated surface
- **UI:** Dropdown items are visible with hover states
- **UI:** Modals have dark backgrounds
- **UI:** Modal buttons are visible

---

### Scenario 12: Embedded Shopify Iframe Mode

**ID:** HP-012

**Preconditions:**

- App opened from Shopify Admin (embedded context)
- User is logged in

**Steps:**

1. Open app from Shopify Admin
2. Click theme toggle
3. Switch between System/Light/Dark modes

**Expected Results:**

- **UI:** Theme toggle works inside Shopify iframe
- **UI:** Theme applies correctly
- **UI:** No CSP-related console errors
- **localStorage:** Preference persists

---

### Scenario 13: Secondary Text Readability (DARK-MODE-POLISH-1)

**ID:** HP-013

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- On a page with secondary/helper text (e.g., product list, settings)

**Steps:**

1. Navigate to /projects/[id]/products
2. Observe secondary text (timestamps, helper text, descriptions)
3. Navigate to /settings/profile
4. Observe form field descriptions and helper text

**Expected Results:**

- **UI:** Secondary text (gray-500/gray-600 equivalents) is readable at a glance
- **UI:** Clear contrast between primary text and secondary text
- **UI:** No need to squint or lean in to read meta information

---

### Scenario 14: Card/Row Separation While Scrolling (DARK-MODE-POLISH-1)

**ID:** HP-014

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- Project with multiple products/issues

**Steps:**

1. Navigate to /projects/[id]/products (with 10+ products)
2. Scroll through the list
3. Hover over different rows
4. Navigate to /projects/[id]/work-queue
5. Scroll through issues

**Expected Results:**

- **UI:** Cards/rows are visually distinct from page background
- **UI:** No "merged slab" effect where rows blend together
- **UI:** Hover state provides visible feedback (slightly raised/lighter)
- **UI:** Table headers (if present) are distinguishable from body rows

---

### Scenario 15: Button Hierarchy Clarity (DARK-MODE-POLISH-1)

**ID:** HP-015

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- On a page with multiple button types

**Steps:**

1. Navigate to /projects/[id]/playbooks
2. Observe primary action buttons (e.g., "Run Playbook", "Apply")
3. Observe secondary/outline buttons (e.g., "Cancel", "Back")
4. Observe ghost/tertiary buttons (e.g., inline actions)
5. Find any disabled buttons and observe their appearance

**Expected Results:**

- **UI:** Primary buttons are clearly the dominant action (solid fill, high contrast)
- **UI:** Secondary buttons have visible borders on dark surfaces
- **UI:** Ghost buttons show subtle hover state
- **UI:** Disabled buttons are clearly non-interactive but text is still readable

---

### Scenario 16: Status Chip Visibility (DARK-MODE-POLISH-1)

**ID:** HP-016

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- Project with products having various health states

**Steps:**

1. Navigate to /projects/[id]/products
2. Observe health badges on product rows (Critical/Needs Attention/Healthy)
3. Navigate to /projects/[id]/work-queue
4. Observe severity badges on issues (Critical/Warning/Info)
5. Look for any "New" or status badges

**Expected Results:**

- **UI:** Critical/red badges are clearly visible with appropriate contrast
- **UI:** Warning/amber badges are clearly visible
- **UI:** Success/green badges are clearly visible
- **UI:** Info/blue badges are clearly visible
- **UI:** Badge text contrast is stronger than regular body text
- **UI:** Badge backgrounds don't blend into card backgrounds

---

### Scenario 17: Input State Distinction (DARK-MODE-POLISH-1)

**ID:** HP-017

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- On a page with form inputs

**Steps:**

1. Navigate to /settings/profile
2. Observe editable input fields
3. Click into an input and observe focus state
4. If any read-only fields exist, observe their appearance
5. If any disabled fields exist, observe their appearance

**Expected Results:**

- **UI:** Editable inputs have dark background with visible border
- **UI:** Focus state shows unmistakable ring/border (blue focus ring visible)
- **UI:** Read-only inputs (if present) have slightly elevated/different surface
- **UI:** Disabled inputs are clearly non-editable but text is readable
- **UI:** Placeholder text is visible but clearly different from entered text

---

### Scenario 18: Dropdowns & Menus (DARK-MODE-DROPDOWN-FIX-1)

**ID:** HP-018

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- Access to pages with dropdowns/selects

**Steps:**

1. Navigate to /projects
2. Click the theme toggle dropdown in the top nav
3. Observe dropdown menu background and text
4. Use keyboard arrow keys to navigate options
5. Click Account dropdown in top nav
6. Observe dropdown styling and hover states
7. Navigate to /projects/[id]/settings
8. Find any `<select>` elements (e.g., timezone, locale dropdowns)
9. Click to open the native dropdown
10. Mouse hover over different options
11. Use keyboard arrow keys to navigate options
12. Select an option

**Expected Results:**

- **UI:** Theme dropdown menu has dark background (not white)
- **UI:** Account dropdown menu has dark background (not white)
- **UI:** Dropdown menu text is light and readable
- **UI:** Mouse hover highlight is visible and dark (not white)
- **UI:** Keyboard navigation highlight is visible and dark (not white)
- **UI:** Native `<select>` dropdown list has dark background
- **UI:** Native select options have dark hover/active states
- **UI:** No white flash when opening any dropdown

**Why This Matters:**

- Browser-native UI surfaces (`<select>` dropdowns, popovers) require `color-scheme: dark` to render correctly
- Without this, native dropdowns show white backgrounds even when the page is dark
- Custom dropdowns need explicit dark surface styling

---

### Scenario 19: Row Hover: Tables & Lists (DARK-MODE-TABLE-HOVER-FIX-1 + FIXUP-1 + FIXUP-2 + FIXUP-3)

**ID:** HP-019

**Preconditions:**

- User is logged in
- Theme set to "Dark"
- Access to pages with tables/lists and project sidebar

**Steps:**

1. Set theme to Dark Mode
2. **Establish baseline:** Navigate to /projects/[id]/store-health (a project page with sidebar visible)
3. Note the active pill tone in the ProjectSideNav sidebar (this is the menuBg reference tone at 0.14 alpha)
4. Navigate to /projects
5. **[FIXUP-2] Base row check:** Before hovering, confirm the Projects table body/rows are NOT white (should be dark surface-card tone)
6. Hover over project rows in the table
7. **[FIXUP-3] Compare:** Verify the hover tone is visibly distinct from the base row AND matches the sidebar active pill tone (both use menuHoverBg / 0.14)
8. Navigate to /admin/runs and confirm base rows are dark, then hover
9. Navigate to /admin/users and confirm base rows are dark, then hover
10. Navigate to /admin/projects and confirm base rows are dark, then hover
11. Navigate to /admin/governance-audit and confirm base rows are dark, then hover
12. Navigate to /admin/audit-log and confirm base rows are dark, then hover
13. For each table: confirm no white/light background appears anywhere (base OR hover); actions/links remain readable
14. Switch to Light Mode and repeat tests on one table to confirm no regression

**Expected Results:**

- **UI:** Table body/rows are NOT white in dark mode even before hovering (--surface-card token)
- **UI:** No white flash or pure white hover surfaces in dark mode (no white anywhere)
- **UI:** **[FIXUP-3] Hover state is visibly distinguishable from the row's base surface** (not merely "not white")
- **UI:** **[FIXUP-3] Hover tone matches the sidebar active pill tone** (both use menuHoverBg / 0.14 alpha)
- **UI:** Row hover uses menuHoverBg token at 0.14 alpha for visible contrast
- **UI:** Projects table row hover tone visually matches the sidebar active pill
- **UI:** Text, links, and action buttons within hovered rows remain readable
- **UI:** Light mode hover behavior unchanged (standard gray-50/gray-100 hover)

**Debugging Note:**

If a white row is observed, inspect the `tbody.bg-white` element and a `td` cell's computed background to confirm the FIXUP-2 rules are taking effect. Expected computed value: `hsl(222.2 47% 11%)` (--surface-card in dark mode).

**Why This Matters:**

- Table rows use `hover:bg-gray-50` on `<tr>`, but child `<td>` cells may have explicit backgrounds
- Without cell-level override, white cell backgrounds can "leak through" on hover
- This fix ensures all cells within a hovered row receive the dark hover surface

---

## Edge Cases

### EC-001: No FOUC on First Visit

**Description:** New user with no localStorage should see correct initial theme.

**Steps:**

1. Clear localStorage
2. Navigate to /projects

**Expected Behavior:**

- If OS is dark: Page loads with dark theme immediately
- If OS is light: Page loads with light theme immediately
- No flash of wrong theme

---

### EC-002: Backward Compatibility with Existing Preferences

**Description:** Users with existing "light" or "dark" localStorage value (from old 2-state toggle).

**Steps:**

1. Manually set localStorage: `engineo_theme` = "dark"
2. Refresh page
3. Open theme dropdown

**Expected Behavior:**

- Theme applies correctly (dark)
- Dropdown shows "Dark" as selected
- No errors in console

---

### EC-003: Invalid localStorage Value

**Description:** Malformed or unexpected localStorage value.

**Steps:**

1. Manually set localStorage: `engineo_theme` = "invalid"
2. Refresh page

**Expected Behavior:**

- Falls back to "system" mode
- Uses OS theme preference
- No errors in console

---

## Error Handling

### ERR-001: localStorage Unavailable

**Scenario:** localStorage access blocked (private browsing, security settings).

**Steps:**

1. Simulate blocked localStorage (browser privacy settings)
2. Load app
3. Try theme toggle

**Expected Behavior:**

- App loads with system theme (no crash)
- Theme changes work for session but don't persist
- No visible errors to user

---

## Limits

### LIM-001: N/A

**Scenario:** No specific limits apply to theme system.

**Steps:**

1. N/A

**Expected Behavior:**

- N/A

---

## Regression

### Areas potentially impacted:

- [ ] **Light theme unchanged:** All existing light theme styling works as before
- [ ] **Embedded Shopify:** Theme toggle works in iframe context
- [ ] **Existing tests:** nav-ia-consistency-1.spec.ts theme toggle test still passes
- [ ] **Marketing pages:** Theme tokens apply correctly to unauthenticated pages

### Quick sanity checks:

- [ ] Login page looks correct in both themes
- [ ] Marketing home page (/) looks correct in both themes
- [ ] All semantic banners (error/warning/success/info) are readable in dark mode
- [ ] Shopify permission notices are visible in dark mode
- [ ] **[DARK-MODE-POLISH-1]** Secondary text is not washed out in dark mode
- [ ] **[DARK-MODE-POLISH-1]** Status badges maintain visibility across all pages
- [ ] **[DARK-MODE-POLISH-1]** Form focus states are clearly visible

---

## Post-Conditions

### Data cleanup steps:

- [ ] No database changes (localStorage only)
- [ ] Reset theme to "System" if desired

### Follow-up verification:

- [ ] Verify no console errors related to theme
- [ ] Confirm localStorage key is correct (`engineo_theme`)

---

## Known Issues

- **Intentionally accepted issues:**
  - Some third-party components may not perfectly match dark theme
  - Chart/graph colors are not yet dark-mode optimized
  - Marketing pages outside /projects have basic dark support

- **Out-of-scope items:**
  - Admin dashboard dark mode optimization (internal tool)
  - Per-component design system refactoring (this patch uses utility remaps)

- **TODOs:**
  - [ ] Add E2E Playwright tests for theme persistence
  - [ ] Optimize chart/graph colors for dark mode
  - [ ] Consider reduced motion preference for theme transitions

- **DARK-MODE-POLISH-1 scope:**
  - Token-only refinements (no component file changes)
  - Surface elevation separation for scannability
  - Secondary text contrast boost (~15%)
  - Expanded chip/badge/input/button coverage via utility remaps

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Pending]                             |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | DARK-MODE-SYSTEM-1 manual testing     |
