# EngineO.ai – Phase 2.6 Manual Testing: DEO Score v2 Explainability

> Manual testing checklist for DEO Score v2 explainability layer implementation.

---

## Overview

- **Purpose of this testing doc:**
  - Validate that the DEO Score v2 explainability layer is computed correctly alongside v1 and stored in snapshot metadata.

- **High-level user impact and what "success" looks like:**
  - DEO Score v1 remains the canonical score (no user-facing changes to score display).
  - v2 breakdown is computed and stored, providing the foundation for future explainability UI.
  - Top opportunities and top strengths are derived from v2 components.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 2.6 – DEO Score v2 Explainability

- **Related documentation:**
  - `docs/deo-score-spec.md` (DEO Score v2 section)
  - `docs/testing/deo-score-compute-pipeline.md` (HP-005, HP-006)
  - `docs/testing/deo-score-snapshots.md` (HP-005, HP-006)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database accessible
  - [ ] Redis available for DEO queue

- **Test accounts and sample data:**
  - [ ] Project with complete crawl and product data
  - [ ] Project with partial data (some signals missing)

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario 1: v2 breakdown computed on score recompute

**ID:** HP-001

**Preconditions:**

- Project with existing signals

**Steps:**

1. Trigger DEO score recompute (via UI button or API endpoint)
2. Wait for job to complete
3. Query the latest DeoScoreSnapshot from database

**Expected Results:**

- [ ] `overall` field contains v1 canonical score (0-100)
- [ ] `metadata` JSON field is populated
- [ ] `metadata.v2` object present with:
  - [ ] `modelVersion` = "v2"
  - [ ] `breakdown.overall` in range [0, 100]
  - [ ] `breakdown.entityStrength` in range [0, 100]
  - [ ] `breakdown.intentMatch` in range [0, 100]
  - [ ] `breakdown.answerability` in range [0, 100]
  - [ ] `breakdown.aiVisibility` in range [0, 100]
  - [ ] `breakdown.contentCompleteness` in range [0, 100]
  - [ ] `breakdown.technicalQuality` in range [0, 100]

---

### Scenario 2: Top opportunities derived correctly

**ID:** HP-002

**Preconditions:**

- Project with varying component scores

**Steps:**

1. Trigger score computation
2. Inspect `metadata.v2.topOpportunities` in snapshot

**Expected Results:**

- [ ] `topOpportunities` is an array of exactly 3 items
- [ ] Each item has `key`, `score`, and `potentialGain` fields
- [ ] Items are sorted by `potentialGain` descending (highest potential first)
- [ ] `potentialGain` = 100 - score for each item

---

### Scenario 3: Top strengths derived correctly

**ID:** HP-003

**Preconditions:**

- Project with varying component scores

**Steps:**

1. Trigger score computation
2. Inspect `metadata.v2.topStrengths` in snapshot

**Expected Results:**

- [ ] `topStrengths` is an array of exactly 3 items
- [ ] Each item has `key` and `score` fields
- [ ] Items are sorted by `score` descending (highest score first)

---

### Scenario 4: v1 metadata preserved for backward compatibility

**ID:** HP-004

**Preconditions:**

- Project with signals

**Steps:**

1. Trigger score computation
2. Inspect `metadata.v1` in snapshot

**Expected Results:**

- [ ] `metadata.v1` object present with:
  - [ ] `modelVersion` = "1.1.0" (DEO_SCORE_VERSION)
  - [ ] `breakdown` object with v1 component scores (content, technical, entityRelevance, visibility)

---

### Scenario 5: Signals preserved in metadata

**ID:** HP-005

**Preconditions:**

- Project with signals

**Steps:**

1. Trigger score computation
2. Inspect `metadata.signals` in snapshot

**Expected Results:**

- [ ] `metadata.signals` object contains all DeoScoreSignals
- [ ] Signal values match what was computed by DeoSignalsService

---

## Edge Cases

### EC-001: v2 components with zero signals

**Description:** Some signals are 0 or missing.

**Steps:**

1. Project with minimal data (few pages, no products)
2. Trigger score computation

**Expected Behavior:**

- [ ] v2 components still computed (may be low values)
- [ ] No NaN or undefined values in breakdown
- [ ] All components in valid [0, 100] range

---

### EC-002: v2 component weights sum correctly

**Description:** Verify weighted overall matches component sum.

**Steps:**

1. Trigger score computation
2. Calculate expected overall from components:
   - entityStrength × 0.2 + intentMatch × 0.2 + answerability × 0.2 + aiVisibility × 0.2 + contentCompleteness × 0.15 + technicalQuality × 0.05

**Expected Behavior:**

- [ ] `breakdown.overall` matches calculated weighted sum (rounded to integer)

---

## Error Handling

### ERR-001: v2 computation failure does not block v1

**Scenario:** If v2 computation logic has an error.

**Expected Behavior:**

- [ ] v1 score is still computed and persisted
- [ ] Error logged but job completes
- [ ] Snapshot saved with v1 data (v2 may be missing or partial)

---

## Regression

### Areas potentially impacted:

- [ ] **DEO Score computation:** v1 score values should be unchanged
- [ ] **Score API response:** `overall` field still returns v1 score
- [ ] **Score UI:** Dashboard displays v1 score (no v2 UI in this phase)
- [ ] **Snapshot storage:** metadata field structure is additive

### Quick sanity checks:

- [ ] DEO score recompute button still works
- [ ] Score appears in UI with expected v1 value
- [ ] No errors in API logs during computation
- [ ] E2E tests pass with v2 assertions

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup required (v2 metadata is additive)

### Follow-up verification:

- [ ] Snapshots contain v2 metadata
- [ ] No v1 regressions in score values

---

## Known Issues

- **Intentionally accepted issues:**
  - v2 is not exposed in UI in this phase (metadata-only)
  - Top opportunities/strengths limited to top 3 items

- **Out-of-scope items:**
  - v2 UI components and displays
  - v2-based recommendations engine
  - Historical v2 trend analysis

- **TODOs:**
  - [ ] Phase 2.7+: Add v2 explainability UI components
  - [ ] Future: v2-based issue generation

---

## Approval

| Field              | Value                                       |
| ------------------ | ------------------------------------------- |
| **Tester Name**    | [Pending]                                   |
| **Date**           | [YYYY-MM-DD]                                |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed       |
| **Notes**          | Phase 2.6 DEO Score v2 explainability layer |
