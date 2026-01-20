# AUTO-PB-1.3 – Preview Persistence & Draft Lifecycle

Author: Narasimhan Mahendrakumar
Phase: DOC-AUTO-PB-1.3 – Preview Persistence & Draft Lifecycle
Status: Authoritative Spec

## 1. Purpose

This document is the **authoritative source of truth** for Preview persistence and Draft lifecycle for AUTO-PB-1.3:

- How Automation Playbook previews are persisted as drafts.
- How `scopeId` and `rulesHash` bind Preview → Estimate → Apply to a single, deterministic scope.
- How users can safely leave and return to Playbooks without losing work.
- How Apply guarantees "no surprise AI" and write-only semantics when a valid draft exists.

This spec underpins:

- TEST-AUTO-PB-1.3 (contract enforcement tests).
- PB-RULES-1 (Playbook Rules v1).
- TEST-PB-RULES-1 (rules contract tests).
- Future phases RUNS-1 (async runs + run history) and AI-USAGE-1 (AI usage ledger, quotas, and reuse).

## 2. Definitions

**Scope**
The set of product IDs that match a playbook's criteria (e.g., products with missing SEO titles) at a specific point in time.

**scopeId**
A deterministic identifier for a scope:

- Computed as `sha256(projectId + playbookId + sorted(productIds)).slice(0, 16)`.
- Same set of products → same `scopeId`.
- Any change to the affected product set (add/remove/fix) → new `scopeId`.

**Rules / rulesHash / ruleset**

- **PlaybookRulesV1** – the normalized rules configuration used when generating drafts:
  - enabled: boolean
  - findReplace?: { find: string; replace: string; caseSensitive?: boolean }
  - prefix?: string
  - suffix?: string
  - maxLength?: number
  - forbiddenPhrases?: string[]
  - mode?: "warn" | "enforce" (v1: enforce maxLength, warn for forbidden phrases).
- **rulesHash** – deterministic hash of the normalized rules:
  - `rulesHash = sha256(stableJson(normalizedRules)).slice(0, 16)`.
- **Ruleset** – shorthand for the pair `{ rules, rulesHash }`.

**Draft / draftKey / persisted payload**

- Draft is a persisted record of AI suggestions and rule metadata for a playbook run.
- Backed by `AutomationPlaybookDraft` (Prisma model) with at least:
  - projectId
  - playbookId
  - scopeId
  - rulesHash
  - status: `READY | PARTIAL | FAILED | EXPIRED`
  - sampleProductIds: sample set used for preview
  - draftItems: array of `{ productId, field, rawSuggestion, finalSuggestion, ruleWarnings[] }`
  - counts: `{ affectedTotal, draftGenerated, noSuggestionCount }`
  - rules: stored PlaybookRulesV1
  - createdByUserId, createdAt, updatedAt
  - expiresAt (optional TTL, see 5.4)
- **draftKey** = `(projectId, playbookId, scopeId, rulesHash)`; there is a unique index on these fields.

**Preview**

- The Step 1 "Preview" UI is a view over the **draft samples**:
  - Generated via `POST /projects/:id/automation-playbooks/:playbookId/preview`.
  - Shows up to N sample products with Before/After text.
  - Under AUTO-PB-1.3, Preview is **generated from and writes to** the draft:
    - First call creates/updates a PARTIAL draft for `draftKey`.
    - Subsequent calls for the same `draftKey` reuse/overwrite that draft.

**Estimate**

- Step 2 "Estimate" UI is based on `GET /projects/:id/automation-playbooks/estimate?playbookId=…`.
- Returns:
  - `totalAffectedProducts`, token estimate, plan eligibility, reasons, `aiDailyLimit`, and:
  - `scopeId` – binding Preview/Estimate/Apply to a scope.
  - `rulesHash`, `draftStatus`, `draftCounts` – snapshot of the latest draft (if any) for the current scope.

**Run** (forward-looking: RUNS-1)

- A **run** is a full apply execution (potentially async) that uses a draft to update products.
- Conceptually: `Run = { runId, projectId, playbookId, scopeId, rulesHash, startedAt, completedAt, status, counts }`.
- Actual run tracking (run table, history, retries) is introduced in RUNS-1; not yet implemented but this document is its prerequisite.

**Valid Draft / Invalid Draft / Missing Draft**

- **Valid Draft**:
  - Exists for `(projectId, playbookId, scopeId, rulesHash)`.
  - Status is `READY` or `PARTIAL`.
  - Not expired (once expiry is enforced).
- **Invalid Draft**:
  - Any of:
    - `scopeId` mismatch relative to current scope.
    - `rulesHash` mismatch relative to current ruleset.
    - Status `FAILED` or `EXPIRED` (once enforced).
- **Missing Draft**:
  - No draft row for `(projectId, playbookId, scopeId, rulesHash)` at Apply/GenerateDraft time.
  - Surfaces as `PLAYBOOK_DRAFT_NOT_FOUND`.

**Gating**

- The set of rules that determine **whether a CTA is enabled** and **what must be done to unblock it**.
- Gating is based **only on persisted state and backend facts**, not on ephemeral UI flags.

**AI Usage Event**

- A server-side record of AI calls (e.g., `AiUsageEvent` in the DB) with:
  - userId, projectId, feature, amount/tokens, createdAt.
- In AUTO-PB-1.3:
  - AI may run during Preview and Draft Generate.
  - Apply logs token usage for writes but does **not** call the model.
- AI-USAGE-1 will extend this into a full ledger exposed to UX.

## 3. State Model (Canonical Table)

This table enumerates core backend states and the UX contract.

| State ID | Backend Condition                                                             | UX Contract (high-level)                                                                                          | Allowed CTAs                                                             | Primary Unblock Action                          |
| -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| S0       | No draft exists for `(projectId, playbookId)`                                 | Step 1 shows empty preview panel; CNAB may invite user to run a playbook.                                         | Generate preview (uses AI)                                               | Generate preview (uses AI)                      |
| S1       | Draft PARTIAL for `draftKey` (scopeId + rulesHash), scope still valid         | Step 1 shows sample preview from draft; Step 2 may show draft counts; Continue allowed if estimate can proceed.   | Regenerate preview (uses AI), Recalculate estimate, Continue to Estimate | Continue to Estimate (if eligible)              |
| S2       | Draft READY for `draftKey`, scope still valid                                 | Preview samples + counts; Apply can proceed after estimate says `canProceed`; no AI at Apply.                     | Recalculate estimate, Generate full draft again (optional), Apply        | Apply                                           |
| S3       | Draft rulesHash mismatch for requested rules (rules changed since preview)    | Inline error (PLAYBOOK_RULES_CHANGED) at Apply/GenerateDraft; Step 3 shows "Regenerate preview" unblock path.     | Regenerate preview (uses AI)                                             | Regenerate preview (uses AI)                    |
| S4       | Current scopeId != provided scopeId (scope changed since preview/estimate)    | Inline error (PLAYBOOK_SCOPE_INVALID); blocks Apply and Draft Generate.                                           | Recalculate estimate                                                     | Recalculate estimate                            |
| S5       | No draft row for requested `(projectId, playbookId, scopeId, rulesHash)`      | Inline error (PLAYBOOK_DRAFT_NOT_FOUND); Step 3 shows "Generate preview" unblock path.                            | Generate preview (uses AI)                                               | Generate preview (uses AI)                      |
| S6       | Draft exists but status `FAILED` (not currently surfaced separately)          | For now treated like S5; future behavior may show a distinct "draft failed" state.                                | Generate preview (uses AI), View logs (future)                           | Generate preview (uses AI)                      |
| S7       | Draft exists, status `EXPIRED` (once enforced via expiresAt)                  | Inline error (PLAYBOOK_DRAFT_EXPIRED, 410); blocked until user regenerates.                                       | Generate preview (uses AI)                                               | Generate preview (uses AI)                      |
| S8       | Draft READY/PARTIAL, valid, but estimate cannot proceed (plan/limits/scope=0) | Step 2 explains reasons (plan_not_eligible, ai_daily_limit_reached, etc.); Step 1 "Why you can't continue" panel. | View plans, Adjust scope, Try again tomorrow (for limits), View products | The most relevant of: View plans / Adjust scope |
| S9       | Draft READY, valid; Apply already run once                                    | Second Apply sees same draft and scope; idempotent outcome (no further AI).                                       | Apply again (writes same data again or returns "no changes")             | None required; Apply remains safe               |

The **Error & State → UX Mapping Table** in `docs/IMPLEMENTATION_PLAN.md` (AUTO-PB-1.3) refines S3–S7 into concrete banners/panels and copy.

## 4. Persistence Rules (Navigation + Refresh)

### 4.1 What is persisted where

**Server / DB (durable):**

- `AutomationPlaybookDraft` rows:
  - Created/updated by:
    - `previewPlaybook` (partial drafts, sample-only).
    - `generateDraft` (full drafts with all affected products).
  - Persist across:
    - Navigation within the app.
    - Browser refresh.
    - New browser sessions/devices.
- AI usage events and token logs (via `TokenUsageService` / `AiUsageEvent`).

**Client / Browser (session-local):**

- Wizard/session state in `sessionStorage`, keyed by:
  - `automationPlaybookState:${projectId}:${playbookId}`.
- Contains:
  - `flowState` (legacy), `previewSamples`, `estimate`, `applyResult`.
  - `rules`, `rulesVersion`, `previewRulesVersion`.
- Used to rehydrate Step 1/2/3 after navigation or refresh in the **same browser session**.

### 4.2 When persistence occurs

- **Preview**
  - On `POST /preview`, server:
    - Computes `scopeId` from current affected product IDs.
    - Normalizes rules, computes `rulesHash`.
    - Generates AI suggestions for sample products.
    - Writes/updates `AutomationPlaybookDraft` for `draftKey` with:
      - `status = PARTIAL`.
      - `sampleProductIds`, partial `draftItems`, `counts`, `rules`, `rulesHash`.
    - Returns preview samples + draft metadata.
  - Client:
    - Stores `previewSamples`, `rules`, `rulesVersion`, `previewRulesVersion`, and updated `estimate` in `sessionStorage`.

- **Estimate**
  - On `GET /estimate`, server:
    - Computes current `scopeId`.
    - Optionally attaches latest draft snapshot (`rulesHash`, `draftStatus`, `draftCounts`).
    - Computes eligibility based on plan, daily limits, token cap, and scope size.
  - Client:
    - Stores `estimate` in `sessionStorage`.

- **Full Draft Generate**
  - On `POST /draft/generate`, server:
    - Validates `scopeId` and `rulesHash` against latest draft and current scope.
    - Generates AI suggestions for **all affected products** that are missing or have no usable draft.
    - Updates draft to `status = READY` with complete `draftItems` and `counts`.
    - Logs token usage for generation.
  - Client:
    - May update local draft-related UI state but has no additional persistence obligations beyond what is already stored.

- **Apply**
  - On `POST /apply`, server:
    - Validates `scopeId` against current scope and `rulesHash` against latest draft.
    - Uses `draftItems` to update products.
    - Logs token usage for writes (but calls **no AI**).
  - Client:
    - Persists `applyResult` in `sessionStorage` for display/resume.

### 4.3 What survives & what does not

**Survives:**

- Draft content (server-side) survives:
  - Page navigation.
  - Browser refresh.
  - User sign-out/in (assuming same project).
- Wizard state (client-side) survives:
  - Navigation within the same browser session.
  - Hard refresh within the same session.

**Does not survive (today):**

- Wizard state across:
  - Different browsers/devices.
  - Private/incognito windows.
  - Explicit session flush (clearing storage).
- Draft expiry TTL is **not enforced yet**:
  - `expiresAt` exists on the model but is not yet used to return `PLAYBOOK_DRAFT_EXPIRED`.
  - Until enforced, drafts are considered non-expiring from the backend's perspective.

## 5. Draft Lifecycle

### 5.1 Creation

1. User triggers Preview from Step 1.
2. Server:
   - Computes `scopeId` for current affected products.
   - Normalizes rules and computes `rulesHash`.
   - Generates AI suggestions for a sample set of products.
   - Upserts `AutomationPlaybookDraft` for `(projectId, playbookId, scopeId, rulesHash)`:
     - `status = PARTIAL`.
     - `sampleProductIds`, partial `draftItems`, `counts`, `rules`.
3. Client renders preview from the returned samples and stores state in `sessionStorage`.

### 5.2 Promotion to Full Draft (READY)

1. User (or UI flow) calls `POST /draft/generate` with `scopeId` and `rulesHash`.
2. Server:
   - Validates ownership and scope.
   - Ensures a draft exists; otherwise `PLAYBOOK_DRAFT_NOT_FOUND`.
   - Ensures `rulesHash` matches draft; otherwise `PLAYBOOK_RULES_CHANGED`.
   - Generates AI suggestions for all affected products that lack usable drafts.
   - Updates draft:
     - `status = READY`.
     - Full `draftItems` and updated `counts`.
   - Logs AI tokens under a "draft_generate" feature key.

### 5.3 Reuse / Resume

- On return to Playbooks:
  - Client rehydrates from `sessionStorage` (preview, estimate, applyResult, rules).
  - Backend drafts remain unchanged.
- If `sessionStorage` is missing but drafts exist:
  - The canonical path is to:
    - Call `GET /automation-playbooks/:playbookId/draft/latest` (when wired) to rehydrate preview from server.
    - Or generate a new preview, which upserts draft for the new `scopeId` and `rulesHash`.
- Resuming Apply with existing `(scopeId, rulesHash)` and READY draft:
  - Apply uses existing drafts and must not call AI.
  - Multiple Apply calls for the same combination are idempotent on content (no surprise changes).

### 5.4 Invalidation & Expiry

Invalidation events:

- **Scope change**:
  - Current derived `scopeId` no longer matches `scopeId` supplied to Apply/GenerateDraft.
  - Server returns 409 `PLAYBOOK_SCOPE_INVALID` with `expectedScopeId` and `providedScopeId`.
  - User must re-run Estimate (and Preview if needed) to rebuild a draft for the new scope.

- **Rules change**:
  - User changes rules after preview/draft generation, and the effective ruleset now produces a different `rulesHash`.
  - Apply or Draft Generate sees `rulesHash` mismatch and returns 409 `PLAYBOOK_RULES_CHANGED`.
  - User must regenerate Preview (and then Draft) with the new rules.

Expiry:

- `expiresAt` exists on the model but is not yet enforced.
- Once enforced, an expired draft must yield 410 `PLAYBOOK_DRAFT_EXPIRED` with a UX unblock path: "Generate preview (uses AI)".

## 6. Apply Contract (Hard Guarantees)

The Apply contract is non-negotiable:

1. **Draft-first trust contract**
   - If a **valid draft** exists for the exact `draftKey` (projectId, playbookId, scopeId, rulesHash), **Apply must never call AI**.
   - Apply uses only the persisted `draftItems` to update products.

2. **No AI at Apply when drafts exist**
   - Confirmed by:
     - Service-level tests (`automation-playbooks.apply.no-ai.spec.ts`).
     - E2E tests (`Automation Playbooks (e2e)` / AUTO-PB-1.3 contract enforcement block).
   - Any AI calls during Apply when a valid draft exists are considered a contract violation.

3. **Failure modes**
   - **Scope changed** → 409 `PLAYBOOK_SCOPE_INVALID`:
     - Payload includes `expectedScopeId` and `providedScopeId`.
     - UX must prompt: "Recalculate estimate to continue safely."
   - **Rules changed** → 409 `PLAYBOOK_RULES_CHANGED`:
     - Payload includes `expectedRulesHash` and `providedRulesHash`.
     - UX must prompt: "Regenerate preview (uses AI) to continue safely."
   - **Draft missing** → 409 `PLAYBOOK_DRAFT_NOT_FOUND`:
     - No draft for `(projectId, playbookId, scopeId, rulesHash)`.
     - UX must prompt: "Generate preview (uses AI) to continue safely."
   - **Draft expired** → 410 `PLAYBOOK_DRAFT_EXPIRED` (once implemented):
     - UX must prompt: "Generate preview (uses AI)."

4. **Per-product semantics**
   - For each affected product in the current scope:
     - If a draft item with non-empty `finalSuggestion` exists:
       - Apply writes that suggestion and marks product as `UPDATED`.
     - If no usable draft item exists:
       - Apply **does not call AI**.
       - Product is marked `SKIPPED` with a clear message (e.g., "Skipped: no draft suggestion was available for this product.").
   - Apply returns counts:
     - `totalAffectedProducts`, `attemptedCount`, `updatedCount`, `skippedCount`, `limitReached`, `stopped`, `results[]`.

## 7. UX Contract (Derived-State Gating & Trust Language)

The front-end must obey these rules when gating CTAs:

1. **Derived-state gating only**
   - Button enabled/disabled states must be derived from persisted facts:
     - `previewPresent`, `previewValid`, `estimatePresent`, `estimateEligible`, `planEligible`, draft status.
   - No gating purely based on transient `flowState` without cross-checking persisted artifacts.

2. **Disabled CTA must explain why**
   - Whenever a primary CTA is disabled (e.g., Continue to Estimate, Apply):
     - A panel or inline message must:
       - State **why** the action is blocked (e.g., rules changed, plan not eligible, estimate required).
       - Present a **single primary unblock action** (Regenerate preview, Recalculate estimate, View plans, etc.).

3. **AI-triggering CTAs must be labeled**
   - Any CTA that can cause new model calls (Preview, Regenerate Preview, Generate Draft) must include:
     - `(uses AI)` in the button label or immediately adjacent helper copy.

4. **Resume UX**
   - When returning with a saved preview:
     - Show explicit "Saved preview found" copy.
     - Indicate whether the preview is valid, stale, or waiting on an estimate.
     - Provide one-step continuation or unblock.

5. **Error UX alignment**
   - UI must map 409/410 error codes to inline panels as defined in the AUTO-PB-1.3 Error & State → UX Mapping Table:
     - `PLAYBOOK_RULES_CHANGED`
     - `PLAYBOOK_SCOPE_INVALID`
     - `PLAYBOOK_DRAFT_NOT_FOUND`
     - `PLAYBOOK_DRAFT_EXPIRED`

## 8. Error & Edge Cases

**Old links / bookmarks**

- If a user lands on Playbooks with a stale `scopeId` or without local wizard state:
  - Backend continues to enforce scope and rules contracts.
  - UX should either:
    - Fetch latest draft (when wired) and show a controlled "Saved preview found" resume state, or
    - Encourage a fresh Preview (uses AI) and Estimate.

**Concurrent rules edits (multi-tab)**

- If rules are changed in another tab and the user attempts Apply with a stale rulesHash:
  - Backend returns 409 `PLAYBOOK_RULES_CHANGED`.
  - Front-end must treat this exactly as any stale rules case: show inline error, block Apply, and offer **Regenerate preview (uses AI)** as primary action.

**Partial failures**

- If Preview fails after persisting an incomplete draft:
  - Draft may exist with partial `draftItems`.
  - UX should:
    - Surface the failure (e.g., error message / toast).
    - Allow user to retry Preview or regenerate later.
  - Apply must still obey the no-AI rule: it either uses whatever valid draft items exist or returns an appropriate 409/410 if the draft is not usable.

**Dev mode constraints**

- If queues / async infra are disabled (e.g., local dev without Redis):
  - Draft and Apply logic remain synchronous and local.
  - RUNS-1 will define behavior when background processing is used; this spec remains valid regardless of execution mode.

## 9. Telemetry Hooks (Forward-Looking – AI-USAGE-1)

These events are **not required** by AUTO-PB-1.3 but are the target for AI-USAGE-1:

- `playbook.draft_created` – on first Preview that creates a draft.
- `playbook.draft_reused` – when an existing draft is reused without AI calls.
- `playbook.draft_full_generate.started` / `.completed` / `.failed`.
- `playbook.draft_invalidated.scope` – when `PLAYBOOK_SCOPE_INVALID` is returned.
- `playbook.draft_invalidated.rules` – when `PLAYBOOK_RULES_CHANGED` is returned.
- `playbook.apply.started` / `.completed`.
- `playbook.apply.blocked_no_valid_draft` – when Apply encounters `PLAYBOOK_DRAFT_NOT_FOUND` or `PLAYBOOK_DRAFT_EXPIRED`.
- `ai.called.preview` – AI usage attributed to Preview.
- `ai.called.draft_generate` – AI usage attributed to full draft generation.
- `ai.called.apply` – MUST remain `0` for valid-draft Apply flows (a violation if >0).

## 10. Cross-References

- Implementation Plan:
  - `docs/IMPLEMENTATION_PLAN.md` – sections:
    - AUTO-PB-1.3 – Preview Persistence & Cross-Surface Drafts.
    - AUTO-PB-1.3 — Error & State → UX Mapping Table.
    - TEST-AUTO-PB-1.3 – Contract Enforcement Tests.
    - PB-RULES-1 – Playbook Rules v1 (depends on this doc).
- Tests:
  - `apps/api/test/e2e/automation-playbooks.e2e-spec.ts` (AUTO-PB-1.3 contract enforcement).
  - `apps/api/test/integration/automation-playbooks.apply.no-ai.spec.ts`.
- Manual Testing:
  - `docs/manual-testing/auto-pb-1-3-scope-binding.md`.
  - `docs/manual-testing/auto-pb-1-3-ux-1-resume-and-gating.md`.
  - `docs/manual-testing/test-auto-pb-1-3-contract-enforcement.md`.
  - `docs/manual-testing/DOC-AUTO-PB-1.3.md` (this spec's manual verification).
