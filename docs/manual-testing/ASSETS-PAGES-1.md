# ASSETS-PAGES-1 – Pages & Collections Visibility Manual Testing

> **Cloned from MANUAL_TESTING_TEMPLATE.md**
>
> This document covers manual testing for the ASSETS-PAGES-1 feature (visibility-only phase), which surfaces Pages and Collections health status through Work Queue bundles, asset list pages, and Store Health cards.
>
> **IMPORTANT:** This phase is visibility-only. No execution paths (Generate Drafts, Apply) exist for Pages/Collections. Execution is deferred to ASSETS-PAGES-1.1.

---

## Overview

- **Purpose of the feature/patch:**
  - Surface Pages and Collections health status and recommended actions (visibility-only)
  - Extend Work Queue to create separate ASSET_OPTIMIZATION bundles for PAGES and COLLECTIONS scope types
  - Provide dedicated asset list pages for Pages (/projects/:id/assets/pages) and Collections (/projects/:id/assets/collections)
  - Enable decision-first UX: one health pill, one action label per asset row
  - Support filtering Work Queue by scopeType (PRODUCTS, PAGES, COLLECTIONS, STORE_WIDE)
  - Route CTA clicks from Work Queue to appropriate asset list pages with filters

- **High-level user impact and what "success" looks like:**
  - Users see Pages and Collections in project navigation
  - Work Queue shows separate bundles for issues affecting Pages vs Collections vs Products
  - Clicking a bundle routes to the correct asset list page with actionKey filter
  - Asset lists show health pills (Healthy/Needs Attention/Critical) per row
  - Bulk actions on asset lists route to Work Queue with scope filter
  - Store Health cards reflect Pages/Collections health (via Work Queue derivation)
  - **No execution surfaces exist** (no "Generate Drafts", no "Apply" for Pages/Collections)

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase ASSETS-PAGES-1 (visibility-only)
  - Phase ASSETS-PAGES-1.1 (execution - pending)

- **Related documentation:**
  - WORK-QUEUE-1.md (Work Queue manual testing)
  - STORE-HEALTH-1.0.md (Store Health manual testing)
  - API_SPEC.md (scopeType query parameter)
  - IMPLEMENTATION_PLAN.md

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with database connection
  - [ ] Web app running and connected to API
  - [ ] Project with crawl data including /pages/* and /collections/* URLs

- **Test accounts and sample data:**
  - [ ] User account with at least one project
  - [ ] Project with crawled pages of various types:
    - /pages/* (static pages)
    - /collections/* (collection pages)
    - /products/* (product pages)
  - [ ] Some pages/collections with missing metadata (for Critical health)
  - [ ] Some pages/collections with thin content (for Needs Attention health)

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access (OWNER/EDITOR/VIEWER)

---

## Test Scenarios (Happy Path)

### Scenario 1: Navigation Shows Pages and Collections

**ID:** HP-001

**Preconditions:**
- User is authenticated and has project access

**Steps:**
1. Login as any user
2. Navigate to a project
3. Observe the sidebar navigation

**Expected Results:**
- **UI:**
  - "Pages" nav item visible in sidebar
  - "Collections" nav item visible in sidebar
  - Both items route to /projects/:id/assets/pages and /projects/:id/assets/collections respectively
- **Logs:** No errors in console

---

### Scenario 2: Pages Asset List Renders

**ID:** HP-002

**Preconditions:**
- Project with crawled /pages/* URLs

**Steps:**
1. Navigate to /projects/:id/assets/pages
2. Observe the page layout

**Expected Results:**
- **UI:**
  - Page title "Pages" visible
  - Subtitle shows count: "N pages • X critical • Y need attention"
  - Table with columns: Checkbox, Health, Path, Title, Action
  - Each row shows a page with appropriate health pill
  - Health pills: "Critical" (red), "Needs Attention" (yellow), or "Healthy" (green)
- **API:** GET /projects/:id/crawl-pages called
- **Logs:** No errors

---

### Scenario 3: Collections Asset List Renders

**ID:** HP-003

**Preconditions:**
- Project with crawled /collections/* URLs

**Steps:**
1. Navigate to /projects/:id/assets/collections
2. Observe the page layout

**Expected Results:**
- **UI:**
  - Page title "Collections" visible
  - Subtitle shows count: "N collections • X critical • Y need attention"
  - Table with columns: Checkbox, Health, Handle, Title, Action
  - Each row shows a collection with appropriate health pill
  - Handle column shows collection handle (e.g., "shoes" from /collections/shoes)
- **API:** GET /projects/:id/crawl-pages called
- **Logs:** No errors

---

### Scenario 4: Work Queue Shows Separate Bundles by Scope Type

**ID:** HP-004

**Preconditions:**
- Project with issues on products, pages, AND collections

**Steps:**
1. Navigate to /projects/:id/work-queue
2. Observe bundle cards

**Expected Results:**
- **UI:**
  - Separate bundle cards for PRODUCTS, PAGES, and COLLECTIONS scope types
  - Each bundle shows scope type in "Applies to" line (e.g., "Applies to 5 pages", "Applies to 3 collections")
  - Bundle IDs are distinct (e.g., ASSET_OPTIMIZATION:FIX_MISSING_METADATA:PAGES vs :PRODUCTS)
- **API:** GET /projects/:id/work-queue returns bundles with different scopeType values
- **Logs:** No errors

---

### Scenario 5: Work Queue Scope Type Filter

**ID:** HP-005

**Preconditions:**
- Work Queue page loaded with multiple scope type bundles

**Steps:**
1. Navigate to /projects/:id/work-queue?scopeType=PAGES
2. Observe filtered results

**Expected Results:**
- **UI:**
  - Only bundles with scopeType=PAGES visible
  - Other scope types (PRODUCTS, COLLECTIONS) filtered out
  - Filter preserved when changing tabs
- **URL:** scopeType=PAGES in query string
- **API:** GET /projects/:id/work-queue?scopeType=PAGES called

---

### Scenario 6: Bundle CTA Routes to Correct Asset Page

**ID:** HP-006

**Preconditions:**
- Work Queue showing a PAGES scope bundle

**Steps:**
1. Navigate to Work Queue
2. Find a bundle with scopeType=PAGES
3. Click the primary CTA (e.g., "View Issues")

**Expected Results:**
- **UI:**
  - Navigated to /projects/:id/assets/pages?actionKey=...
  - Pages list filtered by actionKey
  - Filter indicator shows active filter
- **Network:** No mutations fired

---

### Scenario 7: Bundle CTA Routes to Collections Page

**ID:** HP-007

**Preconditions:**
- Work Queue showing a COLLECTIONS scope bundle

**Steps:**
1. Navigate to Work Queue
2. Find a bundle with scopeType=COLLECTIONS
3. Click the primary CTA

**Expected Results:**
- **UI:**
  - Navigated to /projects/:id/assets/collections?actionKey=...
  - Collections list filtered by actionKey
- **Network:** No mutations fired

---

### Scenario 8: Asset List Bulk Action Routes to Work Queue

**ID:** HP-008

**Preconditions:**
- Pages asset list with selectable rows

**Steps:**
1. Navigate to /projects/:id/assets/pages
2. Select multiple pages using checkboxes
3. Click "Fix missing metadata (N)" button

**Expected Results:**
- **UI:**
  - Navigated to /projects/:id/work-queue?actionKey=FIX_MISSING_METADATA&scopeType=PAGES
  - Work Queue shows filtered bundles
- **Network:** No mutations fired on navigation

---

### Scenario 9: Asset List Action Button Routes to Work Queue

**ID:** HP-009

**Preconditions:**
- Pages asset list with a page needing attention

**Steps:**
1. Navigate to /projects/:id/assets/pages
2. Find a row with recommended action
3. Click the action button in that row

**Expected Results:**
- **UI:**
  - Navigated to Work Queue with actionKey and scopeType filters
  - Filtered to show relevant bundle
- **Network:** No mutations fired

---

### Scenario 10: Clear Filter on Asset List

**ID:** HP-010

**Preconditions:**
- Asset list with active filter from Work Queue click-through

**Steps:**
1. Navigate to /projects/:id/assets/pages?actionKey=FIX_MISSING_METADATA
2. Observe filter indicator
3. Click "Clear filter" link

**Expected Results:**
- **UI:**
  - Filter indicator visible with filter name
  - After clicking "Clear filter", all pages shown
  - URL updated to remove actionKey param
- **URL:** actionKey removed from query string

---

## Edge Cases

### EC-001: No Pages in Project

**Description:** Project has no /pages/* URLs crawled

**Steps:**
1. Navigate to /projects/:id/assets/pages

**Expected Behavior:**
- Empty state: "No pages found"
- No errors

---

### EC-002: No Collections in Project

**Description:** Project has no /collections/* URLs crawled

**Steps:**
1. Navigate to /projects/:id/assets/collections

**Expected Behavior:**
- Empty state: "No collections found"
- No errors

---

### EC-003: All Assets Healthy

**Description:** All pages/collections have complete metadata

**Steps:**
1. Navigate to asset list with all healthy assets

**Expected Behavior:**
- All rows show "Healthy" pill (green)
- No recommended actions shown
- Subtitle shows "0 critical • 0 need attention"

---

### EC-004: Mixed Health States

**Description:** Mix of Critical, Needs Attention, and Healthy assets

**Steps:**
1. Navigate to asset list with mixed health

**Expected Behavior:**
- Critical items: Missing metadata → red pill, "Fix missing metadata" action
- Needs Attention items: Thin content → yellow pill, "Optimize content" action
- Healthy items: Green pill, no action

---

### EC-005: Store Health Reflects Pages/Collections

**Description:** Store Health cards derive from Work Queue including Pages/Collections

**Steps:**
1. Navigate to Store Health page
2. Observe Discoverability card

**Expected Behavior:**
- Card health reflects worst-case across Products, Pages, AND Collections
- If Pages have critical issues, Discoverability shows Critical
- Summary mentions total items needing attention

---

## Error Handling

### ERR-001: Unauthorized Access

**Scenario:** Non-member tries to access asset pages

**Steps:**
1. Login as user not member of project
2. Navigate directly to /projects/:id/assets/pages

**Expected Behavior:**
- 403 Forbidden response
- Redirect to projects list or access denied page

---

### ERR-002: API Failure

**Scenario:** Crawl pages API fails

**Steps:**
1. Simulate API error (disconnect network)
2. Navigate to asset list

**Expected Behavior:**
- Error message displayed with "Try again" button
- User not left on blank page

---

## Health Derivation Verification

### HDV-001: Critical Health Conditions

**Description:** Verify Critical health is derived correctly

**Conditions that trigger Critical:**
1. Missing title (title === null or empty)
2. Missing meta description (metaDescription === null or empty)
3. HTTP status >= 400

**Expected Behavior:**
- Row shows "Critical" pill (red)
- recommendedActionKey = FIX_MISSING_METADATA or RESOLVE_TECHNICAL_ISSUES

---

### HDV-002: Needs Attention Health Conditions

**Description:** Verify Needs Attention health is derived correctly

**Conditions that trigger Needs Attention:**
1. Thin content (wordCount < 300)

**Expected Behavior:**
- Row shows "Needs Attention" pill (yellow)
- recommendedActionKey = OPTIMIZE_CONTENT

---

### HDV-003: Healthy Conditions

**Description:** Verify Healthy is the default state

**Conditions for Healthy:**
1. Has title AND meta description
2. HTTP status < 400 (or null)
3. wordCount >= 300 (or null)

**Expected Behavior:**
- Row shows "Healthy" pill (green)
- No recommended action

---

## Scope Type Label Verification

### STL-001: Singular vs Plural Labels

**Description:** Verify correct grammar in "Applies to" line

**Steps:**
1. Navigate to Work Queue
2. Find bundles with scopeCount = 1 and scopeCount > 1

**Expected Behavior:**
- scopeCount = 1: "Applies to 1 page" / "1 collection" / "1 product"
- scopeCount > 1: "Applies to 5 pages" / "3 collections" / "10 products"
- STORE_WIDE: Always "store-wide" (no count grammar)

---

## Visibility-Only Contract Verification

### VIS-001: No Execution Surfaces for Pages

**Description:** Confirm no Generate Drafts or Apply buttons appear for PAGES bundles

**Steps:**
1. Navigate to Work Queue
2. Find a bundle with scopeType=PAGES
3. Observe the CTA buttons

**Expected Behavior:**
- Primary CTA is "View Issues" or similar view-only action
- No "Generate Drafts" button visible for PAGES bundles
- No "Apply Changes" button visible for PAGES bundles
- Clicking CTA routes to asset list, not execution flow

---

### VIS-002: No Execution Surfaces for Collections

**Description:** Confirm no Generate Drafts or Apply buttons appear for COLLECTIONS bundles

**Steps:**
1. Navigate to Work Queue
2. Find a bundle with scopeType=COLLECTIONS
3. Observe the CTA buttons

**Expected Behavior:**
- Primary CTA is "View Issues" or similar view-only action
- No "Generate Drafts" button visible for COLLECTIONS bundles
- No "Apply Changes" button visible for COLLECTIONS bundles
- Clicking CTA routes to asset list, not execution flow

---

### VIS-003: No Side Effects on Navigation

**Description:** Confirm no mutations occur when navigating Pages/Collections surfaces

**Steps:**
1. Open browser Network tab
2. Navigate to /projects/:id/assets/pages
3. Navigate to /projects/:id/assets/collections
4. Click various action buttons and filters
5. Observe network requests

**Expected Behavior:**
- Only GET requests observed
- No POST, PUT, DELETE, or PATCH requests
- No background jobs triggered
- No draft generation initiated

---

## Regression

### Areas potentially impacted:

- [ ] **Work Queue:** scopeType filter must work correctly
- [ ] **Store Health:** Cards should reflect Pages/Collections health
- [ ] **Products List:** Should continue working (PRODUCTS scope)
- [ ] **Playbooks:** CTA routing to /products should still work

### Quick sanity checks:

- [ ] Work Queue shows bundles for all scope types
- [ ] Products page still accessible and functional
- [ ] Store Health cards still derive health correctly
- [ ] ActionBundleCard CTA routing works for all scope types

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup needed (Pages/Collections asset lists are read-only)

### Follow-up verification:

- [ ] Verify no orphaned records created
- [ ] Confirm no side effects from testing

---

## Known Issues

- **Intentionally accepted issues (visibility-only phase):**
  - Health derivation for Pages/Collections is frontend-only (based on crawl data)
  - No real-time updates (requires page refresh)
  - No draft generation or apply capabilities for Pages/Collections (by design)

- **Out-of-scope items (deferred to ASSETS-PAGES-1.1):**
  - Automation Playbooks support for Pages/Collections draft/apply
  - Shopify apply support for Pages/Collections
  - See Phase ASSETS-PAGES-1.1 in IMPLEMENTATION_PLAN.md for full scope

- **TODOs:**
  - [ ] Add data-testid attributes for E2E automation
  - [ ] Implement Playwright E2E tests

---

## Deferred to ASSETS-PAGES-1.1

The following capabilities are intentionally excluded from this visibility-only phase and deferred to ASSETS-PAGES-1.1:

### Automation Playbooks for Pages/Collections

To fully support Pages/Collections in Automation Playbooks:
1. Extend PlaybookScopeType enum with PAGES, COLLECTIONS
2. Add playbook IDs: PAGE_SEO_TITLE_FIX, PAGE_SEO_DESCRIPTION_FIX
3. Add playbook IDs: COLLECTION_SEO_TITLE_FIX, COLLECTION_SEO_DESCRIPTION_FIX
4. Extend draft generation to handle non-product assets
5. Update playbooks list endpoint to include page/collection playbooks

### Shopify Apply for Pages/Collections

To apply changes to Pages/Collections via Shopify:
1. Use Shopify Admin API for pages: POST /pages/{page_id}.json
2. Use Shopify Admin API for collections: PUT /collections/{collection_id}.json
3. Add shopifyPageId, shopifyCollectionId to crawl page records
4. Implement updatePageSeo(), updateCollectionSeo() in shopify.service.ts
5. Wire apply endpoints for page/collection drafts

### Approval Gating + Audit Coverage

1. ROLES-2/ROLES-3 approval gating for Pages/Collections apply
2. Audit events for page/collection draft generation and apply
3. EDITOR approval chain for Pages/Collections

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | [Any additional notes] |
