# EngineO.ai – System-Level Manual Testing: Frontend UX, Feedback & Limits

> Cross-cutting manual tests for toast notifications, loading states, form validation, error boundaries, empty states, and limit/upgrade prompts.

---

## Overview

- **Purpose of this testing doc:**
  - Validate consistent UX patterns across the application including feedback mechanisms, loading states, error handling, and limit enforcement UI.

- **High-level user impact and what "success" looks like:**
  - Users always know what's happening (loading states, progress indicators).
  - Errors are communicated clearly with actionable guidance.
  - Limit enforcement is clear and non-blocking where possible.
  - Empty states guide users to next actions.
  - Form validation prevents errors before submission.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase UX-1 through UX-6 (all UX phases)
  - Any phase involving user-facing features

- **Related documentation:**
  - `docs/ENTITLEMENTS_MATRIX.md` (limit values)
  - Design system / component library docs

---

## Preconditions

- **Environment requirements:**
  - [ ] Frontend application running
  - [ ] Backend API accessible
  - [ ] Test accounts on various plan tiers

- **Test accounts and sample data:**
  - [ ] Free user (for limit testing)
  - [ ] Pro user (for comparison)
  - [ ] Projects in various states (empty, populated, at limits)

- **Required user roles or subscriptions:**
  - [ ] At least one account per tier for limit testing

---

## Test Scenarios (Happy Path)

### Scenario 1: Toast notifications for successful actions

**ID:** HP-001

**Preconditions:**

- User is logged in with a project

**Steps:**

1. Perform a successful action (e.g., save settings, create project)
2. Observe toast notification

**Expected Results:**

- **UI:** Green success toast appears briefly (3-5 seconds)
- **Content:** Clear confirmation message (e.g., "Settings saved")
- **Behavior:** Toast auto-dismisses, doesn't block interaction

---

### Scenario 2: Loading states during async operations

**ID:** HP-002

**Preconditions:**

- User is on a page that fetches data

**Steps:**

1. Navigate to Overview page
2. Observe loading state
3. Wait for data to load

**Expected Results:**

- **UI:** Skeleton loaders or spinner shown during fetch
- **Timing:** Loading state shows immediately, resolves when data arrives
- **Transition:** Smooth transition from loading to content

---

### Scenario 3: Form validation prevents invalid submissions

**ID:** HP-003

**Preconditions:**

- User is on a form (e.g., project creation)

**Steps:**

1. Leave required fields empty
2. Enter invalid data (e.g., invalid URL format)
3. Attempt to submit

**Expected Results:**

- **UI:** Inline validation errors shown next to fields
- **Behavior:** Form not submitted
- **Focus:** First error field focused for correction

---

### Scenario 4: Empty states guide users

**ID:** HP-004

**Preconditions:**

- User has a new/empty project

**Steps:**

1. Navigate to Products page (no products synced)
2. Navigate to Issues page (no crawl run)
3. Observe empty states

**Expected Results:**

- **UI:** Helpful empty state with illustration/icon
- **Content:** Clear explanation + CTA button
- **CTA:** "Connect store" or "Run first crawl" as appropriate

---

### Scenario 5: Progress indicators for multi-step processes

**ID:** HP-005

**Preconditions:**

- User initiates a multi-step process (e.g., bulk optimization)

**Steps:**

1. Start bulk AI optimization for 5 products
2. Observe progress indicator

**Expected Results:**

- **UI:** Progress bar or step indicator shown
- **Updates:** Real-time progress updates
- **Completion:** Clear success state when done

---

## Edge Cases

### EC-001: Rapid repeated actions

**Description:** User clicks action button multiple times rapidly.

**Steps:**

1. Click "Save" button multiple times quickly

**Expected Behavior:**

- Button disabled after first click
- Only one request sent
- Single toast notification

---

### EC-002: Navigation during async operation

**Description:** User navigates away while operation is in progress.

**Steps:**

1. Start a long operation (e.g., crawl)
2. Navigate to different page
3. Return to original page

**Expected Behavior:**

- Operation continues in background
- Status reflected when returning
- No duplicate operations started

---

### EC-003: Very long content in toasts/alerts

**Description:** Error message or content is very long.

**Steps:**

1. Trigger error with long message

**Expected Behavior:**

- Toast truncates or wraps appropriately
- Full message available on hover/click if needed
- UI doesn't break

---

### EC-004: Multiple simultaneous toasts

**Description:** Several actions complete at once.

**Steps:**

1. Trigger multiple success/error events simultaneously

**Expected Behavior:**

- Toasts stack or queue
- Each is readable
- Older toasts auto-dismiss

---

## Error Handling

### ERR-001: API error displays user-friendly message

**Scenario:** Backend returns 500 error.

**Steps:**

1. Trigger action when API will fail

**Expected Behavior:**

- Red error toast shown
- Message: "Something went wrong. Please try again."
- Technical details not exposed to user
- Retry option if applicable

---

### ERR-002: Network error handling

**Scenario:** Network connection lost.

**Steps:**

1. Disconnect network
2. Attempt action

**Expected Behavior:**

- Error message: "Network error. Check your connection."
- Retry option when connection restored
- No data loss

---

### ERR-003: Session expiration handling

**Scenario:** User's session expires during use.

**Steps:**

1. Let session expire
2. Attempt action

**Expected Behavior:**

- Redirect to login page
- Message explaining session expired
- Return to previous page after re-login

---

### ERR-004: Error boundary catches component crashes

**Scenario:** Component throws rendering error.

**Steps:**

1. Trigger component error (if testable)

**Expected Behavior:**

- Error boundary shows fallback UI
- Rest of app remains functional
- Error logged for debugging

---

## Limits

### LIM-001: Project limit upgrade prompt

**Scenario:** Free user at project limit tries to create another.

**Steps:**

1. Log in as Free user with 1 project
2. Click "New Project"

**Expected Behavior:**

- Modal/dialog shows limit reached
- Clear messaging about current limit (1 project)
- Upgrade CTA prominently displayed
- Option to dismiss without upgrading

---

### LIM-002: AI usage limit warning and block

**Scenario:** User approaches and hits AI daily limit.

**Steps:**

1. Use AI until near limit (e.g., 8/10 for Free)
2. Continue to hit limit

**Expected Behavior:**

- **Near limit:** Warning banner "2 AI calls remaining today"
- **At limit:** Block message "Daily AI limit reached"
- Upgrade prompt shown
- Clear reset time displayed

---

### LIM-003: Feature gating for plan-locked features

**Scenario:** Free user tries to access Pro-only feature.

**Steps:**

1. Navigate to Pro-only feature (if applicable)

**Expected Behavior:**

- Feature disabled or hidden
- If visible: Clear "Pro" or "Business" badge
- Click shows upgrade prompt

---

## Regression

### Areas potentially impacted:

- [ ] **All forms:** Validation still works
- [ ] **All pages:** Loading states appear
- [ ] **All actions:** Toast feedback works
- [ ] **Navigation:** No broken routes

### Quick sanity checks:

- [ ] Create project shows loading then success toast
- [ ] Save settings shows success toast
- [ ] Invalid form shows validation errors
- [ ] Empty project shows appropriate empty states

---

## Post-Conditions

### Data cleanup steps:

- [ ] Delete any test projects created
- [ ] Reset test user states if modified

### Follow-up verification:

- [ ] No console errors during testing
- [ ] All UI elements render correctly

---

## Known Issues

- **Intentionally accepted issues:**
  - Some loading states may be very brief on fast connections

- **Out-of-scope items:**
  - Animation performance optimization
  - Accessibility audit (separate testing doc)

- **TODOs:**
  - [ ] Add consistent loading state duration (minimum 200ms for perceived feedback)
  - [ ] Consider toast persistence settings

---

## Approval

| Field              | Value                                                     |
| ------------------ | --------------------------------------------------------- |
| **Tester Name**    | [Pending]                                                 |
| **Date**           | [YYYY-MM-DD]                                              |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                     |
| **Notes**          | Cross-cutting system-level tests for frontend UX patterns |
