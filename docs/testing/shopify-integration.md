# EngineO.ai – System-Level Manual Testing: Shopify Integration

> Cross-cutting manual tests for OAuth/app installation, connect flow, invalid states, and store metadata retrieval.

---

## Overview

- **Purpose of this testing doc:**
  - Validate Shopify OAuth integration, app installation flow, connection status management, and store data retrieval.

- **High-level user impact and what "success" looks like:**
  - Users can connect their Shopify store seamlessly.
  - OAuth flow completes without errors.
  - Connection status is accurately reflected.
  - Store metadata is retrieved and displayed correctly.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 1.x (Shopify integration)
  - Phase UX-6 (First DEO Win onboarding)

- **Related documentation:**
  - `docs/ARCHITECTURE.md` (Shopify OAuth flow)
  - `docs/API_SPEC.md` (Shopify endpoints)

---

## Preconditions

- **Environment requirements:**
  - [ ] `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` configured
  - [ ] `SHOPIFY_APP_URL` set for OAuth redirect
  - [ ] Backend API running
  - [ ] Shopify Partner account with development store

- **Test accounts and sample data:**
  - [ ] Shopify development store(s) for testing
  - [ ] EngineO test user accounts
  - [ ] Projects in various connection states

- **Required user roles or subscriptions:**
  - [ ] Any authenticated EngineO user

---

## Test Scenarios (Happy Path)

### Scenario 1: Initial Shopify OAuth connect flow

**ID:** HP-001

**Preconditions:**

- User has a project not yet connected to Shopify
- User has a Shopify store

**Steps:**

1. Navigate to Project Overview
2. Enter Shopify store domain
3. Click "Connect Shopify"
4. Authorize on Shopify OAuth screen
5. Return to EngineO

**Expected Results:**

- **Redirect:** User sent to Shopify OAuth page
- **Authorization:** User sees EngineO app permission request
- **Callback:** Redirected back to EngineO with auth code
- **Connection:** Project shows "Connected" status
- **Database:** Integration record created with access token

---

### Scenario 2: Reconnecting existing Shopify store

**ID:** HP-002

**Preconditions:**

- Project was previously connected but needs reauthorization

**Steps:**

1. Click "Reconnect" or "Refresh Connection"
2. Complete OAuth flow again

**Expected Results:**

- **Flow:** Same as initial connect
- **Token:** Access token updated
- **Data:** Existing product associations preserved

---

### Scenario 3: Store metadata retrieval after connect

**ID:** HP-003

**Preconditions:**

- Shopify store connected

**Steps:**

1. After successful connection
2. Check displayed store info

**Expected Results:**

- **Store Name:** Displayed correctly
- **Domain:** Shown in UI
- **Status:** "Connected" indicator visible

---

### Scenario 4: Disconnect Shopify store

**ID:** HP-004

**Preconditions:**

- Project has connected Shopify store

**Steps:**

1. Navigate to project settings/integrations
2. Click "Disconnect" Shopify
3. Confirm disconnection

**Expected Results:**

- **Status:** Changes to "Not Connected"
- **Database:** Integration record removed or marked inactive
- **Products:** Optionally archived or retained
- **UI:** Connect option reappears

---

## Edge Cases

### EC-001: Invalid Shopify domain format

**Description:** User enters malformed store domain.

**Steps:**

1. Enter "not-a-valid-domain" or "http://example"
2. Attempt to connect

**Expected Behavior:**

- Validation error shown
- Connect not attempted
- User prompted to fix domain

---

### EC-002: Shopify store does not exist

**Description:** Valid format but store doesn't exist.

**Steps:**

1. Enter valid format but non-existent store
2. Attempt OAuth

**Expected Behavior:**

- Shopify returns error
- User informed store not found
- No partial connection created

---

### EC-003: User cancels OAuth authorization

**Description:** User clicks "Cancel" on Shopify OAuth screen.

**Steps:**

1. Start connect flow
2. Cancel on Shopify authorization page

**Expected Behavior:**

- User returned to EngineO
- "Connection cancelled" message
- Project remains unconnected

---

### EC-004: OAuth callback with invalid state parameter

**Description:** Callback URL tampered with or expired.

**Steps:**

1. Start OAuth flow
2. Modify state parameter in callback URL

**Expected Behavior:**

- Invalid state detected
- Connection rejected
- Security error logged
- User asked to retry

---

## Error Handling

### ERR-001: Shopify API returns error during OAuth

**Scenario:** Shopify service returns 500 or other error.

**Steps:**

1. Attempt connect when Shopify is having issues

**Expected Behavior:**

- User sees "Unable to connect to Shopify"
- Retry option available
- No broken connection state

---

### ERR-002: Access token expired or revoked

**Scenario:** Store owner revokes app access from Shopify admin.

**Steps:**

1. Revoke app from Shopify admin
2. Attempt to sync products in EngineO

**Expected Behavior:**

- API call fails with auth error
- User notified: "Reconnection required"
- Reconnect flow available

---

### ERR-003: OAuth callback timeout

**Scenario:** Callback takes too long to process.

**Steps:**

1. Simulate slow callback processing

**Expected Behavior:**

- Timeout handled gracefully
- User informed of issue
- Can retry flow

---

### ERR-004: Duplicate connection attempt

**Scenario:** Same store connected to multiple projects.

**Steps:**

1. Connect store to Project A
2. Attempt to connect same store to Project B

**Expected Behavior:**

- Warning about existing connection (if applicable)
- Or: Both connections allowed
- Clear policy communicated

---

## Limits

### LIM-001: One Shopify store per project

**Scenario:** Project can only have one Shopify integration.

**Steps:**

1. Project has connected store
2. Attempt to connect different store

**Expected Behavior:**

- Must disconnect existing first
- Or: New store replaces old
- Clear messaging about behavior

---

### LIM-002: Shopify API rate limits

**Scenario:** Rapid API calls during connection.

**Steps:**

1. Trigger many connection-related API calls

**Expected Behavior:**

- Rate limits respected
- Retry logic for 429 responses
- User not blocked indefinitely

---

## Regression

### Areas potentially impacted:

- [ ] **Product sync:** Ensure connection enables sync
- [ ] **Metadata sync:** Ensure SEO fields can be written
- [ ] **Project overview:** Ensure connection status displays
- [ ] **Onboarding checklist:** Ensure "Connect source" step tracks

### Quick sanity checks:

- [ ] OAuth flow completes
- [ ] Connected status shows
- [ ] Store name displayed
- [ ] Disconnect works

---

## Post-Conditions

### Data cleanup steps:

- [ ] Revoke test app installations from Shopify stores
- [ ] Delete test integrations from database
- [ ] Clear OAuth tokens

### Follow-up verification:

- [ ] No orphaned integration records
- [ ] Test stores accessible for future testing

---

## Known Issues

- **Intentionally accepted issues:**
  - OAuth tokens may need periodic refresh; handled automatically

- **Out-of-scope items:**
  - Shopify Plus multi-location testing
  - Shopify POS integration

- **TODOs:**
  - [ ] Add token refresh mechanism
  - [ ] Consider webhook for app uninstall notification

---

## Approval

| Field              | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| **Tester Name**    | [Pending]                                                |
| **Date**           | [YYYY-MM-DD]                                             |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                    |
| **Notes**          | Cross-cutting system-level tests for Shopify integration |
