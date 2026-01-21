# Automation Engine v1 – Shopify Answer Block Automations Manual Testing

> Manual testing guide for Automation Engine v1 Answer Block automations for Shopify products (v1 launch requirement).

---

## Overview

- Purpose of the feature/patch:
  - Validate that Automation Engine v1 can detect missing/weak Answer Blocks for Shopify products and auto-generate or refresh them using the Answer Engine pipeline.
- High-level user impact and what "success" looks like:
  - Pro/Business Shopify merchants see Answer Blocks automatically created or improved for eligible products.
  - Free plan users remain limited to manual/ephemeral answers (no Answer Block automations).
- Related phases/sections in IMPLEMENTATION_PLAN.md:
  - Phase AE-1 – Automation Engine Foundations
  - Phase AE-2 – Product Automations
  - Phase AUE-1 – New Product SEO Title Auto-Generation
  - Phase AE-1.3 – Answer Block Persistence
  - EngineO.ai v1 – Shopify-Only Launch Scope
- Related documentation:
  - docs/AUTOMATION_ENGINE_SPEC.md (Section 8.7 – Shopify Answer Block Automations)
  - docs/ANSWER_ENGINE_SPEC.md (AE-1.x)
  - docs/deo-issues-spec.md
  - docs/ENTITLEMENTS_MATRIX.md

---

## Preconditions

- Environment requirements:
  - Backend API running with Automation Engine v1 and AE-1.3 persistence implemented.
  - Frontend Product Workspace with AEO / Answers tab and Automation views enabled.
  - AI provider configured; automation-related AI usage limits enforced.
  - Background job processing (queues/workers) enabled if automations run off the main process.
- Test accounts and sample data:
  - Test Shopify store connected with a mix of products:
    - Some with no Answer Blocks.
    - Some with weak or partial answers.
    - Some with high-quality, user-edited Answer Blocks.
  - Test users on Free, Pro, and Business plans.
- Required user roles or subscriptions:
  - Confirm Pro/Business plans are eligible for Answer Block automations.
  - Confirm Free plan is limited to manual or ephemeral Answer flows.

---

## Test Scenarios (Happy Path)

### Scenario AB-AUTO-HP-001: product_synced Trigger (Pro/Business)

Preconditions:

- Pro or Business workspace with Shopify integration connected.
- Product in Shopify with sufficient metadata but no Answer Blocks yet.

Steps:

1. Add or update a product in Shopify that should be eligible for Answer Blocks (e.g., good title/description).
2. Trigger a product sync from EngineO.ai (via Products UI or dedicated sync control).
3. Wait for Automation Engine v1 to process any product_synced events.
4. Open Product Workspace → AEO / Answers tab for the synced product.

Expected Results:

- Answer Blocks are present for eligible questions without manual generation.
- Automation-related logs/activities show a record of the Answer Block automation run.
- For Pro/Business, behavior aligns with plan entitlements (no silent failure due to limits).

---

### Scenario AB-AUTO-HP-002: issue_detected Trigger for Missing/Weak Answers

Preconditions:

- Product with either no Answer Blocks or intentionally weak/incomplete answers.
- Issues Engine configured to emit answerability-related issues (e.g., not_answer_ready, weak_intent_match).

Steps:

1. Ensure Issues Engine has run for the project and emitted relevant answerability issues.
2. Confirm that Automation Engine v1 is configured to react to issue_detected triggers for these issue types.
3. Allow automations to run (either automatically or via a "Run automations" action if present).
4. Re-open Product Workspace → AEO / Answers tab to inspect the updated Answer Blocks.

Expected Results:

- Previously missing or weak answers are now generated or improved where data is sufficient.
- Answer Blocks adhere to non-hallucination rules and remain consistent with product data.
- Issues Engine reflects improved status (fewer or downgraded answerability issues) after re-run.

---

### Scenario AB-AUTO-HP-003: Plan-Aware Behavior (Free vs Pro/Business)

Preconditions:

- Workspaces on Free, Pro, and Business plans using similar Shopify test stores.

Steps:

1. For each plan, set up a product with missing Answer Blocks but good metadata.
2. Trigger product sync and allow product_synced and issue_detected triggers to fire.
3. Inspect Product Workspace → AEO / Answers tab and any Automation Activity views.

Expected Results:

- Free:
  - No automatic Answer Block generation; users remain limited to manual/ephemeral answers.
  - If any automation UI is present, it clearly indicates restrictions and suggests upgrading.
- Pro/Business:
  - Answer Blocks are generated or refreshed automatically within token/automation limits.
  - Automation logs clearly distinguish Answer Block automations from metadata automations.

---

## Edge Cases

### AB-AUTO-EC-001: Insufficient Data for Safe Answer Generation

Description: Automation is triggered, but underlying product data is too sparse or inconsistent.

Steps:

1. Choose a product with very short or low-information descriptions.
2. Ensure the product triggers product_synced or issue_detected for answerability.

Expected Behavior:

- Automation Engine skips unsafe Answer Block generation and records a reason (e.g., "insufficient data").
- No hallucinated or low-quality answers are persisted.
- UI, if surfaced, explains that automation could not safely generate answers.

---

### AB-AUTO-EC-002: Existing User-Edited Answers

Description: Product already has high-quality, user-edited Answer Blocks.

Steps:

1. Persist user-edited answers for a product (via AE-1.3 flows).
2. Trigger answerability-related automations for that product.

Expected Behavior:

- Automations do not overwrite high-quality user-edited answers without explicit configuration.
- Any changes follow a clear rule (e.g., only filling missing questions, not rewriting user edits).
- Logs indicate whether existing answers were respected or updated, and why.

---

## Error Handling

### AB-AUTO-ERR-001: AI Provider Failure During Automation

Scenario: AI provider is temporarily unavailable during an Answer Block automation run.

Steps:

1. Simulate AI provider failure (e.g., invalid key or forced network error in a controlled environment).
2. Trigger an automation for an eligible product.

Expected Behavior:

- Automation run fails gracefully and logs a clear error.
- No partial or corrupted Answer Blocks are persisted.
- UI and/or logs encourage retrying once the provider is healthy.

---

### AB-AUTO-ERR-002: Hitting AI/Automation Limits

Scenario: Workspace reaches daily AI token or automation execution limits.

Steps:

1. Trigger multiple Answer Block automations until limits are reached.
2. Attempt additional automation runs beyond the cap.

Expected Behavior:

- Additional automation runs are skipped with a clear "limit reached" reason.
- Existing Answer Blocks remain intact.
- No silent failures; logs and UI clearly communicate the situation and suggest next steps (wait/reset or upgrade).

---

## Limits

### AB-AUTO-LIM-001: Plan-Based Automation Scope

Scenario: Validate that plan-level automation capabilities match entitlements.

Steps:

1. For each plan (Free, Pro, Business), attempt to trigger Answer Block automations on similar products.

Expected Behavior:

- Behavior aligns with docs/ENTITLEMENTS_MATRIX.md and Section 8.7 of docs/AUTOMATION_ENGINE_SPEC.md.
- Free users see no Answer Block automations but may see messaging about Pro/Business capabilities.
- Pro/Business users receive automations within configured execution caps.

---

### AB-AUTO-LIM-002: Per-Product and Per-Day Limits

Scenario: Ensure per-product/per-day limits prevent over-aggressive automation.

Steps:

1. Trigger multiple automations for the same product within a short window.
2. Observe behavior once any per-product/per-day threshold is crossed (if implemented).

Expected Behavior:

- Automations that would exceed thresholds are skipped with explicit reasons.
- No thrashing or repeated rewrite of the same answers.

---

## Regression

### Areas potentially impacted:

- [ ] Existing metadata automations (AE-2.1) and AUE-1 new-product SEO automations.
- [ ] Answer Engine detection and generation flows (AE-1.1, AE-1.2).
- [ ] DEO Score recompute pipeline when Answer Blocks change.
- [ ] Issues Engine answerability-related issues.
- [ ] Shopify sync flows and product sync performance.

### Quick sanity checks:

- [ ] Metadata automations remain unaffected and behave as documented.
- [ ] Manual generation and persistence of Answer Blocks still works without automation enabled.
- [ ] Disabling Automation Engine v1 (if supported) stops Answer Block automations cleanly.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove or reset any test products created for automation testing if they should not remain.
- [ ] Verify that no unintended Answer Block changes remain in production-like data.
- [ ] Reset any temporary configuration (flags, limits) used to force error/limit scenarios.

---

## Approval

| Field          | Value                                                   |
| -------------- | ------------------------------------------------------- |
| Tester Name    | [Pending]                                               |
| Date           | [YYYY-MM-DD]                                            |
| Overall Status | [ ] Passed / [ ] Blocked / [ ] Failed                   |
| Notes          | Automation Engine v1 – Shopify Answer Block Automations |
