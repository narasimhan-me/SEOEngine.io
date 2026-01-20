# GEO-FOUNDATION-1: Answer Readiness & Citation Confidence - Manual Testing Guide

**Feature:** GEO readiness signals and citation confidence derivation
**Critical Path:** CP-017
**Date:** 2025-12-19

---

## Overview

GEO-FOUNDATION-1 introduces explainable answer readiness signals that evaluate Answer Units (Answer Blocks) against five criteria: Clarity, Specificity, Structure, Context, and Accessibility. These signals are aggregated into a Citation Confidence level (High/Medium/Low).

---

## Prerequisites

### Test Environment Setup

1. Start API and web servers:

   ```bash
   pnpm --filter api dev
   pnpm --filter web dev
   ```

2. Seed test data:

   ```bash
   curl -X POST http://localhost:3001/testkit/e2e/seed-geo-insights-2
   ```

3. Note the returned `accessToken` and `projectId` for testing.

---

## Test Scenarios

### 1. Readiness Signal Evaluation

**Component:** `evaluateGeoAnswerUnit()` in `packages/shared/src/geo.ts`

| Step | Action                                                                           | Expected Result                                            |
| ---- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1    | Create an Answer Block with clear, structured content                            | All 5 signals return `status: 'pass'`                      |
| 2    | Create an Answer Block with a long, unstructured paragraph                       | `structure` signal returns `status: 'needs_improvement'`   |
| 3    | Create an Answer Block with promotional language ("ultimate best", "guaranteed") | Issue `answer_overly_promotional` is generated             |
| 4    | Create an Answer Block with vague content (no specifics)                         | `specificity` signal returns `status: 'needs_improvement'` |

**Unit Test Reference:** `packages/shared/src/geo-types.test.ts`

---

### 2. Citation Confidence Derivation

**Component:** `deriveCitationConfidence()` in `packages/shared/src/geo.ts`

| Step | Action                                               | Expected Result                        |
| ---- | ---------------------------------------------------- | -------------------------------------- |
| 1    | All 5 signals pass                                   | `level: 'high'`                        |
| 2    | 1-2 non-core signals need improvement                | `level: 'medium'`                      |
| 3    | Core signal (clarity or structure) needs improvement | `level: 'low'`                         |
| 4    | No Answer Units exist for product                    | `level: 'low'` with appropriate reason |

---

### 3. Product-Level GEO Evaluation

**Component:** `evaluateGeoProduct()` in `packages/shared/src/geo.ts`

| Step | Action                                              | Expected Result                                          |
| ---- | --------------------------------------------------- | -------------------------------------------------------- |
| 1    | Product with multiple High-confidence Answer Blocks | Product citationConfidence is `high`                     |
| 2    | Product with mixed confidence Answer Blocks         | Product citationConfidence reflects aggregate            |
| 3    | Product with no Answer Blocks                       | `citationConfidence: 'low'`, issue for `no_answer_units` |

---

### 4. GEO Issues Integration

**Integration with Issue Engine**

| Step | Action                           | Expected Result                                      |
| ---- | -------------------------------- | ---------------------------------------------------- |
| 1    | View product with GEO issues     | Issues appear with `pillarId: 'GEO'`                 |
| 2    | GEO issue shows severity badge   | Critical/Warning/Info badge displayed                |
| 3    | GEO issue shows fix guidance     | `recommendedFix` text is actionable                  |
| 4    | Click "Fix with AI" on GEO issue | Routes to product workspace with GEO section focused |

---

### 5. GEO Fix Preview/Apply Flow

**Draft-First Pattern**

| Step | Action                              | Expected Result                            |
| ---- | ----------------------------------- | ------------------------------------------ |
| 1    | Click "Preview" on a GEO issue      | AI generates improvement, draft is created |
| 2    | View the draft                      | Shows improved answer text with diff       |
| 3    | Click "Preview" again on same issue | Cached draft is returned (no AI call)      |
| 4    | Click "Apply"                       | Draft is persisted, no AI call occurs      |
| 5    | Verify AI usage ledger              | Only one AI run recorded (for Preview)     |

**cURL Example (Preview):**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"why_choose_this","issueType":"poor_answer_structure"}' \
  http://localhost:3001/products/$PRODUCT_ID/geo/preview
```

**cURL Example (Apply):**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draftId":"$DRAFT_ID"}' \
  http://localhost:3001/products/$PRODUCT_ID/geo/apply
```

---

### 6. AI Work Key Reuse

**Draft Reuse via aiWorkKey**

| Step | Action                                           | Expected Result                            |
| ---- | ------------------------------------------------ | ------------------------------------------ |
| 1    | Generate preview for product A, question Q1      | Draft created with unique aiWorkKey        |
| 2    | Navigate away and return                         | Same draft is retrievable                  |
| 3    | Generate preview for same product A, question Q1 | Same draft returned (reused)               |
| 4    | Generate preview for different question Q2       | New draft created with different aiWorkKey |

**aiWorkKey Format:** `geo:preview:<projectId>:<productId>:<questionId>:<issueType>:<dateKey>`

---

### 7. Read-Only Invariants

**Critical:** Viewing GEO data never triggers AI or mutations.

| Step | Action                             | Expected Result                             |
| ---- | ---------------------------------- | ------------------------------------------- |
| 1    | Load product page with GEO section | No POST requests to AI endpoints            |
| 2    | View GEO readiness signals         | Data is derived from existing Answer Blocks |
| 3    | Refresh page multiple times        | Same signals returned, no DB writes         |
| 4    | Check AI usage ledger              | No new entries from viewing                 |

---

## Trust Contracts

These invariants MUST be verified:

1. **No Ranking Guarantees**: GEO never claims to guarantee AI engine citations
2. **Explainability**: Every signal includes a `why` explanation
3. **Draft-First**: Preview uses AI, Apply never uses AI
4. **No Hallucination**: Answer content is grounded in product data
5. **Deterministic Work Keys**: Same inputs produce same aiWorkKey

---

## Test Data Expectations

The `seed-geo-insights-2` endpoint creates:

- User with OWNER role
- Project with Shopify integration (Pro plan)
- Products with Answer Blocks of varying quality
- DeoScoreSnapshot records with v2 metadata
- ProductGeoFixDraft records (cached previews)
- ProductGeoFixApplication records (applied fixes)

---

## Related Documents

- [GEO_FOUNDATION.md](../GEO_FOUNDATION.md) - Core GEO concepts
- [GEO_INSIGHTS.md](../GEO_INSIGHTS.md) - GEO Insights derivation
- [CRITICAL_PATH_MAP.md](../testing/CRITICAL_PATH_MAP.md) - CP-017 entry
- [geo.ts](../../packages/shared/src/geo.ts) - Core GEO functions

---

## Document History

| Version | Date       | Changes                                           |
| ------- | ---------- | ------------------------------------------------- |
| 1.0     | 2025-12-19 | Initial manual testing guide for GEO-FOUNDATION-1 |
