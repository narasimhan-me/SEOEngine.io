# TEST-PB-RULES-1 – Rules Enforcement + Stale-Preview UX Manual Testing

Author: Narasimhan Mahendrakumar
Phase: TEST-PB-RULES-1 – Rules Semantics + Stale-Preview Enforcement
Status: Implementation Complete (2025-12-17)

## Overview

This manual testing guide validates the Playbook Rules v1 semantics and stale-preview UX behavior.

**Depends on:**
- DOC-AUTO-PB-1.3 – Preview persistence & draft lifecycle
- AUTO-PB-1.3 backend (scopeId + rulesHash + draftKey enforcement)
- AUTO-PB-1.3-UX.1 – Resume, Explain Gating, and Derived State
- PB-RULES-1 – Playbook Rules v1 spec

## Test Scenarios

### TC-1 – Rules Transforms Applied in Correct Order

**Goal:** Verify that rules are applied in the order: Find/Replace → Prefix → Suffix → Max Length → Forbidden phrase detection.

**Steps:**

1. Navigate to `/projects/{id}/automation/playbooks`.
2. Select "Fix missing SEO titles" playbook.
3. Configure rules in the "Playbook rules" panel:
   - Find/Replace: `AI` → `EngineO`
   - Prefix: `Shop | `
   - Suffix: ` | 2024`
   - Max length: `30`
4. Click **Generate preview**.
5. Examine the preview samples.

**Expected:**

- For a product with title "AI Widget":
  - After Find/Replace: "EngineO Widget"
  - After Prefix: "Shop | EngineO Widget"
  - After Suffix: "Shop | EngineO Widget | 2024" (31 chars)
  - After Max Length: trimmed to 30 chars
- The preview sample shows a "trimmed_to_max_length" warning if applicable.
- Transform order is deterministic and visible in the Before/After comparison.

---

### TC-2 – rulesHash Determinism and Change on Semantic Rules Changes

**Goal:** Verify that rulesHash is stable for identical rules and changes when rules change.

**Steps:**

1. Generate preview with rules: `{ enabled: true, prefix: "A | " }`.
2. Note the `rulesHash` from the Network response.
3. Regenerate preview with identical rules.
4. Note the second `rulesHash`.
5. Change prefix to `"B | "` and regenerate preview.
6. Note the third `rulesHash`.

**Expected:**

- First and second `rulesHash` are identical.
- Third `rulesHash` is different from the first two.
- `rulesHash` is a 16-character hex string.

---

### TC-3 – Draft Validity vs Rules Changes (PLAYBOOK_RULES_CHANGED)

**Goal:** Verify that Apply is blocked with 409 PLAYBOOK_RULES_CHANGED when rulesHash doesn't match the stored draft.

**Steps:**

1. Generate preview with rules A (e.g., prefix "Original | ").
2. Generate full draft via **Continue to Estimate** → Step 2.
3. Return to Step 1 and change rules (e.g., prefix "Changed | ").
4. Attempt to Apply without regenerating the preview.

**Expected:**

- Apply returns 409 with `code: 'PLAYBOOK_RULES_CHANGED'`.
- No product SEO fields are updated.
- No AI calls occur during the failed Apply.
- UI shows the inline "Rules changed" panel with:
  - "Rules changed since this preview."
  - **Regenerate preview (uses AI)** as primary CTA.

---

### TC-4 – Draft Validity vs Scope Changes (PLAYBOOK_SCOPE_INVALID)

**Goal:** Verify that Apply is blocked with 409 PLAYBOOK_SCOPE_INVALID when scope changes after preview.

**Steps:**

1. Generate preview + full draft.
2. Add a new product to the project that matches the playbook criteria.
3. Attempt to Apply with the original `scopeId`.

**Expected:**

- Apply returns 409 with `code: 'PLAYBOOK_SCOPE_INVALID'`.
- Response includes `expectedScopeId` and `providedScopeId`.
- No product updates occur.
- UI shows "Product set changed since your preview" with **Recalculate estimate** CTA.

---

### TC-5 – Stale-Preview UX in the Playbooks Wizard

**Goal:** Verify that the stale-preview UX correctly shows badges, panels, and CTAs when rules change after preview.

**Steps:**

1. Generate preview with valid rules.
2. Confirm the badge shows "Preview valid" and **Continue to Estimate** is enabled.
3. Change a rule field (e.g., update Prefix).
4. Observe Step 1 without clicking Regenerate.

**Expected:**

- The badge next to "Sample preview" shows:
  - ⚠️ `Rules changed — preview out of date`
- **Continue to Estimate** is disabled.
- A yellow "Why you can't continue yet" panel appears with:
  - "Rules changed since this preview. Regenerate preview to continue safely."
  - Primary CTA: **Regenerate preview (uses AI)**
- Clicking **Regenerate preview** restores valid state:
  - Badge returns to "Preview valid"
  - Yellow panel disappears
  - **Continue to Estimate** enables

---

### TC-6 – UPDATED vs SKIPPED Mapping Based on Draft Content

**Goal:** Verify that products with draft suggestions get UPDATED and products without get SKIPPED.

**Steps:**

1. Create a READY draft with mixed suggestions:
   - Product A: has `finalSuggestion` → UPDATED
   - Product B: empty `finalSuggestion` → SKIPPED
   - Product C: no draft item → SKIPPED
2. Apply the playbook.

**Expected:**

- Apply response shows:
  - `updatedCount = 1`
  - `skippedCount = 2`
- Per-product statuses:
  - Product A: `UPDATED`, `seoTitle` populated
  - Product B: `SKIPPED`, `seoTitle` unchanged
  - Product C: `SKIPPED`, `seoTitle` unchanged
- No AI calls during Apply.

---

### TC-7 – Resume with Stale Preview from Session

**Goal:** Verify that returning to Playbooks with a stale preview shows appropriate messaging.

**Steps:**

1. Generate preview and confirm it's valid.
2. Change a rule field (making preview stale).
3. Navigate away (e.g., to `/projects/{id}/overview`).
4. Return to Playbooks.

**Expected:**

- Step 1 shows "Saved preview found" helper.
- Helper text mentions rules changed.
- Badge shows "Rules changed — preview out of date".
- **Continue to Estimate** is disabled.
- "Why you can't continue yet" panel lists the rules-change blocker.
- Regenerating preview via the CTA restores valid state.

---

## Observed vs Contract

Use this section to record any mismatches between behavior and the TEST-PB-RULES-1 contract:

- **Example format:**

  - Scenario: TC-3 – Draft Validity vs Rules Changes
    Observed: Apply returned 200 even with mismatched rulesHash.
    Expected: 409 `PLAYBOOK_RULES_CHANGED` with no updates.
    Notes: Check that rulesHash validation is enabled on the backend.

These entries should feed into future phases as concrete fixes.

---

## Automated Test Coverage

The following automated tests enforce these contracts:

**Unit Tests:** `tests/unit/automation/playbook-rules.engine.test.ts`

- `normalizeRules` – default values, boolean normalization, edge cases
- `applyRulesToText` – Find/Replace, Prefix, Suffix, Max Length, Forbidden Phrases
- Rule combination and order
- `computeRulesHash` – determinism, semantic changes, key order robustness

**Integration Tests:** `tests/integration/automation/pb-rules-draft-hash.test.ts`

- `rulesHash stability` – identical rules produce identical hash
- `rulesHash change` – semantic changes produce different hash
- `PLAYBOOK_RULES_CHANGED` – 409 when applying with mismatched rulesHash
- `PLAYBOOK_SCOPE_INVALID` – 409 when scope changes after preview
- `Failure modes` – forbidden phrase added, maxLength reduced, multiple changes
- `AI usage guarantees` – Apply with valid draft does not call AI, resume path no AI

**E2E Tests:** (Planned) `apps/web/tests/pb-rules-stale-preview.spec.ts`

- Rules change → stale preview guardrail
- Resume with stale preview from session
