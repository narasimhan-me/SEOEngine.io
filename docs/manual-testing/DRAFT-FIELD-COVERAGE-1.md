# Manual Testing: DRAFT-FIELD-COVERAGE-1

> Draft Review Parity Across Products, Pages, and Collections

## Overview

This phase generalizes Draft Review from Products-only to all asset types (Products, Pages, Collections). All draft review features now work consistently across asset types.

## Prerequisites

- Access to a project with connected Shopify store
- At least one product, page, and collection with drafts available
- Or use seed endpoint: `POST /testkit/e2e/seed-draft-field-coverage-1`

---

## Locked Copy (Do Not Modify Without Phase Approval)

These strings are locked across all asset types:

| Element | Text |
|---------|------|
| Current label | "Current (live)" |
| Draft label | "Draft (staged)" |
| No draft message | "No draft generated yet" |
| Clear warning | "Draft will clear this field when applied" |
| Confirmation dialog | "Saving an empty draft will clear this field when applied.\n\nAre you sure you want to save an empty draft?" |

---

## Field Label Mapping by Asset Type

| Asset Type | SEO Title Field Label | SEO Description Field Label |
|------------|----------------------|----------------------------|
| Products | SEO Title | SEO Description |
| Pages | Page Title | Meta Description |
| Collections | Collection Title | Meta Description |

---

## Test Scenarios

### Scenario 1: Products Drafts Tab

**Route:** `/projects/{projectId}/products/{productId}?tab=drafts`

1. Navigate to a product with pending drafts
2. Click the "Drafts" tab
3. **Verify:**
   - [ ] `data-testid="drafts-tab-panel"` is present
   - [ ] `data-testid="draft-ai-boundary-note"` shows "Review & edit (no AI on this step)"
   - [ ] Each draft item shows:
     - [ ] Field label "SEO Title" or "SEO Description"
     - [ ] "Current (live)" block with live value
     - [ ] "Draft (staged)" block with draft value
   - [ ] "Edit" button available for each item

---

### Scenario 2: Pages Drafts Tab

**Route:** `/projects/{projectId}/pages/{pageId}?tab=drafts`
*(Canonical route - redirects to `/assets/pages/...`)*

1. Navigate to a page with pending drafts
2. Click the "Drafts" tab
3. **Verify:**
   - [ ] `data-testid="drafts-tab-panel"` is present
   - [ ] `data-testid="draft-ai-boundary-note"` shows "Review & edit (no AI on this step)"
   - [ ] Each draft item shows:
     - [ ] Field label "Page Title" or "Meta Description" (NOT "SEO Title")
     - [ ] "Current (live)" block with live value
     - [ ] "Draft (staged)" block with draft value
   - [ ] "Edit" button available for each item

---

### Scenario 3: Collections Drafts Tab

**Route:** `/projects/{projectId}/collections/{collectionId}?tab=drafts`
*(Canonical route - redirects to `/assets/collections/...`)*

1. Navigate to a collection with pending drafts
2. Click the "Drafts" tab
3. **Verify:**
   - [ ] `data-testid="drafts-tab-panel"` is present
   - [ ] `data-testid="draft-ai-boundary-note"` shows "Review & edit (no AI on this step)"
   - [ ] Each draft item shows:
     - [ ] Field label "Collection Title" or "Meta Description" (NOT "SEO Title")
     - [ ] "Current (live)" block with live value
     - [ ] "Draft (staged)" block with draft value
   - [ ] "Edit" button available for each item

---

### Scenario 4: "No draft generated yet" Messaging

For assets with empty raw/final suggestion (no AI output):

1. Navigate to an asset where the draft has both `rawSuggestion: ''` and `finalSuggestion: ''`
2. **Verify:**
   - [ ] Draft (staged) block shows "No draft generated yet" in italic gray text
   - [ ] This message appears for Products, Pages, AND Collections consistently

---

### Scenario 5: "Draft will clear this field" Warning

For assets with explicitly cleared drafts (user emptied the draft):

1. Navigate to an asset where `rawSuggestion` is non-empty but `finalSuggestion` is empty
2. **Verify:**
   - [ ] Draft (staged) block shows "Draft will clear this field when applied" in amber text
   - [ ] This warning appears for Products, Pages, AND Collections consistently

---

### Scenario 6: Empty Draft Confirmation Dialog - Dismiss Path

1. Navigate to any asset type Drafts tab (product, page, or collection)
2. Find a draft item that has a non-empty Current (live) value
3. Click "Edit"
4. Clear the textarea (empty it completely)
5. Click "Save changes"
6. **Verify:**
   - [ ] Confirmation dialog appears with exact message:
     ```
     Saving an empty draft will clear this field when applied.

     Are you sure you want to save an empty draft?
     ```
7. Click "Cancel" to dismiss
8. **Verify:**
   - [ ] Draft is NOT saved
   - [ ] Edit mode remains active
   - [ ] Original draft value is NOT changed

---

### Scenario 7: Empty Draft Confirmation Dialog - Accept Path

1. Navigate to any asset type Drafts tab
2. Find a draft item that has a non-empty Current (live) value
3. Click "Edit"
4. Clear the textarea
5. Click "Save changes"
6. Click "OK" to accept
7. **Verify:**
   - [ ] Draft is saved (success toast appears)
   - [ ] Draft (staged) now shows "Draft will clear this field when applied"
   - [ ] Edit mode closes

---

### Scenario 8: Empty State with Correct Asset Label

1. Navigate to a Drafts tab for an asset with NO pending drafts
2. **Verify by asset type:**
   - [ ] Products: "No drafts saved for this product."
   - [ ] Pages: "No drafts saved for this page."
   - [ ] Collections: "No drafts saved for this collection."

---

### Scenario 9: Empty State CTA Routing

**For Products:**
1. Navigate to product Drafts tab with no drafts
2. Click "View issues"
3. **Verify:** Routes to `/projects/{projectId}/products/{productId}?tab=issues`

**For Pages:**
1. Navigate to page Drafts tab with no drafts
2. Click "View issues"
3. **Verify:** Routes to `/projects/{projectId}/issues?assetType=pages&assetId={pageId}`

**For Collections:**
1. Navigate to collection Drafts tab with no drafts
2. Click "View issues"
3. **Verify:** Routes to `/projects/{projectId}/issues?assetType=collections&assetId={collectionId}`

---

### Scenario 10: Non-AI Boundary Compliance

For ALL asset types:

1. Navigate to Drafts tab
2. **Verify the following are NOT present:**
   - [ ] No "Generate" or "Regenerate" buttons
   - [ ] No "Improve with AI" options
   - [ ] No AI suggestion panels
   - [ ] No "Apply to Shopify" button (apply is on main detail page, not Drafts tab)

---

## Cross-Asset Parity Verification

Complete this checklist to verify feature parity:

| Feature | Products | Pages | Collections |
|---------|----------|-------|-------------|
| Drafts tab panel visible | ☐ | ☐ | ☐ |
| AI boundary note visible | ☐ | ☐ | ☐ |
| Current (live) block | ☐ | ☐ | ☐ |
| Draft (staged) block | ☐ | ☐ | ☐ |
| Correct field labels | ☐ | ☐ | ☐ |
| Edit functionality | ☐ | ☐ | ☐ |
| No draft message | ☐ | ☐ | ☐ |
| Clear warning | ☐ | ☐ | ☐ |
| Confirmation dialog | ☐ | ☐ | ☐ |
| Empty state | ☐ | ☐ | ☐ |

---

## Seed Endpoint

For automated testing, use:

```
POST /testkit/e2e/seed-draft-field-coverage-1
```

Returns:
- `projectId`, `accessToken`
- Product IDs: `productDiffId`, `productClearId`, `productNoDraftId`
- Page IDs: `pageDiffId`, `pageClearId`, `pageNoDraftId`
- Collection IDs: `collectionDiffId`, `collectionClearId`, `collectionNoDraftId`
- Live/draft strings for assertions
- Counts: `{ affectedTotal: 3, draftGenerated: 2, noSuggestionCount: 1 }`

---

## Notes

- Apply functionality remains on the main detail page, not on Drafts tab
- Draft Review is human-only (non-AI boundary preserved)
- AssetDraftsTab component enforces non-AI boundary via guard test
