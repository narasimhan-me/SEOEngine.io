# EngineO.ai – System-Level Manual Testing: Billing & Limits

> Cross-cutting manual tests for subscription handling, Stripe integration, plan gating, daily AI limits, and billing status UI.

---

## Overview

- **Purpose of this testing doc:**
  - Validate all billing-related flows across EngineO.ai including subscription creation, plan changes, Stripe webhook handling, and entitlement enforcement.

- **High-level user impact and what "success" looks like:**
  - Users can subscribe, upgrade, downgrade, and cancel plans seamlessly.
  - Entitlements are enforced correctly (project limits, AI call limits, feature gating).
  - Billing status and usage are displayed accurately in the UI.
  - Stripe webhooks are processed reliably.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 1.1 (Stripe integration)
  - Phase 1.2 (Entitlements enforcement)
  - Phase 2.x (Billing UI)

- **Related documentation:**
  - `docs/ENTITLEMENTS_MATRIX.md`
  - `docs/API_SPEC.md` (billing endpoints)
  - `docs/ARCHITECTURE.md` (Stripe webhook flow)

---

## Preconditions

- **Environment requirements:**
  - [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` set to Stripe test mode keys
  - [ ] `STRIPE_PRICE_ID_PRO` and `STRIPE_PRICE_ID_BUSINESS` configured
  - [ ] Backend API and database running
  - [ ] Stripe CLI installed for webhook testing (`stripe listen --forward-to localhost:3001/api/stripe/webhook`)

- **Test accounts and sample data:**
  - [ ] Test user accounts for each tier (free, pro, business)
  - [ ] Stripe test cards (4242 4242 4242 4242 for success, 4000 0000 0000 0002 for decline)
  - [ ] Sample projects at various states

- **Required user roles or subscriptions:**
  - [ ] Free tier user (no active subscription)
  - [ ] Pro tier user (active pro subscription)
  - [ ] Business tier user (active business subscription)

---

## Test Scenarios (Happy Path)

### Scenario 1: New user subscribes to Pro plan

**ID:** HP-001

**Preconditions:**

- User is on Free tier with no active subscription
- Stripe test mode is active

**Steps:**

1. Log in as a Free tier user
2. Navigate to Settings > Billing
3. Click "Upgrade to Pro"
4. Enter test card 4242 4242 4242 4242, any future expiry, any CVC
5. Complete checkout

**Expected Results:**

- **UI:** Success message shown, billing page updates to show Pro subscription
- **API:** `POST /api/stripe/create-checkout-session` returns redirect URL
- **Database:** User's subscription record updated with `plan: PRO`, `stripeSubscriptionId` populated
- **Stripe:** Subscription created in Stripe dashboard

---

### Scenario 2: Pro user upgrades to Business plan

**ID:** HP-002

**Preconditions:**

- User has active Pro subscription

**Steps:**

1. Log in as Pro tier user
2. Navigate to Settings > Billing
3. Click "Upgrade to Business"
4. Confirm upgrade

**Expected Results:**

- **UI:** Confirmation shown, plan changes to Business
- **API:** Subscription updated via Stripe API
- **Database:** Subscription plan updated to `BUSINESS`
- **Entitlements:** New limits immediately available

---

### Scenario 3: User cancels subscription

**ID:** HP-003

**Preconditions:**

- User has active paid subscription

**Steps:**

1. Navigate to Settings > Billing
2. Click "Cancel Subscription"
3. Confirm cancellation

**Expected Results:**

- **UI:** Shows subscription will end at period end
- **Database:** `cancelAtPeriodEnd: true` set
- **Stripe:** Subscription marked for cancellation

---

### Scenario 4: Stripe webhook processes subscription update

**ID:** HP-004

**Preconditions:**

- Stripe CLI forwarding webhooks to local API
- User has active subscription

**Steps:**

1. In Stripe dashboard, manually update subscription (change plan or cancel)
2. Observe webhook delivery

**Expected Results:**

- **API:** Webhook endpoint returns 200
- **Database:** Subscription record updated to match Stripe state
- **Logs:** Webhook processing logged

---

## Edge Cases

### EC-001: User attempts to create project beyond plan limit

**Description:** Free user at 1 project limit tries to create a second project.

**Steps:**

1. Log in as Free user with 1 existing project
2. Click "New Project"
3. Attempt to create project

**Expected Behavior:**

- Upgrade prompt shown
- Project not created
- API returns 403 with `LIMIT_REACHED` error code

---

### EC-002: AI usage at daily limit

**Description:** User has exhausted daily AI call quota.

**Steps:**

1. Use AI features until daily limit reached
2. Attempt another AI operation

**Expected Behavior:**

- Toast message: "Daily AI limit reached. Resets at midnight UTC."
- Operation blocked
- Upgrade prompt shown for higher tier

---

### EC-003: Subscription lapses mid-session

**Description:** Subscription expires while user is actively using the app.

**Steps:**

1. Simulate subscription expiration via Stripe webhook
2. User attempts to use Pro feature

**Expected Behavior:**

- Feature gated, upgrade prompt shown
- Graceful degradation, no crashes

---

## Error Handling

### ERR-001: Stripe checkout fails (card declined)

**Scenario:** User's card is declined during checkout.

**Steps:**

1. Start checkout flow
2. Use test card 4000 0000 0000 0002 (decline)

**Expected Behavior:**

- Error message: "Your card was declined. Please try another payment method."
- User remains on checkout page
- No subscription created

---

### ERR-002: Stripe webhook signature validation fails

**Scenario:** Webhook received with invalid signature.

**Steps:**

1. Send POST to `/api/stripe/webhook` without valid signature

**Expected Behavior:**

- API returns 400
- Event not processed
- Error logged

---

### ERR-003: Stripe API timeout

**Scenario:** Stripe API is slow or unreachable.

**Steps:**

1. Simulate network issue to Stripe
2. User attempts to start checkout

**Expected Behavior:**

- User-friendly error message
- Retry option shown
- Error logged for monitoring

---

## Limits

### LIM-001: Project creation limit by plan

**Scenario:** Verify each plan's project limit is enforced.

| Plan     | Limit     |
| -------- | --------- |
| Free     | 1         |
| Pro      | 5         |
| Business | Unlimited |

**Steps:**

1. For each plan, create projects up to and beyond limit
2. Verify enforcement

**Expected Behavior:**

- At limit: Upgrade prompt shown
- API returns 403 with appropriate error

---

### LIM-002: Daily AI call limits by plan

**Scenario:** Verify AI usage limits per plan.

| Plan     | Daily Limit |
| -------- | ----------- |
| Free     | 10          |
| Pro      | 100         |
| Business | 500         |

**Steps:**

1. Track AI usage via `AiUsageEvent` count
2. Attempt operations at and beyond limit

**Expected Behavior:**

- Limit enforced, clear messaging shown
- Usage resets at midnight UTC

---

## Regression

### Areas potentially impacted:

- [ ] **Project creation flow:** Ensure limit checks don't break normal creation
- [ ] **AI features:** Ensure limit checks don't break normal AI operations
- [ ] **Settings/Billing page:** Ensure displays correctly for all plan states
- [ ] **Stripe webhook processing:** Ensure all event types handled

### Quick sanity checks:

- [ ] Free user can create first project
- [ ] Pro user can use AI features
- [ ] Billing page loads without errors
- [ ] Subscription status displays correctly

---

## Post-Conditions

### Data cleanup steps:

- [ ] Cancel test subscriptions in Stripe dashboard
- [ ] Delete test user accounts if needed
- [ ] Reset any modified feature flags

### Follow-up verification:

- [ ] Stripe dashboard shows expected subscription states
- [ ] Database subscription records are consistent

---

## Known Issues

- **Intentionally accepted issues:**
  - Webhook retry handling relies on Stripe's built-in retry mechanism

- **Out-of-scope items:**
  - Invoice PDF generation testing
  - Tax calculation testing

- **TODOs:**
  - [ ] Add automated Stripe webhook testing in CI

---

## Approval

| Field              | Value                                        |
| ------------------ | -------------------------------------------- |
| **Tester Name**    | [Pending]                                    |
| **Date**           | [YYYY-MM-DD]                                 |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed        |
| **Notes**          | Cross-cutting system-level tests for billing |
