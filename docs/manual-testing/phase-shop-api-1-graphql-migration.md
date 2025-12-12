# EngineO.ai – Manual Testing: Phase SHOP-API-1 – Shopify Product API Migration (REST → GraphQL)

---

## Overview

- **Purpose of the feature/patch:**
  - Validate that all Shopify product sync and SEO update flows in EngineO.ai now use the Shopify Admin GraphQL API instead of deprecated REST `/products` endpoints, and that metafield helper operations are GraphQL-based and AEO-2 compatible.

- **High-level user impact and what "success" looks like:**
  - Product lists in EngineO.ai load reliably from GraphQL.
  - Product Workspace SEO changes are applied via `productUpdate` mutations and reflected in Shopify Admin.
  - Product data (titles, descriptions, images, status, variants, handles, SEO) is mapped correctly.
  - Metafield helpers (`metafieldDefinitions`, `metafieldsSet`) function over GraphQL with no REST metafield calls.
  - No regressions for existing DEO/AEO/Automation Engine behavior.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase SHOP-API-1 – Shopify Product API Migration (REST → New GraphQL Product APIs)
  - Phase AEO-2 – Shopify Metafields Sync for Answer Blocks (regression coverage)

- **Related documentation:**
  - `SHOPIFY_INTEGRATION.md`
  - `IMPLEMENTATION_PLAN.md` (Phase SHOP-API-1, Phase AEO-2)
  - `docs/testing/shopify-integration.md`
  - `docs/testing/product-sync.md`
  - `docs/testing/metadata-sync-seo-fields.md`
  - `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and app OAuth configuration valid for the dev store.
  - [ ] EngineO.ai backend and frontend running locally (e.g., `pnpm dev:api`, `pnpm dev:web`) and connected to the dev store.
  - [ ] GraphQL Admin API version configured to `2024-01` (or current) and consistent across calls.
  - [ ] Logging enabled for Shopify calls (console, file, or structured logger in `apps/api`).

- **Test accounts and sample data:**
  - [ ] Shopify dev store with at least 5–10 products (mix of:
    - Products with SEO titles/descriptions set.
    - Products with empty or weak SEO metadata.
    - Products with multiple images and variants.)
  - [ ] EngineO.ai project connected to this Shopify store and fully onboarded.
  - [ ] At least one product with Answer Blocks generated (for AEO-2 regression checks).

- **Required user roles or subscriptions:**
  - [ ] EngineO.ai account with access to the connected project.
  - [ ] Plan tier sufficient to use Product Workspace and AEO features (e.g., Pro/Business for full coverage).

---

## Test Scenarios (Happy Path)

### Scenario 1: GraphQL Product Sync from Products Admin

**ID:** HP-001

**Preconditions:**
- Project is connected to the Shopify dev store.
- Products exist in Shopify and have not yet been fully synced into EngineO.ai.

**Steps:**
1. In EngineO.ai, go to **Admin → Products** (or the main Products list for the connected project).
2. Trigger **Sync Products** (using the existing sync control/button).
3. Open the browser dev tools Network tab and filter for `graphql.json`.
4. Observe the backend logs for Shopify calls during the sync.

**Expected Results:**
- **UI:**
  - Product list populates with Shopify products without errors.
  - Titles, descriptions, handles, SEO columns (where present), images, and variants appear as expected.
- **API:**
  - Requests go to `POST https://{shop}/admin/api/2024-01/graphql.json`.
  - Request body includes a `query` for products (e.g., `query GetProducts`) with cursor-based pagination (`first`, `after`).
  - No REST `/admin/api/*/products.json` calls are made.
- **Logs:**
  - Logs show GraphQL product queries executed (operation name present).
  - No errors about REST `/products` deprecation or missing endpoints.

---

### Scenario 2: GraphQL SEO Update from Product Workspace

**ID:** HP-002

**Preconditions:**
- At least one product is synced and visible in the Product Workspace.

**Steps:**
1. Open a specific product in the **Product Workspace**.
2. Modify the SEO Title and/or SEO Description fields.
3. Click **Apply to Shopify** (or the existing “Push/Apply to Shopify” action).
4. Observe the Network tab for GraphQL mutations.
5. After success, open the same product in **Shopify Admin → Products → Search engine listing**.

**Expected Results:**
- **UI:**
  - A success toast/notification indicates the SEO fields were applied.
  - No REST-related errors surface in the UI.
- **API:**
  - A GraphQL mutation is sent to `.../graphql.json` with an operation like `mutation productUpdate` or `UpdateProductSeo`.
  - The payload includes the product GID (`gid://shopify/Product/{id}`) and `seo { title, description }`.
  - Shopify returns updated SEO fields and **no** `userErrors` for valid input.
- **Logs:**
  - Logs record the GraphQL mutation and success outcome (including any returned `userErrors` on failure tests below).
- **Shopify Admin:**
  - The SEO title and description in **Search engine listing** match the values applied from EngineO.ai.

---

### Scenario 3: Product Data Mapping & Shopify Admin Validation

**ID:** HP-003

**Preconditions:**
- Products have been synced via Scenario HP-001.

**Steps:**
1. In EngineO.ai, open one of the synced products in the Products list or Product Workspace.
2. Note the following fields:
   - Title
   - Description / body
   - Images (thumbnails and count)
   - Status
   - Product type
   - Vendor
   - Variants (titles and prices)
   - Handle
3. Open the same product in **Shopify Admin → Products**.
4. Compare each field between EngineO.ai and Shopify Admin.

**Expected Results:**
- **UI:**
  - All listed fields appear populated for products that have those fields in Shopify.
  - No unexpected `null`/blank fields where Shopify has data.
- **API:**
  - GraphQL mapping correctly converts `descriptionHtml` to EngineO’s description/body.
  - Images and variants arrays in GraphQL are correctly reflected in the EngineO data model.
- **Logs:**
  - No mapping or parse errors for GraphQL responses.

---

### Scenario 4: GraphQL Metafield Helper & AEO-2 Regression (Answer Blocks)

**ID:** HP-004

**Preconditions:**
- AEO-2 (Shopify Metafields Sync for Answer Blocks) is enabled in the environment.
- The project-level flag `aeoSyncToShopifyMetafields` is **enabled** for the test project.
- At least one product has persisted Answer Blocks.

**Steps:**
1. For a product with Answer Blocks, navigate to **Product Workspace → Answers (AEO)**.
2. Ensure Answer Blocks exist (generate them via automation if necessary).
3. Trigger whatever action (automation or manual sync) is used to sync Answer Blocks to Shopify metafields.
4. In the Network tab, filter for GraphQL requests related to metafields.
5. Optionally, manually call any exposed test/debug endpoint that uses the metafield helper to verify behavior in isolation.
6. Open the product in **Shopify Admin → Products → Metafields**.

**Expected Results:**
- **UI:**
  - No UI errors when syncing Answer Blocks.
- **API:**
  - GraphQL `metafieldDefinitions` query is used to look up `engineo` namespace definitions.
  - GraphQL `metafieldsSet` mutation is called with:
    - `ownerId` set to the product GID.
    - `namespace = "engineo"`.
    - Keys mapped from Answer Block question IDs (e.g., `answer_what_is_it`, `answer_key_features`, etc.).
  - No REST `/metafields*.json` calls are made.
- **Logs:**
  - Logs show successful metafield definition lookup/creation and `metafieldsSet` mutation execution.
- **Shopify Admin:**
  - Under the product’s Metafields section, Answer Block content appears with the expected namespace/keys and values.

> If AEO-2 is not enabled in a given environment, validate the metafield helper via direct API or mocked integration tests and then run full AEO-2 flows using `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md` in an environment where it is enabled.

---

## Edge Cases

### EC-001: Large Catalog Pagination

**Description:** Validate cursor-based pagination and basic rate-limit friendliness when syncing more than 50 products.

**Steps:**
1. Use a Shopify dev store (or fixture) with **50+ products** (ideally 80–120).
2. Trigger a full product sync from EngineO.ai.
3. In the Network tab, observe multiple GraphQL product queries with `first` and `after` variables.
4. Check the EngineO.ai Products list and/or DB product count after sync completes.

**Expected Behavior:**
- Multiple paginated GraphQL calls are issued (`pageInfo.hasNextPage` respected).
- The final product count in EngineO.ai matches the count in Shopify (within reasonable expectations for test data).
- No GraphQL rate-limit errors are surfaced to the user.

---

### EC-002: Products with Minimal or Missing Data

**Description:** Ensure products with sparse data (e.g., missing descriptions or images) do not break GraphQL mapping.

**Steps:**
1. In Shopify, create or identify products with:
   - No description.
   - No images.
   - Single variant vs. multiple variants.
2. Trigger product sync.
3. Inspect these products in EngineO.ai.

**Expected Behavior:**
- Products still appear in the list/workspace.
- Missing fields show as empty or placeholder (not errors).
- No runtime errors in logs due to null/undefined fields from GraphQL.

---

## Error Handling

### ERR-001: Shopify GraphQL Rate Limit / Transport Failure

**Scenario:** GraphQL calls hit temporary rate limits or network errors during product sync.

**Steps:**
1. Rapidly trigger product sync multiple times (or use a store with many products).
2. Optionally simulate network delay/failure via dev tools or test configuration.

**Expected Behavior:**
- **UI:** Displays a clear, user-friendly error or retry message if sync fails; no raw GraphQL error dumps.
- **API:** Built-in throttling (~2 requests/sec) minimizes rate-limit responses; any `429`/transport errors are caught and handled gracefully.
- **Logs:** Errors are logged with enough detail (status codes, operation names) to debug without exposing sensitive data.

---

### ERR-002: Validation Errors on SEO Update (GraphQL userErrors)

**Scenario:** Submitting invalid SEO content (e.g., empty or excessively long) triggers Shopify GraphQL `userErrors`.

**Steps:**
1. Open a product in Product Workspace.
2. Set SEO Title/Description to:
   - Empty or whitespace-only values.
   - Extremely long text beyond reasonable limits.
3. Click **Apply to Shopify**.

**Expected Behavior:**
- **UI:** Shows a clear validation or error message that indicates Shopify rejected the update (not just a generic failure).
- **API:** `productUpdate` response contains `userErrors` entries; EngineO.ai surfaces these in logs and/or error payloads.
- **Logs:** Log entries capture the `userErrors` fields (message, field) without logging sensitive content.

---

### ERR-003: Invalid or Expired Shopify Access Token

**Scenario:** The stored Shopify access token is invalidated, causing GraphQL authentication failures.

**Steps:**
1. In a non-production environment, temporarily corrupt or revoke the stored access token for the project (e.g., set to an invalid value).
2. Attempt a product sync and/or SEO update.

**Expected Behavior:**
- **UI:** Shows a clear error indicating Shopify authentication failed and prompts reconnection.
- **API:** GraphQL calls return appropriate auth errors; no REST fallback is attempted.
- **Logs:** Logs clearly indicate authentication failure and include guidance such as “Reconnect Shopify” or similar.

---

## Limits

### LIM-001: GraphQL Throughput Limits

**Scenario:** System approaches Shopify Admin GraphQL rate limits during heavy product sync usage.

**Steps:**
1. On a store with many products, repeatedly trigger syncs (or simulate via test harness).
2. Monitor GraphQL call volume and any rate-limit responses.

**Expected Behavior:**
- Built-in throttling (minimum interval between requests) keeps the app within Shopify’s safe limits.
- If limits are hit, calls back off and surface controlled errors rather than cascading failures.

---

### LIM-002: Plan/Entitlement Limits (Indirect)

**Scenario:** Plans that restrict product count or AEO features should not break GraphQL transport.

**Steps:**
1. Using a lower-tier plan (e.g., Free), sync products and open Product Workspace.
2. Ensure plan limits are enforced at the business logic layer, not by breaking GraphQL calls.

**Expected Behavior:**
- GraphQL sync still functions; limits are applied in EngineO.ai (e.g., only a subset of products/operations available).
- No GraphQL-specific errors due to entitlements.

---

## Regression

### Areas potentially impacted:

- [ ] **Product Sync (CP-006):** Initial and incremental product sync flows from Shopify to EngineO.ai.
- [ ] **Product Workspace:** Display of product details, SEO fields, and Apply to Shopify actions.
- [ ] **AEO-2 Metafield Sync:** Answer Block metafields written via GraphQL helpers (`metafieldsSet`).
- [ ] **SEO Scan Pipeline:** Product handle resolution for SEO scans using GraphQL product queries.

### Quick sanity checks:

- [ ] Re-run `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md` to ensure Answer Block metafield sync remains healthy under GraphQL.
- [ ] Confirm `tests/unit/shopify/shopify-graphql-*.test.ts` and `tests/integration/shopify/shopify-graphql-*.integration.test.ts` pass locally.
- [ ] Open `IMPLEMENTATION_PLAN.md` and verify:
  - Phase SHOP-API-1 section exists.
  - Status is **Complete**.
  - Acceptance criteria match observed behavior in this manual testing.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Optionally revert any obviously “test” SEO titles/descriptions in Shopify Admin to avoid polluting real data.
- [ ] Remove or clearly mark any test products created solely for GraphQL pagination or sparse-data tests.
- [ ] Restore the correct Shopify access token for the project if it was intentionally corrupted for testing.

### Follow-up verification:

- [ ] Confirm there are no leftover error logs related to GraphQL migration after tests complete.
- [ ] Verify that subsequent daily usage (normal product syncs and SEO updates) behave as expected.

---

## Known Issues

- **Intentionally accepted issues:**
  - None known specific to SHOP-API-1 at this time; see AEO-2 manual testing docs for Answer Block/metafield limitations.

- **Out-of-scope items:**
  - Non-product Shopify surfaces (e.g., collections, blogs) remain REST/untouched by this phase.
  - Future AEO-2+ enhancements to metafield behavior beyond basic sync.

- **TODOs:**
  - [ ] Add automated regression tests for more GraphQL error scenarios as they are implemented.

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** |  |
| **Date** |  |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** |  |
