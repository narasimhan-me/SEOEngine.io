# RUNS-1: Async Playbook Runs + Run History

> Manual testing document for the RUNS-1 patch batch implementing async playbook runs with BullMQ queue processing.

---

## Overview

- **Purpose of the feature/patch:**
  - Introduce async execution for automation playbook operations via BullMQ queue
  - Add `AutomationPlaybookRun` model to track run status, type, and results
  - Provide idempotency guarantees to prevent duplicate runs
  - Support inline execution fallback when Redis is unavailable (dev mode)

- **High-level user impact and what "success" looks like:**
  - Users can trigger playbook runs (preview, generate draft, apply) via API
  - Runs are processed asynchronously in the background
  - Users can poll for run status and see run history
  - Duplicate run requests return the existing run (idempotent)

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase AUTO-PB-1.3: Scope Binding and Draft Persistence
  - Phase RUNS-1: Async Playbook Runs

- **Related documentation:**
  - [DOC-AUTO-PB-1.3.md](./DOC-AUTO-PB-1.3.md) - Scope binding and draft persistence
  - [auto-pb-1-3-scope-binding.md](./auto-pb-1-3-scope-binding.md) - Manual testing for scope binding

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running (`pnpm --filter api dev`)
  - [ ] PostgreSQL database running with migrations applied
  - [ ] Redis running (optional - inline execution works without it)
  - [ ] `ENABLE_QUEUE_PROCESSORS=true` (or unset for default)

- **Test accounts and sample data:**
  - [ ] Test user with valid authentication
  - [ ] Test project with products that have missing SEO fields
  - [ ] At least 3 products without `seoTitle` for `missing_seo_title` playbook testing

- **Required user roles or subscriptions:**
  - [ ] Pro plan or higher (for AI generation entitlements)

---

## Test Scenarios (Happy Path)

### Scenario 1: Create PREVIEW_GENERATE Run

**ID:** HP-001

**Preconditions:**

- Project has products with missing SEO titles
- User is authenticated

**Steps:**

1. Send POST request to `/api/projects/:projectId/automation-playbooks/missing_seo_title/runs`
2. Request body:
   ```json
   {
     "runType": "PREVIEW_GENERATE",
     "meta": { "sampleSize": 3 }
   }
   ```
3. Note the returned `runId`
4. Poll GET `/api/projects/:projectId/automation-playbooks/runs/:runId` until status is `SUCCEEDED`

**Expected Results:**

- **UI:** N/A (API only)
- **API:**
  - POST returns 201 with run object containing `id`, `status: "QUEUED"`
  - GET eventually returns `status: "SUCCEEDED"`, `aiUsed: true`, `draftId` populated
- **Logs:**
  - `[AutomationPlaybookRunsService] Created run {runId}`
  - `[AutomationPlaybookRunProcessor] Processing run {runId}`
  - `[AutomationPlaybookRunProcessor] Run {runId} completed successfully (aiUsed=true)`

---

### Scenario 2: Create APPLY Run Using Existing Draft

**ID:** HP-002

**Preconditions:**

- A PREVIEW_GENERATE run has already succeeded (draft exists)
- Use the same `scopeId` and `rulesHash` from the preview

**Steps:**

1. Retrieve the preview run to get `scopeId` and `rulesHash`
2. Send POST request to `/api/projects/:projectId/automation-playbooks/missing_seo_title/runs`
3. Request body:
   ```json
   {
     "runType": "APPLY",
     "scopeId": "{scopeId from preview}",
     "rulesHash": "{rulesHash from preview}"
   }
   ```
4. Poll GET endpoint until status is `SUCCEEDED`

**Expected Results:**

- **UI:** N/A (API only)
- **API:**
  - POST returns 201 with run object
  - GET returns `status: "SUCCEEDED"`, `aiUsed: false` (draft was reused)
- **Logs:**
  - `apply.started { ... usedDraft: true }`
  - `apply.completed { ... aiCalled: false }`

---

### Scenario 3: Idempotency - Duplicate Run Returns Existing

**ID:** HP-003

**Preconditions:**

- No existing run with the same idempotency key

**Steps:**

1. Send POST request with `idempotencyKey: "test-key-123"`
2. Note the returned `runId`
3. Send the same POST request again with same `idempotencyKey`

**Expected Results:**

- **API:**
  - First POST returns 201 with new run
  - Second POST returns 200 with the same `runId`
- **Logs:**
  - First call: `Created run {runId}`
  - Second call: `Returning existing run {runId}`

---

### Scenario 4: List Runs with Filtering

**ID:** HP-004

**Preconditions:**

- Multiple runs exist for the project

**Steps:**

1. Send GET `/api/projects/:projectId/automation-playbooks/runs`
2. Send GET `/api/projects/:projectId/automation-playbooks/runs?playbookId=missing_seo_title`
3. Send GET `/api/projects/:projectId/automation-playbooks/runs?runType=APPLY`
4. Send GET `/api/projects/:projectId/automation-playbooks/runs?limit=5`

**Expected Results:**

- **API:**
  - Returns array of runs sorted by `createdAt` descending
  - Filters are applied correctly
  - Pagination works with `limit` and `offset`

---

## Edge Cases

### EC-001: Run Without Redis (Inline Execution)

**Description:** When Redis is not available, runs execute inline instead of via queue

**Steps:**

1. Stop Redis service
2. Set `ENABLE_QUEUE_PROCESSORS=false`
3. Restart API server
4. Create a PREVIEW_GENERATE run

**Expected Behavior:**

- Run executes synchronously
- Response includes final status immediately (not QUEUED)
- Logs show: `[AutomationPlaybookRunsService] Queue not available, executing inline`

---

### EC-002: Concurrent Duplicate Runs

**Description:** Two simultaneous requests with same idempotency key

**Steps:**

1. Send two POST requests simultaneously with same `idempotencyKey`

**Expected Behavior:**

- Only one run is created
- Both requests return the same `runId`
- No database unique constraint errors leak to client

---

### EC-003: Run with Invalid scopeId for APPLY

**Description:** APPLY run with scopeId that doesn't match current products

**Steps:**

1. Create PREVIEW_GENERATE run
2. Delete or modify products to change the scope
3. Attempt APPLY with the old scopeId

**Expected Behavior:**

- Run transitions to STALE status
- `errorCode: "PLAYBOOK_SCOPE_INVALID"`
- `errorMessage` explains scope mismatch

---

## Error Handling

### ERR-001: AI Service Failure During PREVIEW_GENERATE

**Scenario:** AI provider returns error during metadata generation

**Steps:**

1. Configure AI service to fail (e.g., invalid API key)
2. Create PREVIEW_GENERATE run
3. Poll until status changes

**Expected Behavior:**

- Run status becomes `FAILED`
- `errorCode` contains error type
- `errorMessage` contains details
- No partial data written to draft

---

### ERR-002: Draft Not Found for APPLY

**Scenario:** APPLY run when no draft exists for the scope

**Steps:**

1. Create APPLY run with scopeId/rulesHash that has no existing draft

**Expected Behavior:**

- Run status becomes `STALE`
- `errorCode: "PLAYBOOK_DRAFT_NOT_FOUND"`
- User should regenerate preview first

---

### ERR-003: Rules Hash Mismatch

**Scenario:** APPLY run when rules have changed since preview

**Steps:**

1. Create PREVIEW_GENERATE with rules `{ enabled: true, maxLength: 60 }`
2. Attempt APPLY with different rulesHash

**Expected Behavior:**

- Run status becomes `STALE`
- `errorCode: "PLAYBOOK_RULES_CHANGED"`

---

## Limits

### LIM-001: AI Suggestion Daily Limit

**Scenario:** User exceeds daily AI suggestion limit during PREVIEW_GENERATE

**Steps:**

1. Exhaust daily AI usage limit
2. Create PREVIEW_GENERATE run

**Expected Behavior:**

- Run fails with entitlement error
- `errorCode` indicates limit exceeded
- User prompted to upgrade or wait

---

## Regression

### Areas potentially impacted:

- [ ] **Existing playbook preview flow:** Should continue working (now creates run records)
- [ ] **Existing playbook apply flow:** Should continue working
- [ ] **Draft persistence:** Drafts should still be created and reused correctly
- [ ] **Scope binding:** scopeId computation unchanged

### Quick sanity checks:

- [ ] Preview playbook via existing `/preview` endpoint still works
- [ ] Apply playbook via existing `/apply` endpoint still works
- [ ] Draft items are persisted correctly
- [ ] Multiple projects don't interfere with each other

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test runs from `AutomationPlaybookRun` table
- [ ] Remove test drafts from `AutomationPlaybookDraft` table
- [ ] Reset test product SEO fields if modified

### Follow-up verification:

- [ ] Confirm no orphaned run records
- [ ] Verify queue is empty after tests complete

---

## Known Issues

- **Intentionally accepted issues:**
  - Inline execution fallback is synchronous (acceptable for dev mode)
  - Run history UI not yet implemented (API only in this patch)

- **Out-of-scope items:**
  - Run cancellation (future enhancement)
  - Real-time run progress updates via WebSocket
  - Run retry mechanism

- **TODOs:**
  - [ ] Add run history UI component
  - [ ] Add run status polling in playbook UI
  - [ ] Consider WebSocket for real-time updates

---

## API Reference

### Create Run

```
POST /api/projects/:projectId/automation-playbooks/:playbookId/runs

Body:
{
  "runType": "PREVIEW_GENERATE" | "DRAFT_GENERATE" | "APPLY",
  "scopeId": "string (optional for PREVIEW_GENERATE)",
  "rulesHash": "string (optional for PREVIEW_GENERATE)",
  "idempotencyKey": "string (optional)",
  "meta": { "sampleSize": number, "rules": PlaybookRulesV1 }
}

Response: AutomationPlaybookRun
```

### Get Run

```
GET /api/projects/:projectId/automation-playbooks/runs/:runId

Response: AutomationPlaybookRun
```

### List Runs

```
GET /api/projects/:projectId/automation-playbooks/runs
  ?playbookId=string
  &runType=string
  &scopeId=string
  &limit=number
  &offset=number

Response: AutomationPlaybookRun[]
```

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    |                                       |
| **Date**           |                                       |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          |                                       |
