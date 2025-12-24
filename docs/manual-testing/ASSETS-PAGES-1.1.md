# ASSETS-PAGES-1.1 – Pages & Collections Execution Manual Testing

> **Cloned from MANUAL_TESTING_TEMPLATE.md**
>
> This document covers manual testing for the ASSETS-PAGES-1.1 feature (execution phase), which adds draft generation and apply-to-Shopify capabilities for Pages and Collections SEO metadata.
>
> **IMPORTANT:** This phase is execution-focused. Prerequisites include ASSETS-PAGES-1 (visibility-only) being complete.

---

## Overview

- **Purpose of the feature/patch:**
  - Enable draft generation and apply-to-Shopify for Pages and Collections SEO metadata (title + description)
  - Extend automation playbooks to work with non-product asset types via `assetType` parameter
  - Use canonical playbook IDs (`missing_seo_title`, `missing_seo_description`) with asset type differentiation
  - Implement handle-only resolution with deterministic blocking for unaddressable items
  - Add Shopify GraphQL mutations for Page/Collection SEO updates

- **High-level user impact and what "success" looks like:**
  - Users see Work Queue bundles for Pages/Collections with missing SEO metadata
  - Estimate endpoint returns affected page/collection counts
  - (Future) Generate Drafts creates AI-powered SEO suggestions for Pages/Collections
  - (Future) Apply Changes pushes SEO updates to Shopify via GraphQL mutations
  - Handle-based refs (`page_handle:about-us`, `collection_handle:summer-sale`) used for scoping

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase ASSETS-PAGES-1.1 (execution)
  - Phase ASSETS-PAGES-1 (visibility-only - prerequisite)

- **Related documentation:**
  - ASSETS-PAGES-1.md (visibility manual testing)
  - WORK-QUEUE-1.md (Work Queue manual testing)
  - API_SPEC.md (Automation Playbooks section)
  - IMPLEMENTATION_PLAN.md

---

## Authoritative Constraints

These constraints are authoritative and override any conflicting information:

1. **Canonical Playbook IDs ONLY**: `missing_seo_title`, `missing_seo_description` — no page/collection-specific variants
2. **Metadata-Only Mutations**: SEO title + SEO description only for Pages/Collections
3. **Handle-Only Apply**: `page_handle:<handle>`, `collection_handle:<handle>` format with no URL/title fallback lookups
4. **Apply Never Uses AI**: AUTO-PB-1.3 invariant preserved — all suggestions come from pre-generated drafts
5. **ROLES-2/ROLES-3 Gating**: EDITOR request → OWNER approve/apply

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running with database connection
  - [ ] Web app running and connected to API
  - [ ] Project with Shopify integration (access token and shop domain)
  - [ ] Project with crawl data including /pages/* and /collections/* URLs

- **Test accounts and sample data:**
  - [ ] OWNER user account with project access
  - [ ] EDITOR user account (for approval flow testing)
  - [ ] Project with crawled pages/collections:
    - Some with missing SEO title (title is null or empty)
    - Some with missing SEO description (metaDescription is null or empty)
    - Some with complete SEO metadata (for exclusion testing)

- **Required user roles or subscriptions:**
  - [ ] OWNER role for apply operations
  - [ ] EDITOR role for draft generation and approval requests
  - [ ] Pro or Business plan for automation playbook access

---

## Test Scenarios (Happy Path)

### Scenario 1: Estimate for Pages with Missing SEO Title

**ID:** HP-001

**Preconditions:**
- Project with crawled /pages/* URLs, some with missing title

**Steps:**
1. Login as OWNER or EDITOR
2. Call POST `/projects/:id/automation-playbooks/estimate` with:
   ```json
   {
     "playbookId": "missing_seo_title",
     "assetType": "PAGES"
   }
   ```
3. Observe the response

**Expected Results:**
- **API Response:**
  - `totalAffectedProducts` > 0 (count of pages with missing title)
  - `scopeId` is a 16-character hex hash including assetType
  - `eligible` is true for Pro/Business plans
  - `canProceed` is true if quota not exceeded

**Verification:**
```bash
curl -X POST http://localhost:3001/projects/PROJECT_ID/automation-playbooks/estimate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"playbookId": "missing_seo_title", "assetType": "PAGES"}'
```

---

### Scenario 2: Estimate for Collections with Missing SEO Description

**ID:** HP-002

**Preconditions:**
- Project with crawled /collections/* URLs, some with missing metaDescription

**Steps:**
1. Login as OWNER or EDITOR
2. Call POST `/projects/:id/automation-playbooks/estimate` with:
   ```json
   {
     "playbookId": "missing_seo_description",
     "assetType": "COLLECTIONS"
   }
   ```
3. Observe the response

**Expected Results:**
- **API Response:**
  - `totalAffectedProducts` reflects collections with missing description
  - `scopeId` is different from PRODUCTS or PAGES estimates for same playbookId
  - Response structure identical to PRODUCTS estimate

---

### Scenario 3: Scoped Estimate with Asset Refs

**ID:** HP-003

**Preconditions:**
- Project with multiple pages, user wants to target specific ones

**Steps:**
1. Login as OWNER or EDITOR
2. Call POST `/projects/:id/automation-playbooks/estimate` with:
   ```json
   {
     "playbookId": "missing_seo_title",
     "assetType": "PAGES",
     "scopeAssetRefs": ["page_handle:about-us", "page_handle:contact"]
   }
   ```
3. Observe the response

**Expected Results:**
- **API Response:**
  - `totalAffectedProducts` <= 2 (only includes specified pages with missing title)
  - `scopeId` reflects the scoped subset

---

### Scenario 4: Work Queue Shows Pages/Collections Automation Bundles

**ID:** HP-004

**Preconditions:**
- Project with pages/collections having missing SEO metadata

**Steps:**
1. Login as any user with project access
2. Call GET `/projects/:id/work-queue`
3. Filter for `bundleType=AUTOMATION_RUN`
4. Observe bundles with different scopeTypes

**Expected Results:**
- **API Response:**
  - Bundles with `scopeType: "PAGES"` for page issues
  - Bundles with `scopeType: "COLLECTIONS"` for collection issues
  - `bundleId` format: `AUTOMATION_RUN:FIX_MISSING_METADATA:{playbookId}:{assetType}:{projectId}`
  - `recommendedActionLabel` includes asset type: "Fix missing page SEO titles"

---

### Scenario 5: Shopify Page SEO Update (Direct API Call)

**ID:** HP-005

**Preconditions:**
- Project with Shopify integration
- Page exists in Shopify store with known handle

**Steps:**
1. Login as OWNER
2. Call `updatePageSeo()` via internal service (not exposed as endpoint yet)
3. Verify Shopify page is updated

**Expected Results:**
- **Shopify:**
  - Page SEO title updated
  - Page SEO description updated
- **Local DB:**
  - CrawlResult record updated with new title/metaDescription

**Note:** This test requires direct service invocation or integration test setup.

---

### Scenario 6: Shopify Collection SEO Update (Direct API Call)

**ID:** HP-006

**Preconditions:**
- Project with Shopify integration
- Collection exists in Shopify store with known handle

**Steps:**
1. Login as OWNER
2. Call `updateCollectionSeo()` via internal service
3. Verify Shopify collection is updated

**Expected Results:**
- **Shopify:**
  - Collection SEO title updated
  - Collection SEO description updated
- **Local DB:**
  - CrawlResult record updated with new title/metaDescription

---

## Test Scenarios (Edge Cases)

### Edge Case 1: Invalid Asset Ref Format

**ID:** EC-001

**Preconditions:**
- User attempts to use invalid scopeAssetRefs format

**Steps:**
1. Call POST `/projects/:id/automation-playbooks/estimate` with:
   ```json
   {
     "playbookId": "missing_seo_title",
     "assetType": "PAGES",
     "scopeAssetRefs": ["invalid_format"]
   }
   ```

**Expected Results:**
- **API Response:**
  - 400 Bad Request
  - Error message indicates invalid ref format

---

### Edge Case 2: Mixed Asset Refs for Wrong Asset Type

**ID:** EC-002

**Preconditions:**
- User attempts to use collection refs for PAGES asset type

**Steps:**
1. Call POST `/projects/:id/automation-playbooks/estimate` with:
   ```json
   {
     "playbookId": "missing_seo_title",
     "assetType": "PAGES",
     "scopeAssetRefs": ["collection_handle:summer-sale"]
   }
   ```

**Expected Results:**
- **API Response:**
  - 400 Bad Request
  - Error: `Invalid ref "collection_handle:summer-sale" for assetType PAGES. Expected prefix "page_handle:"`

---

### Edge Case 3: scopeProductIds with Non-PRODUCTS Asset Type

**ID:** EC-003

**Preconditions:**
- User attempts to use scopeProductIds with PAGES asset type

**Steps:**
1. Call POST `/projects/:id/automation-playbooks/estimate` with:
   ```json
   {
     "playbookId": "missing_seo_title",
     "assetType": "PAGES",
     "scopeProductIds": ["product-id-1"]
   }
   ```

**Expected Results:**
- **API Response:**
  - 400 Bad Request
  - Error: `scopeProductIds cannot be used with assetType PAGES. Use scopeAssetRefs instead.`

---

### Edge Case 4: Page Not Found in Shopify

**ID:** EC-004

**Preconditions:**
- Handle doesn't exist in Shopify store

**Steps:**
1. Attempt to update SEO for non-existent page handle

**Expected Results:**
- **API Response:**
  - 400 Bad Request
  - Error: `Page not found with handle: {handle}`

---

### Edge Case 5: No Shopify Integration

**ID:** EC-005

**Preconditions:**
- Project without Shopify integration

**Steps:**
1. Attempt to update Page/Collection SEO

**Expected Results:**
- **API Response:**
  - 400 Bad Request
  - Error: `No Shopify integration found for this project`

---

### Edge Case 6: Non-OWNER Attempting Apply

**ID:** EC-006

**Preconditions:**
- EDITOR user attempting apply operation

**Steps:**
1. Login as EDITOR
2. Attempt to call apply endpoint for Page/Collection

**Expected Results:**
- **API Response:**
  - 403 Forbidden
  - Role-specific denial message

---

## Test Scenarios (Error Handling)

### Error 1: Shopify API Rate Limit

**ID:** ERR-001

**Preconditions:**
- Shopify API returns 429 Too Many Requests

**Expected Results:**
- **Behavior:**
  - Error logged with Shopify error details
  - User-friendly error message returned
  - No partial updates committed

---

### Error 2: Shopify Mutation User Errors

**ID:** ERR-002

**Preconditions:**
- Shopify mutation returns userErrors

**Expected Results:**
- **Behavior:**
  - Warning logged with error messages
  - 400 Bad Request returned
  - Error: "Failed to update page/collection SEO in Shopify"

---

## Rollback Verification

- **If tests fail, verify:**
  - [ ] No partial Shopify updates occurred
  - [ ] Local CrawlResult records unchanged
  - [ ] Work Queue bundles still accurate

---

## Test Coverage Status

| Scenario | Backend | Frontend | E2E |
|----------|---------|----------|-----|
| HP-001 Estimate Pages | ✅ Manual | ⏳ | ⏳ |
| HP-002 Estimate Collections | ✅ Manual | ⏳ | ⏳ |
| HP-003 Scoped Asset Refs | ✅ Manual | ⏳ | ⏳ |
| HP-004 Work Queue Bundles | ✅ Manual | ⏳ | ⏳ |
| HP-005 Page SEO Update | ✅ Manual | ⏳ | ⏳ |
| HP-006 Collection SEO Update | ✅ Manual | ⏳ | ⏳ |
| EC-001 Invalid Ref Format | ✅ Manual | ⏳ | ⏳ |
| EC-002 Wrong Ref Type | ✅ Manual | ⏳ | ⏳ |
| EC-003 Wrong Scope Param | ✅ Manual | ⏳ | ⏳ |
| EC-004 Page Not Found | ✅ Manual | ⏳ | ⏳ |
| EC-005 No Integration | ✅ Manual | ⏳ | ⏳ |
| EC-006 Non-OWNER Apply | ✅ Manual | ⏳ | ⏳ |

---

## Notes

- Frontend execution surfaces (Generate Drafts, Apply buttons) are deferred to PATCH 5
- AI prompt adaptation for Pages/Collections draft generation is deferred
- Integration tests should be added as automation-playbooks.test.ts extensions
- E2E tests require Shopify sandbox environment

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-24 | Claude | Initial draft for ASSETS-PAGES-1.1 execution phase |
