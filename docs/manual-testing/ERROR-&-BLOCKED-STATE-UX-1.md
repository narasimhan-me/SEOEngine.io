# EngineO.ai – Manual Testing: ERROR-&-BLOCKED-STATE-UX-1

> **Blocked, Error, and Boundary States UX**
>
> This document provides manual testing procedures for the ERROR-&-BLOCKED-STATE-UX-1 phase.

---

## Overview

- **Purpose of the feature/patch:**
  - Standardize and harden all blocked, error, and boundary states across the Issues Decision Engine and Right Context Panel so users never mistake a system limitation for a bug—or a bug for user error.

- **High-level user impact and what "success" looks like:**
  - Every blocked action has a clear, human explanation
  - Users can distinguish permissions vs scopes vs system limits
  - No silent failures or misleading CTAs remain
  - Blocked chips have informative tooltips
  - RCP displays "Why this is blocked" when applicable

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - ERROR-&-BLOCKED-STATE-UX-1
  - ISSUE-FIX-ROUTE-INTEGRITY-1 (prior phase)
  - DRAFT-LIFECYCLE-VISIBILITY-1 (prior phase)

- **Related documentation:**
  - \`apps/web/src/lib/issues/blockedState.ts\` (blocked state derivation)
  - \`docs/jira/ERROR-&-BLOCKED-STATE-UX-1.md\` (Jira issue)

---

## Preconditions

- **Environment requirements:**
  - [ ] Local development environment running (\`pnpm dev\`)
  - [ ] Backend API running with database connection
  - [ ] No special feature flags required

- **Test accounts and sample data:**
  - [ ] Test user with project access (any plan)
  - [ ] Project with Shopify integration (connected and disconnected states)
  - [ ] Project with issues in various states (actionable, informational, blocked)

- **Required user roles or subscriptions:**
  - [ ] Free plan user (for testing permission limits)
  - [ ] Pro/Business plan user (for testing full functionality)
  - [ ] Project owner vs. member roles (for permission scenarios)

---

## Test Scenarios (Happy Path)

### Scenario 1: Blocked Chip Displays Correct Label and Tooltip

**ID:** EBSUX1-HP-001

**Preconditions:**
- User is viewing the Issues page for a project
- At least one issue has a blocked action

**Steps:**

1. Navigate to \`/projects/[id]/issues\`
2. Find an issue row with a blocked action (no Fix CTA visible)
3. Observe the blocked chip in the Actions column
4. Hover over the blocked chip to view tooltip

**Expected Results:**

- **UI:**
  - Blocked chip displays one of the canonical labels:
    - "Blocked — permissions"
    - "Blocked — Shopify permissions"
    - "Blocked — save draft"
    - "Blocked — unavailable"
    - "Blocked — syncing"
    - "Blocked — system error"
  - Tooltip displays description + next step (if applicable)
- **API:** N/A (frontend-only)
- **Logs:** No errors in console

---

### Scenario 2: Blocked Chip Does Not Trigger Row Click

**ID:** EBSUX1-HP-002

**Preconditions:**
- User is viewing the Issues page
- Issue row has a blocked chip

**Steps:**

1. Navigate to \`/projects/[id]/issues\`
2. Find a row with a blocked chip
3. Click directly on the blocked chip

**Expected Results:**

- **UI:**
  - Clicking the blocked chip does NOT open the RCP
  - RCP only opens when clicking elsewhere on the row
- **API:** N/A
- **Logs:** No errors

---

### Scenario 3: RCP Shows "Why this is blocked" Line

**ID:** EBSUX1-HP-003

**Preconditions:**
- User is viewing Issues page
- Issue row has a blocked state

**Steps:**

1. Navigate to \`/projects/[id]/issues\`
2. Click on a blocked issue row (not on the chip) to open RCP
3. Scroll to the Actionability section in RCP

**Expected Results:**

- **UI:**
  - RCP opens for the issue
  - Actionability section displays "Why this is blocked:" label
  - Description matches the blocked state copy
  - "Next: [action]" shows when applicable
- **API:** N/A
- **Logs:** No errors

---

### Scenario 4: Fix/Apply CTA Not Shown When Blocked

**ID:** EBSUX1-HP-004

**Preconditions:**
- User is viewing Issues page
- Issue would normally have a Fix CTA but is blocked

**Steps:**

1. Navigate to \`/projects/[id]/issues\`
2. Identify an issue that is blocked (e.g., Shopify scopes missing)
3. Observe the Actions column

**Expected Results:**

- **UI:**
  - No "Fix", "Fix with AI", "Review fix", or "Apply" CTA is shown
  - Only the blocked chip is displayed in the Actions column
- **API:** N/A
- **Logs:** No errors

---

### Scenario 5: Blocked State Replaces Fix CTA (FIXUP-1)

**ID:** EBSUX1-HP-005

**Preconditions:**
- User is viewing Issues page
- Project has Shopify connected but with missing scopes (e.g., only read_products, missing write_products)
- Issue would normally have an actionable Fix CTA (fix destination exists)

**Steps:**

1. Connect Shopify store with limited scopes (e.g., read_products only)
2. Navigate to `/projects/[id]/issues`
3. Find an issue of type `missing_seo_title` or `missing_seo_description` (which have fix destinations)
4. Observe the Actions column for this issue

**Expected Results:**

- **UI:**
  - Even though a fix destination exists, the blocked chip "Blocked — Shopify permissions" is shown
  - NO Fix CTA button is shown (blocked state takes priority)
  - Blocked chip tooltip shows: "Required Shopify permissions weren't granted, so fixes can't be applied. Reconnect Shopify to grant the missing permissions."
- **API:** N/A
- **Logs:** No console warnings about Fix CTA rendering while blocked (guardrail silent when gating works)

**Verification Note:**
This scenario confirms that `deriveBlockedState()` is evaluated BEFORE checking `destinations.fix.kind !== 'none'`, ensuring blocked state always suppresses Fix CTAs regardless of whether a valid fix destination exists.

---

### Scenario 6: Blocked State Requires Trusted Integration Status (FIXUP-2)

**ID:** EBSUX1-HP-006

**Preconditions:**
- User is viewing Issues page
- Network conditions can be simulated (slow network or API failure)

**Steps:**

1. Simulate slow network or API failure for `/projects/[id]/integration-status` endpoint
2. Navigate to `/projects/[id]/issues`
3. Observe the Actions column while integration-status is loading or after failure
4. Compare with behavior after successful integration-status load

**Expected Results:**

- **UI (during load/failure):**
  - NO blocked chips appear for issues (blocked state derivation is skipped when `integrationStatusOk === false`)
  - Fix CTAs may appear normally (not incorrectly suppressed by unloaded data)
  - Sync-pending empty state does NOT appear (requires `integrationStatusOk === true && lastCrawledAt === null`)
- **UI (after successful load):**
  - Blocked chips appear correctly based on actual integration status
  - Sync-pending empty state appears if `lastCrawledAt === null` (known missing)
- **API:** N/A
- **Logs:** No console errors; `integrationStatusOk` remains `false` until successful response

**Verification Note:**
This scenario confirms that `integrationStatusOk` (not `integrationStatusLoaded`) gates blocked state derivation. This prevents false positives (e.g., showing "Blocked — syncing" when we simply haven't loaded the data yet). The `lastCrawledAt` state initializes to `undefined` (unknown), and is only set to `null` (known missing) after a successful API response confirms it's missing.

---

### Scenario 7: Inline Blocked Explanation Visible Without Hover (FIXUP-1)

**ID:** EBSUX1-HP-007

**Preconditions:**
- User is viewing Issues page
- At least one issue has a blocked state

**Steps:**

1. Navigate to `/projects/[id]/issues`
2. Find an issue row with a blocked action (blocked chip visible)
3. Observe the Actions column WITHOUT hovering over the chip
4. Verify the description text is visible below the chip

**Expected Results:**

- **UI:**
  - Blocked chip displays canonical label (e.g., "Blocked — Shopify permissions")
  - Description text visible below chip WITHOUT requiring hover (e.g., "Required Shopify permissions weren't granted, so fixes can't be applied.")
  - Text styling is subtle: small (10px), muted color, snug line height
  - Tooltip still available on hover (contains full description + next step)
  - Clicking chip or description does NOT trigger row click (RCP does not open)
- **Accessibility:**
  - Description is plain text (no ARIA attributes needed)
  - DOM order is chip → description (correct screen-reader order)
- **API:** N/A
- **Logs:** No console warnings in development mode (description copy exists)

**Verification Note:**
This scenario confirms that blocked state explanations are visible without hover, addressing accessibility concerns about tooltip-only information. The inline description ensures users can understand why an action is blocked at a glance.

---

## Edge Cases

### EC-001: PERMISSIONS_MISSING State

**Description:** User lacks permission to run fixes for the project

**Steps:**

1. Log in as a project member with limited permissions
2. Navigate to project Issues page
3. Observe blocked chips for permission-restricted issues

**Expected Behavior:**

- Blocked chip: "Blocked — permissions"
- Tooltip: "You don't have permission to run fixes for this project. Ask a project owner to grant access, then try again."
- RCP shows same explanation

---

### EC-002: SHOPIFY_SCOPE_MISSING State

**Description:** Shopify OAuth scopes not granted

**Steps:**

1. Create/use a project with Shopify connected but missing write_products scope
2. Navigate to Issues page
3. Observe blocked chips for issues requiring Shopify write access

**Expected Behavior:**

- Blocked chip: "Blocked — Shopify permissions"
- Tooltip: "Required Shopify permissions weren't granted, so fixes can't be applied. Reconnect Shopify to grant the missing permissions."

---

### EC-003: SYNC_PENDING State

**Description:** Project data sync not complete

**Steps:**

1. Create a new project that hasn't completed initial sync
2. Navigate to Issues page before sync completes
3. Observe the empty state

**Expected Behavior:**

- Empty state shows sync-pending message:
  - "Syncing data"
  - "We can't show fixes yet because data sync is still in progress. Try again after the sync completes."
- Background color: warning/amber

---

### EC-004: DRAFT_REQUIRED State

**Description:** Draft must be saved before applying

**Steps:**

1. Generate an AI preview for an issue but don't save it
2. Observe the blocked state for the Apply action

**Expected Behavior:**

- Blocked chip: "Blocked — save draft"
- Tooltip: "Save the draft before applying it to Shopify. Click \"Save draft\", then apply the saved draft."

---

### EC-005: DESTINATION_UNAVAILABLE State

**Description:** Fix action not available in current UI context

**Steps:**

1. Find an issue where the fix destination is not mapped
2. Observe the blocked chip

**Expected Behavior:**

- Blocked chip: "Blocked — unavailable"
- Tooltip: "This action isn't available in the current UI. Open the issue details to review context."

---

### EC-006: SYSTEM_ERROR State

**Description:** System-level error prevents action

**Steps:**

1. Simulate or encounter a system error during issue loading
2. Observe error state

**Expected Behavior:**

- Error banner: "Issues are unavailable due to a system error. Retry, or refresh the page."
- Retry button is visible

---

## Error Handling

### ERR-001: Issues Load Failure

**Scenario:** API fails to return issues

**Steps:**

1. Simulate API failure (e.g., disconnect backend)
2. Navigate to Issues page

**Expected Behavior:**

- Error message: "Issues are unavailable due to a system error. Retry, or refresh the page."
- Retry button is functional
- No unhandled exceptions in console

---

### ERR-002: RCP Issue Details Load Failure

**Scenario:** Issue details fail to load in RCP

**Steps:**

1. Open RCP for an issue
2. Simulate API failure for issue details

**Expected Behavior:**

- Error message: "This action is unavailable due to a system error. Retry, or refresh the page."
- Panel shows error state gracefully

---

## Limits

### LIM-001: Free Plan Permission Limits

**Scenario:** Free plan user cannot apply AI fixes

**Steps:**

1. Log in as free plan user
2. Navigate to Issues page
3. Observe blocked states for AI fix actions

**Expected Behavior:**

- Blocked chips show appropriate permission/plan messaging
- No misleading CTAs suggesting user can apply fixes

---

## Regression

### Areas potentially impacted:

- [ ] **Issues Table:** Ensure all issue rows render correctly with proper CTAs or blocked chips
- [ ] **Right Context Panel:** Verify issue details display properly with blocked state info
- [ ] **Draft Lifecycle:** Confirm draft states still display correctly alongside blocked states
- [ ] **Fix Flow:** Ensure actionable issues still have working Fix CTAs

### Quick sanity checks:

- [ ] Issues page loads without errors
- [ ] Clicking actionable issues navigates to fix flow
- [ ] RCP opens correctly for all issue types
- [ ] Empty states display correctly (sync pending vs. healthy)

---

## Critical Invariants

### CI-001: Blocked Chip Label Matches Tooltip

**Requirement:** The blocked chip label must be a shortened form of the tooltip description

**Verification:**
- [ ] PERMISSIONS_MISSING: "Blocked — permissions" matches "You don't have permission..."
- [ ] SHOPIFY_SCOPE_MISSING: "Blocked — Shopify permissions" matches "Required Shopify permissions..."
- [ ] DRAFT_REQUIRED: "Blocked — save draft" matches "Save the draft before..."
- [ ] DESTINATION_UNAVAILABLE: "Blocked — unavailable" matches "This action isn't available..."
- [ ] SYNC_PENDING: "Blocked — syncing" matches "We can't show fixes yet..."
- [ ] SYSTEM_ERROR: "Blocked — system error" matches "This action is unavailable..."

---

### CI-002: RCP Matches Table State

**Requirement:** The "Why this is blocked" line in RCP must match the blocked chip state in the table

**Verification:**
- [ ] Open RCP for a blocked issue
- [ ] Compare RCP blocked state explanation with table chip tooltip
- [ ] Both should show identical copy

---

### CI-003: No Fix/Apply CTA When Blocked

**Requirement:** When deriveBlockedState() returns a non-null value, no Fix/Apply CTA should be rendered

**Verification:**
- [ ] For each blocked state type, verify no misleading CTAs appear
- [ ] Only the blocked chip is shown in the Actions column

---

### CI-004: Token-Only + No In-Body Navigation Links

**Requirement:** RCP content uses token-only styling and has no in-body navigation links

**Verification:**
- [ ] "Why this is blocked" section has no clickable links
- [ ] Next step guidance is text-only (no buttons or links)
- [ ] Header external-link is the only navigation affordance

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup required (frontend-only changes)

### Follow-up verification:

- [ ] Console shows no dev-time warnings about blocked state mismatches
- [ ] No blocked state has undefined/missing copy

---

## Known Issues

- **Intentionally accepted issues:**
  - Blocked state derivation may not catch all edge cases; falls back to DESTINATION_UNAVAILABLE

- **Out-of-scope items:**
  - Backend permission changes
  - Bulk action blocked states

- **TODOs:**
  - [ ] Add E2E tests for blocked state scenarios

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
