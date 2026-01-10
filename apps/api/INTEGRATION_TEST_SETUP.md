# Integration Test Database Setup

## Issue

The critical integration tests require a test database to be set up. The error:
```
Database `lavanya` does not exist on the database server
```

indicates that the test database hasn't been created or migrated.

## Solution

### Option 1: Set Up Test Database (Recommended)

1. **Create test database:**
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create test database
   CREATE DATABASE engineo_test;
   ```

2. **Set DATABASE_URL_TEST in `.env.test`:**
   ```bash
   # In apps/api/.env.test
   DATABASE_URL_TEST=postgresql://lavanya@localhost:5432/engineo_test
   # Or if you have a password:
   DATABASE_URL_TEST=postgresql://lavanya:password@localhost:5432/engineo_test
   ```

3. **Run migrations:**
   ```bash
   cd apps/api
   pnpm db:test:migrate
   ```

4. **Verify setup:**
   ```bash
   pnpm test:api:critical
   ```

### Option 2: Skip Critical Integration Tests (Temporary)

If you need to push without setting up the database, you can temporarily skip the critical integration tests:

```bash
# Skip pre-push hook
git push --no-verify origin feature/Lavanya
```

⚠️ **Warning:** This bypasses all safety checks. Only use for WIP commits.

### Option 3: Make Pre-Push Hook Optional for Critical Tests

We can modify the pre-push hook to skip critical integration tests if the database isn't available. This would require updating `.husky/pre-push` to check for database availability first.

## Current Status

- ✅ Module path issue fixed (`automation-playbook-runs.test.ts`)
- ❌ Test database not set up
- ❌ Critical integration tests failing due to missing database

## Next Steps

1. Set up the test database (Option 1)
2. Run `pnpm test:api:critical` to verify
3. Then push: `git push origin feature/Lavanya`

