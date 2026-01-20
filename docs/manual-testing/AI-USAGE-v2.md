# AI-USAGE v2: Plan-Aware AI Quota Enforcement (Automation Playbooks)

> Manual testing document for the AI-USAGE v2 patch batch implementing plan-aware monthly AI quotas, predictive warnings, and hard guards for Automation Playbooks.

---

## Overview

- **Purpose of the feature/patch:**
  - Extend AI-USAGE-1 (ledger + visibility) with plan-aware, monthly AI quotas for Automation Playbooks.
  - Provide a predictive UX guard that warns users before they hit limits and blocks new AI runs only when hard enforcement is enabled.
  - Ensure quotas are derived from the AI usage ledger (AutomationPlaybookRun) rather than ad-hoc counters.
  - Preserve trust contracts: Apply remains AI-free, drafts/resume continue to work even at 0 quota.

- **High-level user impact and what "success" looks like:**
  - Users see clear, plan-aware warnings as they approach their monthly Automation Playbooks AI quota.
  - When hard enforcement is enabled and the quota is exceeded, new previews/drafts are blocked with a clear, actionable message.
  - Draft reuse and Apply continue to work even when no additional AI quota is available.
  - Quota resets follow calendar month semantics via the existing ledger window.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase AI-USAGE-1: AI Usage Ledger & Reuse (dependency)
  - Phase RUNS-1: Async Playbook Runs & History (dependency)
  - Phase AUTO-PB-1.3: Scope Binding and Draft Persistence (dependency)
  - Phase AI-USAGE v2: Plan-Aware AI Quota Enforcement (this doc)

- **Related documentation:**
  - docs/manual-testing/AI-USAGE-1.md
  - docs/auto/auto-pb-1.3-preview-persistence.md
  - docs/manual-testing/auto-pb-1-3-ux-1-resume-and-gating.md
  - docs/testing/billing-and-limits.md
  - docs/testing/ai-systems.md

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running with queue processors disabled or enabled (both paths should respect quotas).
  - [ ] PostgreSQL database with migrations applied.
  - [ ] Frontend web app running (`pnpm --filter web dev`).
  - [ ] The following environment variables set for test runs:
    - `AI_USAGE_MONTHLY_RUN_LIMIT_PRO` (e.g., `10`)
    - `AI_USAGE_SOFT_THRESHOLD_PERCENT` (e.g., `80`)
    - `AI_USAGE_HARD_ENFORCEMENT_PRO` (`true` for hard-enforcement scenarios, unset/`false` otherwise)

- **Test accounts and sample data:**
  - [ ] Test user on Pro plan (active subscription).
  - [ ] Test project with products missing SEO titles/descriptions for Automation Playbooks.

- **Required user roles or subscriptions:**
  - [ ] Pro plan user (hard enforcement scenarios use Pro plan in tests).

---

## Test Scenarios (Happy Path)

### Scenario 1: Soft Warning at 80% Monthly Usage (Preview Allowed)

**ID:** HP-001

**Preconditions:**

- `AI_USAGE_MONTHLY_RUN_LIMIT_PRO=10`
- `AI_USAGE_SOFT_THRESHOLD_PERCENT=80`
- `AI_USAGE_HARD_ENFORCEMENT_PRO` unset or `false`
- Ledger already has 8 AI runs for this project (PREVIEW_GENERATE/DRAFT_GENERATE combined), created via AutomationPlaybookRun rows.

**Steps:**

1. Log in as Pro user and open the Playbooks page (`/projects/:id/automation/playbooks`).
2. Ensure at least one product qualifies for the playbook.
3. Click "Generate preview (uses AI)".

**Expected Results:**

- **API:**
  - `GET /ai/projects/:projectId/usage/quota?action=PREVIEW_GENERATE` returns:
    - `status = "warning"`
    - `reason = "soft_threshold_reached"`
    - `currentUsagePercent ≈ 80`
- **UI:**
  - Before preview runs, a warning is surfaced (toast and/or inline text) such as:
    - "This will use AI. You're at 80% of your monthly Automation Playbooks limit."
  - Preview still runs successfully (no blocking).
  - Primary CTA remains labeled "Generate preview (uses AI)".

---

### Scenario 2: Hard Block at 100% Usage (No AI Calls)

**ID:** HP-002

**Preconditions:**

- `AI_USAGE_MONTHLY_RUN_LIMIT_PRO=5`
- `AI_USAGE_SOFT_THRESHOLD_PERCENT=80`
- `AI_USAGE_HARD_ENFORCEMENT_PRO=true`
- Ledger has 5 AI runs (at or above limit) for the project.

**Steps:**

1. Log in as Pro user and open the Playbooks page.
2. Attempt to generate a new preview ("Generate preview (uses AI)").

**Expected Results:**

- **API:**
  - `GET /ai/projects/:projectId/usage/quota?action=PREVIEW_GENERATE` returns:
    - `status = "blocked"`
    - `reason = "hard_limit_reached"`
  - `POST /projects/:id/automation-playbooks/:playbookId/preview` responds with:
    - HTTP 429 / `code = "AI_QUOTA_EXCEEDED"`
  - No AI provider calls (verified via test stub counter).
- **UI:**
  - A blocking message is shown before/alongside the failed call:
    - "AI usage limit reached. Upgrade your plan or wait until your monthly AI quota resets to generate new previews."
  - CTA offers a single unblock path:
    - "Upgrade" (linking to `/settings/billing`) or "Wait until reset".

---

### Scenario 3: Draft Reuse at 0 Quota (No New AI Runs)

**ID:** HP-003

**Preconditions:**

- Valid preview + draft already exist and are stored in session (resumedFromSession banner appears).
- Monthly quota has been exceeded (Scenario 2 conditions) so new previews would be blocked.

**Steps:**

1. Generate preview and progress into estimate/apply at least once (ensure preview samples exist).
2. Refresh the Playbooks page (session restore triggers "Saved preview found").
3. Without clicking any "(uses AI)" CTAs:
   - Click "Recalculate estimate" (if offered) or "Continue".

**Expected Results:**

- **UI:**
  - "Saved preview found" banner appears.
  - User can proceed through estimate and apply using the saved draft, with no additional AI usage.
  - No quota warnings or blocks triggered for these non-AI actions.
- **API:**
  - No calls to `/preview` or `/draft/generate` occur during this resume flow.
  - Apply call still succeeds, consistent with AI-USAGE-1 (Apply uses saved drafts only).

---

### Scenario 4: Apply Unaffected by Quota

**ID:** HP-004

**Preconditions:**

- Monthly quota is fully exhausted; Scenario 2 verified for preview.
- Valid READY draft exists for the playbook (generated before quota exhaustion).

**Steps:**

1. From an APPLY_READY state, click "Apply" to run the playbook.

**Expected Results:**

- **UI:**
  - Apply works exactly as before quotas (success/partial/stop states unchanged).
  - No "(uses AI)" label on apply CTAs (AI-USAGE-1 contract).
  - No new quota warnings or blocking messages are shown for Apply.
- **API:**
  - `AutomationPlaybooksService.apply` executes using saved drafts.
  - No AI provider calls occur; ledger still reports `applyAiRuns = 0`.

---

### Scenario 5: Quota Reset via Calendar Month

**ID:** HP-005

**Preconditions:**

- Project is at hard limit with enforcement enabled.
- Tester can manipulate the system date or DB to simulate month boundary (or wait for a real boundary).

**Steps:**

1. Confirm `GET /ai/projects/:projectId/usage/quota` reports `status = "blocked"`.
2. Adjust data so all existing AutomationPlaybookRun rows fall into the previous calendar month (or advance system date into next month).
3. Call `GET /ai/projects/:projectId/usage/summary` and `GET /ai/projects/:projectId/usage/quota` again.

**Expected Results:**

- **API:**
  - New month summary shows `totalAiRuns = 0`.
  - Quota evaluation returns `status = "allowed"` or `status = "warning"` depending on new usage.
  - No cron job is required; reset is purely via ledger time window.

---

## Edge Cases

### EC-001: Quota Evaluation Fails (Network or Server Error)

**Description:** Quota evaluation endpoint fails, but AI preview still works (no silent blocking due to quota errors).

**Steps:**

1. Temporarily break `/ai/projects/:projectId/usage/quota` (e.g., by proxying to a non-responsive host).
2. Attempt to generate a preview.

**Expected Behavior:**

- **UI:**
  - Preview CTA still works as pre-AI-USAGE v2.
  - No quota warnings are shown (fallback behavior).
- **API:**
  - `/preview` call succeeds.
  - Errors from `/usage/quota` do not prevent AI calls.

---

### EC-002: Soft Warning without Known Percentage

**Description:** Misconfiguration where monthlyAiRunsLimit is set but ledger returns unexpected data.

**Steps:**

1. Configure `AI_USAGE_MONTHLY_RUN_LIMIT_PRO` with a non-zero value.
2. Simulate a scenario where ledger returns zero runs but environment variables are mis-set.

**Expected Behavior:**

- Quota evaluation remains conservative but non-blocking.
- Warning text remains truthful (no misleading percentages).

---

## Error Handling

### ERR-001: Server-Side Hard Block (AI_QUOTA_EXCEEDED)

**Scenario:** Backend has hard enforcement enabled and returns `AI_QUOTA_EXCEEDED`.

**Steps:**

1. Trigger preview when at/above quota with hard enforcement enabled.

**Expected Behavior:**

- **UI:** Shows clear, blocking message with Upgrade CTA.
- **API:** 429 response with `code = "AI_QUOTA_EXCEEDED"`.
- **AI:** No provider calls (verified in tests).

---

## Limits

### LIM-001: Quota Contract Scope

**Scenario:** Verify quota applies only to AI-triggering Automation Playbook actions.

**Scope:**

- **Applies To:**
  - Preview generation (PREVIEW_GENERATE)
  - Full draft generation (DRAFT_GENERATE)
  - Stale preview regeneration (calls preview endpoint again)
- **Does NOT Apply To:**
  - Apply (draft-based, AI-free path)
  - Resume from draft (session restore / existing draft reuse)
  - Non-AI actions (navigation, settings, manual editing)

**Expected Behavior:**

- Only preview/draft actions are subject to plan-aware quota warnings/blocks.
- All other actions behave exactly as in AI-USAGE-1 / AUTO-PB-1.3.

---

## Regression

### Areas potentially impacted:

- [ ] **Preview playbook flow:** Still works; now shows warnings/blocks near quota.
- [ ] **Draft generation & reuse:** Drafts continue to be generated/reused without surprising blocks.
- [ ] **Apply flow:** Remains AI-free and no longer subject to quotas.
- [ ] **AI Usage Summary chip:** Continues to reflect ledger data (AI-USAGE-1 contract).

### Quick sanity checks:

- [ ] Generate preview successfully when far from quota.
- [ ] See warning at soft threshold with successful preview.
- [ ] Hit hard block when over quota (AI_QUOTA_EXCEEDED, no AI calls).
- [ ] Resume from saved draft at 0 quota without new AI usage.
- [ ] Apply works regardless of quota state.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test AutomationPlaybookRun records created for quota seeding.
- [ ] Reset environment variables if modified.
- [ ] Verify no orphaned draft or run records.

### Follow-up verification:

- [ ] Confirm database state is clean.
- [ ] Verify queue is empty after tests complete.

---

## Known Issues

- **Intentionally accepted issues:**
  - Hard enforcement defaults to `false` for all plans; warnings-only mode is the production default.
  - Quota evaluation adds one additional API call before each preview; negligible latency impact.

- **Out-of-scope items:**
  - Per-playbook quotas (all playbooks share the same monthly quota).
  - Real-time quota updates via WebSocket (polling via API is sufficient).
  - Quota carryover between months (strict calendar month reset).

- **TODOs:**
  - [ ] Consider adding quota usage percentage to the AI usage summary chip.
  - [ ] Consider in-app banner when within 10% of hard limit.

---

## Approval

| Field              | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| **Tester Name**    | [Pending]                                                          |
| **Date**           | [YYYY-MM-DD]                                                       |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                              |
| **Notes**          | Plan-aware Automation Playbooks AI quota enforcement (AI-USAGE v2) |
