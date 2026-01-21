# EngineO.ai – System-Level Manual Testing: Product Sync

> Cross-cutting manual tests for initial sync, delta sync, deleted products, large catalogs, and rate limit handling.

---

## Overview

- **Purpose of this testing doc:**
  - Validate product synchronization from Shopify including initial sync, incremental updates, deletion handling, and performance at scale.

- **High-level user impact and what "success" looks like:**
  - Products sync accurately from Shopify store.
  - New, updated, and deleted products are handled correctly.
  - Large catalogs sync within reasonable time.
  - Rate limits are handled gracefully.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 1.x (Product sync)
  - Phase UX-1 (Products page)

- **Related documentation:**
  - `docs/ARCHITECTURE.md` (sync architecture)
  - `docs/API_SPEC.md` (sync endpoints)

---

## Preconditions

- **Environment requirements:**
  - [ ] Shopify store connected
  - [ ] Backend API running
  - [ ] Database accessible

- **Test accounts and sample data:**
  - [ ] Shopify stores with various product counts
  - [ ] Products in various states (active, draft, archived)

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with connected Shopify store

---

## Test Scenarios (Happy Path)

### Scenario 1: Initial product sync

**ID:** HP-001

**Preconditions:**

- Shopify connected, no products synced yet

**Steps:**

1. Navigate to Products page
2. Click "Sync Products"
3. Wait for completion

**Expected Results:**

- **Progress:** Sync status shown
- **Completion:** All products imported
- **Database:** Product records created with Shopify IDs
- **UI:** Products displayed in list

---

### Scenario 2: Delta sync (new products added)

**ID:** HP-002

**Preconditions:**

- Previous sync completed
- New products added in Shopify

**Steps:**

1. Add products in Shopify admin
2. Trigger sync in EngineO
3. Verify new products appear

**Expected Results:**

- **New Products:** Created in EngineO
- **Existing Products:** Unchanged
- **Count:** Matches Shopify total

---

### Scenario 3: Delta sync (products updated)

**ID:** HP-003

**Preconditions:**

- Products previously synced
- Products modified in Shopify

**Steps:**

1. Update product title/description in Shopify
2. Trigger sync
3. Verify updates reflected

**Expected Results:**

- **Updates:** Product data updated in EngineO
- **Fields:** Title, description, images updated
- **Timestamp:** lastSyncedAt updated

---

### Scenario 4: Sync reports accurate counts

**ID:** HP-004

**Preconditions:**

- Mix of new, updated, unchanged products

**Steps:**

1. Make various changes in Shopify
2. Trigger sync
3. Review sync summary

**Expected Results:**

- **Summary:** "X created, Y updated, Z unchanged"
- **Accuracy:** Numbers match actual changes

---

## Edge Cases

### EC-001: Sync with deleted products

**Description:** Products removed from Shopify.

**Steps:**

1. Delete product in Shopify
2. Trigger sync
3. Check EngineO products

**Expected Behavior:**

- Deleted products marked as archived/removed in EngineO
- Or: Products remain but flagged as "not in Shopify"
- Clear policy on retention

---

### EC-002: Very large catalog (1000+ products)

**Description:** Sync performance with large product count.

**Steps:**

1. Store with 1000+ products
2. Trigger full sync
3. Monitor progress and completion

**Expected Behavior:**

- Pagination handled correctly
- Progress updates shown
- Completes within reasonable time
- No timeout or memory issues

---

### EC-003: Products with variants

**Description:** Shopify products with multiple variants.

**Steps:**

1. Sync products with variants
2. Check variant handling

**Expected Behavior:**

- Variants stored/associated correctly
- Parent product linked to variants
- UI shows variant count if applicable

---

### EC-004: Products with no images

**Description:** Products missing image data.

**Steps:**

1. Sync product without images
2. Check product record

**Expected Behavior:**

- Product synced successfully
- Image field null/empty
- UI shows placeholder

---

### EC-005: Products in draft/archived status

**Description:** Non-active products in Shopify.

**Steps:**

1. Store has draft and archived products
2. Sync products

**Expected Behavior:**

- Draft/archived products synced (or filtered based on policy)
- Status stored with product
- Clear in UI which products are active

---

## Error Handling

### ERR-001: Shopify API rate limit (429)

**Scenario:** Too many requests to Shopify API.

**Steps:**

1. Trigger sync that hits rate limit

**Expected Behavior:**

- Rate limit detected
- Automatic backoff and retry
- Sync eventually completes
- User sees progress, not error

---

### ERR-002: Shopify authentication failure

**Scenario:** Access token invalid during sync.

**Steps:**

1. Revoke app access mid-sync

**Expected Behavior:**

- Auth error detected
- Sync fails gracefully
- User prompted to reconnect
- Partial sync data preserved

---

### ERR-003: Network error during sync

**Scenario:** Connection lost during sync.

**Steps:**

1. Simulate network failure during sync

**Expected Behavior:**

- Sync fails with clear error
- Partial progress saved (if applicable)
- Retry available
- No data corruption

---

### ERR-004: Malformed product data from Shopify

**Scenario:** Product has unexpected/invalid data.

**Steps:**

1. Product with unusual characters or structure

**Expected Behavior:**

- Malformed product skipped or sanitized
- Other products still sync
- Warning logged
- Sync completes

---

## Limits

### LIM-001: Product sync limits by plan

**Scenario:** Plan-based limits on synced products.

| Plan     | Max Products |
| -------- | ------------ |
| Free     | 100          |
| Pro      | 1000         |
| Business | 10000        |

**Steps:**

1. Attempt sync exceeding limit

**Expected Behavior:**

- Sync stops at limit
- User informed of limit
- Upgrade prompt shown

---

### LIM-002: Sync frequency limits

**Scenario:** Minimum time between syncs.

**Steps:**

1. Complete sync
2. Immediately try again

**Expected Behavior:**

- Rate limit or cooldown enforced
- User informed when next sync available

---

## Regression

### Areas potentially impacted:

- [ ] **AI Optimization:** Ensure synced products available for optimization
- [ ] **DEO Issues:** Ensure product issues surface after sync
- [ ] **Products UI:** Ensure list displays correctly
- [ ] **Billing:** Ensure product limits tied to plan

### Quick sanity checks:

- [ ] Initial sync works
- [ ] New products appear after re-sync
- [ ] Product details accurate
- [ ] Sync count displayed

---

## Post-Conditions

### Data cleanup steps:

- [ ] Delete test products from EngineO database
- [ ] Reset sync state if needed

### Follow-up verification:

- [ ] Product count matches Shopify
- [ ] No orphaned product records

---

## Known Issues

- **Intentionally accepted issues:**
  - Large catalogs may take several minutes to sync

- **Out-of-scope items:**
  - Real-time sync via webhooks (future enhancement)
  - Bi-directional non-SEO sync

- **TODOs:**
  - [ ] Add webhook-based incremental sync
  - [ ] Consider background job for large syncs

---

## Approval

| Field              | Value                                             |
| ------------------ | ------------------------------------------------- |
| **Tester Name**    | [Pending]                                         |
| **Date**           | [YYYY-MM-DD]                                      |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed             |
| **Notes**          | Cross-cutting system-level tests for product sync |
