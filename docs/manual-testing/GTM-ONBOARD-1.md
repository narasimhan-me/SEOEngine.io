# GTM-ONBOARD-1 Manual Testing Guide

> **Implementation Status:** PLANNED / IMPLEMENTATION PENDING
>
> This document is a test plan to execute once GTM-ONBOARD-1 code exists. The Prisma models, API endpoints, and UI components described here do not exist yet. See [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) for current status.

## Feature: Guided Onboarding & First DEO Win

**Priority:** High
**Testkit Seed:** `seed-first-deo-win`, `connect-shopify` (to be created)

---

## Overview

- **Purpose of the feature/patch:**
  - Guide new users to complete their first DEO fix within 5-10 minutes of connecting their Shopify store
  - Provide trust-safe onboarding that never triggers AI work without explicit user consent

- **High-level user impact and what "success" looks like:**
  - Users see a persistent banner guiding them through 4 steps
  - Users complete their first APPLY action and see a celebration
  - Activation rate increases for new users

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase GTM-ONBOARD-1: Guided Onboarding & First DEO Win

- **Related documentation:**
  - [GTM_ONBOARDING.md](../GTM_ONBOARDING.md) - Philosophy and architecture
  - [DEO_PILLARS.md](../DEO_PILLARS.md) - Pillar definitions
  - [ACTIVATION_METRICS.md](../ACTIVATION_METRICS.md) - Activation funnel

---

## Preconditions

> ⚠️ **Warning:** Onboarding endpoints and UI may not exist yet. API calls may return 404 and UI components may be missing until implementation lands. This test plan should be executed after GTM-ONBOARD-1 implementation is complete.

- **Environment requirements:**
  - [ ] API running on localhost:3001
  - [ ] Web app running on localhost:3000
  - [ ] Database with migrations applied (including `gtm-onboard-1_onboarding-state` migration)
  - [ ] Shopify sandbox configured (or use E2E testkit)
  - [ ] OnboardingModule registered in app.module.ts

- **Test accounts and sample data:**
  - [ ] Test user with no prior APPLY runs
  - [ ] Test project with Shopify connected
  - [ ] Products with missing SEO metadata (for issue selection)

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user (Free, Pro, or Business)

---

## Test Scenarios (Happy Path)

### Scenario 1: Onboarding Banner Appears

**ID:** HP-001

**Preconditions:**

- New user with connected Shopify store
- No prior APPLY runs for the project

**Steps:**

1. Log in as a user with an eligible project
2. Navigate to `/projects/:id/overview`
3. Observe the page header area

**Expected Results:**

- **UI:** Onboarding banner visible with "Get your first DEO win (5–10 minutes)" message
- **UI:** Progress indicator shows Step 1/4 or 2/4 (if Shopify already connected)
- **API:** `GET /onboarding/projects/:projectId/status` returns `eligible: true`

---

### Scenario 2: Start Onboarding Flow

**ID:** HP-002

**Preconditions:**

- Onboarding banner is visible
- Shopify is connected

**Steps:**

1. Click "Start" or "Continue" button on the banner
2. Observe the onboarding panel expansion

**Expected Results:**

- **UI:** Onboarding panel expands showing 4 steps
- **UI:** Step 1 (Connect Store) shows as completed
- **UI:** Step 2 highlights the recommended issue/pillar
- **API:** `POST /onboarding/projects/:projectId/start` creates/updates state

---

### Scenario 3: View Recommended Issue

**ID:** HP-003

**Preconditions:**

- Onboarding started (Step 2)
- At least one actionable issue exists

**Steps:**

1. Click on the recommended issue link in Step 2
2. Observe navigation to the relevant pillar section

**Expected Results:**

- **UI:** Page navigates to the correct pillar section (e.g., Search & Intent)
- **UI:** The specific issue is highlighted or focused
- **UI:** "Preview fix (uses AI)" button is visible
- **API:** No AI calls made (verify via network tab)

---

### Scenario 4: Preview First Fix

**ID:** HP-004

**Preconditions:**

- Viewing the recommended issue
- Onboarding at Step 2

**Steps:**

1. Click "Preview fix (uses AI)" button
2. Wait for AI generation to complete

**Expected Results:**

- **UI:** Loading indicator shown during AI generation
- **UI:** Preview panel displays generated suggestions
- **UI:** Onboarding step advances to Step 3
- **API:** AI preview endpoint called
- **Analytics:** `onboarding_first_preview` event emitted

---

### Scenario 5: Apply First Fix

**ID:** HP-005

**Preconditions:**

- Preview completed
- Suggestions displayed

**Steps:**

1. Click "Apply" button to commit the fix
2. Wait for apply action to complete

**Expected Results:**

- **UI:** Success toast shown
- **UI:** Celebration panel appears: "You completed your first DEO win"
- **UI:** Onboarding banner disappears
- **API:** APPLY endpoint called and succeeds
- **API:** AutomationPlaybookRun row created with `runType='APPLY'`, `aiUsed=false`
- **Analytics:** `onboarding_first_apply` + `onboarding_completed` events emitted

---

### Scenario 6: Non-Guided Completion

**ID:** HP-006

**Preconditions:**

- User eligible for onboarding
- User navigates directly to product and applies a fix manually

**Steps:**

1. Skip the onboarding banner
2. Navigate to any product's SEO editor
3. Make and apply a change via Shopify sync

**Expected Results:**

- **UI:** Celebration panel shows: "You fixed your first DEO issue"
- **UI:** Onboarding banner disappears
- **API:** Onboarding status changes to COMPLETED
- **API:** `completedRunId` references the manual APPLY run

---

## Edge Cases

### EC-001: No Actionable Issues

**Description:** User has no issues in any pillar (all products optimized)

**Steps:**

1. Log in with a project that has no issues

**Expected Behavior:**

- Onboarding recommends "You're in great shape – explore DEO overview"
- No specific issue is highlighted
- User can explore freely

---

### EC-002: Session Dismissal Persistence

**Description:** Dismissing the banner hides it for the session only

**Steps:**

1. Click the dismiss/close button on the onboarding banner
2. Navigate to another page and return
3. Close and reopen the browser

**Expected Behavior:**

- Same session: Banner stays hidden
- New session: Banner reappears (unless completed/skipped)

---

### EC-003: Multiple Projects

**Description:** Onboarding state is per user+project

**Steps:**

1. Complete onboarding on Project A
2. Create or access Project B

**Expected Behavior:**

- Project A: No onboarding banner (completed)
- Project B: Onboarding banner visible (if eligible)

---

### EC-004: Advance Step Validation

**Description:** Steps must advance monotonically

**Steps:**

1. Start onboarding at Step 1
2. Try to call `POST /advance` with `toStep: 4`

**Expected Behavior:**

- API rejects non-monotonic advances
- Steps must progress 1 → 2 → 3 → 4

---

## Error Handling

### ERR-001: AI Preview Failure

**Scenario:** AI service returns an error during preview

**Steps:**

1. Click "Preview fix" when AI service is unavailable

**Expected Behavior:**

- Error message shown to user
- User can retry
- Onboarding step does NOT advance

---

### ERR-002: Apply Failure

**Scenario:** APPLY action fails (Shopify API error, etc.)

**Steps:**

1. Click "Apply" when Shopify API is unavailable

**Expected Behavior:**

- Error message shown
- Onboarding does NOT mark as completed
- User can retry

---

### ERR-003: Unauthorized Access

**Scenario:** User tries to access another user's project onboarding

**Steps:**

1. Call `GET /onboarding/projects/:otherUsersProjectId/status`

**Expected Behavior:**

- 403 Forbidden response
- No data leaked

---

## Limits

### LIM-001: AI Quota During Onboarding

**Scenario:** User hits AI daily limit during onboarding preview

**Steps:**

1. Exhaust AI quota on other operations
2. Try to preview during onboarding

**Expected Behavior:**

- Quota exceeded message shown
- User informed to try again tomorrow or upgrade
- Onboarding remains at current step

---

## Regression

### Areas potentially impacted:

- [ ] **Issue Engine:** Issue reads should NOT trigger AI (trust contract)
- [ ] **Pillar Apply Endpoints:** All should record AutomationPlaybookRun rows
- [ ] **Project Pages Layout:** Banner should not break existing layouts
- [ ] **Shopify SEO Editor:** Apply should also record canonical APPLY run

### Quick sanity checks:

- [ ] Login still works
- [ ] Project overview page loads
- [ ] Existing pillar pages work without onboarding params
- [ ] Products page loads correctly

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test projects and onboarding state records
- [ ] Delete test AutomationPlaybookRun records

### Follow-up verification:

- [ ] Confirm onboarding state persists correctly in DB
- [ ] Verify analytics events appear in GA (if configured)

---

## Known Issues

- **Intentionally accepted issues:**
  - Dismissal is session-only; this is intentional to encourage completion

- **Out-of-scope items:**
  - Multi-user onboarding (each user has their own state)
  - Onboarding for non-Shopify projects

- **TODOs (after implementation):**
  - [ ] Add Playwright E2E coverage for full flow (`gtm-onboard-1.spec.ts`)
  - [ ] Add backend integration tests (`gtm-onboard-1.test.ts`)
  - [ ] Create testkit seeds (`seed-first-deo-win`, `connect-shopify`)

---

## API Testing (curl/Postman)

### Get Onboarding Status

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/onboarding/projects/<projectId>/status
```

### Start Onboarding

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3001/onboarding/projects/<projectId>/start
```

### Advance Step

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"toStep": 2}' \
  http://localhost:3001/onboarding/projects/<projectId>/advance
```

### Skip Onboarding

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3001/onboarding/projects/<projectId>/skip
```

---

## Expected Test Counts (Planned)

> Note: These test scenarios are planned for execution once implementation is complete.

| Category       | Tests  | Status      |
| -------------- | ------ | ----------- |
| Happy Path     | 6      | Planned     |
| Edge Cases     | 4      | Planned     |
| Error Handling | 3      | Planned     |
| Limits         | 1      | Planned     |
| **Total**      | **14** | **Planned** |

---

## Bug Reporting

If you find issues:

1. Note the test scenario (e.g., HP-003)
2. Capture browser console logs
3. Capture network requests
4. Note the onboarding step and state
5. Report in GitHub Issues with `[GTM-ONBOARD-1]` prefix

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
