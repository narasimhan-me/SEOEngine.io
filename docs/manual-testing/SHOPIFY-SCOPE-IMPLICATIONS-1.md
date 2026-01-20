# Manual Testing: SHOPIFY-SCOPE-IMPLICATIONS-1

> Scope Implication Rules for Coverage Checks

---

## Overview

- **Purpose of the feature/patch:**
  - Eliminates false "missing read_products" warnings when `write_products` is already granted
  - Implements implication-aware scope coverage: write scopes implicitly grant read access
  - Ensures the Trust Invariant: no false missing scope warnings for covered capabilities

- **High-level user impact and what "success" looks like:**
  - Users with `write_products` no longer see incorrect "Missing read_products" warnings
  - Users with `write_content` no longer see incorrect "Missing read_content" warnings
  - Scope coverage checks correctly recognize write → read implications
  - No false positive permission prompts or reconnect notices

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase SHOPIFY-SCOPE-IMPLICATIONS-1

- **Related documentation:**
  - `docs/SHOPIFY_SCOPES_MATRIX.md`
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-006: Shopify Integration)
  - `apps/api/src/shopify/shopify-scopes.ts`

---

## Preconditions

- **Environment requirements:**
  - [ ] API and Web servers running locally or on staging
  - [ ] Database seeded with test projects
  - [ ] Shopify sandbox/development store available

- **Test accounts and sample data:**
  - [ ] Test Shopify store connected to a project
  - [ ] Ability to modify granted scopes in integration config (or reconnect with different scopes)

- **Required user roles or subscriptions:**
  - [ ] Any plan (Free, Pro, or Business)
  - [ ] Project owner with connected Shopify store

- **Seed endpoint:**
  - N/A — use existing Shopify integration or connect a new store

---

## Test Scenarios (Happy Path)

### Scenario 1: write_products Covers read_products for Products Sync

**ID:** HP-001

**Preconditions:**
- Shopify store connected with `write_products` scope (but NOT explicit `read_products`)

**Steps:**
1. Navigate to `/projects/{projectId}/overview` or trigger products sync
2. Check for any "Missing read_products" warnings or permission notices
3. Verify products sync completes successfully

**Expected Results:**
- **UI:** No "Missing read_products" warning displayed
- **API:** `GET /projects/:id/shopify/missing-scopes?capability=products_sync` returns `{ missingScopes: [] }`
- **Logs:** No scope coverage errors for products_sync

---

### Scenario 2: write_products Covers read_products for Collections Sync

**ID:** HP-002

**Preconditions:**
- Shopify store connected with `write_products` scope (but NOT explicit `read_products`)

**Steps:**
1. Navigate to `/projects/{projectId}/collections` or trigger collections sync
2. Check for any "Missing read_products" warnings or permission notices
3. Verify collections sync completes successfully

**Expected Results:**
- **UI:** No "Missing read_products" warning displayed
- **API:** `GET /projects/:id/shopify/missing-scopes?capability=collections_sync` returns `{ missingScopes: [] }`
- **Logs:** No scope coverage errors for collections_sync

---

### Scenario 3: read_products Does NOT Cover write_products (Regression)

**ID:** HP-003

**Preconditions:**
- Shopify store connected with `read_products` scope only (no `write_products`)

**Steps:**
1. Navigate to `/projects/{projectId}/products`
2. Attempt to apply SEO changes to a product
3. Check for "Missing write_products" warning or reconnect prompt

**Expected Results:**
- **UI:** "Missing write_products" warning or reconnect prompt displayed
- **API:** `GET /projects/:id/shopify/missing-scopes?capability=products_apply` returns `{ missingScopes: ['write_products'] }`
- **Behavior:** Write → Read implication is one-directional; read does NOT imply write

---

### Scenario 4: write_content Covers read_content for Pages Sync

**ID:** HP-004

**Preconditions:**
- Shopify store connected with `write_content` scope (but NOT explicit `read_content`)

**Steps:**
1. Navigate to `/projects/{projectId}/pages` or trigger pages sync
2. Check for any "Missing read_content" warnings or permission notices
3. Verify pages sync completes successfully

**Expected Results:**
- **UI:** No "Missing read_content" warning displayed
- **API:** `GET /projects/:id/shopify/missing-scopes?capability=pages_sync` returns `{ missingScopes: [] }`

---

### Scenario 5: write_content Covers read_content for Blogs Sync

**ID:** HP-005

**Preconditions:**
- Shopify store connected with `write_content` scope (but NOT explicit `read_content`)

**Steps:**
1. Navigate to `/projects/{projectId}/blogs` or trigger blogs sync
2. Check for any "Missing read_content" warnings or permission notices
3. Verify blogs sync completes successfully

**Expected Results:**
- **UI:** No "Missing read_content" warning displayed
- **API:** `GET /projects/:id/shopify/missing-scopes?capability=blogs_sync` returns `{ missingScopes: [] }`

---

## Edge Cases

### EC-001: Both write_products AND read_products Granted

**Description:** User has explicitly granted both scopes (common in upgraded installs)

**Steps:**
1. Connect Shopify store with both `read_products` and `write_products`
2. Verify products_sync and products_apply both work without warnings

**Expected Behavior:**
- No duplicate scope expansion
- Both capabilities work correctly
- No warnings or errors

---

### EC-002: Multiple Write Scopes with Implications

**Description:** User has multiple write scopes (e.g., `write_products`, `write_content`)

**Steps:**
1. Connect Shopify store with `write_products` and `write_content`
2. Trigger products_sync, collections_sync, pages_sync, blogs_sync

**Expected Behavior:**
- All four capabilities covered by expanded scopes
- `checkScopeCoverage` returns `{ covered: true, missingScopes: [] }` for each

---

### EC-003: No Write Scopes (Read-Only Install)

**Description:** User only has read scopes granted

**Steps:**
1. Connect Shopify store with `read_products`, `read_content`, `read_themes` only
2. Attempt products_apply

**Expected Behavior:**
- `products_apply` shows "Missing write_products" warning
- No false positive for read capabilities
- Sync operations (products_sync, pages_sync, blogs_sync) work correctly

---

## Error Handling

### ERR-001: N/A

**Scenario:** This feature has no specific error handling scenarios (it's a coverage check enhancement)

**Steps:**
- N/A

**Expected Behavior:**
- N/A

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

- [ ] **Shopify OAuth install flow:** Scope computation for install URL
- [ ] **Shopify OAuth reconnect flow:** Missing scope detection for reconnect prompt
- [ ] **Permission notice UI:** Warning banners for missing scopes
- [ ] **Products sync:** Scope coverage checks
- [ ] **Collections sync:** Scope coverage checks
- [ ] **Pages sync:** Scope coverage checks
- [ ] **Blogs sync:** Scope coverage checks

### Quick sanity checks:

- [ ] Products sync works with `write_products` only (no explicit `read_products`)
- [ ] Collections sync works with `write_products` only
- [ ] Pages sync works with `read_content` explicitly granted
- [ ] `products_apply` correctly requires `write_products` (read does not imply write)
- [ ] No console errors in scope-related API calls

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A — no data modifications in this feature

### Follow-up verification:

- [ ] Unit tests pass for scope implication contract
- [ ] No false missing scope warnings in staging environment

---

## Known Issues

- **Intentionally accepted issues:**
  - `write_content` and `write_themes` implications are defined for future-proofing but those write capabilities are not yet implemented

- **Out-of-scope items:**
  - Changing actual OAuth scope requests (implications are for COVERAGE CHECKS ONLY)
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
| 1.0 | 2026-01-20 | Initial SHOPIFY-SCOPE-IMPLICATIONS-1 manual testing guide |
