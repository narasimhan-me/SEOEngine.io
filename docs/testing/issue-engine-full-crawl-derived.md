# EngineO.ai – System-Level Manual Testing: Issue Engine Full - Crawl-Derived Issues

> Manual tests for Issue Engine Full (Phase UX-8): Technical/crawl-derived issues with enriched fields.

---

## Overview

- **Purpose of this testing doc:**
  - Validate that crawl-derived technical issues include correct Issue Engine Full enrichment fields.

- **High-level user impact and what "success" looks like:**
  - Technical issues (crawl errors, indexability) display `whyItMatters` and `recommendedFix` guidance.
  - Issues correctly marked as `aiFixable: false` (require technical fixes).
  - `fixCost: 'advanced'` reflects technical complexity.

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
  - [ ] Database with test project and crawl results

- **Test accounts and sample data:**
  - [ ] Project with crawl results including:
    - HTTP 4xx/5xx errors
    - Pages missing title/description/H1
    - Pages with noindex directives
    - Fetch errors

---

## Test Scenarios (Happy Path)

### Scenario 1: Indexability Problems issue enrichment

**ID:** CRL-001

**Preconditions:**

- Pages with indexability issues exist

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'indexability_problems'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'technical'`
- **whyItMatters:** Explanation about invisible pages and lost opportunities
- **recommendedFix:** Guidance about fixing errors and removing noindex
- **aiFixable:** `false`
- **fixCost:** `'advanced'`

---

### Scenario 2: Crawl Health Errors issue enrichment

**ID:** CRL-002

**Preconditions:**

- Pages with HTTP errors or fetch failures

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'crawl_health_errors'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'technical'`
- **whyItMatters:** Explanation about accessibility and site health
- **recommendedFix:** Guidance about identifying and fixing errors
- **aiFixable:** `false`
- **fixCost:** `'advanced'`

---

### Scenario 3: Missing Product Image issue enrichment

**ID:** CRL-003

**Preconditions:**

- Products without images

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'missing_product_image'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'technical'`
- **whyItMatters:** Explanation about image search and shopping feeds
- **recommendedFix:** Guidance about uploading high-quality images
- **aiFixable:** `false`
- **fixCost:** `'manual'`

---

### Scenario 4: Missing Price issue enrichment

**ID:** CRL-004

**Preconditions:**

- Products without price data

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'missing_price'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'technical'`
- **whyItMatters:** Explanation about shopping results exclusion
- **recommendedFix:** Guidance about re-syncing from Shopify
- **aiFixable:** `false`
- **fixCost:** `'one_click'` (sync action)

---

## Edge Cases

### EC-001: No crawl errors

**Description:** Project with 100% healthy crawl.

**Steps:**

1. Create project with all pages returning 200 OK
2. All pages have complete HTML elements
3. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**

- No technical category issues from crawl data
- May still have product structural issues

---

### EC-002: Mixed error types

**Description:** Project with various error types.

**Steps:**

1. Create crawl results with:
   - Some 404 errors
   - Some 500 errors
   - Some noindex pages
2. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**

- `affectedPages` includes representatives of all error types
- `count` reflects total pages with any issue

---

## Regression

### Areas potentially impacted:

- [ ] **DeoIssuesService:** Technical issue builders include new fields
- [ ] **Crawl Result Parsing:** Issue detection from crawl data
- [ ] **Severity Calculation:** Signal-based severity thresholds

### Quick sanity checks:

- [ ] `indexability_problems` has category `'technical'`
- [ ] `crawl_health_errors` has category `'technical'`
- [ ] All crawl-derived issues are `aiFixable: false`
- [ ] `fixCost: 'advanced'` for technical issues

---

## Approval

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| **Tester Name**    | [Pending]                                             |
| **Date**           | [YYYY-MM-DD]                                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                 |
| **Notes**          | Issue Engine Full - Crawl-Derived issues (Phase UX-8) |
