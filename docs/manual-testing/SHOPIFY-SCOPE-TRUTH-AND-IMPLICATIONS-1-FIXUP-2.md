# Manual Testing: SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-2

> Empty-Scope Persistence Guard and Verification Failure Handling

---

## Overview

- **Purpose of the feature/patch:**
  - Prevents persisting empty scopes to database (never downgrade stored scopes)
  - Implements safe fallback source order: Access Scopes endpoint → OAuth scope → Existing stored scope
  - Throws explicit `SHOPIFY_SCOPE_VERIFICATION_FAILED` error when all scope sources are empty
  - Surfaces "Could not verify permissions" UI message on verification failure
  - Enhanced observability for Access Scopes endpoint failures (HTTP status category, failure mode)

- **High-level user impact and what "success" looks like:**
  - Fresh installs and reconnects always store non-empty scopes (or fail explicitly)
  - Reconnect cannot accidentally downgrade existing scope storage
  - Users see clear "Could not verify permissions" message if verification fails
  - No fake missing-scope list derived from empty data
  - Pages/Blogs/Collections continue to work after reconnect (scopes retained)

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 (parent)
  - FIXUP-1 (suspicious-scope detection)
  - FIXUP-2 (this patch)

- **Related documentation:**
  - `docs/manual-testing/SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md`
  - `docs/SHOPIFY_SCOPES_MATRIX.md`
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-006: Shopify Sync)

---

## Preconditions

- **Environment requirements:**
  - [ ] API and Web servers running locally or on staging
  - [ ] Database seeded with test projects
  - [ ] Shopify sandbox/development store available
  - [ ] Ability to install/reinstall/reconnect Shopify app
  - [ ] Ability to view server logs

- **Test accounts and sample data:**
  - [ ] Test Shopify store (development store recommended)
  - [ ] Project in EngineO.ai ready for Shopify connection
  - [ ] Existing Shopify integration with stored scopes (for reconnect tests)

- **Required user roles or subscriptions:**
  - [ ] Any plan (Free, Pro, or Business)
  - [ ] Project OWNER role (required for Shopify install/reconnect)

- **Seed endpoint:**
  - N/A — use existing project or create a new one

---

## Test Scenarios (Happy Path)

### Scenario 1: Fresh Install — Scopes Stored Non-Empty

**ID:** HP-001

**Preconditions:**
- Project with no existing Shopify integration
- Shopify development store available

**Steps:**
1. Navigate to `/projects/{projectId}/settings#integrations`
2. Click "Connect Shopify"
3. Complete OAuth flow with the Shopify store
4. Check server logs for scope storage info

**Expected Results:**
- **UI:** Shopify connection shows as connected
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] Storing connection: ... truthSource=access_scopes_endpoint (or oauth_scope)`
- **Logs:** `accessScopesStatus=success` (or `accessScopesStatus=http_error` with oauth_scope fallback)
- **Database:** `integration.config.scope` is non-empty and normalized
- **Pages/Blogs/Collections:** Not blocked (if read_content scope granted)

---

### Scenario 2: Reconnect — Scopes Refreshed Non-Empty

**ID:** HP-002

**Preconditions:**
- Project with existing Shopify integration (scopes already stored)
- Ability to trigger reconnect flow

**Steps:**
1. Navigate to `/projects/{projectId}/settings#integrations`
2. Note current stored scopes (from integration details or database)
3. Click "Reconnect Shopify"
4. Complete OAuth flow
5. Check server logs and database

**Expected Results:**
- **UI:** Shopify reconnection completes successfully
- **Logs:** `truthSource=access_scopes_endpoint` (or fallback)
- **Database:** `integration.config.scope` is non-empty (at least as many scopes as before)
- **No Downgrade:** Pages/Blogs/Collections still work if they worked before

---

### Scenario 3: Reconnect with Access Scopes Failure — OAuth Fallback

**ID:** HP-003

**Preconditions:**
- Project with existing Shopify integration
- Simulated Access Scopes endpoint failure (E2E mock or network manipulation)

**Steps:**
1. Configure test to simulate Access Scopes endpoint returning HTTP error
2. Trigger reconnect flow
3. Complete OAuth flow (ensure OAuth returns valid scopes)
4. Check server logs

**Expected Results:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] Access Scopes endpoint returned non-OK: shop=..., status=4xx/5xx`
- **Logs:** `truthSource=oauth_scope_fallback` (or `oauth_scope`)
- **Database:** Scopes from OAuth token exchange are stored (not empty)
- **UI:** Connection shows as successful

---

### Scenario 4: Reconnect with Access Scopes Empty AND OAuth Empty — Existing Retained

**ID:** HP-004

**Preconditions:**
- Project with existing Shopify integration and stored scopes
- Simulated: Access Scopes returns empty, OAuth scope is empty

**Steps:**
1. (E2E mock) Configure Access Scopes to return empty list
2. (E2E mock) Configure OAuth to return empty scope string
3. Trigger reconnect flow
4. Check server logs

**Expected Results:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] Access Scopes ... AND OAuth scope empty. Retaining existing stored scope`
- **Logs:** `truthSource=existing_scope_retained`
- **Database:** Scopes unchanged from before reconnect (no downgrade)
- **UI:** Connection still shows as connected
- **Pages/Blogs/Collections:** Still work (scopes retained)

---

## Edge Cases

### EC-001: Fresh Connect — All Scope Sources Empty

**Description:** Fresh install where OAuth scope is empty AND Access Scopes endpoint fails/returns empty AND no existing integration

**Steps:**
1. (E2E mock) Ensure no existing integration for project
2. (E2E mock) Configure Access Scopes to fail or return empty
3. (E2E mock) Configure OAuth to return empty scope string
4. Trigger fresh install flow

**Expected Behavior:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] SCOPE_VERIFICATION_FAILED: All scope sources empty`
- **UI:** Redirected to `/projects/{projectId}/settings#integrations?shopify=verify_failed`
- **UI:** "Could not verify Shopify permissions" error message displayed
- **UI:** "Try again" button available
- **Database:** No integration record created (or existing unchanged)
- **NO fake missing-scope list:** User does NOT see missing scope warnings

---

### EC-002: Access Scopes HTTP 401 — Logged with Status Category

**Description:** Access Scopes endpoint returns HTTP 401 (unauthorized)

**Steps:**
1. (Mock) Configure Access Scopes to return HTTP 401
2. Trigger reconnect flow

**Expected Behavior:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] Access Scopes endpoint returned non-OK: shop=..., status=401 (4xx)`
- **Fallback:** System falls back to OAuth scope (or existing scope)
- **UI:** Connection proceeds normally if fallback has data

---

### EC-003: Access Scopes JSON Parse Error

**Description:** Access Scopes endpoint returns invalid JSON

**Steps:**
1. (Mock) Configure Access Scopes to return malformed JSON
2. Trigger reconnect flow

**Expected Behavior:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] Access Scopes JSON parse error for ...`
- **Logs:** `accessScopesStatus=parse_error`
- **Fallback:** System falls back to OAuth scope (or existing scope)

---

### EC-004: Access Scopes Network Error

**Description:** Access Scopes endpoint times out or network error

**Steps:**
1. (Mock) Configure network to fail for Access Scopes request
2. Trigger reconnect flow

**Expected Behavior:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] Access Scopes fetch network error for ...`
- **Logs:** `accessScopesStatus=http_error`
- **Fallback:** System falls back to OAuth scope (or existing scope)

---

## Error Handling

### ERR-001: Verification Failure UI

**Scenario:** User sees verify_failed query param after callback failure

**Steps:**
1. Complete a flow that triggers SHOPIFY_SCOPE_VERIFICATION_FAILED
2. Observe redirect to settings page

**Expected Behavior:**
- URL contains `?shopify=verify_failed`
- Red error banner shows "Could not verify Shopify permissions"
- "Try again" button triggers new connect flow
- Query param is cleared after displaying message (on page refresh, message gone)
- **[FIXUP-3] NO "Missing permission: ..." list is shown** — the verify_failed banner is mutually exclusive with the missing-scope permission notice

---

## Regression

### Areas potentially impacted:

- [ ] **Fresh Shopify install flow:** Scopes always stored non-empty (or explicit failure)
- [ ] **Shopify reconnect flow:** Cannot accidentally downgrade stored scopes
- [ ] **Pages/Blogs/Collections sync:** Still gated on read_content (unchanged behavior)
- [ ] **Products sync:** Unchanged behavior
- [ ] **Permission notice UI:** Never shows missing-scope list from empty data
- [ ] **Server logs:** Enhanced observability with accessScopesStatus and HTTP category

### Quick sanity checks:

- [ ] Fresh install stores non-empty scopes
- [ ] Reconnect refreshes scopes (or retains if all sources empty)
- [ ] Reconnect cannot downgrade existing scope storage
- [ ] verify_failed shows clear error UI
- [ ] No fake missing-scope warnings from empty data
- [ ] Server logs show truthSource and accessScopesStatus

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A — no data modifications beyond normal Shopify connection

### Follow-up verification:

- [ ] Verify scope storage is never empty after successful connect
- [ ] Verify verify_failed UI clears query param after display

---

## Known Issues

- **Intentionally accepted issues:**
  - None

- **Out-of-scope items:**
  - Changing OAuth requested scopes (not affected by this patch)
  - Scope implication logic (handled by SHOPIFY-SCOPE-IMPLICATIONS-1)

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
| 1.0 | 2026-01-20 | Initial SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-2 manual testing guide |
| 1.1 | 2026-01-20 | FIXUP-3: Added assertion that verify_failed UI suppresses missing-scope list (ERR-001) |
