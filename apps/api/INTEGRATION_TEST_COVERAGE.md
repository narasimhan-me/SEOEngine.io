# Integration Test Coverage Analysis

**Generated:** 2025-12-19  
**Status:** Analysis Complete

## Critical Integration Test Requirements

### 1. Billing Entitlements and Webhook Idempotency ⚠️ **PARTIAL**

**Status:** **PARTIAL** - Idempotency implemented but not fully tested

**Implementation:**

- ✅ **Idempotency Logic Present:** `BillingService.handleWebhook()` uses `lastStripeEventId` to prevent duplicate processing
  - `handleSubscriptionUpdated()` checks `existingSub.lastStripeEventId === eventId` (line 402-405)
  - `handleSubscriptionDeleted()` checks `existingSub.lastStripeEventId === eventId` (line 463-466)
- ✅ **Webhook Signature Validation:** Implemented via `stripe.webhooks.constructEvent()`

**Integration Tests:** ✅ **ADDED**

- ✅ **Created:** `test/integration/billing/billing-webhook-idempotency.test.ts`
- ✅ **14 comprehensive integration tests covering:**
  - Duplicate event handling (same `event.id` processed twice)
  - Concurrent webhook processing (race conditions)
  - Double-charging prevention
  - Webhook signature validation
  - Edge cases and error scenarios
  - Subscription state integrity

**Test Coverage:**

1. `checkout.session.completed` idempotency (3 tests)
   - Creates subscription on first event
   - Idempotent when same event processed twice
   - Prevents double-charging using upsert
2. `customer.subscription.updated` idempotency (3 tests)
   - Updates subscription on first event
   - Idempotent when same event processed twice (uses `lastStripeEventId`)
   - Prevents duplicate updates when processing concurrently
3. `customer.subscription.deleted` idempotency (2 tests)
   - Cancels subscription on first event
   - Idempotent when same event processed twice
4. Webhook signature validation (2 tests)
   - Rejects webhook with invalid signature
   - Handles webhook when Stripe is not configured
5. Edge cases and error scenarios (3 tests)
   - Missing userId in metadata
   - Non-existent customer
   - Non-existent subscription
6. Concurrent processing stress test (1 test)
   - Multiple different events processed concurrently

**Status:** ✅ **COMPLETE** - Comprehensive integration tests added

---

### 2. Onboarding Transitions and State Integrity ✅ **PRESENT**

**Status:** **PRESENT** - Comprehensive integration tests exist

**Test File:** `test/integration/onboarding-checklist.test.ts`

**Coverage:**

- ✅ Baseline new project state (no integrations, no crawls, no score, no optimized products)
- ✅ Connected Shopify store reflected via `integration-status`
- ✅ First crawl reflected via `overview` metrics (`crawlCount > 0`)
- ✅ DEO score snapshot makes backend expose `latestScore`
- ✅ `productsWithAppliedSeo >= 3` when three products are optimized

**Test Scenarios:**

1. `baseline new project: no integrations, no crawls, no score, no optimized products`
2. `connected Shopify store is reflected via integration-status`
3. `first crawl is reflected via overview metrics (crawlCount > 0)`
4. `DEO score snapshot makes backend expose a latestScore`
5. `productsWithAppliedSeo >= 3 when three products are optimized`

**State Integrity:**

- ✅ Tests verify state transitions across key onboarding steps
- ✅ Uses test fixtures: `seedConnectedStoreProject`, `seedCrawledProject`, `seedReviewedDeoProject`, `seedOptimizedProducts`

**Recommendation:** ✅ **Complete** - No additional tests needed

---

### 3. Preview → Apply Workflow ✅ **PRESENT**

**Status:** **PRESENT** - Multiple integration tests cover this workflow

**Test Files:**

1. `test/integration/automation-playbooks.apply.no-ai.spec.ts` - Verifies no AI calls during apply
2. `test/integration/automation-playbook-runs.test.ts` - Full preview/apply workflow
3. `test/integration/seo-apply-persistence.test.ts` - SEO apply persistence

**Coverage:**

**Preview → Apply Workflow:**

- ✅ **Preview Generation:** `test/integration/automation-playbook-runs.test.ts` tests `PREVIEW_GENERATE` run creation
- ✅ **Draft Persistence:** Tests verify draft is created and stored
- ✅ **Apply Uses Draft:** Tests verify apply reads from draft, not AI
- ✅ **No AI During Apply:** `automation-playbooks.apply.no-ai.spec.ts` explicitly verifies `applyPlaybook` does NOT call `AiService.generateMetadata`
- ✅ **Idempotency:** Tests verify duplicate create run returns existing run (idempotency key)

**SEO Apply Persistence:**

- ✅ **Product Update:** `seo-apply-persistence.test.ts` verifies SEO updates persist to database
- ✅ **Shopify Sync:** Tests verify Shopify API is called exactly once
- ✅ **Validation:** Tests verify correct request body sent to Shopify

**Test Scenarios:**

1. `Create PREVIEW_GENERATE run + process` - Creates preview and processes it
2. `Apply run uses existing draft and calls no AI` - Critical contract verification
3. `Duplicate create run returns existing run (idempotency)` - Idempotency testing
4. `applies SEO to a product and calls Shopify mock exactly once` - Persistence verification

**Recommendation:** ✅ **Complete** - Comprehensive coverage exists

---

### 4. Critical Integration Test Suite ⚠️ **PARTIAL**

**Status:** **PARTIAL** - Integration tests exist but not tagged/isolated as "critical"

**Current State:**

- ✅ Integration tests exist in `test/integration/` directory
- ✅ Tests are runnable via Jest
- ❌ **No explicit "critical" tag or directory structure**
- ❌ **No isolated critical integration suite**

**Test Organization:**

- Integration tests are in `test/integration/` directory
- E2E tests are in `test/e2e/` directory
- No special tagging for critical tests

**Jest Configuration:**

- `jest.config.ts` - Main config for unit/integration tests
- `jest.e2e.config.ts` - Separate config for E2E tests
- No special config for critical integration tests

**Recommendation:**

- Create `test/integration/critical/` directory for critical integration tests
- Add Jest tag support (e.g., `@critical`) or use directory-based filtering
- Create `jest.critical-integration.config.ts` for isolated critical suite
- Document which tests are considered "critical"

**Critical Integration Tests Should Include:**

1. Billing webhook idempotency (when added)
2. Onboarding state transitions
3. Preview → Apply workflow
4. Auth entitlements gating
5. Payment processing integrity

---

## Services Integration Coverage Status

### BillingService ✅ **PRESENT**

**Integration Coverage:**

- ✅ **Present:** Webhook idempotency integration tests (`test/integration/billing/billing-webhook-idempotency.test.ts`)
- ✅ **Present:** Idempotency tests for duplicate events (14 tests)
- ✅ **Present:** Double-charging prevention tests
- ✅ **Present:** Concurrent processing tests
- ✅ **Present:** Auth entitlements integration test (`test/integration/auth-entitlements.test.ts`)

**Status:** ✅ **PRESENT** - Comprehensive webhook idempotency integration tests

---

### EntitlementsService ✅ **PRESENT**

**Integration Coverage:**

- ✅ **Present:** `test/integration/auth-entitlements.test.ts` - Tests entitlement gating
- ✅ **Present:** Free plan user cannot call paid-only endpoints
- ✅ **Present:** Plan-based access control verified

**Status:** **PRESENT** - Good integration coverage

---

### AutomationPlaybooksService ✅ **PRESENT**

**Integration Coverage:**

- ✅ **Present:** `test/integration/automation-playbook-runs.test.ts` - Full preview/apply workflow
- ✅ **Present:** `test/integration/automation-playbooks.apply.no-ai.spec.ts` - No AI contract verification
- ✅ **Present:** Idempotency tests for run creation

**Status:** **PRESENT** - Comprehensive integration coverage

---

### ProjectsService ✅ **PRESENT**

**Integration Coverage:**

- ✅ **Present:** `test/integration/onboarding-checklist.test.ts` - Onboarding state transitions
- ✅ **Present:** `test/integration/project-overview.test.ts` - Project overview integration
- ✅ **Present:** Integration status checking

**Status:** **PRESENT** - Good integration coverage

---

### ShopifyService ✅ **PRESENT**

**Integration Coverage:**

- ✅ **Present:** `test/integration/shopify/shopify-graphql-api.integration.test.ts`
- ✅ **Present:** `test/integration/shopify-metafields/shopify-metafields-sync.integration.test.ts`
- ✅ **Present:** `test/integration/seo-apply-persistence.test.ts` - SEO update persistence

**Status:** **PRESENT** - Good integration coverage

---

## Summary

### Integration Test Coverage Status

| Service                        | Integration Coverage              | Status         |
| ------------------------------ | --------------------------------- | -------------- |
| **BillingService**             | Webhook idempotency comprehensive | ✅ **PRESENT** |
| **EntitlementsService**        | Auth entitlements gating          | ✅ **PRESENT** |
| **AutomationPlaybooksService** | Preview → Apply workflow          | ✅ **PRESENT** |
| **ProjectsService**            | Onboarding transitions            | ✅ **PRESENT** |
| **ShopifyService**             | Metafield sync, SEO updates       | ✅ **PRESENT** |

### Critical Requirements Status

| Requirement                     | Status         | Notes                                    |
| ------------------------------- | -------------- | ---------------------------------------- |
| **Billing webhook idempotency** | ✅ **PRESENT** | 14 comprehensive integration tests added |
| **Onboarding transitions**      | ✅ **PRESENT** | Comprehensive tests exist                |
| **Preview → Apply workflow**    | ✅ **PRESENT** | Multiple tests cover this                |
| **Critical integration suite**  | ⚠️ **PARTIAL** | Tests exist but not tagged/isolated      |

---

## Recommendations

### Immediate Actions (High Priority)

1. ✅ **Add Billing Webhook Integration Tests** - **COMPLETED**
   - ✅ Created `test/integration/billing/billing-webhook-idempotency.test.ts`
   - ✅ Test duplicate event handling with same `event.id`
   - ✅ Test concurrent webhook processing
   - ✅ Test double-charging prevention
   - ✅ Test `handleCheckoutCompleted()` idempotency (uses upsert)
   - ✅ Test `handleSubscriptionUpdated()` idempotency (uses `lastStripeEventId`)
   - ✅ Test `handleSubscriptionDeleted()` idempotency (uses `lastStripeEventId`)

2. **Create Critical Integration Test Suite**
   - Create `test/integration/critical/` directory
   - Move critical tests to this directory:
     - Billing webhook idempotency (when added)
     - Onboarding state transitions
     - Preview → Apply workflow
     - Auth entitlements gating
   - Create `jest.critical-integration.config.ts` for isolated runs
   - Document critical test suite in README

3. **Update SERVICES_COVERAGE_ANALYSIS.md**
   - Add integration coverage status column
   - Map each critical service to integration coverage (Present / Partial / Missing)
   - Include links to integration test files

### Next Steps (Medium Priority)

4. **Add Webhook Event Tracking**
   - Consider adding event ID tracking to `handleCheckoutCompleted()` for full idempotency
   - Add database table or field to track processed webhook events

5. **Document Critical Test Suite**
   - Create `docs/testing/critical-integration-tests.md`
   - Document how to run critical tests in isolation
   - Document test requirements and coverage goals

---

## Test Execution

### Run All Integration Tests

```bash
cd apps/api && pnpm jest --testPathPattern="test/integration" --config jest.config.ts
```

### Run Critical Integration Tests (When Created)

```bash
cd apps/api && pnpm jest --testPathPattern="test/integration/critical" --config jest.critical-integration.config.ts
```

### Run Specific Integration Test Suites

```bash
# Onboarding tests
pnpm jest test/integration/onboarding-checklist.test.ts

# Preview → Apply workflow
pnpm jest test/integration/automation-playbook-runs.test.ts

# SEO apply persistence
pnpm jest test/integration/seo-apply-persistence.test.ts
```
