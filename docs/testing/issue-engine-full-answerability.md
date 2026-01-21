# EngineO.ai – System-Level Manual Testing: Issue Engine Full - Answerability Issues

> Manual tests for Issue Engine Full (Phase UX-8): Answerability issues with enriched fields.

---

## Overview

- **Purpose of this testing doc:**
  - Validate that answerability-related issues include correct Issue Engine Full enrichment fields.

- **High-level user impact and what "success" looks like:**
  - Answerability issues (not answer-ready, weak intent match) display `whyItMatters` and `recommendedFix` guidance.
  - Issues correctly marked as `aiFixable: true` for AI-optimizable content.
  - `fixCost: 'one_click'` for quick AI fixes.

- **Related phases/sections:**
  - Phase UX-8 (Issue Engine Full)
  - Phase UX-7 (Issue Engine Lite)

- **Related documentation:**
  - `packages/shared/src/deo-issues.ts` (DeoIssue type)
  - `apps/api/src/projects/deo-issues.service.ts` (Issue builders)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database with test project and products

- **Test accounts and sample data:**
  - [ ] Project with products that have:
    - Total content < 80 words (description + seoDescription)
    - Unoptimized titles (seoTitle = product title)
    - Short generic descriptions

---

## Test Scenarios (Happy Path)

### Scenario 1: Not Answer-Ready issue enrichment

**ID:** ANS-001

**Preconditions:**

- Products with insufficient content for AI answers

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'not_answer_ready'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'answerability'`
- **whyItMatters:** Explanation about AI assistants skipping thin content
- **recommendedFix:** Guidance about Q&A-style content enhancement
- **aiFixable:** `true`
- **fixCost:** `'one_click'`

---

### Scenario 2: Weak Intent Match issue enrichment

**ID:** ANS-002

**Preconditions:**

- Products with metadata not matching search intent

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'weak_intent_match'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'answerability'`
- **whyItMatters:** Explanation about appearing for wrong queries
- **recommendedFix:** Guidance about AI optimization for intent
- **aiFixable:** `true`
- **fixCost:** `'one_click'`

---

### Scenario 3: Answer Surface Weakness issue enrichment

**ID:** ANS-003

**Preconditions:**

- Pages with word count < 400 or missing H1

**Steps:**

1. Call `GET /projects/:id/deo-issues`
2. Find issue with `id: 'answer_surface_weakness'`
3. Examine enrichment fields

**Expected Results:**

- **category:** `'answerability'`
- **whyItMatters:** Explanation about featured snippets and AI answers
- **recommendedFix:** Guidance about long-form content with headings
- **aiFixable:** `false`
- **fixCost:** `'manual'`

---

## Edge Cases

### EC-001: Products with exactly 80 words total

**Description:** Products at the boundary threshold.

**Steps:**

1. Create product with description (40 words) + seoDescription (40 words)
2. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**

- Product should NOT trigger `not_answer_ready` (threshold is < 80)

---

### EC-002: All products answer-ready

**Description:** Project with comprehensive content.

**Steps:**

1. Create products with 100+ word descriptions and optimized titles
2. Call `GET /projects/:id/deo-issues`

**Expected Behavior:**

- No answerability category issues for products
- May still have page-level answer surface issues

---

## Regression

### Areas potentially impacted:

- [ ] **DeoIssuesService:** Answerability builders include new fields
- [ ] **Word Count Calculation:** Consistent across all issues
- [ ] **Intent Match Detection:** Title comparison logic

### Quick sanity checks:

- [ ] `not_answer_ready` has category `'answerability'`
- [ ] `weak_intent_match` has category `'answerability'`
- [ ] Both product-level answerability issues are `aiFixable: true`
- [ ] Page-level answer surface weakness is `aiFixable: false`

---

## Approval

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| **Tester Name**    | [Pending]                                             |
| **Date**           | [YYYY-MM-DD]                                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                 |
| **Notes**          | Issue Engine Full - Answerability issues (Phase UX-8) |
