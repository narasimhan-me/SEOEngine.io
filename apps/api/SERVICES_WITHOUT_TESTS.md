# Services Without Unit Tests - Quick Reference

**Generated:** 2025-12-19

## Services Missing Unit Tests

### High Priority (2 services)

1. **`src/shopify/shopify.service.ts`** ⚠️ **CRITICAL**
   - Status: ❌ No unit tests
   - Has: Integration tests only
   - Methods: 10+ public methods
   - Priority: HIGH - Core e-commerce integration

2. **`src/projects/automation-playbooks.service.ts`** ⚠️ **CRITICAL**
   - Status: ❌ No unit tests
   - Has: Tests for related `automation-playbook-runs.service.ts`
   - Methods: 5+ public methods
   - Priority: HIGH - Core automation feature

### Medium Priority (1 service)

3. **`src/ai/product-issue-fix.service.ts`** ⚠️ **MEDIUM**
   - Status: ⚠️ Partial (integration tests only)
   - Has: Integration tests
   - Methods: 1 main method
   - Priority: MEDIUM - One-click AI fixes

### Low Priority (1 service)

4. **`src/prisma.service.ts`** ⚠️ **LOW**
   - Status: ⚠️ Infrastructure (not typically unit tested)
   - Has: Integration test coverage
   - Priority: LOW - Generated Prisma Client

## Critical Services Needing More Coverage

### 1. BillingService (60% → Target 90%)

- Missing: Webhook handling, private helper methods
- Critical: `handleWebhook()`, `handleCheckoutCompleted()`, `handleSubscriptionUpdated()`

### 2. DeoScoreService (70% → Target 90%)

- Missing: DeoSignalsService methods, edge cases
- Critical: `collectSignalsForProject()`, signal normalization

### 3. ProjectsService (75% → Target 90%)

- Missing: 4 public methods
- Methods: `getIntegrationStatus()`, `getProjectWithIntegrations()`, `getProjectOverview()`, `getCrawlPages()`

### 4. DeoIssuesService (40% → Target 85%)

- Missing: Issue building methods (6+ private methods)
- Critical: `buildMissingMetadataIssue()`, `buildThinContentIssue()`, `buildLowEntityCoverageIssue()`

### 5. AuthService (85% → Target 95%)

- Missing: Edge cases, error scenarios
- Priority: LOW - Good coverage, polish needed

## Summary

- **Services without tests:** 2 high priority
- **Critical services needing more coverage:** 4 services
- **Estimated new tests needed:** ~80-100 tests
- **Coverage improvement potential:** 58% → 75% overall

See `COVERAGE_GAPS_AND_RECOMMENDATIONS.md` for detailed analysis.
