# TEST-AUTO-PB-1.3 – Contract Enforcement Manual Testing

Author: Narasimhan Mahendrakumar
Phase: TEST-AUTO-PB-1.3 – Strengthened Contract Enforcement Specs
Status: Complete (2025-12-17)

## Overview

This document outlines manual verification for the strengthened E2E contract enforcement tests. These tests ensure:

1. **PLAYBOOK_RULES_CHANGED** – Changing rules between preview and apply returns 409 with no DB mutation.
2. **PLAYBOOK_DRAFT_NOT_FOUND** – Attempting apply without a draft returns 409 with no DB mutation.
3. **No-AI-at-Apply** – Apply never calls AI; it reads from the pre-generated draft.
4. **UPDATED vs SKIPPED** – Products with draft content get UPDATED; products without get SKIPPED.
5. **Resume/Apply Later** – A user can preview, leave, return, and apply without regenerating AI.

## Preconditions

- User on a Pro or Business plan.
- Project with connected store and products missing SEO titles/descriptions.
- Access to browser DevTools (Network tab) or API logs.

---

## TC-1 – PLAYBOOK_RULES_CHANGED (409 Conflict)

**Goal:** Verify that changing rules after preview triggers a 409 PLAYBOOK_RULES_CHANGED error and no product data is modified.

**Steps:**

1. Navigate to `/projects/{id}/automation/playbooks`.
2. Select "Fix missing SEO titles" playbook.
3. Click **Generate preview** and wait for sample cards.
4. Note the `rulesHash` from the estimate response (DevTools Network tab).
5. Change a rule (e.g., update the Max length field).
6. Attempt to click **Apply playbook** (if enabled via dev override) or call the apply API directly with the old `rulesHash`.

**Expected:**

- API returns HTTP 409 with `code: 'PLAYBOOK_RULES_CHANGED'`.
- No products are updated in the database.
- UI displays an error message indicating rules have changed.
- The "Why you can't continue yet" panel appears with "Rules changed — regenerate preview".

---

## TC-2 – PLAYBOOK_DRAFT_NOT_FOUND (409 Conflict)

**Goal:** Verify that attempting apply without a draft triggers a 409 PLAYBOOK_DRAFT_NOT_FOUND error.

**Steps:**

1. Navigate to `/projects/{id}/automation/playbooks`.
2. Select a playbook and obtain `scopeId` from the estimate endpoint.
3. **Do not** generate a preview (skip the preview step).
4. Attempt to call the apply API directly with:
   - `scopeId` from the estimate
   - A fabricated `rulesHash` (e.g., `fake-rules-hash`)

**Expected:**

- API returns HTTP 409 with `code: 'PLAYBOOK_DRAFT_NOT_FOUND'`.
- No products are updated in the database.
- Message indicates that no draft exists for the given scope/rules combination.

---

## TC-3 – No-AI-at-Apply Contract

**Goal:** Verify that the apply operation uses draft suggestions without making any AI calls.

**Steps:**

1. Navigate to `/projects/{id}/automation/playbooks`.
2. Select a playbook and click **Generate preview**.
3. Complete the estimate step and proceed to Step 3.
4. Open browser DevTools Network tab and filter for AI-related requests (e.g., `/ai/`, `openai`, `anthropic`).
5. Click **Apply playbook**.
6. Monitor network requests during the apply operation.

**Expected:**

- No AI service calls are made during the apply operation.
- Products are updated using the pre-generated draft content.
- Apply completes successfully with products marked as UPDATED.

---

## TC-4 – UPDATED vs SKIPPED Behavior

**Goal:** Verify that products with draft content are marked UPDATED while products without draft content are marked SKIPPED.

**Steps:**

1. Navigate to `/projects/{id}/automation/playbooks`.
2. Select "Fix missing SEO titles" playbook.
3. Generate a preview that creates drafts for some products.
4. Note which products have draft suggestions visible in the preview.
5. Add a new product to the project (this product won't have a draft).
6. Refresh the estimate to include the new product in scope.
7. Apply the playbook.

**Expected:**

- Products with draft content: status = `UPDATED`, seoTitle is populated.
- Products without draft content (newly added): status = `SKIPPED`, seoTitle remains null.
- The apply result summary shows correct counts for UPDATED and SKIPPED.

---

## TC-5 – Resume and Apply Later

**Goal:** Verify that users can preview, navigate away, return, and apply without regenerating AI content.

**Steps:**

1. Navigate to `/projects/{id}/automation/playbooks`.
2. Select a playbook and click **Generate preview**.
3. Wait for preview samples to appear.
4. Navigate away (e.g., to `/projects/{id}/overview`).
5. Return to the Playbooks page.
6. Verify the preview is restored from session.
7. Complete the estimate and apply flow.

**Expected:**

- Preview samples are restored when returning to Playbooks.
- "Saved preview found" helper appears.
- No additional AI calls are made during the return.
- Apply uses the original draft content.
- Products are updated successfully.

---

## Contract Checks – TEST-AUTO-PB-1.3 Layer

For TEST-AUTO-PB-1.3 to be considered complete:

- [ ] PLAYBOOK_RULES_CHANGED returns 409 and causes zero DB mutations.
- [ ] PLAYBOOK_DRAFT_NOT_FOUND returns 409 and causes zero DB mutations.
- [ ] Apply with valid draft calls AI exactly zero times.
- [ ] Products with draft content get UPDATED; products without get SKIPPED.
- [ ] Resume flow preserves drafts and does not regenerate AI content.
- [ ] All assertions are verified at both E2E and integration test levels.

---

## Automated Test Coverage

The following automated tests enforce these contracts:

**E2E Tests:** `apps/api/test/e2e/automation-playbooks.e2e-spec.ts`

- `returns 409 PLAYBOOK_RULES_CHANGED when rulesHash differs`
- `returns 409 PLAYBOOK_DRAFT_NOT_FOUND when no draft exists`
- `returns 409 PLAYBOOK_SCOPE_INVALID when scope changes`
- `apply uses draft suggestions without calling AI`
- `uses stored draft items for UPDATED vs SKIPPED`
- `supports resume/apply later`

**Integration Test:** `apps/api/test/integration/automation-playbooks.apply.no-ai.spec.ts`

- `applyPlaybook must NOT call AiService.generateMetadata`
