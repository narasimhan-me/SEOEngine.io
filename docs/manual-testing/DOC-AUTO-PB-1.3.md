# DOC-AUTO-PB-1.3 – Preview Persistence & Draft Lifecycle Manual Testing

Author: Narasimhan Mahendrakumar
Phase: DOC-AUTO-PB-1.3 – Preview Persistence & Draft Lifecycle
Status: Implementation Complete (docs) – behavior enforced by tests, partially verified manually

## Overview

This manual testing guide validates that the current Automation Playbooks implementation matches the contract defined in:

- `docs/auto/auto-pb-1.3-preview-persistence.md`
- AUTO-PB-1.3 sections in `IMPLEMENTATION_PLAN.md`.

Focus:

- Draft creation and reuse.
- Scope/rules binding (`scopeId`, `rulesHash`).
- No AI at Apply when drafts exist.
- Resume behavior and derived-state gating (in conjunction with AUTO-PB-1.3-UX.1).
- Error handling for stale/missing drafts.

If you observe differences between behavior and this contract, record them under **Observed vs Contract** and treat them as candidates for follow-up phases (PB-RULES-1, RUNS-1, AI-USAGE-1).

## Preconditions

- User on Pro or Business plan.
- Project with:
  - Connected store.
  - At least 3 products missing SEO titles and/or descriptions for the selected playbook.
- Browser dev tools open for:
  - Network tab (Preview, Draft Generate, Estimate, Apply calls).
  - Console / logs as needed.

API paths (localhost):

- `GET /projects/{id}/automation-playbooks/estimate`
- `POST /projects/{id}/automation-playbooks/{playbookId}/preview`
- `POST /projects/{id}/automation-playbooks/{playbookId}/draft/generate`
- `POST /projects/{id}/automation-playbooks/apply`

Automation Playbooks UI:

- `/projects/{projectId}/automation/playbooks`

---

## TC-1 – Draft created on Preview and persisted

Goal: Confirm that Preview creates a draft tied to `scopeId` and `rulesHash`, and that preview samples match persisted draft items.

**Steps:**

1. Navigate to `/projects/{id}/automation/playbooks`.
2. Select a playbook (e.g., "Fix missing SEO descriptions").
3. Ensure affected products > 0 (CNAB and Step 1 totals show non-zero).
4. Click **Generate preview**.
5. In the Network tab, inspect the `POST /preview` response:
   - Capture `scopeId`, `rulesHash`, `draftId`, `status`, `samples[]`.
6. Query the DB (or use a debug endpoint if available) to inspect `AutomationPlaybookDraft` for:
   - `projectId`, `playbookId`, `scopeId`, `rulesHash`.

**Expected:**

- A draft row exists for `draftKey = (projectId, playbookId, scopeId, rulesHash)`.
- `status` in DB is `PARTIAL`.
- `sampleProductIds` and `draftItems` align with `samples[]` in the preview response.
- UI shows sample preview cards that match the draft's `finalSuggestion` values.

---

## TC-2 – Full draft generation and no AI at Apply

Goal: Confirm that full draft generation creates a READY draft and Apply uses it without calling AI.

**Steps:**

1. From TC-1, record `scopeId` and `rulesHash`.
2. Call **Generate full draft** (if wired) via:
   - UI action, or
   - `POST /projects/{id}/automation-playbooks/{playbookId}/draft/generate` with `{ scopeId, rulesHash }`.
3. Verify the response:
   - `status = READY`.
   - Updated `counts` reflect affected product count.
4. Observe server logs to confirm AI calls during draft generation.
5. Trigger Apply:
   - Click Apply in the UI, or
   - `POST /projects/{id}/automation-playbooks/apply` with `{ playbookId, scopeId, rulesHash }`.

**Expected:**

- Draft row now has `status = READY` and full `draftItems` for all affected products.
- Apply succeeds with:
  - `updatedCount` > 0.
  - `skippedCount` correct for products with no suggestions.
- Server logs show AI calls **only** during Preview / Draft Generate, **not** during Apply.
- Affected product SEO fields are updated to the draft's `finalSuggestion` values.

If Apply logs any AI calls, note this under **Observed vs Contract**.

---

## TC-3 – Scope binding: PLAYBOOK_SCOPE_INVALID

Goal: Verify that Apply refuses to run when the affected scope changes after preview/draft generation.

**Steps:**

1. Run TC-1 and TC-2 to create a READY draft.
2. Add or modify products so the scope changes:
   - For example, add another product missing the relevant SEO field.
3. Call Apply with the **original** `scopeId` and `rulesHash`.

**Expected:**

- Apply returns 409 with `code: "PLAYBOOK_SCOPE_INVALID"`.
- Response includes `expectedScopeId` and `providedScopeId` if implemented.
- No new product updates occur for the stale request.
- UI shows the inline scope-change panel:
  - "Product set changed since your preview" with **Recalculate estimate** as primary CTA.

---

## TC-4 – Rules binding: PLAYBOOK_RULES_CHANGED

Goal: Verify that Apply protects against stale rules by comparing `rulesHash`.

**Steps:**

1. Create a draft via Preview as in TC-1 with some rules (e.g., Prefix).
2. Capture `scopeId` and `rulesHash`.
3. Change rules in the UI (e.g., different Prefix or Max length) and regenerate preview.
   - Or directly construct a mismatched `rulesHash` in the Apply request for testing.
4. Attempt Apply with:
   - `scopeId` from the old draft.
   - `rulesHash` that does **not** match the stored draft.

**Expected:**

- Apply returns 409 with `code: "PLAYBOOK_RULES_CHANGED"`.
- No product SEO fields are updated by the failing Apply.
- UI shows the inline rules-changed panel:
  - "Rules changed since your preview" with **Regenerate preview (uses AI)** as primary CTA.

---

## TC-5 – Resume behavior: saved draft, no wasted AI

Goal: Verify that returning to Playbooks reuses existing drafts without re-calling AI unnecessarily.

**Steps:**

1. Generate Preview and full draft for a playbook (using TC-1/TC-2 setup).
2. Navigate away from Playbooks and then return.
3. Confirm Step 1:
   - Shows "Saved preview found".
   - Badges and resume messages reflect the validity of the preview and estimate.
4. Trigger Apply without regenerating preview or draft.

**Expected:**

- Preview content appears without additional AI calls (no new Preview / Draft Generate in the Network tab unless user explicitly regenerates).
- Apply succeeds and does not call AI.
- Products updated match the existing draft contents.
- The gating + messaging behavior matches `auto-pb-1-3-ux-1-resume-and-gating.md`.

---

## TC-6 – UPDATED vs SKIPPED mapping to draft content

Goal: Confirm that UPDATED and SKIPPED outcomes align with draft content, not last-known issues.

**Steps:**

1. Create at least 3 eligible products.
2. Seed or construct a READY draft (via backend tools) such that:
   - Product A has a non-empty `finalSuggestion`.
   - Product B has an empty `finalSuggestion`.
   - Product C has no draft item.
3. Call Apply.

**Expected:**

- Apply response shows:
  - `updatedCount = 1`, `skippedCount = 2`.
- Per-product statuses:
  - Product A → `UPDATED`.
  - Product B → `SKIPPED` (no usable suggestion).
  - Product C → `SKIPPED` (no draft item).
- AI is not called during Apply.

---

## Observed vs Contract

Use this section to record any mismatches between behavior and the DOC-AUTO-PB-1.3 spec:

- **Example format:**

  - Scenario: TC-4 – Rules binding
    Observed: Apply returned 200 and updated products even when rulesHash mismatched.
    Expected: 409 `PLAYBOOK_RULES_CHANGED` and no updates.
    Notes: Covered by automated test `AUTO-PB-1.3 Contract enforcement – PLAYBOOK_RULES_CHANGED`; likely environment mismatch.

These entries should feed into future phases (PB-RULES-1 implementation, RUNS-1, AI-USAGE-1) as concrete fixes.
