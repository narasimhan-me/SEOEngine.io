# EngineO.ai – System-Level Manual Testing: DEO Score Snapshots

> Cross-cutting manual tests for snapshot creation, version alignment, history behavior, and persistence handling.

---

## Overview

- **Purpose of this testing doc:**
  - Validate DEO score snapshot storage, version tracking, history retrieval, and long-term data accumulation.

- **High-level user impact and what "success" looks like:**
  - Score snapshots are created and persisted reliably.
  - Version information is stored with each snapshot.
  - Historical snapshots are retrievable.
  - Storage scales appropriately over time.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 2.x (DEO scoring)
  - Phase UX-3 (Score history/trends)

- **Related documentation:**
  - `docs/ARCHITECTURE.md` (snapshot storage)
  - `docs/API_SPEC.md` (history endpoints)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database accessible
  - [ ] DEO_SCORE_VERSION set

- **Test accounts and sample data:**
  - [ ] Projects with multiple score computations
  - [ ] Projects with long history (many snapshots)

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario 1: Snapshot created on score computation

**ID:** HP-001

**Preconditions:**
- Project with signals ready for scoring

**Steps:**
1. Trigger score computation
2. Query database for DeoScoreSnapshot
3. Verify snapshot record

**Expected Results:**
- **Snapshot:** New record created
- **Fields:** projectId, overall score, component scores, computedAt, scoreVersion
- **Timing:** computedAt matches computation time

---

### Scenario 2: Snapshot includes version alignment

**ID:** HP-002

**Preconditions:**
- DEO_SCORE_VERSION is set

**Steps:**
1. Compute score
2. Inspect snapshot version field

**Expected Results:**
- **Version:** Matches current DEO_SCORE_VERSION
- **Storage:** Version persisted with snapshot
- **Query:** Can filter/sort by version

---

### Scenario 3: Multiple snapshots create history

**ID:** HP-003

**Preconditions:**
- Project with data that changes over time

**Steps:**
1. Compute score (creates snapshot 1)
2. Change data, recompute (creates snapshot 2)
3. Repeat for snapshot 3
4. Query history

**Expected Results:**
- **History:** 3 distinct snapshots
- **Order:** Chronologically sorted by computedAt
- **Data:** Each snapshot preserves its point-in-time values

---

### Scenario 4: Latest snapshot accessible via API

**ID:** HP-004

**Preconditions:**
- Project with multiple snapshots

**Steps:**
1. Call score API endpoint
2. Verify returns latest snapshot

**Expected Results:**
- **Response:** Contains most recent score
- **Timestamp:** computedAt is most recent
- **Values:** Match latest computation

---

### Scenario 5: Snapshot includes v2 explainability metadata

**ID:** HP-005

**Preconditions:**
- Project with signals ready for scoring (Phase 2.6+)

**Steps:**
1. Trigger score computation
2. Query snapshot from database
3. Inspect `metadata` JSON field

**Expected Results:**
- **metadata.v1:** Contains `modelVersion` ("1.1.0") and `breakdown` (v1 components)
- **metadata.v2:** Contains `modelVersion` ("v2") and `breakdown` (overall + 6 components)
- **metadata.v2.components:** Object with `entityStrength`, `intentMatch`, `answerability`, `aiVisibility`, `contentCompleteness`, `technicalQuality` keys
- **metadata.v2.topOpportunities:** Array of 3 objects with `key`, `score`, `potentialGain`
- **metadata.v2.topStrengths:** Array of 3 objects with `key`, `score`
- **metadata.signals:** Original signal values preserved

---

### Scenario 6: v2 metadata preserved across snapshot history

**ID:** HP-006

**Preconditions:**
- Project with multiple v2-era snapshots

**Steps:**
1. Compute score multiple times
2. Query snapshot history
3. Verify each snapshot has v2 metadata

**Expected Results:**
- **All Snapshots:** Each snapshot contains `metadata.v2` structure
- **Consistency:** v2 model version consistent across snapshots
- **Independence:** Each snapshot's v2 breakdown reflects point-in-time signal values

---

## Edge Cases

### EC-001: First snapshot for new project

**Description:** Project's first-ever score computation.

**Steps:**
1. New project with no history
2. First score computation

**Expected Behavior:**
- Single snapshot created
- History API returns 1 item
- No errors about missing history

---

### EC-002: Snapshot with identical score to previous

**Description:** Recomputation yields same score.

**Steps:**
1. Compute score
2. Recompute without data changes
3. Check snapshots

**Expected Behavior:**
- New snapshot still created (different timestamp)
- Scores may be identical
- History grows (deduplication is optional)

---

### EC-003: Long-term snapshot accumulation

**Description:** Project with many snapshots over time.

**Steps:**
1. Project with 100+ snapshots
2. Query history
3. Check performance

**Expected Behavior:**
- History query performs well (pagination)
- No storage issues
- Archival/cleanup strategy if applicable

---

### EC-004: Snapshot during version transition

**Description:** DEO_SCORE_VERSION changes between snapshots.

**Steps:**
1. Compute with version 1.0
2. Update to version 2.0
3. Compute again

**Expected Behavior:**
- Old snapshots retain version 1.0
- New snapshot has version 2.0
- Both accessible in history

---

## Error Handling

### ERR-001: Snapshot persistence failure

**Scenario:** Cannot write snapshot to database.

**Steps:**
1. Simulate database write failure
2. Attempt score computation

**Expected Behavior:**
- Score computed but not persisted
- Error logged
- User notified of issue
- Retry possible

---

### ERR-002: Snapshot read failure

**Scenario:** Cannot retrieve snapshots from database.

**Steps:**
1. Simulate database read failure
2. Request score history

**Expected Behavior:**
- API returns error gracefully
- No crash
- User sees "Unable to load history"

---

### ERR-003: Corrupted snapshot data

**Scenario:** Snapshot record has invalid/corrupted data.

**Steps:**
1. Introduce corrupted snapshot record
2. Query history

**Expected Behavior:**
- Corrupted record skipped or flagged
- Valid records still returned
- Error logged

---

## Limits

### LIM-001: Snapshot storage limits

**Scenario:** Maximum snapshots per project (if applicable).

**Steps:**
1. Exceed snapshot limit (if one exists)

**Expected Behavior:**
- Oldest snapshots archived or deleted
- Limit enforced gracefully
- User informed if applicable

---

### LIM-002: History query pagination

**Scenario:** Requesting large history sets.

**Steps:**
1. Query history with many records
2. Use pagination parameters

**Expected Behavior:**
- Pagination works correctly
- No performance degradation
- All records accessible

---

## Regression

### Areas potentially impacted:

- [ ] **Score computation:** Ensure computation creates snapshots
- [ ] **Score API:** Ensure API returns correct snapshot
- [ ] **Score UI:** Ensure history/trends display correctly
- [ ] **Data export:** Ensure snapshots exportable if applicable

### Quick sanity checks:

- [ ] Snapshot created on compute
- [ ] Latest score returns current snapshot
- [ ] History shows multiple entries
- [ ] Version stored correctly

---

## Post-Conditions

### Data cleanup steps:

- [ ] Delete test snapshots if needed
- [ ] Reset project history state

### Follow-up verification:

- [ ] Snapshot count accurate
- [ ] No orphaned snapshots

---

## Known Issues

- **Intentionally accepted issues:**
  - Snapshots are immutable; corrections require new computation

- **Out-of-scope items:**
  - Snapshot comparison/diff UI
  - Snapshot export to external systems

- **TODOs:**
  - [ ] Consider snapshot retention policy
  - [ ] Add snapshot integrity checks

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Cross-cutting system-level tests for DEO score snapshots |
