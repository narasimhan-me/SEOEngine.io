# CACHE/REUSE v2: Deterministic Reuse for Preview/Draft Runs

> Manual testing document for the CACHE/REUSE v2 patch batch implementing deterministic AI work reuse for Automation Playbooks.

---

## Overview

- **Purpose of the feature/patch:**
  - Reduce AI cost by reusing identical AI work when inputs are unchanged
  - Add aiWorkKey, reused, reusedFromRunId fields to AutomationPlaybookRun model
  - Track reusedRuns and aiRunsAvoided in the AI usage ledger
  - Display "AI runs avoided" trust signal on the Playbooks page

- **High-level user impact and what "success" looks like:**
  - When a user regenerates a preview with the same products and rules, AI is not called again
  - The ledger shows reused runs and AI runs avoided
  - Users see "AI runs avoided (reused)" in the usage summary chip when applicable

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase CACHE/REUSE v2: Deterministic Reuse for Preview/Draft Runs
  - Phase AI-USAGE-1: AI Usage Ledger & Reuse (dependency)
  - Phase RUNS-1: Async Playbook Runs (dependency)

- **Related documentation:**
  - [AI-USAGE-1.md](./AI-USAGE-1.md) - AI usage ledger and visibility
  - [AI-USAGE-v2.md](./AI-USAGE-v2.md) - Plan-aware quotas
  - [DOC-AUTO-PB-1.3.md](./DOC-AUTO-PB-1.3.md) - Draft lifecycle and Apply contract

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running (`pnpm --filter api dev`)
  - [ ] PostgreSQL database running with migrations applied
  - [ ] Frontend web app running (`pnpm --filter web dev`)

- **Test accounts and sample data:**
  - [ ] Test user with valid authentication
  - [ ] Test project with products that have missing SEO fields
  - [ ] Pro plan subscription (for AI generation entitlements)

- **Required user roles or subscriptions:**
  - [ ] Pro plan or higher

---

## Test Scenarios (Happy Path)

### Scenario 1: aiWorkKey Determinism

**ID:** HP-001

**Preconditions:**
- User has a project with products missing SEO titles

**Steps:**
1. Navigate to Playbooks page (`/projects/:id/automation/playbooks`)
2. Select "Fix missing SEO titles" playbook
3. Click "Generate preview (uses AI)"
4. Note the run ID from the response
5. Without changing products or rules, click "Regenerate preview (uses AI)"
6. Check both runs in the database

**Expected Results:**
- **Database:**
  - Both runs have the same `aiWorkKey` value
  - First run: `aiUsed=true`, `reused=false`
  - Second run: `aiUsed=false`, `reused=true`, `reusedFromRunId=<first run id>`

---

### Scenario 2: AI Reuse on Identical Inputs

**ID:** HP-002

**Preconditions:**
- Scenario 1 completed (first run exists)

**Steps:**
1. Trigger the same preview again (same products, same rules)
2. Check the AI service mock/logs

**Expected Results:**
- **Logs:**
  - "[AutomationPlaybookRunProcessor] Run ${runId} reusing AI work from run ${originalRunId}"
- **API:**
  - No new AI provider calls
  - Preview returns successfully with draft from original run

---

### Scenario 3: Ledger Reuse Metrics

**ID:** HP-003

**Preconditions:**
- At least one reused run exists

**Steps:**
1. Call `GET /ai/projects/:projectId/usage/summary`
2. Examine the response

**Expected Results:**
- **API:**
  - `reusedRuns >= 1`
  - `aiRunsAvoided >= 1`
  - `aiRunsAvoided` equals `reusedRuns`

---

### Scenario 4: UI Trust Signal

**ID:** HP-004

**Preconditions:**
- At least one reused run exists for the current month

**Steps:**
1. Navigate to Playbooks page
2. Observe the AI usage summary chip

**Expected Results:**
- **UI:**
  - Summary chip shows "AI runs avoided (reused): N" in green text
  - Where N is the count of reused runs

---

### Scenario 5: Different Rules Trigger New AI Call

**ID:** HP-005

**Preconditions:**
- Preview has been generated with default rules

**Steps:**
1. Change rules (e.g., add a prefix "Buy Now: ")
2. Click "Regenerate preview (uses AI)"
3. Check the run in the database

**Expected Results:**
- **Database:**
  - New run has different `aiWorkKey` than original
  - `aiUsed=true`, `reused=false`
- **Logs:**
  - AI provider was called (no reuse)

---

### Scenario 6: Different Products Trigger New AI Call

**ID:** HP-006

**Preconditions:**
- Preview has been generated for products A, B

**Steps:**
1. Add a new product C that qualifies for the playbook
2. Click "Regenerate preview (uses AI)"
3. Check the run in the database

**Expected Results:**
- **Database:**
  - New run has different `aiWorkKey` (product set changed)
  - `aiUsed=true`, `reused=false`

---

## Edge Cases

### EC-001: No Reusable Run Exists

**Description:** First run for a given aiWorkKey

**Steps:**
1. Create a new project with new products
2. Generate first preview

**Expected Behavior:**
- Run proceeds normally with AI call
- `aiUsed=true`, `reused=false`
- `aiWorkKey` is computed and stored

---

### EC-002: Original Run Failed

**Description:** Prior run with same aiWorkKey exists but failed

**Steps:**
1. Simulate a failed run with a specific aiWorkKey
2. Trigger a new run with same inputs

**Expected Behavior:**
- New run does NOT reuse failed run
- AI is called fresh
- `reused=false`

---

### EC-003: Original Run Was Already Reused

**Description:** Prior run was itself a reused run

**Steps:**
1. Create original run (aiUsed=true, reused=false)
2. Create first reuse (aiUsed=false, reused=true, reusedFromRunId=original)
3. Trigger another run with same inputs

**Expected Behavior:**
- Third run reuses the ORIGINAL run, not the second reused run
- `reusedFromRunId` points to the original, not the middle run

---

## Error Handling

### ERR-001: Reuse Lookup Failure

**Scenario:** Database query fails during reuse lookup

**Steps:**
1. Simulate database failure during findFirst for reuse lookup
2. Trigger preview generation

**Expected Behavior:**
- Run proceeds with fresh AI call (fallback behavior)
- No crash or user-visible error

---

## Limits

### LIM-001: Reuse Only for PREVIEW_GENERATE and DRAFT_GENERATE

**Scenario:** Verify APPLY runs are not subject to reuse logic

**Scope:**
- **Applies To:**
  - PREVIEW_GENERATE runs
  - DRAFT_GENERATE runs
- **Does NOT Apply To:**
  - APPLY runs (always draft-based, no AI)

**Expected Behavior:**
- APPLY runs never have `reused=true`
- APPLY runs never have `aiWorkKey`

---

## Regression

### Areas potentially impacted:

- [ ] **Preview playbook flow:** Should work; now supports reuse
- [ ] **Draft generation flow:** Should work; now supports reuse
- [ ] **Apply flow:** Unchanged (still AI-free)
- [ ] **AI Usage Summary:** Now includes reuse metrics
- [ ] **Quota enforcement:** Unchanged (reused runs don't count against quota since aiUsed=false)

### Quick sanity checks:

- [ ] Generate preview via Playbooks UI - verify it works
- [ ] Regenerate same preview - verify reuse occurs (check logs)
- [ ] AI usage summary shows "AI runs avoided" when applicable
- [ ] Apply works regardless of reuse state

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test AutomationPlaybookRun records if needed
- [ ] Reset test product SEO fields if modified

### Follow-up verification:

- [ ] Confirm no orphaned run records
- [ ] Verify ledger summary includes reuse metrics

---

## Known Issues

- **Intentionally accepted issues:**
  - Reuse lookup adds one database query per run (negligible latency)
  - aiWorkKey is computed synchronously (fast SHA-256)

- **Out-of-scope items:**
  - Cross-project reuse (each project is isolated)
  - TTL-based cache expiration (reuse is permanent for same inputs)
  - UI indicator on individual runs showing "reused"

- **TODOs:**
  - [ ] Consider adding "reused" badge to run history UI
  - [ ] Consider analytics for reuse rate

---

## Key Contracts

### Contract 1: aiWorkKey Determinism
- **Rule:** Same (playbookId, productIds, rules) always produces the same aiWorkKey
- **Verification:** productIds are sorted before hashing
- **Invariant:** SHA-256 hash is deterministic

### Contract 2: Reuse Only from Original Runs
- **Rule:** Reused runs reference original AI runs, not other reused runs
- **Verification:** `findReusableRun` filters by `reused=false`
- **Invariant:** Chain depth is always 1 (original -> reused)

### Contract 3: Ledger Accuracy
- **Rule:** `aiRunsAvoided` equals `reusedRuns`
- **Verification:** Both are derived from counting `reused=true` runs
- **Invariant:** Metrics are always consistent

---

## API Reference

### Get Usage Summary (with reuse metrics)
```
GET /ai/projects/:projectId/usage/summary

Response:
{
  "projectId": "...",
  "periodStart": "2025-12-01T00:00:00.000Z",
  "periodEnd": "2025-12-31T23:59:59.999Z",
  "totalRuns": 10,
  "totalAiRuns": 5,
  "previewRuns": 6,
  "draftGenerateRuns": 2,
  "applyRuns": 2,
  "applyAiRuns": 0,
  "reusedRuns": 3,
  "aiRunsAvoided": 3
}
```

### Get Usage Runs (with reuse fields)
```
GET /ai/projects/:projectId/usage/runs
  ?runType=PREVIEW_GENERATE|DRAFT_GENERATE|APPLY
  &limit=20

Response:
[
  {
    "runId": "...",
    "runType": "PREVIEW_GENERATE",
    "status": "SUCCEEDED",
    "aiUsed": false,
    "reused": true,
    "reusedFromRunId": "...",
    "aiWorkKey": "abc123...",
    "scopeId": "...",
    "rulesHash": "...",
    "createdAt": "2025-12-17T12:00:00.000Z"
  }
]
```

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | |
| **Date** | |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | CACHE/REUSE v2 deterministic AI work reuse |
