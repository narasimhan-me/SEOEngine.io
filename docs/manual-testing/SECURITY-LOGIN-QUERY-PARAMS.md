# SECURITY-LOGIN-QUERY-PARAMS — Manual Testing

> This document follows `docs/MANUAL_TESTING_TEMPLATE.md` structure.

## Overview

- **Purpose of the feature/patch:**
  - Prevent sensitive credentials (passwords, emails) from appearing in URL query parameters on auth pages (`/login`, `/signup`). This is a security hotfix to prevent credential leakage via server logs, browser history, and referrer headers.

- **High-level user impact and what "success" looks like:**
  - Users who accidentally navigate to auth pages with credentials in the URL will have those credentials automatically removed.
  - A security message informs users that parameters were sanitized.
  - Password fields remain empty (never pre-filled from URL).
  - The `next` redirect parameter continues to work for post-login navigation.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Security Hotfix (not a named phase)

- **Related documentation:**
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-001)

---

## Preconditions

- **Environment requirements:**
  - [ ] Web app running (`pnpm dev` or deployed)
  - [ ] No special env vars required

- **Test accounts and sample data:**
  - [ ] No accounts needed for URL sanitization tests
  - [ ] For `next` param regression, a valid user account is helpful

- **Required user roles or subscriptions:**
  - [ ] N/A — sanitization applies to all visitors

---

## Test Scenarios (Happy Path)

### Scenario 1: Login page sanitizes password in URL

**ID:** HP-001

**Steps:**

1. Open browser and navigate to `/login?email=test%40example.com&password=mysecretpassword&next=%2Fprojects`
2. Observe the URL bar after page loads

**Expected Results:**

- **URL:** Does NOT contain `password=`, `email=`, or `mysecretpassword`
- **URL:** MAY contain `next=/projects` (preserved as safe param)
- **UI:** Login form renders normally
- **UI:** Password field is empty
- **UI:** Security message appears: "For security, we removed sensitive parameters from the URL."

---

### Scenario 2: Signup page sanitizes password and confirmPassword

**ID:** HP-002

**Steps:**

1. Navigate to `/signup?email=test%40example.com&password=secret&confirmPassword=secret`
2. Observe the URL bar after page loads

**Expected Results:**

- **URL:** Does NOT contain `password=`, `confirmPassword=`, `email=`, or `secret`
- **UI:** Signup form renders normally
- **UI:** Both password fields are empty
- **UI:** Security message appears

---

### Scenario 3: Normal login flow without query params

**ID:** HP-003

**Steps:**

1. Navigate to `/login` (no query params)
2. Observe the page

**Expected Results:**

- **UI:** Login form renders normally
- **UI:** No security message is displayed
- **UI:** User can enter credentials and submit

---

## Edge Cases

### EC-001: Alternative password param names

**Description:** Test that variations like `pass` and `pwd` are also sanitized.

**Steps:**

1. Navigate to `/login?pass=secret123`
2. Navigate to `/login?pwd=secret456`

**Expected Behavior:**

- Both URLs are sanitized — no `pass=` or `pwd=` in final URL
- Security message appears in both cases

---

### EC-002: Multiple sensitive params combined

**Description:** Multiple sensitive params in a single URL.

**Steps:**

1. Navigate to `/login?email=a@b.com&password=x&pass=y&pwd=z`

**Expected Behavior:**

- All sensitive params removed
- Only safe params (like `next`) remain

---

### EC-003: URL-encoded special characters

**Description:** Passwords with special characters that are URL-encoded.

**Steps:**

1. Navigate to `/login?password=%40%23%24%25%5E%26` (contains @#$%^&)

**Expected Behavior:**

- Encoded password is removed from URL
- No trace of the encoded characters in final URL

---

## Error Handling

### ERR-001: Middleware bypass (client navigation)

**Scenario:** User navigates via client-side routing with sensitive params.

**Steps:**

1. While on another page, use browser dev tools to execute:
   `window.location.href = '/login?password=test'`

**Expected Behavior:**

- Client-side sanitization kicks in (defense-in-depth)
- URL is cleaned via `router.replace()`
- Security message appears

---

### ERR-002: JavaScript disabled

**Scenario:** User has JavaScript disabled (middleware-only protection).

**Steps:**

1. Disable JavaScript in browser
2. Navigate to `/login?password=test`

**Expected Behavior:**

- Middleware (server-side) sanitizes URL via redirect
- User sees sanitized URL after redirect
- Note: Security message may not appear without JS

---

## Limits

### LIM-001: N/A

No entitlement or quota limits apply to this security feature.

---

## Regression

### Areas potentially impacted:

- [ ] **Login flow:** Verify normal login still works (no query params)
- [ ] **Signup flow:** Verify normal signup still works
- [ ] **`next` param redirect:** Verify `/login?next=/projects` still redirects correctly after auth
- [ ] **Password managers:** Verify autofill still works on password fields
- [ ] **Bookmarked login links:** Verify `/login` bookmarks still work

### Quick sanity checks:

- [ ] Navigate to `/login` — form loads, no errors
- [ ] Navigate to `/signup` — form loads, no errors
- [ ] Navigate to `/login?next=/settings` — after login, redirects to `/settings`
- [ ] Submit valid login credentials — user is authenticated
- [ ] Submit valid signup credentials — user account is created

---

## Post-Conditions

### Data cleanup steps:

- [ ] N/A — no persistent data created by these tests

### Follow-up verification:

- [ ] Server logs do NOT contain passwords in URL paths
- [ ] Browser history does NOT show password query params

---

## Known Issues

- **Intentionally accepted issues:**
  - The security message shows briefly even for legitimate users who somehow had params in URL
  - The `sanitized=1` flag briefly appears in URL before being cleaned (cosmetic)

- **Out-of-scope items:**
  - POST body sanitization (passwords in POST bodies are correct and expected)
  - API endpoint logging (separate concern)

- **TODOs:**
  - [ ] Consider rate limiting for repeated sanitization attempts (potential abuse detection)

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    |                                       |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          |                                       |
