# EngineO.ai – System-Level Manual Testing: Automation Engine (Framework & Rules)

> Manual tests for the Automation Engine subsystem: Rule model, trigger/evaluation/execution/log lifecycle, and entitlements-aware automation behavior.

---

## Overview

- **Purpose of this testing doc:**
  - Validate the conceptual Automation Engine framework:
    - Rule model and type definitions
    - Trigger → Evaluate → Execute → Log lifecycle
    - Entitlements-based gating
    - Integration points with existing automation suggestions

- **High-level user impact and what "success" looks like:**
  - Automation Engine types are well-defined and compile correctly
  - Framework concepts align with existing automation behavior
  - Entitlements and limits are clearly specified
  - Foundation is ready for implementation phases (AE-2+)

- **Related phases/sections:**
  - Phase AE-1 (Automation Engine Foundations)
  - Phase 12 (Automation Engine Full - future)
  - Phase 17 (Advanced Automations - future)

- **Related documentation:**
  - `packages/shared/src/automation-engine.ts` (Shared types)
  - `docs/AUTOMATION_ENGINE_SPEC.md` (Technical specification)
  - `docs/ENTITLEMENTS_MATRIX.md` (Plan entitlements)
  - `docs/TOKEN_USAGE_MODEL.md` (Token accounting)
  - `docs/CRAWL_PIPELINE.md` (Crawl integration)

- **Note:** In this initial phase, tests are largely conceptual and will become concrete as backend implementations land in AE-2+.

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running (for future functional validation)
  - [ ] Workers running (for automation suggestion behavior)

- **Test accounts and sample data:**
  - [ ] At least one project with products and crawl results
  - [ ] Subscription plan mapping in EntitlementsService (Free/Pro/Business)
  - [ ] Automation suggestions feature working (AutomationService, AutomationSuggestion model)

- **Required documentation in place:**
  - [ ] `packages/shared/src/automation-engine.ts` exists
  - [ ] `docs/AUTOMATION_ENGINE_SPEC.md` exists
  - [ ] Automation Engine types compile without errors

---

## Test Scenarios (Design-Level for AE-1)

### Scenario 1: Shared types match specification

**ID:** AUT-001

**Description:** Verify that shared Automation Engine types align with the spec.

**Steps:**

1. Open `packages/shared/src/automation-engine.ts`
2. Compare types against `docs/AUTOMATION_ENGINE_SPEC.md` Section 4

**Expected Results:**

| Type                        | Code       | Spec       | Match |
| --------------------------- | ---------- | ---------- | ----- |
| `AutomationKind`            | 3 values   | 3 kinds    | [ ]   |
| `AutomationTargetSurface`   | 6 values   | 6 surfaces | [ ]   |
| `AutomationExecutionStatus` | 5 values   | 5 statuses | [ ]   |
| `AutomationRuleId`          | 9 values   | 9 rules    | [ ]   |
| `AutomationRule`            | All fields | Section 4  | [ ]   |
| `AutomationRun`             | All fields | Section 4  | [ ]   |
| `AutomationSettings`        | All fields | Section 4  | [ ]   |

**Verification:**

- [ ] All automation kinds present: `immediate`, `scheduled`, `background`
- [ ] All target surfaces present: `product`, `page`, `answer_block`, `entity`, `project`, `deo_score`
- [ ] All rule IDs map to UEP-described automation types

---

### Scenario 2: Entitlement awareness documented

**ID:** AUT-002

**Description:** Verify that entitlement interactions for automations are specified.

**Steps:**

1. Open `docs/ENTITLEMENTS_MATRIX.md`
2. Find Section 4.4 Automations
3. Verify plan-level automation expectations

**Expected Results:**

| Plan     | Expected Behavior                                     |
| -------- | ----------------------------------------------------- |
| Free     | [ ] Reactive metadata-only, very limited daily cap    |
| Pro      | [ ] Reactive + scheduled, moderate caps, Shopify sync |
| Business | [ ] Full automation suite, higher/uncapped executions |

**Verification:**

- [ ] Basic vs Advanced automation distinction documented
- [ ] Daily cap alignment with `automationSuggestionsPerDay`
- [ ] Token usage reference for AI-powered automations

---

### Scenario 3: Integration with existing automation suggestions

**ID:** AUT-003

**Description:** Confirm that current automation suggestion behavior is documented as v0.

**Steps:**

1. Open `docs/AUTOMATION_ENGINE_SPEC.md`
2. Find references to existing AutomationService and AutomationSuggestion

**Expected Results:**

- [ ] Existing behavior described as "Automation Engine v0"
- [ ] `AutomationService.scheduleSuggestionsForProject` mentioned
- [ ] Trigger after crawl completion documented
- [ ] Relationship to immediate automation rules explained

---

### Scenario 4: Lifecycle documented

**ID:** AUT-004

**Description:** Verify the Trigger → Evaluate → Execute → Log lifecycle is fully documented.

**Steps:**

1. Open `docs/AUTOMATION_ENGINE_SPEC.md` Section 3
2. Verify each stage has clear descriptions

**Expected Results:**

| Stage    | Documented | Complete |
| -------- | ---------- | -------- |
| Trigger  | [ ]        | [ ]      |
| Evaluate | [ ]        | [ ]      |
| Execute  | [ ]        | [ ]      |
| Log      | [ ]        | [ ]      |

**Verification:**

- [ ] Trigger types listed with sources
- [ ] Evaluation checks listed (entitlements, caps, settings, time, safety)
- [ ] Execution delegation to existing services documented
- [ ] Logging fields documented (status, context, snapshots)

---

## Edge Cases

### EC-001: Projects with automation disabled

**Description:** Conceptual behavior when automations are disabled.

**Expected Behavior (once settings exist):**

- Automation evaluation should check `AutomationSettings.enabled`
- If disabled, skip all automations with reason "automation_disabled"
- Log the skip for audit purposes

---

### EC-002: Projects at daily execution cap

**Description:** Behavior when daily automation cap is reached.

**Expected Behavior:**

- Automation evaluation should count today's executions
- If at cap, skip new automations with reason "daily_cap_reached"
- Resume next day when counter resets

---

### EC-003: Entitlement blocks automation category

**Description:** Plan doesn't allow certain automation categories.

**Expected Behavior:**

- Free plan attempting scheduled automation should be blocked
- Skip with reason "entitlement_not_allowed"
- No token usage or AI calls for blocked automations

---

## Error Handling

### ERR-001: Non-destructive behavior on failure

**Scenario:** Automation fails during execution.

**Expected Behavior:**

- Status set to `failed`
- Error logged with details
- No partial data corruption
- Before snapshot available for reference
- User notification (future)

---

### ERR-002: Graceful skip on missing prerequisites

**Scenario:** Automation can't run due to missing data.

**Expected Behavior:**

- Status set to `skipped`
- `reasonSkipped` explains why (e.g., "no_products_to_process")
- No error thrown, just logged skip

---

## Regression

### Areas potentially impacted:

- [ ] **Shared types:** Automation Engine types compile correctly
- [ ] **Existing automation:** AutomationSuggestion behavior unchanged
- [ ] **Entitlements:** No changes to current limit enforcement
- [ ] **Token usage:** No changes to current tracking

### Quick sanity checks:

- [ ] `packages/shared/src/automation-engine.ts` exports all types
- [ ] `pnpm --filter shared build` passes
- [ ] No TypeScript errors in dependent packages
- [ ] Spec document is internally consistent
- [ ] Existing automation suggestions still work

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup required (spec/model phase only)

### Follow-up verification:

- [ ] Types remain stable as implementation proceeds
- [ ] Future AE-2+ phases match conceptual model
- [ ] Entitlement enforcement matches spec when implemented

---

## Known Issues

- **Intentionally accepted limitations:**
  - No Prisma models in Phase AE-1 (deferred to later phases)
  - No API endpoints in Phase AE-1
  - No UI implementation

- **Out-of-scope items:**
  - Actual automation execution logic
  - AutomationRun persistence
  - Automation Center UI

- **TODOs:**
  - [ ] Implement AutomationRule Prisma model (Phase AE-2)
  - [ ] Implement AutomationRun logging (Phase AE-2)
  - [ ] Add Automation Center UI (Phase AE-6)

---

## AUTOMATION-TRIGGER-TRUTHFULNESS-1 (Added 2026-01-20)

### Summary

Automation triggers must be truthful and deterministic:

- **Page load never triggers AI**: The DEO issues GET endpoint is read-only (no side effects)
- **Explicit setting gate**: New `autoGenerateAnswerBlocksOnProductSync` project-level setting (default OFF)
- **DB-backed idempotency**: `AnswerBlockAutomationRun` model tracks fingerprint hashes to prevent duplicate processing
- **Deterministic UI labels**: Sync CTAs show "+ Generate Answer Blocks" only when setting ON AND paid plan

### New Scenarios

#### Scenario AUT-005: Page load does not trigger AI

**ID:** AUT-005

**Description:** Opening the Issues page must not enqueue any AI automation jobs.

**Steps:**

1. Navigate to `/projects/{projectId}/issues`
2. Monitor API server logs

**Expected Results:**

- No `[AnswerBlockAutomation]` or `[Automation] trigger` log entries
- No new rows in `AnswerBlockAutomationRun` table

---

#### Scenario AUT-006: Setting gate for product_synced trigger

**ID:** AUT-006

**Description:** The project-level setting gates Answer Block generation on product sync.

**Steps:**

1. Ensure `autoGenerateAnswerBlocksOnProductSync = false` (default)
2. Sync products from Shopify
3. Check API logs

**Expected Results:**

- Log entry: `suppressedReason=setting_disabled`
- No Answer Block automation jobs enqueued

---

#### Scenario AUT-007: Idempotency via fingerprint hash

**ID:** AUT-007

**Description:** Identical product content should not re-trigger automation.

**Steps:**

1. Enable the setting
2. Sync products (first time)
3. Wait for job to complete (SUCCEEDED/SKIPPED)
4. Sync products again (no changes)

**Expected Results:**

- First sync: Creates `AnswerBlockAutomationRun` with fingerprint hash
- Second sync: Log shows `suppressedReason=idempotent_already_done`
- No duplicate processing

---

#### Scenario AUT-008: CTA label truthfulness

**ID:** AUT-008

**Description:** Sync button labels must accurately reflect what will happen.

| Setting | Plan         | Expected Label                           |
| ------- | ------------ | ---------------------------------------- |
| OFF     | Any          | "Sync Products"                          |
| ON      | free         | "Sync Products"                          |
| ON      | pro/business | "Sync Products + Generate Answer Blocks" |

---

### Related Files

- `apps/api/src/projects/automation.service.ts` - Setting gate + idempotency logic
- `apps/api/src/projects/answer-block-automation.processor.ts` - Worker state management
- `apps/api/prisma/schema.prisma` - `AnswerBlockAutomationRun` model
- `apps/web/src/app/projects/[id]/settings/page.tsx` - Settings toggle
- `apps/web/src/app/projects/[id]/products/page.tsx` - Sync Products CTA
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` - Playbooks Sync CTAs

### Manual Testing Doc

See `docs/manual-testing/AUTOMATION-TRIGGER-TRUTHFULNESS-1.md` for detailed test cases.

---

## Approval

| Field              | Value                                                         |
| ------------------ | ------------------------------------------------------------- |
| **Tester Name**    | [Pending]                                                     |
| **Date**           | [YYYY-MM-DD]                                                  |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                         |
| **Notes**          | Automation Engine system-level testing (Phase AE-1 Framework) |
