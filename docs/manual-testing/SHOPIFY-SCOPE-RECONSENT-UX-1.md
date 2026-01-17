# SHOPIFY-SCOPE-RECONSENT-UX-1 — Manual Testing
> Clone of MANUAL_TESTING_TEMPLATE.md (structure preserved).

---

## Overview

- Purpose of the feature/patch:
  - Provide a trust-preserving remediation path when an existing Shopify installation is missing newly required scopes (e.g., `read_content` for Pages).
- High-level user impact and what "success" looks like:
  - Users see a clear permission notice instead of a generic "sync failed".
  - Users can explicitly reconnect Shopify to grant only the missing required scopes for the blocked capability.
  - After re-consent, users return to the same screen and the previously blocked sync succeeds automatically.
- Related phases/sections in docs/IMPLEMENTATION_PLAN.md:
  - Phase SHOPIFY-SCOPE-RECONSENT-UX-1
- Related documentation:
  - docs/testing/CRITICAL_PATH_MAP.md (CP-006 Shopify Sync)
  - API_SPEC.md
  - docs/SHOPIFY_PERMISSIONS_AND_RECONSENT.md

---

## Preconditions

- Environment requirements:
  - API + Web running
  - Shopify app configured
- Test accounts and sample data:
  - A project connected to a Shopify store that was installed before `read_content` was required (scope missing)
- Required user roles or subscriptions:
  - OWNER role (required to reconnect and trigger sync)

---

## Test Scenarios (Happy Path)

### Scenario 1: Pages missing read_content shows permission notice and offers reconnect

ID: HP-001

Preconditions:
- Shopify connected
- Stored scope does NOT include `read_content`

Steps:
1. Go to Assets > Pages.
2. Confirm the notice title "Additional Shopify permission required" is visible.
3. Confirm the notice includes "Reconnect Shopify".
4. Confirm "Sync Pages" is disabled while scopes are missing.

Expected Results:
- UI: Structured permission notice is shown (not a generic error banner).
- API: GET `/projects/:id/shopify/missing-scopes?capability=pages_sync` returns `missingScopes` including `read_content`.

---

### Scenario 2: Reconnect Shopify returns to Pages and auto-sync succeeds

ID: HP-002

Preconditions:
- Same as HP-001

Steps:
1. On Assets > Pages, click "Reconnect Shopify".
2. Complete Shopify OAuth consent.
3. Confirm you return to Assets > Pages.
4. Confirm Pages sync runs automatically and completes successfully.

Expected Results:
- UI: Pages list shows "Last synced: ..." and imported Pages appear.
- API: Sync endpoint succeeds (no `SHOPIFY_MISSING_SCOPES` error).

---

### Scenario 3: Collections remain usable when only Pages scope is missing

ID: HP-003

Preconditions:
- Shopify connected
- Stored scope includes `read_products` but does NOT include `read_content`

Steps:
1. Go to Assets > Collections.
2. Confirm Collections sync can still run (no permission notice for collections).

Expected Results:
- UI: Collections are not blocked by missing `read_content`.
- API: GET `/projects/:id/shopify/missing-scopes?capability=collections_sync` returns empty `missingScopes`.

---

## Edge Cases

### EC-001: Invalid returnTo is ignored safely

Description: Prevent open redirect / cross-project redirect.

Steps:
1. Attempt reconnect with `returnTo` not starting with `/projects/:projectId`.

Expected Behavior:
- Redirect after OAuth falls back to `/projects/:projectId` (no external or cross-project redirect).

---

## Error Handling

### ERR-001: Missing scopes on sync endpoints returns structured error

Scenario: User triggers sync while missing scopes.

Steps:
1. Attempt "Sync Pages" while missing `read_content`.

Expected Behavior:
- API responds 400 with `code: SHOPIFY_MISSING_SCOPES` and `missingScopes`.
- UI shows the permission notice with "Reconnect Shopify".

---

### ERR-002: Reconnect CTA shows visible inline error when session is missing

Scenario: User clicks "Reconnect Shopify" but the session token is missing/expired.

Steps:
1. Go to Assets > Pages (with missing scopes so the permission notice is visible).
2. Clear the local session token (localStorage `engineo_token`) or let the session expire.
3. Click "Reconnect Shopify".

Expected Behavior:
- UI shows an inline error *within the permission notice* explaining what to do next.
- Primary remediation action is visible ("Sign in again").
- No silent failures (click always causes redirect OR visible error).

---

## Limits

### LIM-001: N/A

---

## Regression

### Areas potentially impacted:

- [ ] CP-006 Shopify Sync: existing product sync and SEO apply still works
- [ ] Assets Pages/Collections list UX remains stable

### Quick sanity checks:

- [ ] Connect Shopify from Project Overview still works
- [ ] Pages/Collections sync works for stores with full scopes

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A

### Follow-up verification:

- [ ] N/A

---

## Known Issues

- Intentionally accepted issues:
  - N/A
- Out-of-scope items:
  - Any apply expansion for Pages/Collections beyond existing behavior
- TODOs:
  - N/A
