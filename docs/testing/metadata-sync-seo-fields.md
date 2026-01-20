# EngineO.ai – System-Level Manual Testing: Metadata Sync (SEO Fields)

> Cross-cutting manual tests for AI SEO apply to Shopify, manual edits, validation, partial failures, and API error handling.

---

## Overview

- **Purpose of this testing doc:**
  - Validate the metadata sync functionality that writes AI-generated and manually-edited SEO fields (title, description) back to Shopify products.

- **High-level user impact and what "success" looks like:**
  - AI-generated SEO content is successfully pushed to Shopify.
  - Manual SEO edits sync correctly.
  - Sync failures are handled gracefully.
  - Product pages on Shopify reflect EngineO optimizations.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 2.x (AI optimization)
  - Phase UX-2 (Product workspace)

- **Related documentation:**
  - `docs/ARCHITECTURE.md` (metadata sync)
  - `docs/API_SPEC.md` (apply endpoints)

---

## Preconditions

- **Environment requirements:**
  - [ ] Shopify store connected with write permissions
  - [ ] Backend API running
  - [ ] Products synced from Shopify

- **Test accounts and sample data:**
  - [ ] Products with empty SEO fields
  - [ ] Products with existing SEO fields
  - [ ] AI-generated suggestions ready

- **Required user roles or subscriptions:**
  - [ ] User with active subscription (AI features enabled)

---

## Test Scenarios (Happy Path)

### Scenario 1: Apply AI SEO suggestion to Shopify

**ID:** HP-001

**Preconditions:**

- Product has AI-generated SEO suggestion

**Steps:**

1. Navigate to product optimization workspace
2. Generate AI suggestion
3. Click "Apply" or "Push to Shopify"
4. Wait for sync confirmation

**Expected Results:**

- **EngineO:** Product's seoTitle/seoDescription updated
- **Shopify:** Product's SEO fields updated via API
- **UI:** Success message shown
- **Verification:** Check product in Shopify admin

---

### Scenario 2: Manual SEO edit synced to Shopify

**ID:** HP-002

**Preconditions:**

- Product in optimization workspace

**Steps:**

1. Manually edit SEO title and description
2. Click "Save & Sync" or "Apply"
3. Verify in Shopify

**Expected Results:**

- **EngineO:** Local record updated
- **Shopify:** SEO fields match manual edits
- **Timestamp:** lastSyncedAt updated

---

### Scenario 3: Bulk apply SEO to multiple products

**ID:** HP-003

**Preconditions:**

- Multiple products with AI suggestions

**Steps:**

1. Select multiple products
2. Generate suggestions for all
3. Bulk apply to Shopify

**Expected Results:**

- **Progress:** Batch progress shown
- **Completion:** All products updated
- **Summary:** "X products updated successfully"

---

### Scenario 4: Verify SEO fields in Shopify admin

**ID:** HP-004

**Preconditions:**

- SEO sync completed

**Steps:**

1. Open Shopify admin
2. Navigate to synced product
3. Check SEO fields in product editor

**Expected Results:**

- **Title:** Matches EngineO seoTitle
- **Description:** Matches EngineO seoDescription
- **Preview:** Google preview shows updated content

---

## Edge Cases

### EC-001: SEO fields with special characters

**Description:** Content includes quotes, HTML entities, or unicode.

**Steps:**

1. Generate/edit SEO with special characters
2. Apply to Shopify
3. Verify characters preserved

**Expected Behavior:**

- Characters properly escaped/encoded
- Displayed correctly in Shopify
- No truncation or corruption

---

### EC-002: Very long SEO content

**Description:** Title or description exceeds recommended limits.

**Steps:**

1. Enter SEO title > 60 chars or description > 160 chars
2. Attempt sync

**Expected Behavior:**

- Warning about length (or truncation)
- Sync proceeds with full content
- User informed of SEO best practices

---

### EC-003: Sync overwrites existing Shopify SEO

**Description:** Product had SEO content in Shopify before EngineO.

**Steps:**

1. Product with existing SEO in Shopify
2. Generate new AI suggestion
3. Apply

**Expected Behavior:**

- New content overwrites old
- No merge (replace behavior)
- User warned before overwrite (optional)

---

### EC-004: Sync after product deleted from Shopify

**Description:** Product no longer exists in Shopify.

**Steps:**

1. Delete product from Shopify
2. Attempt to sync SEO from EngineO

**Expected Behavior:**

- 404 error from Shopify API
- User informed product not found
- Suggestion to remove from EngineO

---

## Error Handling

### ERR-001: Shopify API write failure

**Scenario:** Shopify returns error on update.

**Steps:**

1. Trigger sync when Shopify API has issues

**Expected Behavior:**

- Error message shown
- Local changes preserved
- Retry option available
- Original Shopify data unchanged

---

### ERR-002: Invalid SEO field values

**Scenario:** Content violates Shopify validation.

**Steps:**

1. Attempt sync with invalid content (if any restrictions)

**Expected Behavior:**

- Validation error from Shopify
- User informed of issue
- Suggestion to fix content

---

### ERR-003: Partial bulk sync failure

**Scenario:** Some products fail in bulk operation.

**Steps:**

1. Bulk apply to 10 products
2. 2 fail due to errors

**Expected Behavior:**

- 8 products succeed
- 2 failures reported
- User can retry failed items
- Clear error messages

---

### ERR-004: Permission error (read-only scope)

**Scenario:** App doesn't have write permissions.

**Steps:**

1. Attempt sync without write scope

**Expected Behavior:**

- 403 error from Shopify
- User informed of permission issue
- Reconnect flow suggested

---

## Limits

### LIM-001: AI apply counts against usage limits

**Scenario:** Applying AI SEO counts toward daily AI usage.

**Steps:**

1. Track AI usage before/after apply
2. Verify usage incremented

**Expected Behavior:**

- Usage counted correctly
- Limit enforced if reached
- Clear messaging about usage

---

### LIM-002: Bulk apply limits

**Scenario:** Maximum products per bulk operation.

**Steps:**

1. Attempt bulk apply on large selection

**Expected Behavior:**

- Batch size limits enforced (if any)
- Pagination/chunking handled
- All products eventually synced

---

## Regression

### Areas potentially impacted:

- [ ] **Product sync:** Ensure sync doesn't overwrite EngineO SEO
- [ ] **AI suggestions:** Ensure suggestions generate correctly
- [ ] **Products page:** Ensure applied status shows
- [ ] **DEO Score:** Ensure score updates after apply

### Quick sanity checks:

- [ ] Single product apply works
- [ ] SEO appears in Shopify
- [ ] Success message shown
- [ ] Usage tracked

---

## Post-Conditions

### Data cleanup steps:

- [ ] Reset test product SEO fields in Shopify
- [ ] Clear test AI suggestions
- [ ] Reset usage counters if testing limits

### Follow-up verification:

- [ ] Shopify products match EngineO
- [ ] No orphaned sync jobs

---

## Known Issues

- **Intentionally accepted issues:**
  - Sync is one-way (EngineO → Shopify); Shopify edits not pulled back

- **Out-of-scope items:**
  - Two-way sync of SEO fields
  - Sync scheduling/automation

- **TODOs:**
  - [ ] Add sync status indicator per product
  - [ ] Consider optimistic UI update

---

## Approval

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| **Tester Name**    | [Pending]                                          |
| **Date**           | [YYYY-MM-DD]                                       |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed              |
| **Notes**          | Cross-cutting system-level tests for metadata sync |
