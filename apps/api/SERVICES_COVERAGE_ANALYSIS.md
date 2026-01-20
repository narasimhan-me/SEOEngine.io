# Services Coverage Analysis

**Generated:** 2025-12-19  
**Status:** Analysis Complete

## Services WITHOUT Unit Tests

### Missing Unit Tests (1 service)

1. **`src/prisma.service.ts`** ⚠️ **LOW PRIORITY**
   - **Why Low:** Infrastructure service, typically tested via integration tests
   - **Note:** Prisma Client is generated code, unit testing not typically needed

### Recently Added Unit Tests ✅

1. **`src/shopify/shopify.service.ts`** ✅ **COMPLETED**
   - **Status:** Unit tests added (`test/unit/shopify/shopify.service.test.ts`)
   - **Coverage:** OAuth flow, HMAC validation, GraphQL operations, metafield management
   - **Tests:** 25 tests covering all major methods

2. **`src/projects/automation-playbooks.service.ts`** ✅ **COMPLETED**
   - **Status:** Unit tests added (`test/unit/projects/automation-playbooks.service.test.ts`)
   - **Coverage:** Estimation logic, preview generation, apply operations, draft management
   - **Tests:** 12 tests covering all public methods

3. **`src/ai/product-issue-fix.service.ts`** ✅ **COMPLETED**
   - **Status:** Unit tests added (`test/unit/ai/product-issue-fix.service.test.ts`)
   - **Coverage:** Plan validation, AI limit enforcement, field updates, error handling
   - **Tests:** 11 tests covering all scenarios

4. **`src/projects/local-discovery.service.ts`** ✅ **HAS TESTS**
   - **Status:** Has unit tests (`test/unit/local-discovery/local-discovery.service.test.ts`)

5. **`src/projects/offsite-signals.service.ts`** ✅ **HAS TESTS**
   - **Status:** Has unit tests (`test/unit/offsite-signals/offsite-signals.service.test.ts`)

6. **`src/projects/automation-playbook-runs.service.ts`** ✅ **HAS TESTS**
   - **Status:** Has unit tests (`test/unit/automation/playbook-runs.service.test.ts`)

7. **`src/prisma.service.ts`** ⚠️ **LOW PRIORITY**
   - **Why Low:** Infrastructure service, typically tested via integration tests
   - **Note:** Prisma Client is generated code, unit testing not typically needed

## Integration Test Coverage Status

| Service                        | Integration Coverage        | Status         | Test Files                                                                                                       |
| ------------------------------ | --------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| **BillingService**             | Webhook idempotency missing | ⚠️ **PARTIAL** | `test/integration/auth-entitlements.test.ts` (entitlements only)                                                 |
| **EntitlementsService**        | Auth entitlements gating    | ✅ **PRESENT** | `test/integration/auth-entitlements.test.ts`                                                                     |
| **AutomationPlaybooksService** | Preview → Apply workflow    | ✅ **PRESENT** | `test/integration/automation-playbook-runs.test.ts`, `test/integration/automation-playbooks.apply.no-ai.spec.ts` |
| **ProjectsService**            | Onboarding transitions      | ✅ **PRESENT** | `test/integration/onboarding-checklist.test.ts`, `test/integration/project-overview.test.ts`                     |
| **ShopifyService**             | Metafield sync, SEO updates | ✅ **PRESENT** | `test/integration/shopify/`, `test/integration/seo-apply-persistence.test.ts`                                    |

**See `INTEGRATION_TEST_COVERAGE.md` for detailed analysis.**

## Critical Services - Coverage Gap Analysis

### 1. AuthService ⚠️ **NEEDS MORE COVERAGE**

**Current Coverage:**

- ✅ `signup()` - tested
- ✅ `validateUser()` - tested
- ✅ `login()` - tested (with/without 2FA)
- ✅ `verifyTwoFactor()` - tested
- ✅ `validateJwtPayload()` - tested

**Missing Coverage:**

- ❌ Edge cases: password validation, email format validation
- ❌ Error scenarios: database failures, JWT expiration edge cases
- ❌ Concurrent login attempts
- ❌ Token refresh scenarios (if implemented)

**Recommendation:** Add tests for edge cases and error scenarios to reach ~95% coverage

### 2. BillingService ⚠️ **NEEDS MORE COVERAGE**

**Unit Test Coverage:**

- ✅ `getPlans()` - tested
- ✅ `getSubscription()` - tested
- ✅ `getBillingSummary()` - tested
- ✅ `createCheckoutSession()` - tested
- ✅ `createPortalSession()` - tested
- ✅ `updateSubscription()` - tested
- ✅ `cancelSubscription()` - tested

**Missing Unit Test Coverage:**

- ❌ `handleWebhook()` - **CRITICAL** - Stripe webhook processing
- ❌ `handleCheckoutCompleted()` - private method, critical for subscription activation
- ❌ `handleSubscriptionUpdated()` - private method, critical for plan changes
- ❌ `handleSubscriptionDeleted()` - private method, critical for cancellations
- ❌ `applySubscriptionEntitlements()` - private method, critical for entitlements
- ❌ Edge cases: webhook signature validation failures, duplicate events
- ❌ Error scenarios: Stripe API failures, database transaction failures

**Integration Test Coverage:** ⚠️ **PARTIAL**

- ✅ Auth entitlements gating (`test/integration/auth-entitlements.test.ts`)
- ❌ **Missing:** Webhook idempotency integration tests
- ❌ **Missing:** Duplicate event handling tests
- ❌ **Missing:** Double-charging prevention tests
- ❌ **Missing:** `handleCheckoutCompleted()` idempotency tests

**Note:** Idempotency logic is implemented (uses `lastStripeEventId`) but not tested at integration level.

**Recommendation:**

- Add unit tests for webhook handling and private methods to reach ~90% coverage
- **CRITICAL:** Add integration tests for webhook idempotency (see `INTEGRATION_TEST_COVERAGE.md`)

### 3. DeoScoreService ⚠️ **NEEDS MORE COVERAGE**

**Current Coverage:**

- ✅ `getLatestForProject()` - tested (with/without snapshots)
- ✅ `computeAndPersistScoreFromSignals()` - tested

**Missing Coverage:**

- ❌ `DeoSignalsService.collectSignalsForProject()` - **CRITICAL** - signal collection logic
- ❌ Edge cases: empty projects, projects with no products/pages
- ❌ Error scenarios: database failures during snapshot creation
- ❌ Signal normalization edge cases
- ❌ V2 breakdown computation edge cases

**Recommendation:** Add tests for `DeoSignalsService` methods and edge cases to reach ~90% coverage

### 4. ProjectsService ⚠️ **NEEDS MORE COVERAGE**

**Current Coverage:**

- ✅ `getProjectsForUser()` - tested
- ✅ `getProject()` - tested
- ✅ `createProject()` - tested
- ✅ `updateProject()` - tested
- ✅ `deleteProject()` - tested
- ✅ `validateProjectOwnership()` - tested

**Missing Coverage:**

- ❌ `getIntegrationStatus()` - **IMPORTANT** - integration status checking
- ❌ `getProjectWithIntegrations()` - **IMPORTANT** - project with integrations
- ❌ `getProjectOverview()` - **IMPORTANT** - project overview with stats
- ❌ `getCrawlPages()` - **IMPORTANT** - crawl pages retrieval
- ❌ Edge cases: projects with no integrations, projects with multiple integrations
- ❌ Error scenarios: concurrent updates, cascade deletion edge cases

**Recommendation:** Add tests for remaining public methods to reach ~90% coverage

### 5. EntitlementsService ✅ **GOOD COVERAGE**

**Current Coverage:**

- ✅ `getUserPlan()` - tested
- ✅ `getEntitlementsSummary()` - tested
- ✅ `getAiSuggestionLimit()` - tested
- ✅ `getDailyAiUsage()` - tested
- ✅ `ensureWithinDailyAiLimit()` - tested
- ✅ `recordAiUsage()` - tested
- ✅ `enforceEntitlement()` - tested
- ✅ `ensureCanCreateProject()` - tested
- ✅ `canAutoApplyMetadataAutomations()` - tested

**Coverage:** ~95% - Excellent coverage

### 6. DeoIssuesService ⚠️ **NEEDS MORE COVERAGE**

**Current Coverage:**

- ✅ `getIssuesForProject()` - tested (basic)

**Missing Coverage:**

- ❌ Individual issue building methods (many private methods)
- ❌ Edge cases: projects with no products, projects with no crawl results
- ❌ Error scenarios: service dependency failures
- ❌ Issue severity calculation logic
- ❌ Issue aggregation and deduplication

**Recommendation:** Add tests for issue building methods and edge cases to reach ~85% coverage

## Summary

### Services Without Tests: 0 High Priority ✅

All high-priority services now have unit tests!

### Recently Completed ✅

1. `ShopifyService` - ✅ 25 unit tests added
2. `AutomationPlaybooksService` - ✅ 12 unit tests added
3. `ProductIssueFixService` - ✅ 11 unit tests added

### Critical Services Needing More Coverage: 4 Services

1. **BillingService** - Missing webhook handling tests (~60% coverage → target 90%)
2. **DeoScoreService** - Missing DeoSignalsService tests (~70% coverage → target 90%)
3. **ProjectsService** - Missing 4 public methods (~75% coverage → target 90%)
4. **DeoIssuesService** - Missing issue building tests (~40% coverage → target 85%)

### Services With Good Coverage: 2 Services

1. **EntitlementsService** - ~95% coverage ✅
2. **AuthService** - ~85% coverage (could improve to 95% with edge cases)

## Recommendations

### Immediate Actions (High Priority)

1. **Add unit tests for `ShopifyService`**
   - OAuth flow methods
   - HMAC validation
   - GraphQL operations
   - Metafield management

2. **Add unit tests for `AutomationPlaybooksService`**
   - Estimation logic
   - Preview generation
   - Apply operations
   - Draft management

3. **Expand `BillingService` tests**
   - Webhook handling methods
   - Private helper methods
   - Error scenarios

### Next Steps (Medium Priority)

4. **Expand `DeoScoreService` tests**
   - DeoSignalsService methods
   - Edge cases and error scenarios

5. **Expand `ProjectsService` tests**
   - Remaining public methods
   - Integration scenarios

6. **Expand `DeoIssuesService` tests**
   - Issue building methods
   - Edge cases

### Target Coverage Goals

- **Critical Services:** 90%+ coverage
- **High Priority Services:** 85%+ coverage
- **Medium Priority Services:** 80%+ coverage
- **Overall:** 80%+ coverage for all services
