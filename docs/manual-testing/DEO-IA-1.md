# Manual Test Script: DEO-IA-1

**Feature:** Pillarized DEO Information Architecture & UX Contracts
**Version:** 1.0
**Date:** 2024-12

## Prerequisites

- Local development environment running (`pnpm dev`)
- At least one project with synced products
- Some products with DEO issues (run a crawl if needed)

## Test Cases

### TC-001: Navigation Structure

**Objective:** Verify pillar-centric navigation is present and functional

**Steps:**
1. Log in and navigate to any project
2. Observe the sidebar navigation

**Expected:**
- [ ] "DEO Overview" appears in nav (links to `/projects/[id]/deo`)
- [ ] "Metadata" appears in nav (links to `/projects/[id]/metadata`)
- [ ] "Content" appears in nav
- [ ] "Media" appears in nav
- [ ] "Technical" appears in nav
- [ ] Navigation order follows DEO pillar hierarchy
- [ ] Issues Engine is NOT in main navigation (accessed via links)

---

### TC-002: DEO Overview Page

**Objective:** Verify DEO Overview displays pillar scorecards

**Steps:**
1. Navigate to `/projects/[id]/deo`
2. Review the page content

**Expected:**
- [ ] Page header shows "DEO Overview"
- [ ] Overall health summary card is visible
- [ ] Shows total issue count
- [ ] Pillar scorecards displayed in grid
- [ ] Each pillar card shows:
  - Pillar name
  - Issue count for that pillar
  - "View issues" link
- [ ] "View issues" links include `?pillar=X` parameter
- [ ] Coming soon pillars show disabled/placeholder state

---

### TC-003: Issues Engine - Pillar Filter

**Objective:** Verify pillar filtering works correctly

**Steps:**
1. Navigate to Issues Engine (`/projects/[id]/issues`)
2. Observe the filter area
3. Click on a pillar filter button
4. Click "All pillars"

**Expected:**
- [ ] "Filter by DEO Pillar" label is visible
- [ ] "All pillars" button is first
- [ ] Each active pillar has a filter button with issue count
- [ ] Clicking a pillar:
  - Updates URL to `?pillar=X`
  - Filters issues to only that pillar
  - Highlights selected pillar button (purple)
- [ ] "All pillars" resets to show all issues
- [ ] Empty state message reflects pillar context
- [ ] Severity filter works alongside pillar filter

---

### TC-004: Issues Engine - Deep Link from DEO Overview

**Objective:** Verify pillar filter from URL parameter

**Steps:**
1. Navigate to `/projects/[id]/deo`
2. Click "View issues" on any pillar card
3. Observe Issues Engine

**Expected:**
- [ ] URL contains `?pillar=X` parameter
- [ ] Issues are filtered to that pillar
- [ ] Pillar filter button is highlighted
- [ ] Clearing filter removes URL parameter

---

### TC-005: Products Page - Metadata Status Labels - **SUPERSEDED**

> **This test case is superseded by [PRODUCTS-LIST-2.0.md](./PRODUCTS-LIST-2.0.md)**.
>
> The Products list no longer uses metadata status filters or labels in the default row view.
> Instead, PRODUCTS-LIST-2.0 introduces:
> - **Health filter**: All, Critical, Needs Attention, Healthy (based on issue presence/severity)
> - **Health pill per row**: Healthy (green), Needs Attention (yellow), Critical (red) - no numbers
> - **Recommended action per row**: Single deterministic action under the product title
> - **Progressive disclosure**: Metadata status visible in expanded details, not default row
>
> See PRODUCTS-LIST-2.0.md for current test coverage.

~~**Objective:** Verify status labels explicitly reference metadata~~

~~**Steps:**~~
~~1. Navigate to Products page (`/projects/[id]/products`)~~
~~2. Find products with different statuses~~
~~3. Review filter controls~~

~~**Expected:**~~
~~- [ ] Filter buttons say "Metadata OK", "Metadata needs work", "Metadata missing"~~
~~- [ ] Status chips on product rows say:~~
~~  - "Metadata optimized" (not just "optimized")~~
~~  - "Metadata needs work"~~
~~  - "Metadata missing"~~
~~- [ ] Helper text mentions "Metadata status does not reflect DEO issues"~~

---

### TC-006: Product Row - DEO Issue Badge

**Objective:** Verify issue badge is clickable and navigates correctly

**Steps:**
1. Find a product with DEO issues on the Products page
2. Observe the issue badge
3. Click the badge

**Expected:**
- [ ] Badge shows "X DEO issues" (not "X issues")
- [ ] Badge color reflects max severity
- [ ] Badge is visible even if metadata is "optimized"
- [ ] Clicking badge navigates to product workspace
- [ ] URL contains `?focus=deo-issues`
- [ ] Page scrolls to DEO issues section

---

### TC-007: Product Workspace - Focus Parameter

**Objective:** Verify focus parameters scroll to correct sections

**Steps:**
1. Navigate to a product workspace with `?focus=metadata`
2. Navigate to same product with `?focus=deo-issues`

**Expected:**
- [ ] `?focus=metadata` scrolls to metadata section
- [ ] `?focus=deo-issues` scrolls to DEO issues section
- [ ] Scrolling happens after brief delay (200ms)
- [ ] Section is visible in viewport

---

### TC-008: Product DEO Insights Panel

**Objective:** Verify status vs health separation

**Steps:**
1. Find a product with optimized metadata but DEO issues
2. Open the product workspace
3. Review the DEO Insights panel

**Expected:**
- [ ] Panel header says "Metadata & Content Status"
- [ ] Shows warning message:
  > "Metadata is optimized but this product has DEO issues. Review the issues below."
- [ ] Warning appears when metadata OK but issues exist
- [ ] Warning does NOT appear when no issues exist

---

### TC-009: Content Page - Pillar Context

**Objective:** Verify content page shows pillar information

**Steps:**
1. Navigate to Content page (`/projects/[id]/content`)
2. Review the page header and context sections

**Expected:**
- [ ] Page title uses pillar name ("Content & Commerce Signals")
- [ ] Description comes from pillar definition
- [ ] "About this DEO Pillar" section visible
- [ ] Link to Issues Engine with `?pillar=content_commerce_signals`

---

### TC-010: Technical Page - Pillar Context

**Objective:** Verify technical page shows pillar information

**Steps:**
1. Navigate to Technical page (`/projects/[id]/performance`)
2. Review the page content

**Expected:**
- [ ] Page title is "Technical & Indexability"
- [ ] Description references Core Web Vitals, crawl health, indexability
- [ ] Link to Issues Engine with `?pillar=technical_indexability`

---

### TC-011: Overview Page - DEO Link

**Objective:** Verify overview links to DEO Overview

**Steps:**
1. Navigate to Project Overview (`/projects/[id]/overview`)
2. Find the DEO-related link in the header

**Expected:**
- [ ] "View DEO pillars" link in header description
- [ ] Link goes to `/projects/[id]/deo`
- [ ] "View all issues" links go to `/projects/[id]/issues`

---

### TC-012: Metadata Placeholder Page

**Objective:** Verify metadata placeholder displays correctly

**Steps:**
1. Navigate to Metadata page (`/projects/[id]/metadata`)
2. Review the page content

**Expected:**
- [ ] Shows pillar name in header
- [ ] Shows pillar description
- [ ] Links to Products for fixing metadata
- [ ] Links to Content for page metadata
- [ ] Link to Issues Engine with `?pillar=metadata_snippet_quality`

---

### TC-013: Media Placeholder Page

**Objective:** Verify media placeholder displays correctly

**Steps:**
1. Navigate to Media page (`/projects/[id]/media`)
2. Review the page content

**Expected:**
- [ ] Shows "Media & Accessibility" header
- [ ] Shows pillar description
- [ ] Lists what the pillar covers (alt text, images, etc.)
- [ ] Link to Issues Engine with `?pillar=media_accessibility`

---

## Regression Checks

### RC-001: Existing Issue Display
- [ ] Issues still display correctly without pillar filter
- [ ] AI fix functionality still works
- [ ] Issue severity badges show correctly

### RC-002: Product Optimization Flow
- [ ] Can still optimize products from Products page
- [ ] "Optimize" button navigates to product workspace
- [ ] AI suggestions work correctly

### RC-003: Crawl & Sync
- [ ] Can run crawl from Overview
- [ ] Product sync still works
- [ ] Issues update after crawl

---

## Notes

- Test with multiple projects if possible
- Test with both projects that have issues and projects that don't
- Test on different screen sizes (desktop and mobile)
- Note any unexpected behavior in comments below

## Test Results

| Date | Tester | Pass/Fail | Notes |
|------|--------|-----------|-------|
|      |        |           |       |
