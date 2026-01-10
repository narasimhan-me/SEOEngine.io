# DRAFT-ENTRYPOINT-UNIFICATION-1 Manual Testing

**Phase:** DRAFT-ENTRYPOINT-UNIFICATION-1
**Feature:** Product Detail Drafts Tab
**Date:** 2026-01-10

## Overview

This document covers manual testing for DRAFT-ENTRYPOINT-UNIFICATION-1, which unifies draft review entrypoints by adding a Drafts tab to Product detail page. Products list "Review drafts" action now routes directly to the Product detail Drafts tab (NOT Automation/Playbooks Draft Review).

## Locked Statements

- **Product detail is the canonical draft review entrypoint for products**
- **Draft Review stays human-only**: No AI invocation during Draft Review/Approval/Apply
- **Products list Review drafts does not route to Automation Draft Review**

## Prerequisites

1. User logged in with OWNER role
2. Project with connected Shopify store
3. At least one product with pending draft (status READY or PARTIAL, not expired)

## Test Scenarios

### 1. Products List "Review drafts" Routing

**Steps:**
1. Navigate to Products list (`/projects/{projectId}/products`)
2. Find a product with "🟡 Draft saved (not applied)" chip
3. Click the "Review drafts" action button

**Expected:**
- Navigates to `/projects/{projectId}/products/{productId}?tab=drafts&from=asset_list&returnTo=...`
- Does NOT navigate to `/automation/playbooks?mode=drafts`
- Product detail page opens with Drafts tab selected

### 2. Drafts Tab Visibility

**Steps:**
1. Navigate to a product detail page (`/projects/{projectId}/products/{productId}`)
2. Look at the tab bar

**Expected:**
- "Drafts" tab is visible in the tab bar (after Metadata, Answers, etc.)
- Tab is clickable

### 3. Drafts Tab Content - With Drafts

**Steps:**
1. Navigate to product detail for a product with pending draft
2. Click the "Drafts" tab (or arrive via `?tab=drafts`)

**Expected:**
- Draft list is visible (`data-testid="drafts-tab-list"`)
- Each draft item shows:
  - Field name (e.g., "SEO Description")
  - Current value
  - Suggested value (finalSuggestion or rawSuggestion)
  - Edit button
- No "Generate" or "Regenerate" buttons (AI is not invoked)

### 3a. [FIXUP-1] Non-AI Surface Verification (Drafts Tab)

**Steps:**
1. Navigate to Product detail Drafts tab (`?tab=drafts`)
2. Inspect the page header and banners

**Expected:**
- No "Generate drafts, review, then apply to Shopify" copy appears
- No "Automate this fix" button in the header
- No "Apply to Shopify" button in the header
- No draft state indicator (`data-testid="header-draft-state-indicator"`) in the header
- No AI limit upsell link ("Upgrade your plan to unlock more AI suggestions")
- The CNAB-1 optimization banner is NOT visible on Drafts tab

### 4. Drafts Tab Content - No Drafts

**Steps:**
1. Navigate to product detail for a product WITHOUT pending draft
2. Click the "Drafts" tab

**Expected:**
- Empty state is visible (`data-testid="drafts-tab-empty"`)
- Message: "No drafts saved for this product."
- Optional: Link to Issues Engine for the product

### 5. Inline Edit Mode

**Steps:**
1. Navigate to Drafts tab for a product with pending draft
2. Click "Edit" button on a draft item

**Expected:**
- Input field appears with current finalSuggestion value
- "Save changes" button is visible
- "Cancel" button is visible
- Edit button is replaced by save/cancel buttons

### 6. Save Edit

**Steps:**
1. Enter inline edit mode (click Edit)
2. Modify the text in the input field
3. Click "Save changes"

**Expected:**
- Loading state appears briefly
- Draft item updates with new value
- Edit mode exits
- Success is persistent (refresh page, value is preserved)

### 7. Cancel Edit

**Steps:**
1. Enter inline edit mode (click Edit)
2. Modify the text in the input field
3. Click "Cancel"

**Expected:**
- Edit mode exits
- Original value is restored (changes discarded)
- No API call is made

### 8. Back Navigation

**Steps:**
1. From Products list, click "Review drafts" on a product
2. On the Product detail Drafts tab, look for back navigation

**Expected:**
- ScopeBanner shows navigation context (if `from` param present)
- Back link returns to Products list
- Filter context (if any) is preserved in returnTo

### 9. Pages/Collections Review Drafts (Unchanged)

**Steps:**
1. Navigate to Pages list (`/projects/{projectId}/assets/pages`)
2. Find a page with "🟡 Draft saved (not applied)" chip
3. Click "Review drafts" action

**Expected:**
- Navigates to `/automation/playbooks?mode=drafts&assetType=pages&assetId={pageId}`
- Does NOT navigate to any Pages detail page
- This confirms Pages/Collections still use Automation Draft Review

### 10. Permission Enforcement

**Steps (OWNER):**
1. Log in as OWNER
2. Navigate to Drafts tab
3. Click Edit on a draft item

**Expected:**
- Edit button is clickable
- Can modify and save

**Steps (VIEWER):**
1. Log in as VIEWER
2. Navigate to Drafts tab

**Expected:**
- Edit button is NOT shown (or disabled)
- Cannot modify drafts

## Edge Cases

### Draft with Legacy Shape

If a draft was created before DRAFT-ENTRYPOINT-UNIFICATION-1 (using `suggestedTitle`/`suggestedDescription` instead of `field`/`finalSuggestion`):

**Expected:**
- UI renders the draft correctly
- "Suggested Title" or "Suggested Description" is shown
- Edit may not work for legacy-shape drafts (expected limitation)

### Expired Draft

If a draft has expired (`expiresAt < now`):

**Expected:**
- Draft is NOT shown in the Drafts tab
- Empty state appears if no other drafts

### Multiple Drafts for Same Product

If a product appears in multiple drafts (e.g., missing_seo_title and missing_seo_description):

**Expected:**
- All draft items are shown
- Each item is editable independently
- itemIndex ensures correct API calls

## Test Data Setup

For E2E testing, use the seed endpoint:
```
POST /testkit/e2e/seed-list-actions-clarity-1
```

This creates:
- Product 3 ("Product With Pending Draft") with pending draft
- Draft uses canonical shape (field/rawSuggestion/finalSuggestion)

## Related Documents

- [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) - Phase documentation
- [DRAFT-EDIT-INTEGRITY-1.md](./DRAFT-EDIT-INTEGRITY-1.md) - Inline edit feature
- [DRAFT-ROUTING-INTEGRITY-1.md](./DRAFT-ROUTING-INTEGRITY-1.md) - Original draft routing (Pages/Collections)
- [LIST-ACTIONS-CLARITY-1.md](./LIST-ACTIONS-CLARITY-1.md) - Row chips and actions
