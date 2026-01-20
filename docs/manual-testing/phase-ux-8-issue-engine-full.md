# Phase UX-8 – Issue Engine Full (IE-2.0) Manual Testing

> Comprehensive manual testing guide for Phase UX-8: Issue Engine Full with rich metadata fields.

---

## Overview

Phase UX-8 extends all existing DEO issues with rich metadata fields for better context, prioritization, and AI fix guidance.

**Key Features:**

- Issue categories (metadata, content_entity, answerability, technical, schema_visibility)
- Business impact explanations (whyItMatters)
- Actionable fix guidance (recommendedFix)
- AI fixability indicators (aiFixable)
- Effort estimation (fixCost: one_click, manual, advanced)

**Backend-Only Phase:** No UI changes; enriched fields enable future UI improvements.

---

## Preconditions

- [ ] Backend API running
- [ ] Database with test project containing various issues
- [ ] At least one crawl completed
- [ ] Products with varying metadata states

---

## Test Categories

### 1. Type System Validation

**Test:** Verify new types are exported correctly

```typescript
// Expected exports from @engineo/shared
import {
  DeoIssue,
  DeoIssueCategory,
  DeoIssueFixCost,
  DeoIssueSeverity,
  DeoIssueType,
  DeoIssueFixType,
} from '@engineo/shared';
```

**Validation:**

- [ ] `DeoIssueCategory` accepts: 'metadata', 'content_entity', 'answerability', 'technical', 'schema_visibility'
- [ ] `DeoIssueFixCost` accepts: 'one_click', 'manual', 'advanced'
- [ ] All new DeoIssue fields are optional (backward compatible)

---

### 2. API Response Validation

**Test:** Verify all issues include new fields

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. For each issue in response, verify presence of:
   - `category` (string, one of defined categories)
   - `whyItMatters` (non-empty string)
   - `recommendedFix` (non-empty string)
   - `aiFixable` (boolean)
   - `fixCost` (one of: one_click, manual, advanced)

**Expected:**

- All 20 issue types include new fields
- No null or undefined values for required fields
- Category values match taxonomy

---

### 3. Category-Specific Testing

Each category has dedicated testing docs:

| Category          | Testing Doc                                                  |
| ----------------- | ------------------------------------------------------------ |
| metadata          | `docs/testing/issue-engine-full-metadata.md`                 |
| content_entity    | `docs/testing/issue-engine-full-content-and-entities.md`     |
| answerability     | `docs/testing/issue-engine-full-answerability.md`            |
| technical         | `docs/testing/issue-engine-full-crawl-derived.md`            |
| schema_visibility | `docs/testing/issue-engine-full-schema-and-ai-visibility.md` |

**Cross-Category Tests:**

- [ ] Each issue belongs to exactly one category
- [ ] Categories align with issue detection logic
- [ ] No orphan categories (all have at least one issue type)

---

### 4. AI Fixability Testing

See: `docs/testing/issue-engine-full-ai-fix-engine.md`

**Summary Validation:**

- [ ] AI-fixable issues (aiFixable: true) have fixType: 'aiFix'
- [ ] AI-fixable issues have fixCost: 'one_click'
- [ ] Manual issues (aiFixable: false) have appropriate fixCost
- [ ] Sync issues have fixCost: 'one_click' despite aiFixable: false

---

### 5. Content Quality Testing

**whyItMatters Validation:**

- [ ] Each issue has unique whyItMatters text
- [ ] Text explains business impact clearly
- [ ] No technical jargon without explanation
- [ ] Length: 1-3 sentences

**recommendedFix Validation:**

- [ ] Each issue has unique recommendedFix text
- [ ] Text provides actionable guidance
- [ ] AI-fixable issues mention AI/automation
- [ ] Manual issues provide specific steps

---

### 6. Backward Compatibility Testing

**Test:** Ensure existing consumers are unaffected

**Steps:**

1. Call API and verify all existing fields present
2. Verify existing Issue Engine Lite fields work:
   - `type`, `fixType`, `fixReady`, `primaryProductId`
3. Verify Phase 3B aggregated issue fields work:
   - `id`, `title`, `description`, `severity`, `count`

**Expected:**

- All existing functionality preserved
- New fields additive only
- No breaking changes to API contract

---

## Issue Matrix

| Issue ID                    | Category          | aiFixable | fixCost   |
| --------------------------- | ----------------- | --------- | --------- |
| missing_metadata            | metadata          | false     | manual    |
| thin_content                | content_entity    | false     | manual    |
| low_entity_coverage         | schema_visibility | false     | manual    |
| indexability_problems       | technical         | false     | advanced  |
| answer_surface_weakness     | answerability     | false     | manual    |
| brand_navigational_weakness | schema_visibility | false     | advanced  |
| crawl_health_errors         | technical         | false     | advanced  |
| product_content_depth       | content_entity    | false     | manual    |
| missing_seo_title           | metadata          | true      | one_click |
| missing_seo_description     | metadata          | true      | one_click |
| weak_title                  | metadata          | true      | one_click |
| weak_description            | metadata          | true      | one_click |
| missing_long_description    | content_entity    | false     | manual    |
| duplicate_product_content   | content_entity    | true      | one_click |
| low_product_entity_coverage | schema_visibility | true      | one_click |
| not_answer_ready            | answerability     | true      | one_click |
| weak_intent_match           | answerability     | true      | one_click |
| missing_product_image       | technical         | false     | manual    |
| missing_price               | technical         | false     | one_click |
| missing_category            | schema_visibility | false     | one_click |

---

## Regression Testing

### Areas to Verify:

- [ ] Issue detection logic unchanged (same issues detected)
- [ ] Severity calculation unchanged
- [ ] Count accuracy unchanged
- [ ] affectedPages/affectedProducts unchanged
- [ ] Issue Engine Lite fix buttons still work
- [ ] Issues page renders correctly

### Quick Sanity Checks:

- [ ] API returns 200 OK for deo-issues endpoint
- [ ] All issues have required base fields
- [ ] All issues have new IE-2.0 fields
- [ ] TypeScript compilation succeeds
- [ ] No runtime errors in console

---

## Related Documentation

- **Spec:** `docs/deo-issues-spec.md` (Section 8: Issue Engine Full)
- **Types:** `packages/shared/src/deo-issues.ts`
- **Service:** `apps/api/src/projects/deo-issues.service.ts`
- **Critical Path:** `docs/testing/CRITICAL_PATH_MAP.md` (CP-010)

---

## Approval

| Field              | Value                                   |
| ------------------ | --------------------------------------- |
| **Tester Name**    | [Pending]                               |
| **Date**           | [YYYY-MM-DD]                            |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed   |
| **Notes**          | Phase UX-8 – Issue Engine Full (IE-2.0) |
