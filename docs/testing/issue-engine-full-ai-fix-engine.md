# EngineO.ai – System-Level Manual Testing: Issue Engine Full - AI Fix Engine

> Manual tests for Issue Engine Full (Phase UX-8): AI fixability metadata and fix guidance.

---

## Overview

- **Purpose of this testing doc:**
  - Validate that `aiFixable` and `fixCost` fields are correctly set across all issues.
  - Ensure `recommendedFix` guidance matches the fixability status.

- **High-level user impact and what "success" looks like:**
  - Users can filter issues by AI-fixable status.
  - AI-fixable issues show one-click fix guidance.
  - Manual issues provide appropriate manual guidance.
  - Fix cost accurately reflects effort required.

- **Related phases/sections:**
  - Phase UX-8 (Issue Engine Full)
  - Phase UX-7 (Issue Engine Lite - fixType)

- **Related documentation:**
  - `packages/shared/src/deo-issues.ts` (DeoIssue type)
  - `apps/api/src/projects/deo-issues.service.ts` (Issue builders)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database with project having various issue types

- **Test accounts and sample data:**
  - [ ] Project with mix of:
    - AI-fixable issues (missing/weak titles, descriptions)
    - Manual-fix issues (missing long descriptions, images)
    - Sync-fix issues (missing prices, categories)
    - Advanced-fix issues (crawl errors, indexability)

---

## Test Scenarios (Happy Path)

### Scenario 1: AI-fixable issues have correct metadata

**ID:** FIX-001

**Preconditions:**
- Issues with `fixType: 'aiFix'` exist

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Filter issues where `fixType === 'aiFix'`
3. Verify `aiFixable` and `fixCost` fields

**Expected Results:**
- All should have `aiFixable: true`
- All should have `fixCost: 'one_click'`
- `recommendedFix` mentions AI or automated generation

---

### Scenario 2: Manual-fix issues have correct metadata

**ID:** FIX-002

**Preconditions:**
- Issues with `fixType: 'manualFix'` exist

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Filter issues where `fixType === 'manualFix'`
3. Verify `aiFixable` and `fixCost` fields

**Expected Results:**
- All should have `aiFixable: false`
- Most should have `fixCost: 'manual'`
- `recommendedFix` provides manual editing guidance

---

### Scenario 3: Sync-fix issues have correct metadata

**ID:** FIX-003

**Preconditions:**
- Issues with `fixType: 'syncFix'` exist

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Filter issues where `fixType === 'syncFix'`
3. Verify `aiFixable` and `fixCost` fields

**Expected Results:**
- All should have `aiFixable: false`
- All should have `fixCost: 'one_click'` (sync is fast)
- `recommendedFix` mentions Shopify sync

---

### Scenario 4: Aggregated issues have correct metadata

**ID:** FIX-004

**Preconditions:**
- Phase 3B aggregated issues exist (missing_metadata, thin_content, etc.)

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Filter issues that don't have `fixType` (aggregated issues)
3. Verify `aiFixable` and `fixCost` fields

**Expected Results:**
- Aggregated issues have `aiFixable: false` (require per-item action)
- Fix cost varies: `'manual'` or `'advanced'`
- `recommendedFix` provides general guidance

---

### Scenario 5: Fix cost consistency

**ID:** FIX-005

**Preconditions:**
- Issues of all fix cost levels exist

**Steps:**
1. Call `GET /projects/:id/deo-issues`
2. Group issues by `fixCost`
3. Verify consistency within each group

**Expected Results:**
- `'one_click'`: AI-fixable product issues + sync issues
- `'manual'`: Content creation issues (long descriptions, images)
- `'advanced'`: Technical issues (crawl, indexability, brand pages)

---

## Edge Cases

### EC-001: All issues AI-fixable

**Description:** Project with only AI-fixable issues.

**Steps:**
1. Create project with only missing/weak title and description issues
2. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**
- All returned issues have `aiFixable: true`
- All have `fixCost: 'one_click'`

---

### EC-002: No AI-fixable issues

**Description:** Project with only technical/structural issues.

**Steps:**
1. Create project with only crawl errors and missing images
2. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**
- All returned issues have `aiFixable: false`
- Fix costs are `'manual'` or `'advanced'`

---

## Validation Matrix

| Issue ID | aiFixable | fixCost | fixType |
|----------|-----------|---------|---------|
| missing_seo_title | true | one_click | aiFix |
| missing_seo_description | true | one_click | aiFix |
| weak_title | true | one_click | aiFix |
| weak_description | true | one_click | aiFix |
| missing_long_description | false | manual | manualFix |
| duplicate_product_content | true | one_click | aiFix |
| low_product_entity_coverage | true | one_click | aiFix |
| not_answer_ready | true | one_click | aiFix |
| weak_intent_match | true | one_click | aiFix |
| missing_product_image | false | manual | manualFix |
| missing_price | false | one_click | syncFix |
| missing_category | false | one_click | syncFix |
| missing_metadata | false | manual | - |
| thin_content | false | manual | - |
| low_entity_coverage | false | manual | - |
| indexability_problems | false | advanced | - |
| answer_surface_weakness | false | manual | - |
| brand_navigational_weakness | false | advanced | - |
| crawl_health_errors | false | advanced | - |
| product_content_depth | false | manual | - |

---

## Regression

### Areas potentially impacted:

- [ ] **DeoIssuesService:** All builders set aiFixable and fixCost
- [ ] **Issue Engine Lite:** fixType alignment with new fields
- [ ] **UI Fix Buttons:** Should respect aiFixable status

### Quick sanity checks:

- [ ] Every issue has `aiFixable` field (boolean)
- [ ] Every issue has `fixCost` field (valid enum value)
- [ ] `aiFixable: true` correlates with `fixType: 'aiFix'`
- [ ] Sync fixes have `fixCost: 'one_click'`

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Issue Engine Full - AI Fix Engine (Phase UX-8) |
