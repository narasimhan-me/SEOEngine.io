# Test Structure - EngineO.ai

This document describes the organized test structure for easy maintenance.

## Directory Structure

```
EngineO.ai/
├── apps/
│   ├── api/
│   │   └── test/
│   │       ├── unit/              # Unit tests (isolated, fast)
│   │       │   ├── ai/
│   │       │   ├── answer-engine/
│   │       │   ├── automation/
│   │       │   ├── local-discovery/
│   │       │   ├── offsite-signals/
│   │       │   ├── shopify/
│   │       │   └── shopify-metafields/
│   │       ├── integration/       # Integration tests (real DB, mocked external APIs)
│   │       │   ├── automation/
│   │       │   ├── local-discovery/
│   │       │   ├── offsite-signals/
│   │       │   ├── shopify/
│   │       │   └── shopify-metafields/
│   │       │   # Plus flat integration tests (aeo2-manual-sync, auth-entitlements, etc.)
│   │       ├── e2e/               # E2E tests (Jest-based, full API testing)
│   │       │   └── automation/
│   │       ├── fixtures/          # Test data factories
│   │       ├── utils/             # Test utilities (test-db, test-app)
│   │       └── setup.ts           # Jest setup
│   │
│   └── web/
│       └── tests/
│           └── e2e/               # Playwright E2E tests (browser-based)
│               ├── first-deo-win.spec.ts
│               └── smoke-homepage.spec.ts
│
└── packages/
    └── shared/
        └── src/
            └── **/*.test.ts        # Co-located unit tests for shared package
```

## Test Types

### 1. Unit Tests (`apps/api/test/unit/`)
- **Purpose**: Test individual services/utilities in isolation
- **Location**: `apps/api/test/unit/{module}/`
- **Characteristics**:
  - Fast execution
  - No database connections
  - Mocked dependencies
  - Organized by feature/module

### 2. Integration Tests (`apps/api/test/integration/`)
- **Purpose**: Test API endpoints and service interactions with real database
- **Location**: `apps/api/test/integration/{module}/` or flat in `integration/`
- **Characteristics**:
  - Real PostgreSQL test database
  - Mocked external APIs (Shopify, AI providers)
  - Test environment guards prevent production DB access
  - Organized by feature/module

### 3. E2E Tests - API (`apps/api/test/e2e/`)
- **Purpose**: End-to-end API testing with Jest
- **Location**: `apps/api/test/e2e/{feature}/`
- **Characteristics**:
  - Full NestJS application context
  - Real database
  - Full request/response cycle
  - Uses `jest.e2e.config.ts`

### 4. E2E Tests - Web (`apps/web/tests/e2e/`)
- **Purpose**: Browser-based end-to-end testing
- **Location**: `apps/web/tests/e2e/`
- **Characteristics**:
  - Playwright-based
  - Tests full user journeys
  - Requires both web and API servers running

### 5. Shared Package Tests (`packages/shared/src/**/*.test.ts`)
- **Purpose**: Test shared utilities and types
- **Location**: Co-located with source files
- **Characteristics**:
  - Pure TypeScript, no framework dependencies
  - Fast, isolated tests

## Import Paths

### From Unit Tests (`apps/api/test/unit/{module}/`)
```typescript
// Source files
import { ServiceName } from '../../src/module/service';

// Test utilities
import { testPrisma } from '../../utils/test-db';
import { fixture } from '../../fixtures/fixture-name';
```

### From Integration Tests (`apps/api/test/integration/{module}/`)
```typescript
// Source files
import { ServiceName } from '../src/module/service';

// Test utilities
import { testPrisma } from '../utils/test-db';
import { createTestApp } from '../utils/test-app';
import { fixture } from '../fixtures/fixture-name';
```

## Running Tests

```bash
# Run all API tests (unit + integration)
pnpm test:api

# Run only unit tests
pnpm --filter api test:api -- test/unit

# Run only integration tests
pnpm --filter api test:api -- test/integration

# Run E2E tests (Jest)
pnpm --filter api test:api:e2e

# Run Playwright E2E tests
pnpm test:e2e
# or
pnpm --filter web test:e2e

# Run with coverage
pnpm --filter api test:api --coverage
```

## Configuration Files

- **Jest (Unit + Integration)**: `apps/api/jest.config.ts`
- **Jest (E2E)**: `apps/api/jest.e2e.config.ts`
- **Playwright**: `apps/web/playwright.config.ts`

## Test Utilities

### `apps/api/test/utils/test-db.ts`
- `testPrisma` - Prisma client for test database
- `cleanupTestDb()` - Clean all test data
- `disconnectTestDb()` - Close database connection

### `apps/api/test/utils/test-app.ts`
- `createTestApp()` - Create NestJS testing module for integration tests

### `apps/api/test/fixtures/`
- Test data factories for creating consistent test data
- Shopify product fixtures
- Automation event fixtures
- Test data helpers

## Best Practices

1. **Co-location**: Keep tests close to the code they test
2. **Organization**: Group by feature/module, not by test type at root level
3. **Naming**: Use `.test.ts` for unit/integration, `.spec.ts` for E2E
4. **Isolation**: Each test should be independent and clean up after itself
5. **Fixtures**: Use test data factories for consistent, maintainable test data

## Migration Notes

Tests were reorganized from:
- `tests/unit/` → `apps/api/test/unit/`
- `tests/integration/` → `apps/api/test/integration/`
- `tests/e2e/` → `apps/api/test/e2e/`
- `apps/web/tests/*.spec.ts` → `apps/web/tests/e2e/*.spec.ts`

All import paths have been updated to reflect the new structure.

