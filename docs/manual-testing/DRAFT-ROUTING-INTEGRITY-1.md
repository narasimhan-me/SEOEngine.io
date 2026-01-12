# DRAFT-ROUTING-INTEGRITY-1 Manual Testing Checklist

## Phase Overview
Ensures "Review drafts" action routes to Draft Review mode (scoped to asset), NOT Work Queue.
Provides deterministic, scoped draft review with Back navigation via ScopeBanner.

**Locked Rule**: "Review drafts" NEVER routes to Work Queue.

## Scope
- Products list (/projects/:projectId/products)
- Pages list (/projects/:projectId/assets/pages)
- Collections list (/projects/:projectId/assets/collections)
- Playbooks Draft Review mode (/projects/:projectId/automation/playbooks?mode=drafts&...)
- ScopeBanner Back navigation

---

## Draft Review Mode URL Structure

**Required URL params for Draft Review mode:**
```
/projects/:projectId/automation/playbooks?mode=drafts&assetType=<products|pages|collections>&assetId=<id>&from=asset_list&returnTo=<origin list url>
```

| Param | Required | Description |
|-------|----------|-------------|
| mode | Yes | Must be `drafts` |
| assetType | Yes | `products`, `pages`, or `collections` (lowercase) |
| assetId | Yes | The asset ID (product ID or crawl result ID) |
| from | Yes | `asset_list` |
| returnTo | Yes | URL-encoded origin list URL for Back navigation |
| returnLabel | Optional | Display label for Back link |

---

## Test Scenarios

### 1. Products List → Draft Review → Back
- [ ] Navigate to /projects/:projectId/products
- [ ] Find row with "🟡 Draft saved (not applied)" chip
- [ ] Click "Review drafts" primary action
- [ ] **Assert URL contains**:
  - `/automation/playbooks`
  - `mode=drafts`
  - `assetType=products`
  - `assetId=<productId>`
- [ ] **Assert URL does NOT contain**: `/work-queue`
- [ ] **Assert ScopeBanner** is visible with Back link
- [ ] **Assert Draft Review panel** (`data-testid="draft-review-panel"`) is visible
- [ ] **Assert Draft Review list** (`data-testid="draft-review-list"`) shows non-empty suggestion content (not placeholder)
- [ ] Click Back (ScopeBanner or secondary CTA)
- [ ] **Assert return** to /projects/:projectId/products (NOT Work Queue)

### 2. Pages List → Draft Review → Back
- [ ] Navigate to /projects/:projectId/assets/pages
- [ ] Find row with "🟡 Draft saved (not applied)" chip
- [ ] Click "Review drafts" primary action
- [ ] **Assert URL contains**:
  - `/automation/playbooks`
  - `mode=drafts`
  - `assetType=pages`
  - `assetId=<pageId>`
- [ ] **Assert URL does NOT contain**: `/work-queue`
- [ ] **Assert ScopeBanner** is visible with Back link
- [ ] Click Back
- [ ] **Assert return** to /projects/:projectId/assets/pages

### 3. Collections List → Draft Review → Back
- [ ] Navigate to /projects/:projectId/assets/collections
- [ ] Find row with "🟡 Draft saved (not applied)" chip
- [ ] Click "Review drafts" primary action
- [ ] **Assert URL contains**:
  - `/automation/playbooks`
  - `mode=drafts`
  - `assetType=collections`
  - `assetId=<collectionId>`
- [ ] **Assert URL does NOT contain**: `/work-queue`
- [ ] **Assert ScopeBanner** is visible with Back link
- [ ] Click Back
- [ ] **Assert return** to /projects/:projectId/assets/collections

---

## Zero-Draft Edge Case (MANDATORY)

When Draft Review mode has no drafts for the specified asset:

### Empty State Requirements
- [ ] **Container**: `data-testid="draft-review-empty"` is visible
- [ ] **Exact copy**: "No drafts available for this item."
- [ ] **Primary CTA**: "View issues" → Issues Engine filtered to assetType + assetId
  - Includes `from=asset_list` and `returnTo` params
- [ ] **Secondary CTA**: "Back" (`data-testid="draft-review-back"`) → Returns to origin list (uses validated returnTo)
  - Note: ScopeBanner Back uses `data-testid="scope-banner-back"` (separate element)
- [ ] **No redirect to Work Queue**

---

## API Endpoint Testing

### GET /projects/:id/automation-playbooks/drafts

**Request:**
```
GET /projects/:id/automation-playbooks/drafts?assetType=products&assetId=<productId>
Authorization: Bearer <token>
```

**Response:**
```json
{
  "projectId": "...",
  "assetType": "products",
  "assetId": "...",
  "drafts": [
    {
      "id": "draft-id",
      "playbookId": "missing_seo_title",
      "status": "READY",
      "scopeId": "...",
      "rulesHash": "...",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "counts": { "affectedTotal": 10, "draftGenerated": 5, "noSuggestionCount": 0 },
      "filteredItems": [
        {
          "productId": "...",
          "field": "seoTitle",
          "rawSuggestion": "...",
          "finalSuggestion": "...",
          "ruleWarnings": []
        }
      ]
    }
  ]
}
```

**Validation:**
- [ ] Returns only pending drafts (status READY or PARTIAL, appliedAt=null, not expired)
- [ ] `filteredItems` contains only items for the specified assetId
- [ ] Never returns global/unscoped drafts
- [ ] Any ProjectMember can view (view-only access)

---

## Test Data Setup

Use `/testkit/e2e/seed-list-actions-clarity-1` endpoint:

```bash
curl -X POST http://localhost:3001/testkit/e2e/seed-list-actions-clarity-1
```

Returns:
- `projectId`
- `accessToken` (OWNER)
- `draftPendingProductId`
- `draftPendingPageId`
- `draftPendingCollectionId`

---

## Playwright E2E Test

Test ID: `LAC1-008: Review drafts routes to Draft Review mode (NOT Work Queue)`

Located in: `apps/web/tests/list-actions-clarity-1.spec.ts`

---

## Pass Criteria

1. All "Review drafts" hrefs route to `/automation/playbooks?mode=drafts&...`
2. No href contains `/work-queue`
3. ScopeBanner visible with correct Back link
4. Draft Review panel renders with `data-testid="draft-review-panel"`
5. Back navigation returns to origin list (not Work Queue)
6. Zero-draft empty state shows exact copy and CTAs
7. API returns only asset-scoped pending drafts
