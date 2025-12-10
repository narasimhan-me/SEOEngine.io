# Phase AE-1.3 – Answer Block Persistence Manual Testing

> Manual testing guide for persistent Answer Blocks (AE-1.3) for Shopify products.

---

## Overview

- Purpose of the feature/patch:
  - Verify that Answer Blocks (10 canonical questions) are persisted per product and become the canonical answer source for downstream systems.
- High-level user impact and what "success" looks like:
  - Shopify merchants can generate, edit, and rely on stable Answer Blocks that survive reloads and future sessions.
  - DEO Score, Issues Engine, and Automation Engine use the persisted answers rather than ephemeral responses.
- Related phases/sections in IMPLEMENTATION_PLAN.md:
  - Phase AE-1 – Answer Engine Foundations (Model & Spec)
  - Phase AE-1.1 – Answer Engine Detection & API
  - Phase AE-1.2 – Answer Engine Generation & UI Integration
  - Phase AE-1.3 – Answer Block Persistence (this phase)
  - EngineO.ai v1 – Shopify-Only Launch Scope
- Related documentation:
  - docs/ANSWER_ENGINE_SPEC.md (AE-1.0–AE-1.3)
  - docs/deo-score-spec.md
  - docs/deo-issues-spec.md
  - docs/AUTOMATION_ENGINE_SPEC.md

---

## Preconditions

- Environment requirements:
  - Backend API running (local or staging) with Prisma migrations for Answer Block persistence applied.
  - Frontend app running with Product Workspace → AEO / Answers tab enabled.
  - AI provider configured for answer generation (as in AE-1.2).
  - Redis/queues configured if Answer-related jobs are offloaded.
- Test accounts and sample data:
  - Shopify development store connected to a test project.
  - At least one product with rich metadata (title, description, attributes).
  - At least one product with sparse metadata (minimal description).
  - Test users on Free, Pro, and Business plans (if plan-specific behavior is implemented in AE-1.3).
- Required user roles or subscriptions:
  - Confirm which tiers can generate/edit persistent Answer Blocks; test at least Pro/Business flows end-to-end.

---

## Test Scenarios (Happy Path)

### Scenario AE13-HP-001: Persisting Generated Answer Blocks per Product

Preconditions:
- Test project connected to Shopify store.
- Product with sufficient description and attributes for answer generation.

Steps:
1. Open Product Workspace for the chosen product and navigate to the AEO / Answers tab.
2. Trigger Answer Block generation for all 10 canonical questions (or the subset supported in UI).
3. Wait for generation to complete and ensure answers appear with confidence scores.
4. Reload the Product Workspace page or navigate away and back to the same product.

Expected Results:
- Previously generated Answer Blocks still appear after reload (no loss of data).
- Answer content, confidence, and question IDs remain consistent.
- Any visible timestamps or version indicators (if exposed) are stable and reflect persistence, not a fresh ephemeral generation.

---

### Scenario AE13-HP-002: Editing and Saving Answer Blocks

Preconditions:
- At least one product with persisted Answer Blocks from AE13-HP-001.

Steps:
1. Open Product Workspace → AEO / Answers tab for the product with persisted answers.
2. Edit the answer text for one or more questions (e.g., update wording or clarify a detail).
3. Save the changes using the provided UI controls.
4. Reload the product page or switch to another product and back.

Expected Results:
- Edited answers remain exactly as saved (no reversion to AI-generated content).
- Confidence/source metadata reflects that the answer is user edited (where exposed).
- Any subsequent non-editing reloads do not trigger new AI generations for the edited questions.

---

### Scenario AE13-HP-003: Downstream Consumption (DEO Score / Issues / Automations)

Preconditions:
- Product with persisted Answer Blocks, including both strong and intentionally weak/missing answers.

Steps:
1. Ensure DEO signals/score recomputation has run for the project (via scheduled or manual trigger).
2. Open Project Overview and confirm DEO Score and Answerability indicators.
3. Open Issues view and inspect issues related to answerability (e.g., "Not answer-ready", "Weak intent match").
4. If Answer Block automations are enabled, verify that they do not overwrite high-quality user-edited answers.

Expected Results:
- DEO Score v2 Answerability component and related indicators reflect the presence/quality of persisted answers.
- Issues Engine uses persisted answers when determining missing/weak answerability, rather than ignoring them.
- Automation Engine interactions (if implemented) treat persisted, user-edited answers as the source of truth and avoid regressions.

---

## Edge Cases

### AE13-EC-001: Product Without Sufficient Data

Description: Product has minimal metadata; Answer Engine cannot safely generate good answers.

Steps:
1. Choose a product with only a short title and no meaningful description.
2. Attempt to generate Answer Blocks.

Expected Behavior:
- System either refuses to generate answers or marks most questions as "cannot answer".
- No low-quality or hallucinated answers are persisted.
- UI clearly communicates limitations to the user.

---

### AE13-EC-002: Shopify Product Deleted or Disconnected

Description: Product is removed from Shopify or the integration is disconnected.

Steps:
1. Persist answers for a Shopify product.
2. Delete the product in Shopify or disconnect the Shopify integration.
3. Observe how the system handles the associated Answer Blocks.

Expected Behavior:
- No orphaned Answer Blocks are surfaced in the UI.
- Either the Answer Blocks are cleaned up or clearly marked as belonging to an inactive product.
- No errors when viewing the project or remaining products.

---

## Error Handling

### AE13-ERR-001: Persistence Failure (DB Error)

Scenario: Database error occurs while saving edited Answer Blocks.

Steps:
1. Simulate a DB failure (e.g., temporarily break the connection in a controlled environment).
2. Attempt to save edited answers.

Expected Behavior:
- UI shows a clear error message and does not claim success.
- No partial or corrupted answer data is persisted.
- Logs contain actionable error details for debugging.

---

### AE13-ERR-002: Conflict Between Ephemeral Generation and Persistence

Scenario: Multiple answer-generation or save operations are triggered in quick succession.

Steps:
1. Trigger answer generation for a product.
2. Before initial persistence is confirmed, attempt another generation or edit-save cycle.

Expected Behavior:
- System resolves conflicts deterministically (e.g., last successful save wins).
- Users are not shown interleaved or inconsistent answers.
- Logs indicate any skipped or overridden operations.

---

## Limits

### AE13-LIM-001: Tier Limits for AEO v1

Scenario: Free plan with only 1 product allowed for Answer Blocks.

Steps:
1. On a Free plan workspace, persist answers for one product.
2. Attempt to persist answers for a second product.

Expected Behavior:
- Second product is blocked or warned with a clear upgrade message.
- First product's persisted answers remain intact.

---

### AE13-LIM-002: Maximum Answer Blocks per Product

Scenario: Product attempts to create more than the supported number of Answer Blocks.

Steps:
1. Try to create duplicate or extra Answer Blocks for the same question(s).

Expected Behavior:
- System enforces a single canonical Answer Block per question per product (or a clearly defined versioning model).
- UI prevents or gracefully handles duplicate attempts.

---

## Regression

### Areas potentially impacted:

- [ ] Existing AE-1.1 detection behavior (AnswerabilityStatus calculations).
- [ ] AE-1.2 Answer generation flows (ephemeral responses).
- [ ] DEO Score v1/v2 APIs and signals computation.
- [ ] Issues Engine answerability-related issue generation.
- [ ] Automation Engine product automations that interact with Answer Blocks.

### Quick sanity checks:

- [ ] Products with no Answer Blocks still behave as before.
- [ ] Ephemeral answer generation still works when persistence is disabled or not invoked.
- [ ] DEO Score and Issues APIs continue to respond without errors for projects with and without persisted Answer Blocks.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove any test projects and products created solely for AE-1.3 testing (if they should not remain).
- [ ] Verify no orphaned Answer Blocks remain for deleted products or projects.
- [ ] Reset any feature flags or environment tweaks used during testing.

---

## Approval

| Field | Value |
|-------|-------|
| Tester Name | [Pending] |
| Date | [YYYY-MM-DD] |
| Overall Status | [ ] Passed / [ ] Blocked / [ ] Failed |
| Notes | AE-1.3 Answer Block Persistence |
