# EngineO.ai – Manual Testing: AUTOMATION-TRIGGER-TRUTHFULNESS-1

> Manual testing document for AUTOMATION-TRIGGER-TRUTHFULNESS-1 patch.
> Ensures automation triggers are truthful, deterministic, and never fire unexpectedly.

---

## Overview

- **Purpose of the feature/patch:**
  - Ensure automation triggers are truthful and deterministic
  - Page load must NEVER trigger AI generation (no side effects on GET)
  - Sync CTAs must accurately reflect what will happen (label truthfulness)
  - DB-backed idempotency prevents duplicate Answer Block generation

- **High-level user impact and what "success" looks like:**
  - Users see "Sync Products + Generate Answer Blocks" only when the setting is ON AND plan is eligible
  - Page loads (Issues, Products, etc.) never enqueue AI jobs
  - Repeated syncs with unchanged content do not re-trigger AI
  - Failed automation runs can be retried without crashing

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Entry 6.79: AUTOMATION-TRIGGER-TRUTHFULNESS-1

- **Related documentation:**
  - `docs/testing/automation-engine.md` (Scenarios AUT-005 through AUT-008)
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-012 scenarios)

---

## Preconditions

- **Environment requirements:**
  - [ ] API server running (`npm run dev` in apps/api)
  - [ ] Web server running (`npm run dev` in apps/web)
  - [ ] Redis running (`redis-server`) for queue processing
  - [ ] `ENABLE_QUEUE_PROCESSORS` not set to `false`

- **Test accounts and sample data:**
  - [ ] User with `pro` or `business` plan (Answer Block generation requires paid plan)
  - [ ] User with `free` plan (for plan-gating verification)
  - [ ] Project with connected Shopify store
  - [ ] Products synced from Shopify

- **Required user roles or subscriptions:**
  - [ ] OWNER role for Settings page access
  - [ ] Paid plan (pro/business) for Answer Block generation eligibility

---

## Test Scenarios (Happy Path)

### Scenario 1: Page Load Does NOT Trigger AI

**ID:** HP-001

**Preconditions:**
- Project with products exists
- User is logged in

**Steps:**
1. Navigate to `/projects/{projectId}/issues` (DEO Issues page)
2. Monitor API server terminal for logs

**Expected Results:**
- **UI:** Page loads normally with issues displayed
- **API:** No logs containing `[AnswerBlockAutomation] Allowed/enqueued`
- **Logs:** No new entries in `AnswerBlockAutomationRun` table

**Verification Query:**
```sql
SELECT * FROM "AnswerBlockAutomationRun"
WHERE "projectId" = '{projectId}'
ORDER BY "createdAt" DESC
LIMIT 5;
```

---

### Scenario 2: Sync with Setting OFF (Default)

**ID:** HP-002

**Preconditions:**
- Project with Shopify connected
- `autoGenerateAnswerBlocksOnProductSync` is OFF (default)

**Steps:**
1. Navigate to `/projects/{projectId}/settings`
2. Confirm "Generate Answer Blocks on product sync" toggle is OFF
3. Navigate to `/projects/{projectId}/products`
4. Click "Sync Products" button
5. Monitor API server terminal

**Expected Results:**
- **UI:** Button label is "Sync Products" (no "+ Generate Answer Blocks")
- **API:** Log shows `suppressedReason=setting_disabled`
- **Logs:** No entries in `AnswerBlockAutomationRun` table created

**Expected Log Pattern:**
```
[AnswerBlockAutomation] Suppressed: automationType=answer_blocks, trigger=product_synced, projectId=..., productId=..., suppressedReason=setting_disabled
```

---

### Scenario 3: Sync with Setting ON + Eligible Plan

**ID:** HP-003

**Preconditions:**
- User has `pro` or `business` plan
- `autoGenerateAnswerBlocksOnProductSync` is ON

**Steps:**
1. Navigate to `/projects/{projectId}/settings`
2. Enable "Generate Answer Blocks on product sync" toggle
3. Click "Save Changes"
4. Navigate to `/projects/{projectId}/products`
5. Confirm button label shows "+ Generate Answer Blocks"
6. Click "Sync Products + Generate Answer Blocks"
7. Monitor API server terminal

**Expected Results:**
- **UI:** Button label is "Sync Products + Generate Answer Blocks"
- **API:** Log shows `[AnswerBlockAutomation] Allowed/enqueued`
- **Logs:** New row in `AnswerBlockAutomationRun` with `status='QUEUED'`

**Expected Log Pattern:**
```
[AnswerBlockAutomation] Allowed/enqueued: automationType=answer_blocks, trigger=product_synced, projectId=..., productId=..., runId=..., idempotencyHash=...
```

---

### Scenario 4: Double-Sync Idempotency

**ID:** HP-004

**Preconditions:**
- Scenario 3 completed (first sync with setting ON)
- Run status is `SUCCEEDED` or `SKIPPED`

**Steps:**
1. Without changing any product content in Shopify
2. Click "Sync Products + Generate Answer Blocks" again
3. Monitor API server terminal

**Expected Results:**
- **UI:** Sync completes without error
- **API:** Log shows `suppressedReason=idempotent_already_done`
- **Logs:** NO new rows in `AnswerBlockAutomationRun` table (same fingerprint)

**Expected Log Pattern:**
```
[AnswerBlockAutomation] Suppressed: automationType=answer_blocks, trigger=product_synced, projectId=..., productId=..., suppressedReason=idempotent_already_done, existingRunId=..., existingStatus=SUCCEEDED
```

---

### Scenario 5: Content Change Creates New Run

**ID:** HP-005

**Preconditions:**
- Scenario 4 completed (double-sync suppressed)

**Steps:**
1. In Shopify Admin, edit a product title or description
2. Navigate to `/projects/{projectId}/products`
3. Click "Sync Products + Generate Answer Blocks"
4. Monitor API server terminal

**Expected Results:**
- **UI:** Sync completes
- **API:** Log shows `[AnswerBlockAutomation] Allowed/enqueued` with new `idempotencyHash`
- **Logs:** New row in `AnswerBlockAutomationRun` with different `fingerprintHash`

---

### Scenario 6: Playbooks CTA Label Truthfulness

**ID:** HP-006

**Preconditions:**
- Setting ON + paid plan (same as Scenario 3)

**Steps:**
1. Navigate to `/projects/{projectId}/playbooks`
2. Look for any "Sync products" buttons in the UI

**Expected Results:**
- **UI:** Buttons show "Sync products + Generate Answer Blocks" (NOT "Sync to Shopify")
- **Logs:** Toast message says "Products sync triggered." (neutral, no misleading claims)

---

## Edge Cases

### EC-001: Free Plan User with Setting ON

**Description:** Free plan users cannot trigger Answer Block generation even with setting enabled.

**Steps:**
1. As free plan user, enable `autoGenerateAnswerBlocksOnProductSync` in Settings
2. Navigate to Products page
3. Click "Sync Products" button

**Expected Behavior:**
- Button label is "Sync Products" (no "+ Generate Answer Blocks")
- API returns `willGenerateAnswerBlocksOnProductSync: false` in integration-status
- Log shows `suppressedReason=plan_ineligible`

---

### EC-002: Race Condition - Concurrent Sync Triggers

**Description:** Two concurrent sync operations for the same product should not both enqueue.

**Steps:**
1. Trigger two near-simultaneous sync operations (e.g., via two browser tabs)

**Expected Behavior:**
- First trigger creates run record and enqueues
- Second trigger suppresses with `suppressedReason=in_flight`
- No unique constraint violations

---

### EC-003: FAILED Run Retry

**Description:** A previously failed run can be retried by re-syncing.

**Steps:**
1. Have a run in `FAILED` status (e.g., from Redis being down)
2. Sync products again with same content

**Expected Behavior:**
- Existing FAILED run is transitioned back to QUEUED
- Log shows `Retrying FAILED run`
- No new run record created (reuses existing ID)

---

## Error Handling

### ERR-001: Redis Unavailable

**Scenario:** Redis is not running when sync is triggered.

**Steps:**
1. Stop Redis server
2. Enable setting and trigger sync

**Expected Behavior:**
- Run record created with status `QUEUED`
- Run record updated to `FAILED` with `errorMessage: 'Queue unavailable'`
- No crash, graceful degradation

---

### ERR-002: Worker Failure During Processing

**Scenario:** Worker encounters error during Answer Block generation.

**Steps:**
1. Simulate AI service failure (e.g., mock error response)
2. Trigger sync

**Expected Behavior:**
- Run status updated to `FAILED`
- `errorMessage` field populated (truncated to 500 chars)
- `completedAt` timestamp set

---

## Limits

### LIM-001: Free Plan Blocking

**Scenario:** Free plan user attempts to trigger Answer Block generation.

**Steps:**
1. Downgrade to free plan
2. Enable `autoGenerateAnswerBlocksOnProductSync`
3. Sync products

**Expected Behavior:**
- CTA shows "Sync Products" (no mention of Answer Blocks)
- `willGenerateAnswerBlocksOnProductSync` is `false`
- Log shows `suppressedReason=plan_ineligible`

---

## Regression

### Areas potentially impacted:

- [ ] **Products sync flow:** Ensure basic product sync still works regardless of setting
- [ ] **DEO Issues page:** Page load must remain fast (no AI calls)
- [ ] **Settings page:** New toggle integrates with existing save flow
- [ ] **Playbooks page:** Sync buttons function correctly with new labels

### Quick sanity checks:

- [ ] Settings page loads without errors
- [ ] Products page sync button works
- [ ] Playbooks sync CTA triggers product sync
- [ ] Worker processes jobs when Redis is available

---

## Post-Conditions

### Data cleanup steps:

- [ ] Reset `autoGenerateAnswerBlocksOnProductSync` to false if testing in production-like environment
- [ ] Clear test `AnswerBlockAutomationRun` records if needed

### Follow-up verification:

- [ ] Confirm no orphaned run records in QUEUED/RUNNING state
- [ ] Verify Answer Blocks were created for successful runs

---

## Known Issues

- **Intentionally accepted issues:**
  - Run records are retained even after completion (for audit trail)
  - FAILED runs require content change or manual DB reset to clear idempotency

- **Out-of-scope items:**
  - `issue_detected` trigger behavior (unchanged from previous implementation)
  - Answer Block quality/content validation

- **TODOs:**
  - [ ] Add E2E Playwright tests for CTA label assertions
  - [ ] Add API-level idempotency unit tests

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | AUTOMATION-TRIGGER-TRUTHFULNESS-1 manual testing |
