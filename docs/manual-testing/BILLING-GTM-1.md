# BILLING-GTM-1 — Manual Testing

> This document follows `docs/MANUAL_TESTING_TEMPLATE.md` structure.

## Overview
- **Purpose of the feature/patch:**
  - Public pricing + in-app upgrades that surface value first and enforce quotas via Predict → Warn → Enforce, Stripe-first.
- **High-level user impact and what "success" looks like:**
  - Users understand value (progress + reuse savings) and can upgrade without surprises.
- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase BILLING-GTM-1
- **Related documentation:**
  - `docs/BILLING_GTM.md`
  - `docs/SELF_SERVICE.md`
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-002)

## Preconditions
- **Environment requirements:**
  - [ ] Stripe test keys configured (as applicable)
  - [ ] `AI_USAGE_MONTHLY_RUN_LIMIT_<PLAN>` set for at least Free/Pro (for warning/limit scenarios)
  - [ ] Web + API running
- **Test accounts and sample data:**
  - [ ] Free plan user with some AI runs + some reuse
  - [ ] Pro plan user near soft threshold
  - [ ] (Optional) Pro plan user blocked by hard limit (if enabled)
- **Required user roles or subscriptions:**
  - [ ] OWNER vs EDITOR/VIEWER (billing actions)

## Test Scenarios (Happy Path)
### Scenario 1: Public pricing page is readable without signup
**ID:** HP-001
**Steps:**
1. Visit `/pricing` logged out.
2. Confirm plans render and limits match backend plan definitions.
**Expected Results:**
- **UI:** No login wall; plans and FAQ visible.
- Plans show: Free (1 project, 50 pages), Pro (5 projects, 500 pages), Business (Unlimited).
- "Contact Sales" removed from Business CTA; self-serve CTA present.

### Scenario 2: Billing page shows value before upgrade
**ID:** HP-002
**Steps:**
1. Log in as OWNER.
2. Visit `/settings/billing`.
3. Confirm AI runs used, reuse savings, and Apply trust message are visible before plan CTAs.
**Expected Results:**
- **UI:** "Runs avoided via reuse" present; "APPLY never uses AI" present.
- AI runs used shows `aiUsedRuns` (not `totalRuns`).
- Quota progress bar visible when limit is configured.

### Scenario 3: Plan grid shows monthly AI runs
**ID:** HP-003
**Steps:**
1. Visit `/settings/billing` as OWNER.
2. Scroll to Available Plans grid.
**Expected Results:**
- Each plan card shows "X AI runs/month" or "Unlimited AI runs/month".

## Edge Cases
### EC-001: API quota env not configured
**Steps:**
1. Unset `AI_USAGE_MONTHLY_RUN_LIMIT_<PLAN>`.
2. Visit `/settings/billing`.
**Expected Behavior:**
- UI shows "Unlimited" quota and does not show misleading percent pressure messaging.

### EC-002: Quota at exactly 80%
**Steps:**
1. Configure limit and generate runs to reach exactly 80%.
2. View Insights page.
**Expected Behavior:**
- Upgrade prompt appears (80% is the threshold).

## Error Handling
### ERR-001: Stripe not configured
**Steps:**
1. With missing Stripe keys, attempt "Upgrade".
**Expected Behavior:**
- Clear error; no crash; no partial state.

### ERR-003: Permission failures
**Steps:**
1. Log in as EDITOR/VIEWER.
2. Visit `/settings/billing`.
**Expected Behavior:**
- Read-only notice; no enabled upgrade actions.

## Limits
### LIM-001: Soft quota warning (Predict → Warn)
**Steps:**
1. Configure a small monthly limit via env.
2. Generate enough AI runs to cross soft threshold.
3. Trigger an AI preview action (e.g., Automation Playbooks preview).
**Expected Behavior:**
- Limit-style toast shown with Upgrade CTA; action is still allowed.

### LIM-002: Hard quota block (Warn → Enforce)
**Steps:**
1. Enable hard enforcement via env for a plan.
2. Exceed the monthly limit.
3. Trigger an AI preview action.
**Expected Behavior:**
- Action blocked; Upgrade CTA present; Apply remains unaffected.

### LIM-003: Insights upgrade prompt
**Steps:**
1. Configure quota and reach >=80% usage.
2. Navigate to `/projects/:id/insights`.
**Expected Behavior:**
- Contextual upgrade prompt visible referencing progress/savings.
- Trust anchor line visible: "APPLY never uses AI".

### LIM-004: AI Efficiency page upgrade prompt
**Steps:**
1. Configure quota and reach >=80% usage.
2. Navigate to `/projects/:id/insights/ai-efficiency`.
**Expected Behavior:**
- "Manage Plan & Billing" link always visible.
- Upgrade prompt appears in Quota Status section.

## Regression
### Areas potentially impacted:
- [ ] Pricing page layout
- [ ] Billing page role gating
- [ ] Automation Playbooks quota guard UX
- [ ] Insights pages remain read-only

## Post-Conditions
- [ ] Cancel Stripe test subscriptions if created
- [ ] Clean up seeded users/projects if needed

## Known Issues
- **Out-of-scope items:**
  - No annual plans, coupons, or enterprise contracts in v1.

## Approval
| Field | Value |
|-------|-------|
| **Tester Name** |  |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** |  |
