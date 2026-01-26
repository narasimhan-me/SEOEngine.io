# EngineO.ai – Manual Testing: SHOPIFY-EMBEDDED-SHELL-1

> Manual testing document for SHOPIFY-EMBEDDED-SHELL-1 patch.
> Ensures Shopify embedded app context works correctly with never-blank fallbacks.

---

## Overview

- **Purpose of the feature/patch:**
  - Enable EngineO.ai to run as an embedded app within Shopify Admin
  - Implement never-blank fallbacks for all embedded context states
  - Persist host/shop across internal navigation (URL repair)
  - Support top-level auth escape for unauthenticated embedded users
  - Add frame-ancestors CSP headers for Shopify iframe embedding

- **High-level user impact and what "success" looks like:**
  - Merchants can open EngineO.ai directly from Shopify Admin
  - The app loads without blank screens in any scenario
  - Navigation within the app preserves Shopify context
  - Auth flow works seamlessly from embedded context
  - Standalone users see no changes to their experience

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Entry 6.81: SHOPIFY-EMBEDDED-SHELL-1
  - Entry 6.85: SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1 (CSP reliability)

- **Related documentation:**
  - `SHOPIFY_INTEGRATION.md` (root) – Canonical Shopify integration guide: Partner config, embedded setup, env vars
  - `docs/SHOPIFY_PERMISSIONS_AND_RECONSENT.md` – Re-consent UX and safety contracts
  - `docs/SHOPIFY_SCOPES_MATRIX.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] Web server running (`npm run dev` in apps/web)
  - [ ] API server running (`npm run dev` in apps/api)
  - [ ] `NEXT_PUBLIC_SHOPIFY_API_KEY` set in `.env.local` (Shopify app Client ID)
  - [ ] Shopify Partner app configured with embedded app URL

- **Test accounts and sample data:**
  - [ ] Shopify Partner test app with proper URL configuration
  - [ ] Test Shopify development store with app installed
  - [ ] EngineO.ai user account (any plan)

- **Required user roles or subscriptions:**
  - [ ] Any plan is sufficient for embedded shell testing

---

## Test Scenarios (Happy Path)

### Scenario 1: Embedded Open-App from Shopify Admin

**ID:** HP-001

**Preconditions:**

- Shopify app installed on test store
- EngineO.ai user is logged in (token in localStorage)

**Steps:**

1. Open Shopify Admin for your test store
2. Navigate to Apps section
3. Click on EngineO.ai app

**Expected Results:**

- **UI:** App loads inside Shopify Admin iframe without blank screen
- **URL:** Contains `embedded=1` and `host` query params
- **Browser:** App Bridge CDN script loads (check Network tab)
- **Logs:** No console errors related to App Bridge

---

### Scenario 2: Embedded Open-App When Logged Out

**ID:** HP-002

**Preconditions:**

- Shopify app installed on test store
- EngineO.ai user is NOT logged in (no token)

**Steps:**

1. Clear EngineO.ai token from localStorage
2. Open Shopify Admin → Apps → EngineO.ai

**Expected Results:**

- **UI:** Shows "Connecting to Shopify…" message with "Reconnect Shopify" button
- **UI:** NOT a blank screen
- **Action:** Clicking "Reconnect Shopify" redirects to /login with `next` param containing embedded return URL

---

### Scenario 3: Auth Flow Completes and Returns to Embedded

**ID:** HP-003

**Preconditions:**

- Scenario HP-002 completed (at auth required screen)

**Steps:**

1. Click "Reconnect Shopify" button
2. Complete login (email/password)
3. If 2FA enabled, complete 2FA verification

**Expected Results:**

- **UI:** After login, redirects back to embedded URL (with `host`, `embedded=1`)
- **UI:** App loads normally inside Shopify iframe
- **Session:** `next` param correctly preserved through 2FA flow if applicable

---

### Scenario 4: Internal Navigation Preserves Host

**ID:** HP-004

**Preconditions:**

- App opened from Shopify Admin (embedded context)
- User is logged in

**Steps:**

1. Navigate from dashboard to Projects list
2. Open a specific project
3. Navigate to Settings tab
4. Navigate to Products tab

**Expected Results:**

- **URL:** All pages maintain `host` and `embedded=1` params
- **UI:** No "Missing Shopify context" messages
- **Session:** `shopify_host` persisted in sessionStorage

---

### Scenario 5: Standalone Direct URL Access

**ID:** HP-005

**Preconditions:**

- User is logged in
- No Shopify params in URL

**Steps:**

1. Open browser directly to `http://localhost:3000/projects`
2. Navigate through the app normally

**Expected Results:**

- **UI:** App works exactly as before (no embedded UI/notices)
- **URL:** No `host`, `embedded`, or `shop` params added
- **Behavior:** All existing functionality unchanged

---

### Scenario 6: URL Repair When Host Missing but Stored

**ID:** HP-006

**Preconditions:**

- App was previously opened from Shopify (host in sessionStorage)

**Steps:**

1. Open app from Shopify Admin (stores host)
2. Manually navigate to `/projects` without host param
3. Observe URL

**Expected Results:**

- **URL:** Automatically repaired to include `host`, `embedded=1`, `shop` (if available)
- **UI:** Brief "Loading Shopify context…" then normal page
- **Logs:** No errors in console

---

### Scenario 7: Embedded Deep Link and Hard Refresh (FIXUP-1)

**ID:** HP-007

**Preconditions:**

- App opened from Shopify Admin (embedded context)
- User is logged in
- Host stored in sessionStorage

**Steps:**

1. Open app from Shopify Admin
2. Navigate to a deep route (e.g., `/projects/[id]/settings`)
3. **Hard refresh** the page (Cmd+Shift+R / Ctrl+Shift+R)
4. Open DevTools → Network tab
5. Find the document request for the deep route
6. Inspect Response Headers

**Expected Results:**

- **UI:** App renders (shell or diagnostic), NOT a blank screen
- **Headers:** Response includes `Content-Security-Policy: frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com;`
- **Console:** No CSP-related errors (e.g., "Refused to frame...")
- **Behavior:** If host was in sessionStorage, URL repair kicks in; if not, shows "Missing Shopify context" fallback

**Why This Matters:**

- Server-side middleware cannot access sessionStorage
- Deep links inside Shopify iframe may not have `embedded=1` or `host` params
- Without unconditional CSP, hard refresh inside iframe causes blank screen
- FIXUP-1 ensures CSP is always present for all app routes

---

### Scenario 8: Standalone Access with CSP Header (Regression)

**ID:** HP-008

**Preconditions:**

- User is logged in
- No Shopify params in URL
- NOT inside Shopify iframe (direct browser access)

**Steps:**

1. Open browser directly to `http://localhost:3000/projects`
2. Open DevTools → Console
3. Navigate through the app normally

**Expected Results:**

- **UI:** App works exactly as before (no embedded UI/notices)
- **Console:** No CSP-related errors or warnings
- **Behavior:** frame-ancestors CSP is present but has no effect on standalone users

---

## Edge Cases

### EC-001: Missing Host Param (No Stored Host)

**Description:** User opens embedded URL without host param and no prior session.

**Steps:**

1. Clear sessionStorage
2. Navigate to `http://localhost:3000/projects?embedded=1` (no host)

**Expected Behavior:**

- Shows "Missing Shopify context. Please reopen the app from Shopify Admin."
- Retry button reloads the page
- NOT a blank screen

---

### EC-002: Missing NEXT_PUBLIC_SHOPIFY_API_KEY

**Description:** App Bridge cannot initialize due to missing env var.

**Steps:**

1. Remove `NEXT_PUBLIC_SHOPIFY_API_KEY` from `.env.local`
2. Restart web server
3. Open app from Shopify Admin

**Expected Behavior:**

- Shows "Unable to load inside Shopify" message
- Provides "Open in EngineO.ai" link to standalone version
- NOT a blank screen

---

### EC-003: Invalid/Malformed Host Parameter

**Description:** Host param is present but malformed.

**Steps:**

1. Navigate to `http://localhost:3000/projects?embedded=1&host=invalid`

**Expected Behavior:**

- App attempts to load (App Bridge may fail gracefully)
- If App Bridge fails, shows error fallback
- NOT a blank screen

---

## Error Handling

### ERR-001: App Bridge Script Load Failure

**Scenario:** CDN script fails to load (network issue).

**Steps:**

1. Block `cdn.shopify.com` in browser DevTools
2. Open app from Shopify Admin

**Expected Behavior:**

- App still renders (with degraded functionality)
- Shows appropriate error if App Bridge features are used
- NOT a blank screen

---

### ERR-002: Session Expired During Embedded Use

**Scenario:** User's EngineO.ai token expires while using embedded app.

**Steps:**

1. Open app from Shopify Admin
2. Manually clear token from localStorage
3. Perform an API action (e.g., sync products)

**Expected Behavior:**

- API returns 401
- UI handles gracefully (shows login prompt or redirects)
- Embedded context preserved if redirected to login

---

### ERR-003: Unsafe next URL Injection Attempt

**Scenario:** Attacker tries to use `next` param for open redirect.

**Steps:**

1. Navigate to `/login?next=https://evil.com/steal`
2. Complete login

**Expected Behavior:**

- Unsafe `next` URL is rejected
- User redirected to `/projects` instead
- No open redirect vulnerability

---

## Limits

### LIM-001: N/A

**Scenario:** No specific limits apply to embedded shell functionality.

**Steps:**

1. N/A

**Expected Behavior:**

- N/A

---

## Regression

### Areas potentially impacted:

- [ ] **Login flow:** Ensure standard login still works without `next` param
- [ ] **2FA flow:** Ensure 2FA completion redirects correctly
- [ ] **Middleware:** Ensure auth URL sanitization still works
- [ ] **Layout rendering:** Ensure Suspense boundary doesn't cause issues

### Quick sanity checks:

- [ ] Direct URL access to `/projects` works (standalone)
- [ ] Login → redirect to `/projects` works (no `next` param)
- [ ] Sensitive param sanitization still works (`/login?password=x`)
- [ ] Google Analytics still loads (check Network tab)

---

## Post-Conditions

### Data cleanup steps:

- [ ] No special cleanup required (sessionStorage clears on tab close)

### Follow-up verification:

- [ ] Verify no orphaned sessionStorage keys
- [ ] Confirm App Bridge CDN loads correctly in production

---

## Known Issues

- **Intentionally accepted issues:**
  - App Bridge v4 uses CDN script; npm package is primarily for React hooks
  - Host stored in sessionStorage (cleared on tab close, not persistent)

- **Out-of-scope items:**
  - Shopify OAuth installation flow (separate from embedded shell)
  - App Bridge actions (Modal, TitleBar, etc.) - future enhancement

- **TODOs:**
  - [ ] Add E2E Playwright tests for embedded detection
  - [ ] Add App Bridge action integration (TitleBar, etc.)

---

## Approval

| Field              | Value                                   |
| ------------------ | --------------------------------------- |
| **Tester Name**    | [Pending]                               |
| **Date**           | [YYYY-MM-DD]                            |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed   |
| **Notes**          | SHOPIFY-EMBEDDED-SHELL-1 manual testing |
