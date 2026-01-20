# Manual Testing: SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-4

> Suspicious OAuth Must Not Downgrade Existing Scopes

---

## Overview

- **Purpose of the feature/patch:**
  - Prevents suspicious OAuth scope from downgrading existing stored scopes when Access Scopes endpoint fails
  - When OAuth returns fewer scopes than requested (suspicious) AND Access Scopes fails/empty:
    - If existing stored scope is non-empty: retain existing scope (refuse to downgrade)
    - If existing stored scope is empty (fresh install): explicit verification failure
  - Ensures reconnect cannot accidentally reduce capabilities due to transient API failures

- **High-level user impact and what "success" looks like:**
  - Reconnect with flaky Access Scopes endpoint does not accidentally remove permissions
  - Pages/Blogs/Collections continue to work after reconnect (scopes retained)
  - Fresh install with suspicious OAuth + Access Scopes failure shows clear error (not fake permissions)
  - No silent scope downgrade that breaks previously working features

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 (parent)
  - FIXUP-2 (empty-scope persistence guard)
  - FIXUP-3 (suppress fake missing-scope list)
  - FIXUP-4 (this patch)

- **Related documentation:**
  - `docs/manual-testing/SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md`
  - `docs/manual-testing/SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1-FIXUP-2.md`
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
  - [ ] Ability to mock/simulate Access Scopes endpoint failures (E2E mode)

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

### Scenario 1: Suspicious OAuth + Access Scopes OK — Uses Access Scopes

**ID:** HP-001

**Preconditions:**
- Project with existing Shopify integration (scopes: read_products,read_content,write_products)
- E2E mode: OAuth returns suspicious scope (fewer than requested)
- Access Scopes endpoint returns full scopes

**Steps:**
1. Configure E2E to return suspicious OAuth scope (e.g., only "read_products")
2. Configure E2E Access Scopes to return full scopes
3. Trigger reconnect flow
4. Check server logs

**Expected Results:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] Storing connection: ... truthSource=access_scopes_endpoint`
- **Database:** Scopes from Access Scopes endpoint stored (full set)
- **UI:** Connection shows as successful
- **No downgrade:** All features still work

---

### Scenario 2: Normal OAuth + Access Scopes Fails — Uses OAuth

**ID:** HP-002

**Preconditions:**
- Project with existing Shopify integration
- E2E mode: OAuth returns expected scopes (not suspicious)
- Access Scopes endpoint fails

**Steps:**
1. Configure E2E to return normal OAuth scope (matches requested)
2. Configure E2E Access Scopes to fail (HTTP error)
3. Trigger reconnect flow
4. Check server logs

**Expected Results:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] ... truthSource=oauth_scope`
- **Database:** Scopes from OAuth stored
- **UI:** Connection shows as successful
- **Behavior:** Non-suspicious OAuth is trusted as fallback

---

### Scenario 3: Suspicious OAuth + Access Scopes Fails + Existing Scopes — Retains Existing

**ID:** HP-003

**Preconditions:**
- Project with existing Shopify integration with stored scopes (e.g., read_products,read_content,write_products)
- E2E mode: OAuth returns suspicious scope (subset)
- Access Scopes endpoint fails

**Steps:**
1. Note current stored scopes in database
2. Configure E2E to return suspicious OAuth scope (e.g., only "read_products")
3. Configure E2E Access Scopes to fail (HTTP error or empty)
4. Trigger reconnect flow
5. Check server logs and database

**Expected Results:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] Suspicious OAuth scope AND Access Scopes ... Refusing to downgrade. Retaining existing stored scope`
- **Logs:** `truthSource=existing_scope_retained`
- **Logs:** Shows `suspiciousOauth=[read_products]` and `retained=[read_content,read_products,write_products]`
- **Database:** Scopes unchanged from before reconnect (no downgrade)
- **UI:** Connection still shows as connected
- **Pages/Blogs/Collections:** Still work (scopes retained)

---

## Edge Cases

### EC-001: Fresh Install — Suspicious OAuth + Access Scopes Fails

**Description:** Fresh install (no existing integration) where OAuth is suspicious AND Access Scopes fails

**Steps:**
1. Ensure no existing integration for project
2. Configure E2E to return suspicious OAuth scope
3. Configure E2E Access Scopes to fail
4. Trigger fresh install flow

**Expected Behavior:**
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] Suspicious OAuth scope AND Access Scopes ... AND no existing scope. Cannot safely verify permissions`
- **Logs:** `[SHOPIFY-SCOPE-TRUTH-1] SCOPE_VERIFICATION_FAILED`
- **UI:** Redirected to `/projects/{projectId}/settings#integrations?shopify=verify_failed`
- **UI:** "Could not verify Shopify permissions" error message displayed
- **Database:** No integration record created
- **NO suspicious OAuth persisted:** System refuses to store unverified permissions

---

### EC-002: Reconnect — Suspicious OAuth + Access Scopes Empty (not error)

**Description:** Reconnect where Access Scopes returns success but empty array

**Steps:**
1. Configure E2E to return suspicious OAuth scope
2. Configure E2E Access Scopes to return `{ access_scopes: [] }`
3. Trigger reconnect flow

**Expected Behavior:**
- Same as HP-003: existing scopes retained, no downgrade
- **Logs:** `accessScopesStatus=empty` or `accessScopesStatus=success` (with 0 scopes)

---

### EC-003: Reconnect — Existing Scopes Are Superset of Suspicious OAuth

**Description:** Existing stored scopes include permissions that suspicious OAuth lacks

**Steps:**
1. Existing scopes: read_products,read_content,write_products
2. Suspicious OAuth: read_products (missing read_content, write_products)
3. Access Scopes fails
4. Trigger reconnect

**Expected Behavior:**
- **Database:** All original scopes retained (read_products,read_content,write_products)
- **Pages/Blogs:** Still work (read_content retained)
- **Collections:** Still work (write_products retained)

---

## Error Handling

### ERR-001: Verification Failure — Fresh Install with Suspicious OAuth

**Scenario:** Fresh install cannot complete because OAuth is suspicious and Access Scopes unavailable

**Steps:**
1. Complete flow as described in EC-001

**Expected Behavior:**
- URL contains `?shopify=verify_failed`
- Red error banner shows "Could not verify Shopify permissions"
- "Try again" button available
- No partial/suspicious permissions stored
- User can retry when Access Scopes endpoint recovers

---

## Regression

### Areas potentially impacted:

- [ ] **Shopify OAuth reconnect flow:** Suspicious OAuth no longer persisted when Access Scopes fails
- [ ] **Fresh Shopify install flow:** Explicit failure when suspicious OAuth + Access Scopes unavailable
- [ ] **Scope retention:** Existing scopes always retained when new source is suspicious + unverifiable
- [ ] **Pages/Blogs/Collections sync:** Continue to work after reconnect (scopes retained)

### Quick sanity checks:

- [ ] Normal OAuth (not suspicious) still works as fallback
- [ ] Suspicious OAuth + Access Scopes OK = Access Scopes used
- [ ] Suspicious OAuth + Access Scopes fails + existing = existing retained
- [ ] Suspicious OAuth + Access Scopes fails + fresh = verify_failed
- [ ] Server logs show correct truthSource and warning messages

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A — no data modifications beyond normal Shopify connection

### Follow-up verification:

- [ ] Verify scope storage never downgrades on reconnect with suspicious OAuth
- [ ] Verify fresh install fails explicitly rather than storing suspicious data

---

## Known Issues

- **Intentionally accepted issues:**
  - None

- **Out-of-scope items:**
  - Access Scopes endpoint reliability (infrastructure concern)
  - OAuth scope negotiation with Shopify (not controllable)

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
| 1.0 | 2026-01-20 | Initial SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-4 manual testing guide |
