# EngineO.ai – System-Level Manual Testing: DEO Score Compute Pipeline

> Cross-cutting manual tests for DEO score computation, versioning, partial signals handling, and failure recovery.

---

## Overview

- **Purpose of this testing doc:**
  - Validate the DEO score computation pipeline that transforms collected signals into the overall DEO score and component scores.

- **High-level user impact and what "success" looks like:**
  - DEO scores are computed accurately from signals.
  - Score versioning (DEO_SCORE_VERSION) is respected.
  - Partial signals produce valid (possibly partial) scores.
  - Computation failures are handled with recovery options.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 2.x (DEO scoring)
  - Phase UX-3 (DEO Score visualization)

- **Related documentation:**
  - `docs/ARCHITECTURE.md` (scoring algorithm)
  - `docs/API_SPEC.md` (score endpoints)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database with signals data
  - [ ] DEO_SCORE_VERSION environment variable set

- **Test accounts and sample data:**
  - [ ] Projects with complete signals
  - [ ] Projects with partial signals
  - [ ] Projects with no signals (edge case)

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario 1: Full score computation from complete signals

**ID:** HP-001

**Preconditions:**
- Project has all required signals populated

**Steps:**
1. Ensure project has complete crawl and product data
2. Trigger score computation (manual or automatic)
3. Fetch computed score

**Expected Results:**
- **Overall Score:** 0-100 value computed
- **Components:** Content, Technical, Entity, Visibility scores populated
- **Database:** DeoScoreSnapshot created with version
- **API:** Score endpoint returns computed values

---

### Scenario 2: Score computation includes version tracking

**ID:** HP-002

**Preconditions:**
- DEO_SCORE_VERSION is set (e.g., "1.0.0")

**Steps:**
1. Compute score
2. Inspect stored snapshot

**Expected Results:**
- **Snapshot:** Contains `scoreVersion` field
- **Value:** Matches current DEO_SCORE_VERSION
- **History:** Different versions distinguishable

---

### Scenario 3: Score recomputation updates values

**ID:** HP-003

**Preconditions:**
- Project has existing score
- Site/data has changed

**Steps:**
1. Note current score
2. Update site or sync new data
3. Trigger recomputation
4. Compare new score

**Expected Results:**
- **New Score:** Reflects updated data
- **Snapshot:** New snapshot created
- **History:** Previous snapshot preserved

---

### Scenario 4: Component scores contribute to overall

**ID:** HP-004

**Preconditions:**
- Project with complete signals

**Steps:**
1. Compute score
2. Review component breakdown

**Expected Results:**
- **Components:** Content, Technical, Entity, Visibility each scored
- **Overall:** Weighted combination of components
- **Weights:** Applied according to algorithm

---

### Scenario 5: DEO Score v2 explainability layer computed alongside v1

**ID:** HP-005

**Preconditions:**
- Project with complete signals

**Steps:**
1. Trigger score computation
2. Inspect snapshot metadata for v2 breakdown

**Expected Results:**
- **v1 Score:** Canonical score computed and persisted as `overall`
- **v2 Breakdown:** Computed and stored in `metadata.v2.breakdown`
- **v2 Components:** Six components present (entityStrength, intentMatch, answerability, aiVisibility, contentCompleteness, technicalQuality)
- **Model Version:** `metadata.v2.modelVersion` equals "v2"
- **Top Opportunities:** `metadata.v2.topOpportunities` array with 3 lowest-scoring components
- **Top Strengths:** `metadata.v2.topStrengths` array with 3 highest-scoring components

---

### Scenario 6: v2 component scores in valid range

**ID:** HP-006

**Preconditions:**
- Project with varying signal values

**Steps:**
1. Compute score for projects with different signal profiles
2. Verify v2 component scores

**Expected Results:**
- **All Components:** Each v2 component score in range [0, 100]
- **Overall v2:** Weighted sum of components in range [0, 100]
- **Weights Applied:** entityStrength (0.2), intentMatch (0.2), answerability (0.2), aiVisibility (0.2), contentCompleteness (0.15), technicalQuality (0.05)

---

## Edge Cases

### EC-001: Score computation with partial signals

**Description:** Some signals missing, others present.

**Steps:**
1. Project with incomplete data (e.g., no products but has crawl)
2. Trigger score computation

**Expected Behavior:**
- Score computed from available signals
- Missing components marked as N/A or computed with defaults
- User informed of incomplete score

---

### EC-002: Score computation with zero signals

**Description:** No signals available for project.

**Steps:**
1. New project with no crawl or products
2. Attempt score computation

**Expected Behavior:**
- No score computed (or score of 0/N/A)
- Clear indication that data is needed
- No crash or error

---

### EC-003: Score at boundary values

**Description:** Signals that would produce 0 or 100 overall score.

**Steps:**
1. Perfect site with all signals at maximum
2. Site with all signals at minimum
3. Compute scores

**Expected Behavior:**
- Scores properly bounded (0-100)
- No overflow or underflow
- Edge values displayed correctly

---

### EC-004: Rapid successive recomputations

**Description:** Multiple recompute requests in quick succession.

**Steps:**
1. Trigger recompute multiple times rapidly

**Expected Behavior:**
- Requests handled (queued or deduplicated)
- No duplicate snapshots for same data state
- System remains stable

---

## Error Handling

### ERR-001: Computation failure mid-process

**Scenario:** Error occurs during score calculation.

**Steps:**
1. Simulate computation error (e.g., invalid signal value)

**Expected Behavior:**
- Computation fails gracefully
- Previous score preserved
- Error logged with context
- User can retry

---

### ERR-002: Database write failure for snapshot

**Scenario:** Cannot persist computed score.

**Steps:**
1. Simulate database unavailability during save

**Expected Behavior:**
- Score computation completes
- Save failure logged
- Retry mechanism or user notification
- Score can be recomputed

---

### ERR-003: Version mismatch handling

**Scenario:** Score version changes between computations.

**Steps:**
1. Compute score with version 1.0
2. Update DEO_SCORE_VERSION to 2.0
3. View historical scores

**Expected Behavior:**
- Old scores retain their version
- New computations use new version
- API handles version comparison

---

## Limits

### LIM-001: Score precision

**Scenario:** Score values should have appropriate precision.

**Expected Behavior:**
- Overall score: Integer or 1 decimal place
- Component scores: Consistent precision
- No floating point artifacts displayed

---

### LIM-002: Computation frequency limits

**Scenario:** Rate limiting on score recomputation.

**Steps:**
1. Attempt many recomputations in short period

**Expected Behavior:**
- Rate limit enforced if applicable
- Clear messaging about limits
- Automatic computation not affected

---

## Regression

### Areas potentially impacted:

- [ ] **Signals collection:** Ensure signals feed into computation
- [ ] **Score API:** Ensure endpoint returns computed scores
- [ ] **Score UI:** Ensure visualization renders correctly
- [ ] **Snapshots:** Ensure history preserved

### Quick sanity checks:

- [ ] Score computes after crawl
- [ ] Score appears in UI
- [ ] Component breakdown visible
- [ ] Recompute button works

---

## Post-Conditions

### Data cleanup steps:

- [ ] Reset test project scores if needed
- [ ] Clear test snapshots

### Follow-up verification:

- [ ] Scores consistent with signals
- [ ] Snapshots properly versioned

---

## Known Issues

- **Intentionally accepted issues:**
  - Score algorithm may be refined over time; historical scores use their original version

- **Out-of-scope items:**
  - Score prediction/forecasting
  - Comparative scoring across projects

- **TODOs:**
  - [ ] Add score computation audit logging
  - [ ] Consider score caching strategy

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Cross-cutting system-level tests for DEO score computation |
