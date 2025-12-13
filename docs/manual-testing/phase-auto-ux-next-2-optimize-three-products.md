# Phase AUTO-UX-NEXT-2 – Guided "Optimize 3 Products" First DEO Win

> Manual testing checklist for the "Optimize 3 products" guided card on the Project Overview page and the corresponding deep-link behavior on the Product Optimization page.

---

## Overview

- **Purpose of the feature/patch:**
  - Guide users toward completing the "Optimize 3 key products" step of the First DEO Win checklist by showing a prioritized list of products missing SEO metadata directly on the Project Overview page.

- **High-level user impact and what "success" looks like:**
  - Users see up to 3 products that need SEO optimization with clear badges showing what's missing (title, description, or both).
  - Clicking "Optimize" on a product navigates to the Product page with `?focus=metadata` which auto-scrolls to the SEO metadata section.
  - Users can quickly apply optimizations and return to complete their First DEO Win.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase UX-6 – First DEO Win Checklist
  - Phase AUTO-UX-NEXT-1 – Next DEO Win: Automation Playbooks Entry
  - Phase AUTO-UX-NEXT-2 – Guided "Optimize 3 Products" First DEO Win

- **Related documentation:**
  - docs/manual-testing/phase-auto-ux-next-1-next-deo-win-automation-playbooks.md
  - docs/manual-testing/phase-shop-ux-cta-2-deo-score-completion.md

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with product and crawl endpoints available.
  - [ ] Web app (apps/web) running against the same API base URL.
  - [ ] At least one project with products that have missing SEO titles or descriptions.

- **Test accounts and sample data:**
  - [ ] Test user with at least one project that:
    - Has a connected source (e.g., Shopify or website).
    - Has completed at least one crawl.
    - Has a valid DEO Score.
    - Has fewer than 3 products with applied SEO optimizations (so the card is visible).
    - Has some products with missing SEO titles and/or descriptions.

- **Required user roles or subscriptions:**
  - [ ] Any plan that can view products and apply optimizations (Free or higher).

---

## Test Scenarios (Happy Path)

### Scenario 1: "Optimize 3 products" card visible when checklist incomplete

**ID:** HP-001

**Preconditions:**
- [ ] First DEO Win checklist is visible (fewer than 4 steps complete).
- [ ] Fewer than 3 products have been optimized.
- [ ] Project has products with missing SEO metadata.

**Steps:**
1. Navigate to /projects/[id]/overview for the prepared project.
2. Scroll down past the DEO Score section.
3. Observe the page layout.

**Expected Results:**
- **UI:**
  - [ ] "First DEO Win: Optimize 3 products" card is visible.
  - [ ] Card shows amber/orange styling with star icon.
  - [ ] Progress indicator shows "X of 3 products optimized".
  - [ ] Up to 3 products are listed with "Optimize" buttons.
- **Content:**
  - [ ] Title: "First DEO Win: Optimize 3 products"
  - [ ] Description mentions applying AI-powered optimizations.
  - [ ] Each product shows its name.
  - [ ] Missing metadata badges appear (orange for titles, blue for descriptions).

---

### Scenario 2: Products show correct missing metadata badges

**ID:** HP-002

**Preconditions:**
- [ ] HP-001 completed; card is visible with product suggestions.
- [ ] Mix of products: some missing title only, some missing description only, some missing both.

**Steps:**
1. Observe the product list in the "Optimize 3 products" card.
2. Compare badges to actual product metadata.

**Expected Results:**
- **Badges:**
  - [ ] Products missing only title show "Missing title" badge (orange).
  - [ ] Products missing only description show "Missing description" badge (blue).
  - [ ] Products missing both show both badges.
- **Data:**
  - [ ] Badge information matches actual product SEO metadata state.

---

### Scenario 3: Clicking "Optimize" navigates with deep-link

**ID:** HP-003

**Preconditions:**
- [ ] HP-001 completed; card is visible with product suggestions.

**Steps:**
1. Click the "Optimize" button for any listed product.

**Expected Results:**
- **Navigation:**
  - [ ] Browser navigates to /projects/[id]/products/[productId]?focus=metadata
- **Product Page:**
  - [ ] Page loads successfully.
  - [ ] Page auto-scrolls to the "SEO Metadata" section.
  - [ ] The SEO Title and SEO Description editor fields are visible.

---

### Scenario 4: Auto-scroll to metadata section works correctly

**ID:** HP-004

**Preconditions:**
- [ ] HP-003 completed; on Product page via deep-link.

**Steps:**
1. Observe the page scroll position after load.
2. Note the visibility of the SEO Metadata section.

**Expected Results:**
- **UI:**
  - [ ] The "SEO Metadata" section heading is visible in the viewport.
  - [ ] The scroll animation is smooth (if any).
  - [ ] The SEO editor (ProductSeoEditor) is visible and ready for editing.
- **Timing:**
  - [ ] Scroll occurs after product data loads (slight delay is acceptable).

---

### Scenario 5: Applying SEO shows updated success message

**ID:** HP-005

**Preconditions:**
- [ ] On Product page with a product that has pending SEO changes.
- [ ] Product is connected to Shopify.

**Steps:**
1. Make changes to SEO title or description.
2. Click "Apply to Shopify" button.
3. Wait for the operation to complete.

**Expected Results:**
- **Success Message:**
  - [ ] Toast shows: "SEO updated in Shopify successfully! Applied to Shopify and saved in EngineO."
  - [ ] Success banner also shows the same message.
- **Functionality:**
  - [ ] Changes are persisted to Shopify.
  - [ ] Product data reflects the update.

---

### Scenario 6: Progress updates after optimizing products

**ID:** HP-006

**Preconditions:**
- [ ] Project has 0 or 1 products with applied SEO.
- [ ] HP-003-005 completed (optimized at least one product).

**Steps:**
1. Navigate back to /projects/[id]/overview.
2. Observe the "Optimize 3 products" card.

**Expected Results:**
- **Progress:**
  - [ ] Progress text updates to reflect new count (e.g., "1 of 3 products optimized").
  - [ ] Optimized products may be removed from the suggestions list.
- **Checklist:**
  - [ ] First DEO Win checklist progress may update if applicable.

---

## Edge Cases

### EC-001: Card hidden when all steps complete

**Description:** Card should not appear if all 4 checklist steps are complete.

**Steps:**
1. Ensure all 4 First DEO Win steps are complete (3+ products optimized).
2. Navigate to /projects/[id]/overview.

**Expected Behavior:**
- [ ] "Optimize 3 products" card is NOT visible.
- [ ] "Next DEO win" card may appear instead.

---

### EC-002: No products with missing metadata

**Description:** Card should handle projects where all products have complete SEO.

**Steps:**
1. Ensure all products in the project have both SEO title and description.
2. Navigate to /projects/[id]/overview with fewer than 3 optimized products.

**Expected Behavior:**
- [ ] Card may show empty state or not appear.
- [ ] No JavaScript errors in console.

---

### EC-003: Deep-link without metadata section

**Description:** Handle case where product page loads but section is not found.

**Steps:**
1. Navigate directly to /projects/[id]/products/[productId]?focus=metadata
2. Observe page behavior.

**Expected Behavior:**
- [ ] Page loads without errors.
- [ ] If section exists, scroll occurs.
- [ ] If section doesn't exist, page loads normally without scroll.

---

### EC-004: Prioritization matches top blockers

**Description:** Products from "Top blockers" should appear first in suggestions.

**Steps:**
1. Check the "Top blockers" section for suggested products.
2. Compare with products in "Optimize 3 products" card.

**Expected Behavior:**
- [ ] Products appearing in "Top blockers" are prioritized in the suggestions.
- [ ] Order: prioritized products first, then other products with missing metadata.

---

## Regression

### Areas potentially impacted:

- [ ] First DEO Win checklist visibility and progress calculation.
- [ ] Project Overview page layout and data fetching.
- [ ] Product Optimization page scroll behavior.
- [ ] Apply to Shopify functionality and messaging.
- [ ] DEO Score and issues sections.

### Quick sanity checks:

- [ ] First DEO Win checklist still appears and functions correctly.
- [ ] "Next DEO win" card still appears when checklist is complete.
- [ ] Product page works normally without `?focus=metadata` param.
- [ ] Other navigation on Product page (tabs, sections) works correctly.
- [ ] Apply to Shopify still works for non-deep-link scenarios.

---

## Post-Conditions

### Data cleanup steps:

- [ ] None required beyond standard test project cleanup (optional).

### Follow-up verification:

- [ ] Confirm no console errors when loading the overview page.
- [ ] Confirm no console errors when navigating via deep-link.
- [ ] Verify that scroll behavior doesn't interfere with user interaction.

---

## Known Issues

- **Intentionally accepted issues:**
  - Suggestions are computed on every overview page load; no caching implemented.
  - Scroll timing uses a 200ms delay to ensure DOM readiness.

- **Out-of-scope items:**
  - Auto-applying optimizations from the overview card.
  - Tracking which specific products the user has viewed.
  - Persisting suggestion dismissals.

- **TODOs:**
  - [ ] Consider adding analytics events for "Optimize button clicked from card".
  - [ ] Consider adding a "View all products" link to the card.

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Phase AUTO-UX-NEXT-2 Guided Optimize 3 Products First DEO Win |
