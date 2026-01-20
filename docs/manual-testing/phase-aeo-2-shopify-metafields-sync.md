# Phase AEO-2 – Shopify Metafields Sync for Answer Blocks (Manual Testing)

> Manual testing guide for Phase AEO-2: syncing persisted Answer Blocks to Shopify metafields for Shopify-connected projects.

---

## Overview

- Purpose of the feature/patch:
  Verify that persisted Answer Blocks (AE-1.3) can be synced into Shopify product metafields under the engineo namespace, using canonical keys per question type.

- High-level user impact and what "success" looks like:
  Merchants with Shopify connected see canonical, non-hallucinated answers surfaced as metafields on products.
  Automation Engine v1 can generate/update Answer Blocks and, when enabled, sync them to Shopify without breaking existing SEO/metadata behavior.

- Related phases/sections in IMPLEMENTATION_PLAN.md:
  Phase AE-1.3 – Answer Block Persistence
  Phase UX-2 – Product Workspace AEO and Automation UI
  Phase AE-2 / AUE-2 – Product Automations and Shopify sync
  Phase AEO-2 – Shopify Metafields Sync for Answer Blocks (this document)

- Related documentation:
  docs/ANSWER_ENGINE_SPEC.md
  docs/AUTOMATION_ENGINE_SPEC.md
  SHOPIFY_INTEGRATION.md
  docs/manual-testing/automation-engine-v1-shopify-answer-block-automations.md
  docs/manual-testing/phase-shop-api-1-graphql-migration.md (GraphQL migration reference)
  docs/MANUAL_TESTING_TEMPLATE.md (canonical structure reference)

---

## Preconditions

- Environment requirements:
  - Backend API running (NestJS apps/api) with access to the test PostgreSQL database.
  - Frontend app running with Product Workspace enabled.
  - .env / .env.test configured with valid SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL, and SHOPIFY_SCOPES.
  - Background workers enabled for Answer Block automations (Redis on, worker process running) or ability to trigger equivalent flows in-process.

- Test accounts and sample data:
  - Test Shopify store with at least 2–3 products suitable for Answer Engine (non-trivial descriptions).
  - EngineO.ai test user on Pro or Business plan.
  - Project connected to the test Shopify store via /shopify/install → /shopify/callback.
  - At least one product with Answer Blocks persisted (either via automation or manual save in the AEO tab).

- Required user roles or subscriptions:
  - Pro or Business plan workspace for validating automation-driven sync.
  - (Optional) Free plan workspace to confirm that metafield sync does not run when Answer Block automations are gated by plan.

---

## Test Scenarios (Happy Path)

### Scenario AEO2-HP-001: Metafield Definitions Created on Store Connect

ID: AEO2-HP-001

Preconditions:

- [ ] New or existing EngineO.ai project without prior Shopify metafield definitions for engineo namespace.

Steps:

1. Log in as a Pro/Business user and create a new project (or reuse an existing one) suitable for Shopify integration.
2. From the project overview, initiate the Shopify connect flow (Connect Shopify → /shopify/install).
3. Complete the Shopify OAuth flow and confirm redirect back to the project page.
4. In the database or via the Shopify Admin UI:
   Navigate to Settings → Custom data → Products.
   Inspect metafield definitions under namespace engineo.

Expected Results:

- UI: Project shows Shopify as connected without regressions to the existing sync UX.
- API: An Integration row exists for the project with type SHOPIFY, populated externalId and accessToken.
- Shopify Admin: Metafield definitions exist for the following keys (type multi_line_text_field, owner/product-level):
  - engineo.answer_what_is_it
  - engineo.answer_key_features
  - engineo.answer_how_it_works
  - engineo.answer_materials
  - engineo.answer_benefits
  - engineo.answer_dimensions
  - engineo.answer_usage
  - engineo.answer_warranty
  - engineo.answer_faq
  - engineo.answer_care_instructions

---

### Scenario AEO2-HP-002: Enable Metafield Sync in Project Settings

ID: AEO2-HP-002

Preconditions:

- [ ] Project connected to Shopify as in AEO2-HP-001.

Steps:

1. Open Project Settings for the connected project (/projects/:id/settings).
2. Locate the AI Automation Rules section.
3. Toggle "Sync Answer Blocks to Shopify metafields" on.
4. Save changes and confirm the global save banner shows success.
5. Refresh the page and confirm the toggle persists in the enabled state.

Expected Results:

- UI: New toggle is present, labeled clearly with minimal copy, and persists after page reload.
- API: PUT /projects/:id includes aeoSyncToShopifyMetafields: true and the response reflects the new value.
- Database: Project.aeoSyncToShopifyMetafields is true for the project.

---

### Scenario AEO2-HP-003: Automation Generates Answer Blocks and Syncs Metafields

ID: AEO2-HP-003

Preconditions:

- [ ] Project connected to Shopify.
- [ ] aeoSyncToShopifyMetafields enabled in settings.
- [ ] Redis/queues or equivalent automation processing enabled.

Steps:

1. In Shopify, ensure a product has rich title/description content suitable for Answer Engine.
2. From EngineO.ai, run a product sync (via Products UI or /shopify/sync-products).
3. In the Product Workspace for that product:
   Open Answers (AEO) tab.
   Trigger Run Answer Block automation if Answer Blocks do not yet exist.
4. Wait for the automation to complete and verify persisted Answer Blocks appear in the Answer Blocks (AEO) panel.
5. After automation completion, wait briefly for metafield sync (same job).
6. In Shopify Admin → Product → Metafields, inspect the engineo namespace values.

Expected Results:

- UI (EngineO):
  - Answer Blocks render in the AEO tab with reasonable content.
  - The small text under "Answers (AEO)" mentions that answers can be synced as metafields when enabled in Settings.
  - Automation history for the product includes an entry with action answer_blocks_synced_to_shopify showing success.
- API / DB:
  - AnswerBlockAutomationLog contains at least one row with action = 'answer_blocks_synced_to_shopify' and status = 'succeeded'.
  - No fatal errors are logged when metafield sync completes.
- Shopify Admin:
  - Relevant metafields under engineo are populated with the Answer Block text (e.g. answer_what_is_it matches the "What is it?" Answer Block).

---

### Scenario AEO2-HP-004: Manual Edit of Answer Blocks and Subsequent Sync

ID: AEO2-HP-004

Preconditions:

- [ ] All from AEO2-HP-003.

Steps:

1. In Product Workspace → Answers (AEO), manually edit one or more Answer Blocks (e.g., "What is it?" or "Key features").
2. Click Save Answer Blocks and wait for confirmation.
3. Trigger the Answer Block automation again (if applicable) or wait for the next automation run that updates the same product.
4. After automation completes, verify that:
   - User edits are respected (not blindly overwritten unless spec allows).
   - Metafields in Shopify update to reflect the latest canonical answer text.

Expected Results:

- UI: Edited Answer Blocks remain consistent with user expectations and are not regressed by automation.
- Shopify Admin: Metafields reflect the updated answers after sync, matching the persisted state in EngineO rather than an older version.

---

### Scenario AEO2-HP-005: Manual "Sync now" from Answer Blocks panel

ID: AEO2-HP-005

Preconditions:

- [ ] All from AEO2-HP-003 (Shopify connected, metafield definitions present, aeoSyncToShopifyMetafields enabled).
- [ ] Workspace on Pro or Business plan.
- [ ] At least one product with persisted Answer Blocks.

Steps:

1. In Product Workspace → Answers (AEO), open a product that already has Answer Blocks.
2. Confirm the "Answer Blocks (Canonical Answers)" panel is visible and shows at least one block.
3. Click the "Sync now" button in the Answer Blocks panel.
4. Wait for the toast/notification indicating the result of the sync.
5. In Shopify Admin, open the same product and inspect Product → Metafields → engineo.\* values.

Expected Results:

- UI: "Sync now" button is visible whenever Answer Blocks exist and shows a short loading state while the request is in flight.
- UI: On success, a success toast appears (optionally mentioning the number of Answer Blocks synced) and no validation errors are shown.
- Shopify Admin: Metafields under the engineo namespace update to match the latest Answer Block content for the product (only keys with Answer Blocks are written).
- Automation history: AnswerBlockAutomationLog contains an entry with triggerType = 'manual_sync', action = 'answer_blocks_synced_to_shopify', and status = 'succeeded'.

Variants:

- **Toggle OFF:**
  - aeoSyncToShopifyMetafields is disabled in Project Settings.
  - "Sync now" still appears in the Answer Blocks panel.
  - Clicking the button surfaces a clear "Sync is off in Settings" style message and no Shopify writes occur.
  - Automation history shows a new AnswerBlockAutomationLog row with triggerType = 'manual_sync', action = 'answer_blocks_synced_to_shopify', status = 'skipped', and errorMessage containing sync_toggle_off.
- **Free plan:**
  - Workspace is on the Free plan.
  - Clicking "Sync now" shows an upgrade/limit-style toast and does not perform a Shopify write.
  - The manual sync endpoint either is not called or returns status = 'skipped', reason = 'plan_not_entitled'.
  - No Shopify metafield changes are observed; if logged, AnswerBlockAutomationLog shows a skipped entry with plan_not_entitled.
- **Partial blocks:**
  - Only a subset of canonical questions have Answer Blocks for the product.
  - After clicking "Sync now", only the corresponding metafield keys (e.g., engineo.answer_what_is_it, engineo.answer_key_features) are written/updated.
  - No unexpected metafields are created for missing questions.
- **Shopify GraphQL failure:**
  - Simulate or force a failure in the metafieldsSet call (e.g., by pointing to a mock that returns errors).
  - UI surfaces a clear error toast/message indicating the sync failed.
  - Automation history shows a failed 'answer_blocks_synced_to_shopify' entry with triggerType = 'manual_sync' and an errorMessage derived from the underlying Shopify error(s).

---

## Edge Cases

### AEO2-EC-001: Unknown or Future Question IDs

Description: Answer Blocks exist with questionId values not in the canonical 10-question set.

Steps:

1. Using a controlled environment or DB seeding, create AnswerBlock rows with an unknown questionId (e.g., legacy_custom_question).
2. Ensure the rest of the setup is as in AEO2-HP-003 (flag enabled, Shopify connected).
3. Trigger Answer Block automation and metafield sync for the affected product.

Expected Behavior:

- Unknown questionId values are skipped for metafield sync.
- Automation logs may record that some question IDs were skipped, but no errors are thrown.
- Shopify metafields remain unchanged for unknown IDs; no unexpected keys appear.

---

### AEO2-EC-002: No Answer Blocks Persisted

Description: Project has metafield sync enabled but no Answer Blocks exist yet.

Steps:

1. Enable aeoSyncToShopifyMetafields in settings.
2. Pick a product with no Answer Blocks (newly synced or manually cleared).
3. Trigger metafield sync indirectly by running Answer Block automation and confirming it skips generation (e.g., insufficient data).

Expected Behavior:

- Metafield sync returns gracefully with syncedCount = 0.
- No metafields are created in Shopify for that product.
- Logs indicate "no Answer Blocks to sync" rather than an error.

---

## Error Handling

### AEO2-ERR-001: Shopify Admin API Failure During Definition Ensure

Scenario: Shopify metafield_definitions endpoint fails (e.g., 5xx or auth error).

Steps:

1. In a test environment, misconfigure the Shopify app or mock Shopify to return a failing response for metafield_definitions calls.
2. Attempt to connect a Shopify store or explicitly trigger metafield definition ensure logic.

Expected Behavior:

- EngineO logs a clear warning about failing to list or create metafield definitions.
- Project connection remains valid; user is not blocked from using the app.
- Metafield sync for Answer Blocks may skip due to missing definitions, but does not crash the automation worker.

---

### AEO2-ERR-002: Shopify Admin API Failure During Metafield Upsert

Scenario: Shopify products/{id}/metafields call fails for one or more keys.

Steps:

1. Configure or mock Shopify to return an error for the metafield POST/PUT calls.
2. Trigger Answer Block automation and metafield sync as in AEO2-HP-003.

Expected Behavior:

- Automation log records answer_blocks_synced_to_shopify with status = 'failed' and an error message from Shopify.
- Core Answer Block automation log (generate_missing / regenerate_weak) remains succeeded.
- No partial data corruption; either specific keys fail gracefully or are retried in a controlled way in future runs.

---

## Limits

### AEO2-LIM-001: Rate Limiting (2 Requests/sec)

Scenario: Multiple products are processed in quick succession, ensuring the 2 requests/sec guideline is respected.

Steps:

1. Enable aeoSyncToShopifyMetafields on a project with multiple products.
2. Trigger Answer Block automation for several products at once (e.g., via product sync).
3. Monitor logs and any observability around Shopify API usage.

Expected Behavior:

- Shopify calls from the metafield sync layer are rate-limit aware (no obvious 429s from Shopify).
- EngineO logs do not show bursty or unbounded Shopify request patterns.

---

## Regression

### Areas potentially impacted:

- [ ] Existing Shopify product sync behavior (/shopify/sync-products) and SEO metafield updates.
- [ ] Answer Engine generation and Answer Block persistence (AE-1.2 / AE-1.3).
- [ ] Automation Engine v1 Answer Block automations and logs.
- [ ] Project settings page (other toggles and integration status).

### Quick sanity checks:

- [ ] Shopify product sync still creates/updates local products with correct SEO metadata.
- [ ] Existing Answer Blocks remain editable and persist correctly via the AEO tab.
- [ ] Disabling aeoSyncToShopifyMetafields stops new metafield syncs without affecting Answer Block generation.
- [ ] Free plan behavior for Answer Block automations is unchanged (no unexpected metafield sync).

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove or reset any test projects, products, and Answer Blocks created for testing.
- [ ] Disconnect the test Shopify store if necessary.
- [ ] Reset aeoSyncToShopifyMetafields to its original value for shared test projects.

### Follow-up verification:

- [ ] Confirm that no stray or malformed metafield definitions remain in the Shopify test store.
- [ ] Verify that related automation and Answer Engine logs look healthy after testing.

---

## Known Issues

- Intentionally accepted issues:
  None identified at this phase; document any discovered issues here during testing.

- Out-of-scope items:
  - Embedded app UX inside Shopify Admin.
  - Non-Shopify ecommerce platforms.
  - Automated removal/cleanup of metafields when Answer Blocks are deleted (handled separately if needed).

- TODOs:
  - Expand automated test coverage around rate-limiting and multi-product sync scenarios if/when workloads increase.

---

## Approval

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| Tester Name    | [Name]                                |
| Date           | [YYYY-MM-DD]                          |
| Overall Status | [ ] Passed / [ ] Blocked / [ ] Failed |
| Notes          | [Any additional notes]                |
