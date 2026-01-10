# NAV-IA-CONSISTENCY-1 - Manual Testing Documentation

> **Phase:** NAV-IA-CONSISTENCY-1
> **Critical Paths:** CP-001 (Auth terminology), CP-008 (Design tokens & theme)

---

## Overview

- **Purpose of the feature/patch:**
  - Enforce locked contract for navigation IA (Information Architecture) and terminology
  - Add design tokens and dark mode support (theme toggle)
  - Normalize authentication terminology across marketing and portal
  - Ensure visual consistency between marketing and portal using token-based styling

- **High-level user impact and what "success" looks like:**
  - Consistent terminology across all user-facing surfaces (e.g., "Sign in" not "Log in", "Stores" not "Organization / Stores")
  - Working dark mode toggle that persists preference
  - Grouped project sidebar navigation with clear section headings
  - Pillar navigation moved under Insights with subnav

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase NAV-IA-CONSISTENCY-1

- **Related documentation:**
  - docs/DEO_INFORMATION_ARCHITECTURE.md

---

## Preconditions

- **Environment requirements:**
  - [ ] Frontend running (`pnpm dev`)
  - [ ] Backend API running (for authenticated tests)
  - [ ] Test user account available

- **Test accounts and sample data:**
  - [ ] Free tier test user
  - [ ] Test project with store integration

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user for portal tests
  - [ ] No authentication needed for marketing tests

---

## Test Scenarios (Happy Path)

### Scenario 1: Marketing Navbar Terminology

**ID:** HP-001

**Preconditions:**
- Not logged in

**Steps:**
1. Navigate to the marketing home page (/)
2. Inspect the navbar

**Expected Results:**
- **UI:** Navbar shows "Sign in" link (not "Log in")
- **UI:** Navbar shows "Start free" CTA button
- **UI:** Navbar uses token-based colors (bg-background, not bg-white)

---

### Scenario 2: Top Nav Contract (Authenticated)

**ID:** HP-002

**Preconditions:**
- Logged in as any user

**Steps:**
1. Navigate to /projects
2. Check the top navigation bar
3. Click Account dropdown

**Expected Results:**
- **UI:** Top nav shows "Projects" link
- **UI:** Top nav does NOT show "Settings" link (removed from top-level)
- **UI:** Account dropdown contains exact labels in order: Profile, Stores, Plan & Billing, AI Usage, Security, Preferences, Help & Support, Sign out
- **UI:** Account dropdown does NOT contain "Admin Dashboard" (Admin link remains in main nav for admin users only)

---

### Scenario 3: Theme Toggle

**ID:** HP-003

**Preconditions:**
- Logged in as any user

**Steps:**
1. Navigate to /projects
2. Click the theme toggle button (moon/sun icon in top nav)
3. Verify page switches to dark mode
4. Refresh the page
5. Close and reopen browser
6. Navigate back to /projects

**Expected Results:**
- **UI:** Theme toggles between light and dark modes
- **UI:** Dark mode persists after page refresh
- **UI:** Dark mode persists after browser restart (localStorage)

---

### Scenario 4: Project Sidebar Groups

**ID:** HP-004

**Preconditions:**
- Logged in with at least one project
- Navigate to any project page

**Steps:**
1. Navigate to /projects/{id}/store-health
2. Inspect the left sidebar

**Expected Results:**
- **UI:** Sidebar shows group headings: OPERATE, ASSETS, AUTOMATION, INSIGHTS, PROJECT
- **UI:** OPERATE contains: Store Health, Work Queue
- **UI:** ASSETS contains: Products, Pages, Collections
- **UI:** AUTOMATION contains: Playbooks
- **UI:** INSIGHTS contains: Insights (single item)
- **UI:** PROJECT contains: Project Settings
- **UI:** Sidebar does NOT show: Overview, Automation (old label), Settings (old label), Content, DEO Overview

---

### Scenario 5: Insights Active State

**ID:** HP-005

**Preconditions:**
- Navigate to any project

**Steps:**
1. Navigate to /projects/{id}/deo
2. Check sidebar "Insights" item
3. Navigate to /projects/{id}/keywords
4. Check sidebar "Insights" item
5. Repeat for: /competitors, /backlinks, /local, /performance

**Expected Results:**
- **UI:** "Insights" sidebar item shows active state on ALL pillar routes
- **UI:** Pillar subnav tabs visible on pillar pages (DEO, Search & Intent, Competitors, Off-site Signals, Local Discovery, Technical)

---

### Scenario 6: Terminology - Stores Page

**ID:** HP-006

**Preconditions:**
- Logged in

**Steps:**
1. Navigate to /settings/organization

**Expected Results:**
- **UI:** Page title is "Stores" (not "Organization / Stores")
- **UI:** Settings hub card shows "Stores" label

---

### Scenario 7: Playbooks Terminology

**ID:** HP-007

**Preconditions:**
- Navigate to any project

**Steps:**
1. Click "Playbooks" in sidebar
2. Check page header and breadcrumbs

**Expected Results:**
- **UI:** Page header shows "Playbooks" (not "Automation Playbooks")
- **UI:** Breadcrumbs show: Project / Playbooks
- **UI:** "Create playbook" button visible

---

### Scenario 8: Auth Pages Terminology

**ID:** HP-008

**Preconditions:**
- Not logged in

**Steps:**
1. Navigate to /login
2. Check the "Create account" link at bottom
3. Navigate to /signup
4. Check the submit button text

**Expected Results:**
- **UI:** Login page link says "Create account" (not "Sign up")
- **UI:** Signup page button says "Create account" (not "Sign up")

---

## Edge Cases

### EC-001: Dark Mode on Marketing Pages

**Description:** Verify token-based styling works on marketing pages

**Steps:**
1. Navigate to marketing page
2. Enable dark mode via browser dev tools (.dark class on html)

**Expected Behavior:**
- Marketing pages respect dark mode tokens

---

### EC-002: InsightsSubnav Tab Label

**Description:** Verify Overview tab renamed to Summary

**Steps:**
1. Navigate to /projects/{id}/insights

**Expected Behavior:**
- First tab label is "Summary" (not "Overview")

---

## Error Handling

### ERR-001: Theme Storage Failure

**Scenario:** localStorage unavailable (private browsing)

**Steps:**
1. Use private/incognito mode
2. Toggle theme

**Expected Behavior:**
- Theme still toggles in session
- No console errors

---

## Limits

### LIM-001: N/A

No limits apply to this patch (UI/terminology changes only).

---

## Regression

### Areas potentially impacted:

- [ ] **Navigation:** All sidebar links should work
- [ ] **Auth flows:** Login/signup should work with new terminology
- [ ] **Settings pages:** All settings routes accessible from dropdown

### Quick sanity checks:

- [ ] Can sign in and out
- [ ] Can navigate to all sidebar items
- [ ] Theme persists across sessions
- [ ] No hardcoded colors visible on marketing pages

---

## Post-Conditions

### Data cleanup steps:

- [ ] Clear localStorage if testing theme persistence

### Follow-up verification:

- [ ] N/A - no database changes

---

## How to Run Playwright Tests

```bash
# Run NAV-IA-CONSISTENCY-1 specific tests
pnpm test:web -- apps/web/tests/nav-ia-consistency-1.spec.ts

# Run all E2E tests
pnpm test:web
```

---

## Known Issues

- **Intentionally accepted issues:**
  - Marketing pages still have some hardcoded colors for gradients/accents (acceptable for brand identity)
  - Logo switching for dark mode requires both logo-light.png and logo-dark.png assets

- **Out-of-scope items:**
  - Full dark mode for marketing pages (tokens applied, but full dark marketing design not prioritized)
  - Pillar page content updates (only navigation/terminology updated)

- **TODOs:**
  - [ ] Add logo-dark.png asset for TopNav dark mode

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | [Any additional notes] |
