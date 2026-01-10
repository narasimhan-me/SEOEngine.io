# STORE-HEALTH-1.0 – Store Optimization Home Manual Testing

> **Cloned from MANUAL_TESTING_TEMPLATE.md**
>
> This document covers manual testing for the STORE-HEALTH-1.0 feature, which provides a calm, executive Store Health page with 6 health cards that route to Work Queue.

---

## Overview

- **Purpose of the feature/patch:**
  - Provide a unified Store Health page that answers "what's wrong + what first"
  - Display exactly 6 health cards in fixed order: Discoverability, Generative Visibility, Content Quality, Technical Readiness, Trust & Compliance, AI Usage & Quota
  - Decision-only surface - no preview/generate/apply triggered from this page
  - All actions route into Work Queue with appropriate pre-filters

- **High-level user impact and what "success" looks like:**
  - Users see an executive overview of their store's health at a glance
  - Each card shows one health pill (Healthy / Needs Attention / Critical)
  - Each card has a plain-language summary (no jargon, no SEO promises)
  - Each card has exactly one primary action label (verb-first)
  - Clicking any card routes to Work Queue or appropriate detail page with filters
  - No side effects on click (no POST/PUT/DELETE)

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase STORE-HEALTH-1.0

- **Related documentation:**
  - WORK-QUEUE-1.md (Work Queue manual testing)
  - IMPLEMENTATION_PLAN.md

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with database connection
  - [ ] Web app running and connected to API

- **Test accounts and sample data:**
  - [ ] User account with at least one project
  - [ ] Project with products having varying health states
  - [ ] Project with GEO insights data (for Generative Visibility card)
  - [ ] User with AI quota configured

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario 1: Store Health Page Renders with 6 Cards

**ID:** HP-001

**Preconditions:**
- User is authenticated and has project access

**Steps:**
1. Login as any user
2. Navigate to a project (should redirect to /store-health)
3. Observe the page layout

**Expected Results:**
- **UI:**
  - Page title "Store Health" visible
  - Subtitle "Overview of your store's optimization status. Click any card to take action."
  - Exactly 6 cards displayed in grid layout
  - Cards appear in order: Discoverability, Generative Visibility, Content Quality, Technical Readiness, Trust & Compliance, AI Usage & Quota
- **API:** Parallel requests to work-queue, insights, and ai-usage-quota endpoints
- **Logs:** No errors in console

---

### Scenario 2: Cards Display Correct Order

**ID:** HP-002

**Preconditions:**
- Store Health page loaded

**Steps:**
1. Observe the card order

**Expected Results:**
- **UI:**
  - Card 1: "Discoverability"
  - Card 2: "Generative Visibility"
  - Card 3: "Content Quality"
  - Card 4: "Technical Readiness"
  - Card 5: "Trust & Compliance"
  - Card 6: "AI Usage & Quota"

---

### Scenario 3: Health Pills Show Correct States

**ID:** HP-003

**Preconditions:**
- Project with mixed health states

**Steps:**
1. Navigate to Store Health page
2. Observe health pills on each card

**Expected Results:**
- **UI:**
  - Each card shows exactly ONE health pill
  - Pills show text: "Healthy" (green), "Needs Attention" (yellow), or "Critical" (red)
  - Health is derived from worst-case of underlying Work Queue bundles
- **No prohibited elements:** No counts, charts, percentages, scores, or "SEO score" language on cards

---

### Scenario 4: Click-Through to Work Queue with Filters

**ID:** HP-004

**Preconditions:**
- Store Health page loaded
- Discoverability card shows "Needs Attention" or "Critical"

**Steps:**
1. Click on "Discoverability" card
2. Observe URL and Work Queue page

**Expected Results:**
- **UI:**
  - Navigated to /projects/:id/work-queue?actionKey=FIX_MISSING_METADATA
  - Work Queue shows filtered bundles matching actionKey
  - Tab, actionKey, and bundleType filters preserved in URL
- **Network:** No POST/PUT/DELETE requests fired on navigation
- **API:** Only GET /projects/:id/work-queue?actionKey=... called

---

### Scenario 5: Generative Visibility Routes to Insights

**ID:** HP-005

**Preconditions:**
- Store Health page loaded

**Steps:**
1. Click on "Generative Visibility" card
2. Observe navigation

**Expected Results:**
- **UI:**
  - Navigated to /projects/:id/insights?tab=geo
  - GEO Insights section visible
- **Network:** No mutations fired

---

### Scenario 6: AI Usage Routes to Settings

**ID:** HP-006

**Preconditions:**
- Store Health page loaded

**Steps:**
1. Click on "AI Usage & Quota" card
2. Observe navigation

**Expected Results:**
- **UI:**
  - Navigated to /settings/ai-usage
  - AI usage settings page visible
- **Network:** No mutations fired

---

### Scenario 7: Default Project Landing

**ID:** HP-007

**Preconditions:**
- User authenticated

**Steps:**
1. Navigate directly to /projects/:id
2. Observe redirect

**Expected Results:**
- **UI:**
  - Redirected to /projects/:id/store-health
  - Store Health page displayed
- **URL:** Final URL ends with /store-health

---

### Scenario 8: New Project Creation Landing

**ID:** HP-008

**Preconditions:**
- User authenticated with ability to create projects

**Steps:**
1. Go to projects list (/projects)
2. Create a new project
3. Observe navigation after creation

**Expected Results:**
- **UI:**
  - After project creation, navigated to /projects/:newId/store-health
  - Store Health page displayed for new project
- **URL:** Final URL ends with /store-health

---

## Edge Cases

### EC-001: Empty Project (No Data)

**Description:** New project with no products, no crawl data

**Steps:**
1. Create new project (no Shopify connected)
2. Navigate to Store Health

**Expected Behavior:**
- All cards show "Healthy" (no issues detected)
- Summaries reflect empty state gracefully
- No errors

---

### EC-002: API Failure

**Description:** Work Queue or Insights API fails

**Steps:**
1. Simulate API error (disconnect network momentarily)

**Expected Behavior:**
- Error message displayed with "Try again" button
- User not left on blank page

---

### EC-003: Partial API Success

**Description:** Work Queue succeeds but Insights fails

**Steps:**
1. Ensure Work Queue endpoint works
2. Block Insights endpoint

**Expected Behavior:**
- Cards derived from Work Queue still render
- Generative Visibility card shows default/graceful state
- No JavaScript errors

---

## Error Handling

### ERR-001: Unauthorized Access

**Scenario:** Non-member tries to access Store Health

**Steps:**
1. Login as user not member of project
2. Navigate directly to /projects/:id/store-health

**Expected Behavior:**
- 403 Forbidden response
- Redirect to projects list or access denied page

---

## No Side Effects Verification

### NSE-001: No Mutations on Card Click

**Description:** Clicking any card must not trigger mutations

**Steps:**
1. Open browser Network tab
2. Navigate to Store Health
3. Click each of the 6 cards in sequence
4. Observe network requests

**Expected Behavior:**
- Only GET requests observed
- No POST, PUT, DELETE, or PATCH requests
- No background jobs triggered

---

## Navigation Verification

### NAV-001: Sidebar Shows Store Health First

**Description:** Store Health is first item in project sidebar

**Steps:**
1. Navigate to any project page
2. Observe sidebar navigation

**Expected Behavior:**
- "Store Health" is first nav item
- "Work Queue" is second nav item
- "Overview" is third nav item

---

## Regression

### Areas potentially impacted:

- [ ] **Project Overview:** Now third in navigation, not first
- [ ] **Work Queue:** actionKey filter must work for click-through
- [ ] **Project Creation:** Landing changed from overview to store-health
- [ ] **Direct Navigation:** /projects/:id now redirects to store-health

### Quick sanity checks:

- [ ] Project sidebar navigation shows Store Health first
- [ ] Work Queue still functions with actionKey filter
- [ ] Insights page still loads GEO data
- [ ] AI usage settings page accessible

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup needed (Store Health is read-only)

### Follow-up verification:

- [ ] Verify no orphaned records created
- [ ] Confirm no side effects from testing

---

## Known Issues

- **Intentionally accepted issues:**
  - Generative Visibility health derived from GEO readiness percentage only
  - AI Usage & Quota routes to global settings, not project-scoped

- **Out-of-scope items:**
  - Real-time updates (requires page refresh)
  - Custom card ordering or hiding

- **TODOs:**
  - [ ] Add data-testid attributes for E2E automation
  - [ ] Implement Playwright E2E tests

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | [Any additional notes] |
