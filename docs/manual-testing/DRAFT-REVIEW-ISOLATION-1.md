# DRAFT-REVIEW-ISOLATION-1 Manual Testing

**Phase:** DRAFT-REVIEW-ISOLATION-1
**Feature:** Structural Non-AI Boundary for Product Drafts Tab
**Date:** 2026-01-10

## Overview

This document covers manual testing for DRAFT-REVIEW-ISOLATION-1, which extracts the Product Drafts tab into an isolated module with a NON-AI BOUNDARY contract. The refactor prevents accidental AI creep into the Draft Review surface.

## Locked Statements

- **Draft Review stays human-only**: AI is never invoked during Draft Review/Approval/Apply
- **NON-AI BOUNDARY contract**: `ProductDraftsTab.tsx` must not import AI-related code
- **No behavior changes**: All existing functionality is preserved

## Prerequisites

1. User logged in with OWNER role
2. Project with connected Shopify store
3. At least one product with pending draft (status READY or PARTIAL, not expired)

## Test Scenarios

### 1. Products List → Review Drafts → Product Drafts Tab

**Steps:**

1. Navigate to Products list (`/projects/{projectId}/products`)
2. Find a product with "🟡 Draft saved (not applied)" chip
3. Click the "Review drafts" action button

**Expected:**

- Navigates to `/projects/{projectId}/products/{productId}?tab=drafts&from=asset_list`
- Product detail page opens with Drafts tab selected
- Drafts tab panel is visible (`data-testid="drafts-tab-panel"`)

### 2. View Drafts (Unchanged Behavior)

**Steps:**

1. Navigate to Product detail Drafts tab
2. Observe the draft list

**Expected:**

- Draft list shows pending drafts for the product
- Each draft shows:
  - Playbook type (SEO Title Suggestion / SEO Description Suggestion)
  - Status badge (READY / PARTIAL)
  - Updated date
  - Draft items with field name and value

### 3. Edit Draft (Unchanged Behavior)

**Steps:**

1. Navigate to Drafts tab with pending drafts
2. Click "Edit" on a draft item
3. Modify the text
4. Click "Save changes"

**Expected:**

- Edit mode activates with textarea and Save/Cancel buttons
- After save: success toast, updated value displayed
- Page reload: saved value persists (server-persisted)

### 4. Cancel Edit (Unchanged Behavior)

**Steps:**

1. Enter edit mode on a draft item
2. Modify text
3. Click "Cancel"

**Expected:**

- Edit mode exits
- Original value restored
- No API call made

### 5. No AI Affordances on Drafts Tab

**Steps:**

1. Navigate to Product detail Drafts tab
2. Inspect the entire page surface

**Expected (explicit absence checks):**

- No "Generate" button
- No "Regenerate" button
- No "AI suggestion" text
- No "Automate this fix" button in header
- No "Apply to Shopify" button in header
- No "Generate drafts, review, then apply to Shopify" banner (CNAB-1)
- No draft state indicator in header
- No AI limit upsell link

### 6. Back/returnTo Navigation (Unchanged Behavior)

**Steps:**

1. From Products list, click "Review drafts" on a product
2. On Product detail Drafts tab, observe the ScopeBanner
3. Click the back link

**Expected:**

- ScopeBanner shows navigation context
- Back link returns to Products list
- Filter context preserved in returnTo

### 7. Empty State (Unchanged Behavior)

**Steps:**

1. Navigate to Drafts tab for a product WITHOUT pending drafts

**Expected:**

- Empty state visible (`data-testid="drafts-tab-empty"`)
- Message: "No drafts saved for this product."
- "View issues" CTA present

## NON-AI BOUNDARY Verification

The `ProductDraftsTab.tsx` module must contain:

```
NON-AI BOUNDARY: Draft Review is human-only. Do not import aiApi or add AI generation actions here.
```

The module must NOT contain imports for:

- `aiApi`
- `ProductAiSuggestionsPanel`
- `suggestProductMetadata`
- `generateProductAnswers`
- `AI_DAILY_LIMIT_REACHED`

This is automatically verified by the guard test: `draft-review-isolation-1.spec.ts`

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
- [DRAFT-ENTRYPOINT-UNIFICATION-1.md](./DRAFT-ENTRYPOINT-UNIFICATION-1.md) - Original Drafts tab implementation
- [DRAFT-EDIT-INTEGRITY-1.md](./DRAFT-EDIT-INTEGRITY-1.md) - Inline edit feature
