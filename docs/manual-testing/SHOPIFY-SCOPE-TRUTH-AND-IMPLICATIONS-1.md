# Manual Testing: SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1

> Authoritative Granted-Scope Truth Source and Capability-Aware Messaging

---

## Overview

- **Purpose of the feature/patch:**
  - Establishes authoritative granted-scope derivation after OAuth callback
  - Implements fallback to Access Scopes endpoint when OAuth scope string is empty/suspicious
  - Normalizes stored scopes (deduplicated, sorted, comma-separated)
  - Provides capability-aware permission notice messaging (catalog vs content vs combined)

- **High-level user impact and what "success" looks like:**
  - Users see accurate scope storage after fresh install or reconnect
  - Collections is not blocked when write_products is granted (implication satisfied)
  - Permission notice shows contextual messaging based on missing scopes
  - No false "missing read_products" warnings when write_products is granted

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1
  - Phase SHOPIFY-SCOPE-IMPLICATIONS-1 (predecessor)

- **Related documentation:**
  - `docs/SHOPIFY_SCOPES_MATRIX.md`
  - `docs/manual-testing/SHOPIFY-SCOPE-IMPLICATIONS-1.md`
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-006: Shopify Sync)

---

## Preconditions

- **Environment requirements:**
  - [ ] API and Web servers running locally or on staging
  - [ ] Database seeded with test projects
  - [ ] Shopify sandbox/development store available
  - [ ] Ability to install/reinstall/reconnect Shopify app

- **Test accounts and sample data:**
  - [ ] Test Shopify store (development store recommended)
  - [ ] Project in EngineO.ai ready for Shopify connection
  - [ ] Ability to view server logs (for truth source verification)

- **Required user roles or subscriptions:**
  - [ ] Any plan (Free, Pro, or Business)
  - [ ] Project OWNER role (required for Shopify install/reconnect)

- **Seed endpoint:**
  - N/A — use existing project or create a new one

---

## Test Scenarios (Happy Path)

### Scenario 1: Fresh Install — Normalized Scope Storage

**ID:** HP-001

**Preconditions:**
- Project with no existing Shopify integration
- Shopify development store available

**Steps:**
1. Navigate to `/projects/{projectId}/settings#integrations`
2. Click "Connect Shopify"
3. Complete OAuth flow with the Shopify store
4. After callback, check server logs for scope storage info

**Expected Results:**
- **UI:** Shopify connection shows as connected
- **API:** Integration stored with normalized scope string (sorted, no duplicates)
- **Logs:**
  - `[SHOPIFY-SCOPE-TRUTH-1] Storing connection: ... truthSource=oauth_scope`
  - `[SHOPIFY-SCOPE-TRUTH-1] Upserted integration: ... normalizedScopes=...`
- **Database:** `integration.config.scope` contains sorted, comma-separated scopes

---

### Scenario 2: Collections Not Blocked with write_products Only

**ID:** HP-002

**Preconditions:**
- Shopify store connected with `write_products` scope granted (but NOT explicit `read_products`)

**Steps:**
1. Navigate to `/projects/{projectId}/assets/collections`
2. Attempt to sync collections
3. Check for any "Missing read_products" warnings

**Expected Results:**
- **UI:** No "Missing read_products" permission notice displayed
- **API:** `GET /projects/:id/shopify/missing-scopes?capability=collections_sync` returns `{ missingScopes: [] }`
- **Behavior:** Collections sync proceeds normally (implication satisfied)

---

### Scenario 3: Reconnect After Reinstall — Scopes Refresh

**ID:** HP-003

**Preconditions:**
- Previously connected Shopify store
- Shopify app uninstalled and reinstalled with different scope set

**Steps:**
1. Uninstall the EngineO.ai app from Shopify admin
2. Navigate to `/projects/{projectId}/settings#integrations`
3. Click "Reconnect Shopify"
4. Complete OAuth flow
5. Check server logs for truth source

**Expected Results:**
- **UI:** Shopify connection shows as connected with new scopes
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] ... truthSource=oauth_scope` (or `access_scopes_endpoint` if OAuth scope empty)
- **Database:** `integration.config.scope` reflects new granted scopes

---

### Scenario 4: Truth Source Fallback — Access Scopes Endpoint

**ID:** HP-004

**Preconditions:**
- Ability to simulate empty OAuth scope string (E2E mode or mock)

**Steps:**
1. (In E2E mode) Trigger OAuth callback with empty scope string
2. Check server logs for fallback behavior

**Expected Results:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] ... truthSource=access_scopes_endpoint`
- **Behavior:** System fetched scopes from `/admin/oauth/access_scopes.json`
- **Database:** Scopes correctly stored from fallback source

---

### Scenario 5: Permission Notice — Catalog Wording (Missing read_products)

**ID:** HP-005

**Preconditions:**
- Shopify store connected without `read_products` scope
- No `write_products` either (so implication doesn't satisfy)

**Steps:**
1. Navigate to `/projects/{projectId}/assets/products` or `/collections`
2. Observe the permission notice

**Expected Results:**
- **UI:** Permission notice says "To sync and analyze your products and collections, EngineO.ai needs access to your store catalog."
- **List items:** "Sync Products", "Sync Collections"

---

### Scenario 6: Permission Notice — Content Wording (Missing read_content)

**ID:** HP-006

**Preconditions:**
- Shopify store connected without `read_content` scope

**Steps:**
1. Navigate to `/projects/{projectId}/assets/pages` or `/blogs`
2. Observe the permission notice

**Expected Results:**
- **UI:** Permission notice says "To sync and analyze your pages and blog posts, EngineO.ai needs access to your store content."
- **List items:** "Sync Pages", "Sync Blog posts"

---

### Scenario 7: Permission Notice — Combined Wording (Both Missing)

**ID:** HP-007

**Preconditions:**
- Shopify store connected without `read_products` or `read_content`

**Steps:**
1. Navigate to any asset page requiring permissions
2. Observe the permission notice

**Expected Results:**
- **UI:** Permission notice says "To sync and analyze your products, collections, pages, and blog posts, EngineO.ai needs access to your store catalog and content."
- **List items:** "Sync Products", "Sync Collections", "Sync Pages", "Sync Blog posts"

---

## Edge Cases

### EC-001: Duplicate Scopes in OAuth Response

**Description:** OAuth response contains duplicate scopes (e.g., "read_products,read_products")

**Steps:**
1. (Mock) Simulate OAuth callback with duplicate scopes
2. Check stored scope string

**Expected Behavior:**
- Stored scopes are deduplicated
- Only one instance of each scope in normalized string

---

### EC-002: Unsorted Scopes in OAuth Response

**Description:** OAuth response scopes are not alphabetically sorted

**Steps:**
1. (Mock) Simulate OAuth callback with unsorted scopes (e.g., "write_products,read_content,read_products")
2. Check stored scope string

**Expected Behavior:**
- Stored scopes are sorted alphabetically
- Normalized string: "read_content,read_products,write_products"

---

### EC-003: Empty OAuth Scope — Fallback Path

**Description:** OAuth token exchange returns empty or null scope string

**Steps:**
1. (E2E mode) Trigger callback with empty scope
2. Verify fallback to Access Scopes endpoint

**Expected Behavior:**
- Server logs show `truthSource=access_scopes_endpoint`
- Scopes correctly fetched from Access Scopes API
- No error shown to user

---

### EC-004: Partial/Suspicious OAuth Scope — Fallback Path

**Description:** OAuth token exchange returns fewer scopes than were requested (e.g., requested "read_products,read_content" but only got "read_products")

**Steps:**
1. (E2E mode or mock) Trigger OAuth callback where tokenData.scope is missing some requested scopes
2. Verify fallback to Access Scopes endpoint

**Expected Behavior:**
- Server logs show warning: `[SHOPIFY-SCOPE-TRUTH-1] OAuth scope suspicious: expected=[...], got=[...]`
- Server logs show `truthSource=access_scopes_endpoint_suspicious`
- Scopes correctly fetched from Access Scopes API
- No error shown to user

---

## Error Handling

### ERR-001: Access Scopes Endpoint Failure

**Scenario:** Both OAuth scope is empty AND Access Scopes endpoint fails

**Steps:**
1. (Mock) Simulate empty OAuth scope and failing Access Scopes request

**Expected Behavior:**
- Integration still created with empty scope string
- Server logs warn about failure
- User can reconnect to fix

---

## Limits

### LIM-001: N/A

**Scenario:** This feature has no entitlement/quota limits

**Steps:**
- N/A

**Expected Behavior:**
- N/A

---

## Regression

### Areas potentially impacted:

- [ ] **Shopify OAuth install flow:** Scope storage and normalization
- [ ] **Shopify OAuth reconnect flow:** Scope refresh from authoritative source
- [ ] **Permission notice UI:** Capability-aware messaging
- [ ] **Collections sync:** No false read_products warnings (implication satisfied)
- [ ] **Products sync:** Unchanged behavior
- [ ] **Pages/Blogs sync:** Still gate on read_content

### Quick sanity checks:

- [ ] Fresh install stores normalized scopes
- [ ] Collections works with write_products only (no explicit read_products)
- [ ] Permission notice shows catalog wording when read_products missing
- [ ] Permission notice shows content wording when read_content missing
- [ ] Server logs show truthSource (oauth_scope or access_scopes_endpoint)
- [ ] No console errors in OAuth callback

### Regression check (SHOPIFY-SCOPE-PARSE-ROBUSTNESS-1):

For projects with older/legacy Shopify integrations where `integration.config.scope` may be stored as a JSON array or whitespace-delimited string:

- [ ] **Collections page:** Verify `GET /projects/:id/shopify/missing-scopes?capability=collections_sync` does NOT report `read_products` missing when the integration is known to have product permissions (e.g., `write_products` or `read_products` in scope).
- [ ] **Pages page:** Verify `GET /projects/:id/shopify/missing-scopes?capability=pages_sync` does NOT falsely report `read_content` missing when the integration has content permissions.
- [ ] **Blogs page:** Verify `GET /projects/:id/shopify/missing-scopes?capability=blogs_sync` does NOT falsely report `read_content` missing when the integration has content permissions.

**To test legacy formats directly:**
1. Manually update `integration.config.scope` in the database to a JSON array format: `["read_products", "write_products"]`
2. Reload the Collections page and verify no "Missing permission: read_products" block appears.
3. Restore the scope to comma-separated format if needed.

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A — no data modifications beyond normal Shopify connection

### Follow-up verification:

- [ ] Verify scope storage is normalized in database
- [ ] Confirm no false missing scope warnings

---

## Known Issues

- **Intentionally accepted issues:**
  - Access Scopes endpoint fallback adds one extra API call when OAuth scope is empty

- **Out-of-scope items:**
  - Changing OAuth requested scopes (truth source is about granted scopes only)
  - Adding new capabilities or scopes

- **TODOs:**
  - [ ] None

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | [Any additional notes] |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-20 | Initial SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 manual testing guide |
