# Coverage Gaps and Recommendations

**Generated:** 2025-12-19  
**Current Status:** 43 test suites, 505 tests passing, ~58% overall coverage

## Services WITHOUT Unit Tests

### High Priority (2 services)

1. **`src/shopify/shopify.service.ts`** ⚠️ **CRITICAL**
   - **Why Critical:** Core e-commerce integration, handles OAuth, product sync, metafield management
   - **Key Methods Needing Tests:**
     - `generateInstallUrl()` - OAuth URL generation
     - `validateHmac()` - Security-critical HMAC validation
     - `validateState()` - OAuth state validation
     - `exchangeToken()` - Token exchange with Shopify
     - `storeShopifyConnection()` - Integration persistence
     - `fetchShopifyProducts()` - Product fetching (has integration tests, needs unit tests)
     - `updateProductSeo()` - SEO updates via GraphQL
     - `syncAnswerBlocksToShopify()` - Answer block syncing
     - `ensureMetafieldDefinitions()` - Metafield definition management
   - **Coverage Needed:** OAuth flow, HMAC validation, GraphQL operations, error handling
   - **Estimated Coverage:** 0% → Target: 85%

2. **`src/projects/automation-playbooks.service.ts`** ⚠️ **CRITICAL**
   - **Why Critical:** Core automation feature for bulk SEO fixes, handles preview/apply workflows
   - **Key Methods Needing Tests:**
     - `estimatePlaybook()` - Cost estimation and eligibility
     - `previewPlaybook()` - Preview generation with AI
     - `applyPlaybook()` - Apply operations (reads from draft)
     - `getPlaybookDraft()` - Draft retrieval
     - `invalidateDraft()` - Draft invalidation
   - **Coverage Needed:** Estimation logic, preview generation, apply operations, draft management, rule processing
   - **Estimated Coverage:** 0% → Target: 90%

### Medium Priority (1 service)

3. **`src/ai/product-issue-fix.service.ts`** ⚠️ **MEDIUM**
   - **Why Important:** One-click AI fixes for product metadata issues
   - **Key Methods:**
     - `fixMissingSeoFieldFromIssue()` - Main fix method
   - **Note:** Has integration tests but could use more unit test coverage
   - **Coverage Needed:** Plan validation, AI limit enforcement, field updates, error handling
   - **Estimated Coverage:** ~40% (integration tests) → Target: 85%

### Low Priority (1 service)

4. **`src/prisma.service.ts`** ⚠️ **LOW**
   - **Why Low:** Infrastructure service, Prisma Client is generated code
   - **Note:** Typically tested via integration tests, unit testing not typically needed
   - **Recommendation:** Skip unit tests, rely on integration tests

## Critical Services - Coverage Gap Analysis

### 1. BillingService ⚠️ **NEEDS MORE COVERAGE** (Current: ~60% → Target: 90%)

**Current Coverage:**
- ✅ `getPlans()` - tested
- ✅ `getSubscription()` - tested
- ✅ `getBillingSummary()` - tested
- ✅ `createCheckoutSession()` - tested
- ✅ `createPortalSession()` - tested
- ✅ `updateSubscription()` - tested
- ✅ `cancelSubscription()` - tested

**Missing Coverage (CRITICAL):**
- ❌ `handleWebhook()` - **CRITICAL** - Stripe webhook processing
  - Webhook signature validation
  - Event routing (checkout.session.completed, subscription.created/updated/deleted)
  - Error handling for invalid signatures
  - Idempotency handling
- ❌ `handleCheckoutCompleted()` - private method, critical for subscription activation
  - Subscription upsert logic
  - Entitlement application
  - Missing metadata handling
- ❌ `handleSubscriptionUpdated()` - private method, critical for plan changes
  - Plan mapping from price ID
  - Status mapping
  - Idempotency via lastStripeEventId
  - Entitlement updates
- ❌ `handleSubscriptionDeleted()` - private method, critical for cancellations
  - Downgrade to free plan
  - Status updates
  - Entitlement cleanup
- ❌ `applySubscriptionEntitlements()` - private method, critical for entitlements
  - Plan and status updates
- ❌ `mapPriceIdToPlanId()` - private method, price ID to plan mapping
- ❌ `mapStripeSubscriptionStatus()` - private method, status mapping
- ❌ Edge cases: webhook signature validation failures, duplicate events, missing metadata
- ❌ Error scenarios: Stripe API failures, database transaction failures

**Recommendation:** Add comprehensive webhook handling tests to reach ~90% coverage

### 2. DeoScoreService ⚠️ **NEEDS MORE COVERAGE** (Current: ~70% → Target: 90%)

**Current Coverage:**
- ✅ `getLatestForProject()` - tested (with/without snapshots, ownership validation)
- ✅ `computeAndPersistScoreFromSignals()` - tested (basic flow)

**Missing Coverage:**
- ❌ `DeoSignalsService.collectSignalsForProject()` - **CRITICAL** - signal collection logic
  - Content signal collection (pages, metadata, word counts)
  - Entity signal collection (products, answer blocks)
  - Technical signal collection (crawlability, indexability, load times)
  - Visibility signal collection (offsite presence, local discovery)
  - Edge cases: empty projects, projects with no products/pages
- ❌ Edge cases in `computeAndPersistScoreFromSignals()`:
  - Empty signals
  - Null/undefined signal values
  - V2 breakdown computation edge cases
  - Top opportunities/strengths calculation
- ❌ Error scenarios: database failures during snapshot creation, project update failures

**Recommendation:** Add tests for `DeoSignalsService` methods and edge cases to reach ~90% coverage

### 3. ProjectsService ⚠️ **NEEDS MORE COVERAGE** (Current: ~75% → Target: 90%)

**Current Coverage:**
- ✅ `getProjectsForUser()` - tested
- ✅ `getProject()` - tested
- ✅ `createProject()` - tested
- ✅ `updateProject()` - tested
- ✅ `deleteProject()` - tested
- ✅ `validateProjectOwnership()` - tested

**Missing Coverage:**
- ❌ `getIntegrationStatus()` - **IMPORTANT** - integration status checking
  - Shopify integration status
  - Integration health checks
- ❌ `getProjectWithIntegrations()` - **IMPORTANT** - project with integrations
  - Integration loading
  - Multiple integration types
- ❌ `getProjectOverview()` - **IMPORTANT** - project overview with stats
  - DEO score aggregation
  - Product counts
  - Crawl status
  - Issue counts
- ❌ `getCrawlPages()` - **IMPORTANT** - crawl pages retrieval
  - Pagination
  - Filtering
  - Sorting
- ❌ Edge cases: projects with no integrations, projects with multiple integrations
- ❌ Error scenarios: concurrent updates, cascade deletion edge cases

**Recommendation:** Add tests for remaining 4 public methods to reach ~90% coverage

### 4. DeoIssuesService ⚠️ **NEEDS MORE COVERAGE** (Current: ~40% → Target: 85%)

**Current Coverage:**
- ✅ `getIssuesForProject()` - tested (basic flow, ownership validation, error handling)

**Missing Coverage:**
- ❌ `buildMissingMetadataIssue()` - private method, critical for metadata issues
  - Page and product metadata detection
  - Severity calculation
  - Affected items tracking
- ❌ `buildThinContentIssue()` - private method, critical for content issues
  - Word count calculation
  - Severity thresholds
  - Affected items tracking
- ❌ `buildLowEntityCoverageIssue()` - private method, critical for entity issues
  - Entity hint detection
  - Coverage calculation
  - Severity mapping
- ❌ `buildIndexabilityIssue()` - private method, critical for technical issues
  - HTTP error detection
  - Noindex detection
  - Missing HTML basics
- ❌ `buildAnswerSurfaceIssue()` - private method, critical for answer engine issues
- ❌ `buildBrandNavigationalIssue()` - private method, critical for brand issues
- ❌ `getSeverityForHigherIsWorse()` - helper method, severity calculation
- ❌ `getSeverityForLowerIsWorse()` - helper method, severity calculation
- ❌ `getWordCount()` - helper method, word count calculation
- ❌ Edge cases: projects with no products, projects with no crawl results, empty issues
- ❌ Error scenarios: service dependency failures, null/undefined data handling

**Recommendation:** Add tests for issue building methods and edge cases to reach ~85% coverage

### 5. AuthService ✅ **GOOD COVERAGE** (Current: ~85% → Target: 95%)

**Current Coverage:**
- ✅ `signup()` - tested (success, duplicate email, optional name)
- ✅ `validateUser()` - tested (success, user not found, invalid password)
- ✅ `login()` - tested (with/without 2FA)
- ✅ `verifyTwoFactor()` - tested (success, invalid token, invalid code)
- ✅ `validateJwtPayload()` - tested (success, user not found)

**Missing Coverage (Edge Cases):**
- ❌ Password validation edge cases (empty, too short, special characters)
- ❌ Email format validation
- ❌ Database failure scenarios
- ❌ JWT expiration edge cases
- ❌ Concurrent login attempts
- ❌ Token refresh scenarios (if implemented)

**Recommendation:** Add edge case tests to reach ~95% coverage

### 6. EntitlementsService ✅ **EXCELLENT COVERAGE** (Current: ~95%)

**Current Coverage:**
- ✅ All public methods tested
- ✅ Edge cases covered
- ✅ Error scenarios covered

**Recommendation:** Maintain current coverage, add any new methods as they're added

## Summary

### Services Without Tests: 2 High Priority
1. **ShopifyService** - 0% coverage, needs 85%+
2. **AutomationPlaybooksService** - 0% coverage, needs 90%+

### Critical Services Needing More Coverage: 4 Services
1. **BillingService** - 60% → Target 90% (webhook handling critical)
2. **DeoScoreService** - 70% → Target 90% (DeoSignalsService critical)
3. **ProjectsService** - 75% → Target 90% (4 public methods missing)
4. **DeoIssuesService** - 40% → Target 85% (issue building methods critical)

### Services With Good Coverage: 2 Services
1. **EntitlementsService** - ~95% ✅
2. **AuthService** - ~85% (could improve to 95% with edge cases)

## Action Plan

### Phase 1: High Priority (Immediate)
1. **Add unit tests for `ShopifyService`** (Est. 2-3 hours)
   - OAuth flow methods (4 methods)
   - HMAC validation
   - GraphQL operations (3 methods)
   - Metafield management

2. **Add unit tests for `AutomationPlaybooksService`** (Est. 3-4 hours)
   - Estimation logic
   - Preview generation
   - Apply operations
   - Draft management

3. **Expand `BillingService` tests** (Est. 2-3 hours)
   - Webhook handling (`handleWebhook()`)
   - Private helper methods (5 methods)
   - Error scenarios

### Phase 2: Medium Priority (Next)
4. **Expand `DeoScoreService` tests** (Est. 2-3 hours)
   - DeoSignalsService methods
   - Edge cases and error scenarios

5. **Expand `ProjectsService` tests** (Est. 1-2 hours)
   - Remaining 4 public methods
   - Integration scenarios

6. **Expand `DeoIssuesService` tests** (Est. 3-4 hours)
   - Issue building methods (6+ private methods)
   - Edge cases

### Phase 3: Polish (Future)
7. **Expand `AuthService` tests** (Est. 1 hour)
   - Edge cases and error scenarios

8. **Add unit tests for `ProductIssueFixService`** (Est. 1-2 hours)
   - If not already covered by integration tests

## Target Coverage Goals

- **Critical Services:** 90%+ coverage
  - BillingService: 90%
  - DeoScoreService: 90%
  - AutomationPlaybooksService: 90%
  - ProjectsService: 90%
  
- **High Priority Services:** 85%+ coverage
  - DeoIssuesService: 85%
  - ShopifyService: 85%
  - AuthService: 95%
  
- **Medium Priority Services:** 80%+ coverage
  - ProductIssueFixService: 85%
  
- **Overall:** 80%+ coverage for all services

## Estimated Impact

After completing Phase 1 and Phase 2:
- **New test files:** 2 (ShopifyService, AutomationPlaybooksService)
- **Expanded test files:** 4 (BillingService, DeoScoreService, ProjectsService, DeoIssuesService)
- **Estimated new tests:** ~80-100 tests
- **Coverage improvement:** ~58% → ~75% overall
- **Critical services coverage:** ~60% → ~90% average

