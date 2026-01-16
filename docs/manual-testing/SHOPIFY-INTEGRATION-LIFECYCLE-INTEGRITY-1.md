# EngineO.ai – Manual Testing: SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1

---

## Overview

- Purpose of the feature/patch:
  Make Shopify connect/disconnect lifecycle deterministic across Store Health, Products, Assets, and Project Settings.
- High-level user impact and what "success" looks like:
  When Shopify is not connected, the UI clearly says so and provides a working, user-initiated Connect path.
  Disconnecting Shopify removes "phantom connected" experiences across relevant surfaces.
- Related phases/sections in docs/IMPLEMENTATION_PLAN.md:
  Phase SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1
- Related documentation:
  docs/API_SPEC.md
  docs/CRITICAL_PATH_MAP.md

---

## Preconditions

- Environment requirements:
  SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL, FRONTEND_URL
  API + Web running
- Test accounts and sample data:
  Project with Shopify domain (e.g., *.myshopify.com) and NO Shopify integration
  Project with Shopify integration connected, then disconnected
- Required user roles or subscriptions:
  Project OWNER (required for Connect/Disconnect actions)

---

## Test Scenarios (Happy Path)

### Scenario 1: Disconnect Shopify fully disconnects the project everywhere

ID: HP-001

Preconditions:
- Shopify is connected to the project.

Steps:
1. Go to /projects/:id/settings#integrations.
2. Click "Disconnect Shopify".
3. Navigate to Store Health and Assets surfaces.

Expected Results:
- UI: Settings shows Shopify is not connected + Connect CTA; Store Health shows "Shopify is not connected".
- API: GET /projects/:id/integration-status returns shopify.connected=false and Shopify is absent from active integrations[].

---

### Scenario 2: New Shopify-domain project shows an explicit Connect path (no silent pretend-connected)

ID: HP-002

Preconditions:
- Project domain is Shopify (e.g. my-store.myshopify.com) and Shopify is not connected.

Steps:
1. Visit /projects/:id/store-health.
2. Click "Connect Shopify" and complete OAuth.

Expected Results:
- UI: Store Health shows a "Shopify is not connected" notice with a working Connect CTA.
- API: Connect starts via GET /projects/:id/shopify/connect-url.

---

## Edge Cases

### EC-001: Viewer/non-owner sees Connect/Disconnect disabled

Description: Non-OWNER can view settings but cannot initiate Shopify connect/disconnect.

Steps:
1. Open /projects/:id/settings#integrations as non-OWNER.

Expected Behavior:
- Buttons are disabled and guidance to ask an owner is shown.

---

## Error Handling

### ERR-001: Session token missing when clicking Connect Shopify

Scenario: User is on Settings but local session token is missing/expired.

Steps:
1. Remove engineo_token from local storage.
2. Click "Connect Shopify".

Expected Behavior:
- Visible inline error explaining the token is missing and instructing to sign in again.
- No silent failure and no auto-redirect into OAuth.

---

## Limits

### LIM-001: Entitlement/Quota Limit

Scenario: N/A

Steps:
1. N/A

Expected Behavior:
- N/A

---

## Regression

### Areas potentially impacted:

- [ ] Shopify reconnect flow (SHOPIFY-SCOPE-RECONSENT-UX-1)
- [ ] Store Health cards routing
- [ ] Project Settings save behavior

### Quick sanity checks:

- [ ] Store Health cards still render and route correctly
- [ ] Pages/Collections permission notice still renders when missing scopes

---

## FIXUP-1: Dead-Click and Brittle Behavior Fixes

### FIX-001: Connect/Disconnect buttons allow clicks while capabilities loading

**Issue:** When `capabilities` is null (still loading), buttons were disabled causing "dead clicks" where users click but nothing happens.

**Fix:** Changed disabled logic from `!(capabilities?.canModifySettings ?? false)` to `(capabilities ? !capabilities.canModifySettings : false)` - buttons are enabled while loading and only disabled when capabilities is loaded AND canModifySettings is false.

### FIX-002: Store Health integrationStatus fetch is non-blocking

**Issue:** If the integrationStatus fetch failed, the entire Store Health page would error out.

**Fix:** Added `.catch(() => null)` to the integrationStatus fetch so it fails gracefully - the page still loads and shows health cards even if integration status is unavailable.

### FIX-003: connect-url validates non-Shopify domains

**Issue:** If project domain was a custom domain (e.g., example.com), the endpoint would generate an invalid OAuth URL by appending `.myshopify.com` to it (e.g., example.com.myshopify.com).

**Fix:** Added validation: if the domain contains dots but is not a .myshopify.com domain, return a clear error explaining that custom domains cannot be used for Shopify OAuth.

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A
