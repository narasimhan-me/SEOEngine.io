# EngineO.ai – System-Level Manual Testing: Issue Engine Full - Batch Fixes

> Manual tests for Issue Engine Full (Phase UX-8): Batch fix capabilities and future enhancements.

---

## Overview

- **Purpose of this testing doc:**
  - Document planned batch fix functionality for Issue Engine Full.
  - Validate foundation for future bulk operations.

- **High-level user impact and what "success" looks like:**
  - Users can identify issues suitable for batch fixing.
  - `affectedProducts` array enables future bulk selection.
  - `aiFixable` flag enables future "Fix All with AI" actions.

- **Related phases/sections:**
  - Phase UX-8 (Issue Engine Full)
  - Future: Batch Fix Engine

- **Related documentation:**
  - `packages/shared/src/deo-issues.ts` (DeoIssue type)
  - `apps/api/src/projects/deo-issues.service.ts` (Issue builders)

---

## Current State (Phase UX-8)

### What's Implemented

1. **affectedProducts array**: Up to 20 product IDs per issue
2. **aiFixable flag**: Identifies issues suitable for AI batch processing
3. **fixCost field**: Helps prioritize batch vs. individual fixes
4. **category field**: Enables batch filtering by issue type

### What's Planned (Future)

1. **Bulk AI Fix**: Fix all AI-fixable issues of a type with one click
2. **Batch Selection UI**: Select multiple issues for simultaneous fixing
3. **Progress Tracking**: Real-time progress for batch operations
4. **Undo/Rollback**: Revert batch changes if needed

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database with project having multiple issues

- **Test accounts and sample data:**
  - [ ] Project with 5+ products having the same issue type
  - [ ] Mix of AI-fixable and manual issues

---

## Test Scenarios (Foundation Validation)

### Scenario 1: Multiple affected products tracked

**ID:** BAT-001

**Preconditions:**

- Issue affects more than 20 products

**Steps:**

1. Create project with 25 products missing SEO titles
2. Call `GET /projects/:id/deo-issues`
3. Find `missing_seo_title` issue
4. Examine `affectedProducts` and `count`

**Expected Results:**

- `count: 25` (all affected products)
- `affectedProducts` contains exactly 20 IDs (capped)
- `aiFixable: true` enables future batch processing

---

### Scenario 2: AI-fixable issues grouped by category

**ID:** BAT-002

**Preconditions:**

- Multiple AI-fixable issues exist

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Filter where `aiFixable === true`
3. Group by `category`

**Expected Results:**

- Metadata category has multiple AI-fixable issues
- Answerability category has AI-fixable issues
- Content category has some AI-fixable issues
- Technical category has no AI-fixable issues

---

### Scenario 3: Fix cost enables prioritization

**ID:** BAT-003

**Preconditions:**

- Issues of all fix cost levels exist

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Sort by `fixCost` (one_click first)
3. Verify sorting enables batch prioritization

**Expected Results:**

- `one_click` issues are quick batch candidates
- `manual` issues require individual attention
- `advanced` issues may not be suitable for batching

---

## Future Batch Fix Scenarios (Planned)

### Scenario F-001: Fix All Missing SEO Titles

**Preconditions:**

- Multiple products missing SEO titles

**Steps:**

1. Navigate to Issues Engine page
2. Find "Missing SEO Title" issue
3. Click "Fix All with AI" button
4. Confirm batch operation
5. Wait for completion

**Expected Results:**

- All affected products get AI-generated titles
- Progress indicator shows completion %
- Success toast with count of fixed products
- Issue count drops to 0 or updates

---

### Scenario F-002: Batch Fix by Category

**Preconditions:**

- Multiple issues in same category

**Steps:**

1. Navigate to Issues Engine page
2. Filter by "Metadata" category
3. Select all AI-fixable issues
4. Click "Fix Selected with AI"
5. Confirm batch operation

**Expected Results:**

- All selected issues processed
- Individual progress per issue type
- Summary of fixes applied

---

## Data Structure Support

### Current DeoIssue fields supporting batch operations:

```typescript
interface DeoIssue {
  // Batch identification
  id: string; // Issue type identifier
  count: number; // Total affected items
  affectedProducts?: string[]; // Up to 20 product IDs

  // Batch eligibility
  aiFixable?: boolean; // Can be AI-fixed in batch
  fixCost?: DeoIssueFixCost; // Effort estimation
  category?: DeoIssueCategory; // Grouping for batch selection

  // User guidance
  whyItMatters?: string; // Explains batch impact
  recommendedFix?: string; // Batch fix guidance
}
```

---

## Regression

### Areas potentially impacted:

- [ ] **affectedProducts Cap:** 20 items max per issue
- [ ] **Count Accuracy:** Must match total, not capped list
- [ ] **aiFixable Consistency:** Same value for same issue type

### Quick sanity checks:

- [ ] `count` >= `affectedProducts.length`
- [ ] `affectedProducts` never exceeds 20 items
- [ ] All issues of same type have same `aiFixable` value
- [ ] `fixCost` is consistent per issue type

---

## Known Limitations

- **Current**: Batch fix UI not implemented
- **Current**: No bulk API endpoint
- **Current**: No progress tracking for batch operations
- **Planned**: Full batch fix engine in future phase

---

## Approval

| Field              | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| **Tester Name**    | [Pending]                                               |
| **Date**           | [YYYY-MM-DD]                                            |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                   |
| **Notes**          | Issue Engine Full - Batch Fixes foundation (Phase UX-8) |
