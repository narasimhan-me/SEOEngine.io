# EngineO.ai – Manual Testing Template

> **This is the single source of truth for manual testing structure.**
>
> - Claude must **clone** this template (not edit it directly) when creating per-feature or per-patch manual testing docs.
> - Per-feature docs should live under `docs/manual-testing/` with descriptive filenames.
> - All sections must remain present in cloned docs (even if marked "N/A").
> - Claude should adapt the content to the specific patch but preserve the section ordering.

---

## Overview

- **Purpose of the feature/patch:**
  - [Describe what this feature or patch accomplishes]

- **High-level user impact and what "success" looks like:**
  - [Describe the expected user experience and measurable outcomes]

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - [Reference relevant phase numbers, e.g., Phase UX-6, Phase 2.3]

- **Related documentation:**
  - [List any related docs, e.g., ENTITLEMENTS_MATRIX.md, API_SPEC.md]

---

## Preconditions

- **Environment requirements:**
  - [ ] Required env vars (e.g., `STRIPE_SECRET_KEY`, `SHOPIFY_API_KEY`)
  - [ ] Feature flags enabled/disabled
  - [ ] Backend services running (API, database, Redis if applicable)

- **Test accounts and sample data:**
  - [ ] Test user accounts (free, pro, business tiers)
  - [ ] Test Shopify/Stripe sandbox setup
  - [ ] Sample projects with specific states

- **Required user roles or subscriptions:**
  - [ ] Specify which plan/tier is needed for each scenario

---

## Test Scenarios (Happy Path)

### Scenario 1: [Descriptive Name]

**ID:** HP-001

**Preconditions:**
- [Any additional preconditions specific to this scenario]

**Steps:**
1. [Step 1 action]
2. [Step 2 action]
3. [Step 3 action]

**Expected Results:**
- **UI:** [Expected UI behavior]
- **API:** [Expected API response/behavior]
- **Logs:** [Expected log output, if relevant]

---

### Scenario 2: [Descriptive Name]

**ID:** HP-002

**Preconditions:**
- [Any additional preconditions]

**Steps:**
1. [Step 1 action]
2. [Step 2 action]

**Expected Results:**
- **UI:** [Expected UI behavior]
- **API:** [Expected API response]

---

## Edge Cases

### EC-001: [Edge Case Name]

**Description:** [Describe the unusual input, boundary value, or multi-tenant case]

**Steps:**
1. [Step to trigger edge case]

**Expected Behavior:**
- [How the system should handle this case]

---

### EC-002: [Edge Case Name]

**Description:** [Description]

**Steps:**
1. [Steps]

**Expected Behavior:**
- [Expected behavior]

---

## Error Handling

### ERR-001: External Service Failure (Stripe/Shopify/AI Provider)

**Scenario:** [Describe the failure scenario, e.g., Stripe API timeout]

**Steps:**
1. [How to simulate or trigger the failure]

**Expected Behavior:**
- [Error message shown to user]
- [Fallback behavior]
- [Logging/monitoring behavior]

---

### ERR-002: Validation Errors

**Scenario:** [Describe invalid input scenario]

**Steps:**
1. [Steps to submit invalid data]

**Expected Behavior:**
- [Validation error message]
- [Form state after error]

---

### ERR-003: Permission Failures

**Scenario:** [Describe unauthorized access attempt]

**Steps:**
1. [Steps to attempt unauthorized action]

**Expected Behavior:**
- [403/401 response or redirect]
- [UI feedback]

---

## Limits

### LIM-001: Entitlement/Quota Limit

**Scenario:** [Describe hitting a plan limit, e.g., "Free plan user tries to create 2nd project"]

**Steps:**
1. [Steps to reach the limit]
2. [Steps to exceed the limit]

**Expected Behavior:**
- [Upgrade prompt or toast message]
- [API error payload (code, message)]
- [User remains on current page/state]

---

### LIM-002: [Another Limit Scenario]

**Scenario:** [Description]

**Steps:**
1. [Steps]

**Expected Behavior:**
- [Expected behavior]

---

## Regression

### Areas potentially impacted:

- [ ] **[Feature/Flow 1]:** [Brief description of what to sanity-check]
- [ ] **[Feature/Flow 2]:** [Brief description]
- [ ] **[Feature/Flow 3]:** [Brief description]

### Quick sanity checks:

- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test records (projects, products, users)
- [ ] Cancel test subscriptions in Stripe sandbox
- [ ] Reset feature flags if modified

### Follow-up verification:

- [ ] Confirm database state is clean
- [ ] Verify no orphaned records

---

## Known Issues

- **Intentionally accepted issues:**
  - [List any known limitations or accepted behaviors]

- **Out-of-scope items:**
  - [List items explicitly not tested in this doc]

- **TODOs:**
  - [ ] [Any follow-up testing work needed]

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | [Any additional notes] |
