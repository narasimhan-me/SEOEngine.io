# EngineO.ai – System-Level Manual Testing: Issue Engine Full - Content & Entity Issues

> Manual tests for Issue Engine Full (Phase UX-8): Content and entity coverage issues with enriched fields.

---

## Overview

- **Purpose of this testing doc:**
  - Validate that content and entity-related issues include correct Issue Engine Full enrichment fields.

- **High-level user impact and what "success" looks like:**
  - Content issues (thin content, shallow descriptions) display `whyItMatters` and `recommendedFix` guidance.
  - Entity coverage issues provide actionable context.
  - Mix of `aiFixable` values based on issue type.

- **Related phases/sections:**
  - Phase UX-8 (Issue Engine Full)
  - Phase 3B (DEO Issues Engine)

- **Related documentation:**
  - `packages/shared/src/deo-issues.ts` (DeoIssue type)
  - `apps/api/src/projects/deo-issues.service.ts` (Issue builders)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database with test project, products, and crawl results

- **Test accounts and sample data:**
  - [ ] Project with:
    - Pages with word count < 150
    - Products with descriptions < 80 words
    - Products with missing long descriptions
    - Products with duplicate content

---

## Test Scenarios (Happy Path)

### Scenario 1: Thin Content issue enrichment

**ID:** CNT-001

**Preconditions:**

- Pages or products with thin content exist

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'thin_content'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'content_entity'`
- **whyItMatters:** Explanation about ranking and AI answer extraction
- **recommendedFix:** Guidance about expanding content with FAQs
- **aiFixable:** `false`
- **fixCost:** `'manual'`

---

### Scenario 2: Missing Long Description issue enrichment

**ID:** CNT-002

**Preconditions:**

- Products with body descriptions < 50 words

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'missing_long_description'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'content_entity'`
- **whyItMatters:** Explanation about AI understanding and recommendations
- **recommendedFix:** Guidance about comprehensive descriptions
- **aiFixable:** `false`
- **fixCost:** `'manual'`

---

### Scenario 3: Duplicate Product Content issue enrichment

**ID:** CNT-003

**Preconditions:**

- Multiple products with identical descriptions

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'duplicate_product_content'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'content_entity'`
- **whyItMatters:** Explanation about visibility dilution
- **recommendedFix:** Guidance about using AI to rewrite
- **aiFixable:** `true`
- **fixCost:** `'one_click'`

---

### Scenario 4: Low Product Entity Coverage issue enrichment

**ID:** CNT-004

**Preconditions:**

- Products lacking rich metadata and content depth

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'low_product_entity_coverage'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'schema_visibility'` (entity-related)
- **whyItMatters:** Explanation about entity-based queries
- **recommendedFix:** Guidance about AI enrichment
- **aiFixable:** `true`
- **fixCost:** `'one_click'`

---

### Scenario 5: Product Content Depth issue enrichment

**ID:** CNT-005

**Preconditions:**

- Products with shallow descriptions

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'product_content_depth'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'content_entity'`
- **whyItMatters:** Explanation about competition and customer decisions
- **recommendedFix:** Guidance about detailed descriptions (150+ words)
- **aiFixable:** `false`
- **fixCost:** `'manual'`

---

## Edge Cases

### EC-001: No content issues

**Description:** Project has sufficient content depth everywhere.

**Steps:**

1. Create project with all pages having 400+ words
2. All products have 150+ word descriptions
3. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**

- No content_entity category issues returned (except possibly duplicates)

---

### EC-002: Exact threshold boundary

**Description:** Content right at detection thresholds.

**Steps:**

1. Create product with exactly 50 word description
2. Create page with exactly 150 words
3. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**

- Boundary behavior is consistent (< threshold triggers issue)

---

## Regression

### Areas potentially impacted:

- [ ] **DeoIssuesService:** Ensure content builders include new fields
- [ ] **Thin Content Detection:** Word count calculation accuracy
- [ ] **Duplicate Detection:** Hash-based comparison working correctly

### Quick sanity checks:

- [ ] `thin_content` has category `'content_entity'`
- [ ] `duplicate_product_content` is `aiFixable: true`
- [ ] Manual content issues have `fixCost: 'manual'`

---

## Approval

| Field              | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| **Tester Name**    | [Pending]                                                |
| **Date**           | [YYYY-MM-DD]                                             |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                    |
| **Notes**          | Issue Engine Full - Content & Entity issues (Phase UX-8) |
