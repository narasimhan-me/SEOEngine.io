# Unit Test Coverage Analysis

**Generated:** 2025-12-19  
**Total Source Files:** 70 (excluding `.module.ts`, `main.ts`, `worker-main.ts`)  
**Total Unit Test Files:** 15  
**Unit Tests Passing:** 234 ✅

## Coverage Summary

### Files WITH Unit Tests (13 source files)

| Source File | Test File | Coverage Focus |
|------------|-----------|----------------|
| `src/projects/automation-playbook-runs.service.ts` | `test/unit/automation/playbook-runs.service.test.ts` | Service methods, run creation, status management |
| `src/projects/automation-playbook-run.processor.ts` | `test/unit/automation/playbook-runs.service.test.ts` | Processor logic, error handling |
| `src/shopify/shopify.service.ts` | `test/unit/shopify/shopify-graphql-products-mapping.test.ts` | GraphQL product mapping |
| `src/shopify/shopify.service.ts` | `test/unit/shopify/shopify-graphql-seo-update.test.ts` | SEO update operations |
| `src/shopify/shopify.service.ts` | `test/unit/shopify/shopify-connect-cta.test.ts` | Connect CTA helper functions |
| `src/shopify/shopify.service.ts` | `test/unit/shopify-metafields/shopify-metafields-mapping.test.ts` | Answer blocks to metafields mapping |
| `src/projects/local-discovery.service.ts` | `test/unit/local-discovery/local-discovery.service.test.ts` | Service logic, coverage computation, gap generation |
| `@engineo/shared` (Local Discovery types) | `test/unit/local-discovery/local-discovery-types.test.ts` | Type helpers, constants, utilities |
| `src/projects/offsite-signals.service.ts` | `test/unit/offsite-signals/offsite-signals.service.test.ts` | Service logic, coverage computation, gap generation |
| `@engineo/shared` (Offsite Signals types) | `test/unit/offsite-signals/offsite-signals-types.test.ts` | Type helpers, constants, utilities |
| `src/ai/product-issue-fix.service.ts` | `test/unit/automation/product-issue-fix.service.test.ts` | Issue fixing logic, AI integration |
| `src/billing/entitlements.service.ts` | `test/unit/automation/product-issue-fix.service.test.ts` | Entitlement checks (partial) |
| `src/billing/entitlements.service.ts` | `test/unit/automation/automation-engine.rules.test.ts` | Plan gating, daily limits (partial) |
| `src/projects/automation.service.ts` | `test/unit/automation/automation-engine.rules.test.ts` | Rule evaluation, trigger handling, idempotency |
| `src/projects/automation-playbooks.service.ts` | `test/unit/automation/playbook-rules.engine.test.ts` | Playbook rules engine, rule evaluation |
| `src/ai/ai-usage-ledger.service.ts` | `test/unit/ai/ai-usage-ledger.service.test.ts` | Usage tracking, ledger operations |
| `src/ai/ai-usage-quota.service.ts` | `test/unit/ai/ai-usage-quota.service.test.ts` | Quota evaluation, policy enforcement |
| `src/products/answer-block.service.ts` | `test/unit/answer-engine/answer-block-persistence.test.ts` | Answer block CRUD, persistence logic |

### Files WITHOUT Unit Tests (57 source files)

#### Controllers (No Unit Tests - Typically Tested via Integration Tests)
- `src/admin/admin.controller.ts`
- `src/ai/ai.controller.ts`
- `src/auth/auth.controller.ts`
- `src/billing/billing.controller.ts`
- `src/contact/contact.controller.ts`
- `src/crawl/crawl.controller.ts`
- `src/health/health.controller.ts`
- `src/integrations/integrations.controller.ts`
- `src/products/product-answer-blocks.controller.ts`
- `src/products/products.controller.ts`
- `src/projects/competitors.controller.ts`
- `src/projects/local-discovery.controller.ts`
- `src/projects/media-accessibility.controller.ts`
- `src/projects/offsite-signals.controller.ts`
- `src/projects/product-automation.controller.ts`
- `src/projects/projects.controller.ts`
- `src/projects/search-intent.controller.ts`
- `src/seo-scan/seo-scan.controller.ts`
- `src/shopify/shopify.controller.ts`
- `src/two-factor-auth/two-factor-auth.controller.ts`
- `src/users/users.controller.ts`
- `src/testkit/e2e-testkit.controller.ts`

#### Services (No Unit Tests)
- `src/admin/admin.service.ts`
- `src/ai/ai.service.ts` ⚠️ **Critical - AI service logic**
- `src/ai/gemini.client.ts` ⚠️ **Critical - Gemini API client**
- `src/ai/token-usage.service.ts` ⚠️ **Important - Token tracking**
- `src/auth/auth.service.ts` ⚠️ **Critical - Authentication logic**
- `src/billing/billing.service.ts` ⚠️ **Important - Billing operations**
- `src/billing/plans.ts` (Type definitions, but logic could be tested)
- `src/captcha/auth-abuse.service.ts` ⚠️ **Security - Abuse prevention**
- `src/captcha/captcha.service.ts` ⚠️ **Security - CAPTCHA validation**
- `src/crawl/crawl-scheduler.service.ts` ⚠️ **Important - Crawl scheduling**
- `src/crawl/crawl.processor.ts` ⚠️ **Important - Crawl processing**
- `src/integrations/integrations.service.ts` ⚠️ **Important - Integration management**
- `src/products/products.service.ts` ⚠️ **Important - Product operations**
- `src/projects/answer-block-automation.processor.ts` ⚠️ **Important - Automation processor**
- `src/projects/answer-engine.service.ts` ⚠️ **Critical - Answer engine core**
- `src/projects/answer-generation.service.ts` ⚠️ **Critical - Answer generation**
- `src/projects/competitors.service.ts` ⚠️ **Important - Competitor analysis**
- `src/projects/deo-issues.service.ts` ⚠️ **Critical - DEO issues management**
- `src/projects/deo-score.processor.ts` ⚠️ **Important - DEO score processing**
- `src/projects/deo-score.service.ts` ⚠️ **Critical - DEO score computation**
- `src/projects/media-accessibility.service.ts` ⚠️ **Important - Media accessibility**
- `src/projects/projects.service.ts` ⚠️ **Critical - Project management**
- `src/projects/search-intent.service.ts` ⚠️ **Important - Search intent analysis**
- `src/seo-scan/seo-scan.service.ts` ⚠️ **Important - SEO scanning**

#### Infrastructure & Utilities (No Unit Tests)
- `src/config/redis.config.ts`
- `src/config/stripe.config.ts`
- `src/config/test-env-guard.ts`
- `src/filters/all-exceptions.filter.ts`
- `src/infra/redis/redis.health.ts`
- `src/infra/redis/redis.provider.ts`
- `src/prisma.service.ts` (Usually tested via integration tests)
- `src/queues/queues.ts` (Infrastructure, typically mocked in tests)
- `src/scripts/backup-db.ts` (Script, not typically unit tested)

#### Auth & Security (No Unit Tests)
- `src/auth/admin.guard.ts` ⚠️ **Security - Admin authorization**
- `src/auth/jwt-auth.guard.ts` ⚠️ **Security - JWT authentication**
- `src/auth/jwt.strategy.ts` ⚠️ **Security - JWT strategy**

#### DTOs & Types (No Unit Tests - Usually Tested via Integration)
- `src/contact/contact.dto.ts`
- `src/two-factor-auth/dto/disable-2fa.dto.ts`
- `src/two-factor-auth/dto/enable-2fa.dto.ts`

#### Other
- `src/testkit/index.ts`
- `src/two-factor-auth/two-factor-auth.service.ts` ⚠️ **Security - 2FA logic**

## Coverage Statistics

### By Category

| Category | Total Files | With Tests | Without Tests | Coverage % |
|----------|------------|------------|---------------|------------|
| **Services** | 30 | 9 | 21 | 30% |
| **Controllers** | 22 | 0 | 22 | 0% |
| **Infrastructure** | 8 | 0 | 8 | 0% |
| **Auth/Security** | 5 | 0 | 5 | 0% |
| **DTOs/Types** | 3 | 0 | 3 | 0% |
| **Other** | 2 | 0 | 2 | 0% |
| **TOTAL** | **70** | **9** | **61** | **~13%** |

### Critical Files Missing Unit Tests

#### High Priority (Core Business Logic)
1. **`src/ai/ai.service.ts`** - Core AI service, handles OpenAI/Gemini integration
2. **`src/projects/answer-engine.service.ts`** - Answer engine core logic
3. **`src/projects/answer-generation.service.ts`** - Answer generation logic
4. **`src/projects/deo-issues.service.ts`** - DEO issues management
5. **`src/projects/deo-score.service.ts`** - DEO score computation
6. **`src/projects/projects.service.ts`** - Project management core
7. **`src/auth/auth.service.ts`** - Authentication core logic

#### Medium Priority (Important Features)
8. **`src/ai/gemini.client.ts`** - Gemini API client
9. **`src/ai/token-usage.service.ts`** - Token usage tracking
10. **`src/products/products.service.ts`** - Product operations
11. **`src/projects/competitors.service.ts`** - Competitor analysis
12. **`src/projects/search-intent.service.ts`** - Search intent analysis
13. **`src/integrations/integrations.service.ts`** - Integration management
14. **`src/crawl/crawl.processor.ts`** - Crawl processing
15. **`src/crawl/crawl-scheduler.service.ts`** - Crawl scheduling

#### Security Priority
16. **`src/auth/jwt.strategy.ts`** - JWT authentication strategy
17. **`src/auth/jwt-auth.guard.ts`** - JWT guard
18. **`src/auth/admin.guard.ts`** - Admin authorization
19. **`src/captcha/captcha.service.ts`** - CAPTCHA validation
20. **`src/captcha/auth-abuse.service.ts`** - Abuse prevention

## Recommendations

### Immediate Actions
1. **Add unit tests for core AI services:**
   - `src/ai/ai.service.ts` - Test AI prompt generation, model selection, error handling
   - `src/ai/gemini.client.ts` - Test API calls, retries, error handling

2. **Add unit tests for answer engine:**
   - `src/projects/answer-engine.service.ts` - Test answer generation, validation
   - `src/projects/answer-generation.service.ts` - Test generation logic, templates

3. **Add unit tests for DEO core:**
   - `src/projects/deo-issues.service.ts` - Test issue detection, classification
   - `src/projects/deo-score.service.ts` - Test score calculation, aggregation

4. **Add unit tests for authentication:**
   - `src/auth/auth.service.ts` - Test login, registration, password reset
   - `src/auth/jwt.strategy.ts` - Test JWT validation, payload extraction

### Medium-Term Actions
5. Add unit tests for product operations (`src/products/products.service.ts`)
6. Add unit tests for project management (`src/projects/projects.service.ts`)
7. Add unit tests for integrations (`src/integrations/integrations.service.ts`)
8. Add unit tests for crawl processing (`src/crawl/crawl.processor.ts`)

### Testing Strategy Notes
- **Controllers**: Typically tested via integration/E2E tests (current approach is acceptable)
- **Infrastructure**: Usually tested via integration tests or mocked in unit tests
- **DTOs**: Validated via integration tests or class-validator decorators
- **Services**: Should have comprehensive unit tests with mocked dependencies

## Current Test Quality

✅ **Strengths:**
- Well-structured test files with clear organization
- Good use of fixtures and test utilities
- Tests cover critical business logic (automation, playbooks, AI usage)
- Tests are passing (234/234)

⚠️ **Areas for Improvement:**
- Low overall coverage (~13% of source files)
- Missing tests for core AI services
- Missing tests for answer engine core
- Missing tests for authentication/security
- Missing tests for DEO score computation

## Next Steps

1. Prioritize unit tests for files marked as ⚠️ **Critical**
2. Set up coverage reporting in CI/CD
3. Establish coverage thresholds (e.g., 80% for services)
4. Create test templates for common patterns (services, processors)
5. Document testing patterns and best practices

