# DRAFT-DIFF-CLARITY-1 Manual Testing

**Phase:** DRAFT-DIFF-CLARITY-1
**Feature:** Current vs Draft Diff Display
**Date:** 2026-01-10

## Overview

This document covers manual testing for DRAFT-DIFF-CLARITY-1, which adds explicit "Current (live)" vs "Draft (staged)" diff display at draft review surfaces. The feature provides users with clear visibility into what will change when a draft is applied.

## Locked Statements

- **Locked Copy**: The label text and messaging are locked and must not be modified without phase approval
- **Current label**: "Current (live)"
- **Draft label**: "Draft (staged)"
- **No draft message**: "No draft generated yet"
- **Clear warning**: "Draft will clear this field when applied"
- **Confirmation dialog**: "Saving an empty draft will clear this field when applied.\n\nAre you sure you want to save an empty draft?"

## Prerequisites

1. User logged in with OWNER role
2. Project with connected Shopify store
3. At least one product with pending draft (status READY)
4. At least one product with live SEO values and a draft with different values
5. At least one product with explicitly cleared draft (rawSuggestion exists, finalSuggestion empty)

## Test Scenarios

### 1. Product Drafts Tab - Diff Display

**Steps:**
1. Navigate to Products list (`/projects/{projectId}/products`)
2. Find a product with "Draft saved (not applied)" chip
3. Click "Review drafts" action button
4. Observe the Drafts tab panel

**Expected:**
- Each draft item shows two distinct sections
- First section labeled "Current (live)" with gray background
- Second section labeled "Draft (staged)" with indigo background
- Current section shows the live value from Shopify
- Draft section shows the staged value to be applied
- Both sections have appropriate test hooks

### 2. Product Drafts Tab - No Draft Generated Yet

**Steps:**
1. Navigate to a product where a draft field has not been generated
2. Observe the Drafts tab panel

**Expected:**
- Draft section shows "No draft generated yet" in italic gray text
- Message appears when both rawSuggestion and finalSuggestion are empty/null

### 3. Product Drafts Tab - Draft Will Clear Field

**Steps:**
1. Navigate to a product with an explicitly cleared draft
2. Observe the Drafts tab panel

**Expected:**
- Draft section shows "Draft will clear this field when applied" in italic amber text
- Message appears when rawSuggestion exists but finalSuggestion is empty

### 4. Product Drafts Tab - Empty Draft Save Confirmation

**Steps:**
1. Navigate to a product with a draft that has a live value
2. Click "Edit" on the draft item
3. Clear the text field completely
4. Click "Save changes"

**Expected:**
- Confirmation dialog appears with message: "Saving an empty draft will clear this field when applied.\n\nAre you sure you want to save an empty draft?"
- Clicking "Cancel" keeps the edit mode open without saving
- Clicking "OK" saves the empty draft and shows the "Draft will clear" warning

### 5. Playbooks Draft Review - Diff Display

**Steps:**
1. Navigate to Playbooks page
2. Use mode=drafts URL to enter Draft Review mode for an asset with draft
3. Observe the draft items

**Expected:**
- Each draft item shows "Current (live)" and "Draft (staged)" sections
- Current section shows live value from the asset
- Draft section shows staged value
- Test hooks `data-testid="draft-diff-current"` and `data-testid="draft-diff-draft"` are present

### 6. Playbooks Draft Review - Empty Draft Confirmation

**Steps:**
1. Navigate to Playbooks Draft Review mode
2. Click "Edit" on a draft item with a live value
3. Clear the text field completely
4. Click "Save changes"

**Expected:**
- Confirmation dialog appears with the same message as Product Drafts tab
- Confirmation behavior is identical

## Data Attributes Verification

The diff display component includes test hooks for E2E automation:

| Attribute | Location | Value |
|-----------|----------|-------|
| `data-testid` | Current block | `draft-diff-current` |
| `data-testid` | Draft block | `draft-diff-draft` |

## Visual Style Verification

### Current (live) Block
- **Background**: Gray-50
- **Label color**: Gray-500
- **Label style**: Uppercase, extra small, tracking-wide
- **Content color**: Gray-700
- **Empty state**: "(empty)" in italic gray-400

### Draft (staged) Block
- **Background**: Indigo-50
- **Label color**: Indigo-600
- **Label style**: Uppercase, extra small, tracking-wide
- **Content color**: Indigo-900
- **Empty states**:
  - "No draft generated yet" in italic gray-400
  - "Draft will clear this field when applied" in italic amber-600

## Test Data Setup

For E2E testing, use the seed endpoint:
```
POST /testkit/e2e/seed-draft-diff-clarity-1
```

This creates:
- **Product 1** (`productWithDiffId`): Live SEO + draft with different values (for diff display)
- **Product 2** (`productWithClearedDraftId`): Live SEO + explicitly cleared draft (rawSuggestion non-empty, finalSuggestion empty → "Draft will clear" message)
- **Product 3** (`productNoDraftId`): Live SEO + draftItem entry with field present but both rawSuggestion and finalSuggestion empty (→ "No draft generated yet" message)
- **Page** (`pageWithDraftId`): Draft for Playbooks Draft Review testing

## Related Documents

- [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) - Phase documentation
- [DRAFT-ENTRYPOINT-UNIFICATION-1.md](./DRAFT-ENTRYPOINT-UNIFICATION-1.md) - Product Drafts tab
- [DRAFT-EDIT-INTEGRITY-1.md](./DRAFT-EDIT-INTEGRITY-1.md) - Inline edit feature
- [DRAFT-AI-ENTRYPOINT-CLARITY-1.md](./DRAFT-AI-ENTRYPOINT-CLARITY-1.md) - AI boundary notes
