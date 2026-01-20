# Fix Database Connection Issue

## Problem

The integration tests are failing with:

```
Database `lavanya` does not exist on the database server
```

This means the connection string is pointing to the wrong database. The connection string should point to `engineo_test`, not `lavanya`.

## Solution

### Step 1: Update .env.test

Make sure `apps/api/.env.test` has the correct `DATABASE_URL_TEST`:

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api

cat > .env.test << 'EOF'
NODE_ENV=test
ENGINEO_ENV=test
DATABASE_URL_TEST=postgresql://lavanya@localhost:5432/engineo_test
EOF
```

**Important:** The database name in the connection string must be `engineo_test`, not `lavanya`.

### Step 2: Verify Database Connection

```bash
psql -d engineo_test -c "SELECT 1;"
```

If this fails, the database might not exist or PostgreSQL isn't running.

### Step 3: Run Migrations

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api
NODE_ENV=test ENGINEO_ENV=test pnpm db:test:migrate
```

### Step 4: Run Tests

```bash
NODE_ENV=test ENGINEO_ENV=test pnpm test:api:critical
```

## Quick Fix Script

Or run the automated fix script:

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api
./scripts/fix-test-db.sh
```

## Connection String Format

The connection string format is:

```
postgresql://[username]@[host]:[port]/[database_name]
```

For your setup:

- Username: `lavanya`
- Host: `localhost`
- Port: `5432` (default)
- Database: `engineo_test` ← **This is the key part!**

## Troubleshooting

### If database doesn't exist:

```bash
psql -d postgres -c "CREATE DATABASE engineo_test;"
```

### If connection fails:

1. Check PostgreSQL is running:

   ```bash
   pg_isready
   ```

2. Check database exists:

   ```bash
   psql -l | grep engineo_test
   ```

3. Try with different user:
   ```bash
   psql -U postgres -d postgres -c "CREATE DATABASE engineo_test;"
   ```
   Then update `.env.test`:
   ```env
   DATABASE_URL_TEST=postgresql://postgres@localhost:5432/engineo_test
   ```
