# EngineO.ai – System-Level Manual Testing: Issue Engine Full - Schema & AI Visibility Issues

> Manual tests for Issue Engine Full (Phase UX-8): Schema and AI visibility issues with enriched fields.

---

## Overview

- **Purpose of this testing doc:**
  - Validate that schema and AI visibility issues include correct Issue Engine Full enrichment fields.

- **High-level user impact and what "success" looks like:**
  - Schema/visibility issues (entity coverage, brand pages, categories) display `whyItMatters` and `recommendedFix` guidance.
  - Mix of AI-fixable and manual issues within this category.
  - Clear guidance for improving AI visibility.

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
    - Missing canonical pages (/about, /contact, etc.)
    - Products without categories
    - Low entity signal coverage

---

## Test Scenarios (Happy Path)

### Scenario 1: Low Entity Coverage (aggregated) issue enrichment

**ID:** SCH-001

**Preconditions:**

- Pages/products with insufficient entity signals

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'low_entity_coverage'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'schema_visibility'`
- **whyItMatters:** Explanation about entity-based search features
- **recommendedFix:** Guidance about structured headings and metadata
- **aiFixable:** `false`
- **fixCost:** `'manual'`

---

### Scenario 2: Brand Navigational Weakness issue enrichment

**ID:** SCH-002

**Preconditions:**

- Missing canonical pages like /about, /contact

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'brand_navigational_weakness'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'schema_visibility'`
- **whyItMatters:** Explanation about brand signals and user trust
- **recommendedFix:** Guidance about creating essential pages
- **aiFixable:** `false`
- **fixCost:** `'advanced'`

---

### Scenario 3: Missing Category issue enrichment

**ID:** SCH-003

**Preconditions:**

- Products without category/type classification

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'missing_category'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'schema_visibility'`
- **whyItMatters:** Explanation about product relationships and queries
- **recommendedFix:** Guidance about syncing or manual assignment
- **aiFixable:** `false`
- **fixCost:** `'one_click'` (sync action)

---

### Scenario 4: Low Product Entity Coverage issue enrichment

**ID:** SCH-004

**Preconditions:**

- Products lacking rich entity signals

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'low_product_entity_coverage'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'schema_visibility'`
- **whyItMatters:** Explanation about entity-based query categorization
- **recommendedFix:** Guidance about AI enrichment
- **aiFixable:** `true`
- **fixCost:** `'one_click'`

---

## Edge Cases

### EC-001: All canonical pages present

**Description:** Project with complete navigational structure.

**Steps:**

1. Create project with crawl results including /, /about, /contact, /faq, /support
2. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**

- No `brand_navigational_weakness` issue returned

---

### EC-002: All products categorized

**Description:** Project with complete category assignments.

**Steps:**

1. Create products all with `productType` set
2. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**

- No `missing_category` issue returned

---

## Regression

### Areas potentially impacted:

- [ ] **DeoIssuesService:** Schema/visibility builders include new fields
- [ ] **Canonical Page Detection:** Path extraction from URLs
- [ ] **Entity Coverage Calculation:** Signal-based or heuristic fallback

### Quick sanity checks:

- [ ] `low_entity_coverage` has category `'schema_visibility'`
- [ ] `brand_navigational_weakness` has category `'schema_visibility'`
- [ ] `missing_category` has category `'schema_visibility'`
- [ ] `low_product_entity_coverage` is `aiFixable: true`

---

## Approval

| Field              | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| **Tester Name**    | [Pending]                                                      |
| **Date**           | [YYYY-MM-DD]                                                   |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                          |
| **Notes**          | Issue Engine Full - Schema & AI Visibility issues (Phase UX-8) |
