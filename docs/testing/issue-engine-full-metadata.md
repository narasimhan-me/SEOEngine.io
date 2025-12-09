# EngineO.ai – System-Level Manual Testing: Issue Engine Full - Metadata Issues

> Manual tests for Issue Engine Full (Phase UX-8): Metadata category issues with enriched fields.

---

## Overview

- **Purpose of this testing doc:**
  - Validate that all metadata-related issues include correct Issue Engine Full enrichment fields.

- **High-level user impact and what "success" looks like:**
  - Metadata issues (missing/weak SEO titles and descriptions) display `whyItMatters` and `recommendedFix` guidance.
  - Issues correctly marked as `aiFixable: true` with `fixCost: 'one_click'`.
  - Category filtering by `metadata` returns all relevant issues.

- **Related phases/sections:**
  - Phase UX-8 (Issue Engine Full)
  - Phase UX-7 (Issue Engine Lite)

- **Related documentation:**
  - `packages/shared/src/deo-issues.ts` (DeoIssue type)
  - `apps/api/src/projects/deo-issues.service.ts` (Issue builders)
  - `docs/deo-issues-spec.md` (Issue Engine Full spec)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Frontend web app running
  - [ ] Database with test project and products

- **Test accounts and sample data:**
  - [ ] Project with products that have:
    - Missing SEO titles
    - Missing SEO descriptions
    - Weak (short) SEO titles
    - Weak (short) SEO descriptions

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario 1: Missing SEO Title issue enrichment

**ID:** MET-001

**Preconditions:**
- Products exist without `seoTitle` set

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'missing_seo_title'`
3. Examine enrichment fields

**Expected Results:**
- **category:** `'metadata'`
- **whyItMatters:** Non-empty explanation about SEO title importance
- **recommendedFix:** Guidance mentioning AI generation
- **aiFixable:** `true`
- **fixCost:** `'one_click'`

---

### Scenario 2: Missing SEO Description issue enrichment

**ID:** MET-002

**Preconditions:**
- Products exist without `seoDescription` set

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'missing_seo_description'`
3. Examine enrichment fields

**Expected Results:**
- **category:** `'metadata'`
- **whyItMatters:** Explanation about meta description importance for CTR
- **recommendedFix:** Guidance mentioning AI generation
- **aiFixable:** `true`
- **fixCost:** `'one_click'`

---

### Scenario 3: Weak Title issue enrichment

**ID:** MET-003

**Preconditions:**
- Products exist with short or unoptimized SEO titles

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'weak_title'`
3. Examine enrichment fields

**Expected Results:**
- **category:** `'metadata'`
- **whyItMatters:** Explanation about weak titles failing to capture attention
- **recommendedFix:** Guidance about using AI to optimize
- **aiFixable:** `true`
- **fixCost:** `'one_click'`

---

### Scenario 4: Weak Description issue enrichment

**ID:** MET-004

**Preconditions:**
- Products exist with short SEO descriptions

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'weak_description'`
3. Examine enrichment fields

**Expected Results:**
- **category:** `'metadata'`
- **whyItMatters:** Explanation about truncation and differentiation
- **recommendedFix:** Guidance about expanding with AI
- **aiFixable:** `true`
- **fixCost:** `'one_click'`

---

### Scenario 5: Missing Metadata (aggregated) issue enrichment

**ID:** MET-005

**Preconditions:**
- Pages or products missing titles or descriptions

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'missing_metadata'`
3. Examine enrichment fields

**Expected Results:**
- **category:** `'metadata'`
- **whyItMatters:** Explanation about visibility and click-through rates
- **recommendedFix:** Guidance about adding metadata
- **aiFixable:** `false` (aggregated issue requires per-item action)
- **fixCost:** `'manual'`

---

## Edge Cases

### EC-001: No metadata issues

**Description:** Project has complete, well-optimized metadata.

**Steps:**
1. Create project with all products having optimized titles and descriptions
2. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**
- No metadata-category issues returned
- Issues with other categories may still appear

---

### EC-002: Mixed metadata issues

**Description:** Project has some products with issues, some without.

**Steps:**
1. Create project with mix of optimized and unoptimized products
2. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**
- Only affected products listed in `affectedProducts`
- `count` accurately reflects number of affected items
- Severity reflects proportion of affected items

---

## Regression

### Areas potentially impacted:

- [ ] **DeoIssuesService:** Ensure all metadata builders include new fields
- [ ] **DeoIssue Type:** Ensure optional fields don't break existing consumers
- [ ] **Issues Engine UI:** Ensure new fields render correctly if displayed

### Quick sanity checks:

- [ ] API returns enrichment fields for all metadata issues
- [ ] `category` is always `'metadata'` for these issues
- [ ] `aiFixable` is `true` for product-level metadata issues
- [ ] `fixCost` is `'one_click'` for AI-fixable issues

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Issue Engine Full - Metadata issues (Phase UX-8) |
