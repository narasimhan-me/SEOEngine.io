# Test Database Setup Guide

## Quick Setup

Run these commands in your terminal:

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api

# Step 1: Create .env.test file with DATABASE_URL_TEST
cat > .env.test << 'EOF'
NODE_ENV=test
ENGINEO_ENV=test
DATABASE_URL_TEST=postgresql://lavanya@localhost:5432/engineo_test
EOF

# Step 2: Create test database
psql -d postgres -c "CREATE DATABASE engineo_test;"

# Step 3: Run migrations
NODE_ENV=test ENGINEO_ENV=test pnpm db:test:migrate

# Step 4: Run integration tests
NODE_ENV=test ENGINEO_ENV=test pnpm test:api:critical
```

## Detailed Steps

### Step 1: Create .env.test

Create or update `apps/api/.env.test`:

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api
```

Add these lines to `.env.test`:

```env
NODE_ENV=test
ENGINEO_ENV=test
DATABASE_URL_TEST=postgresql://lavanya@localhost:5432/engineo_test
```

**Note:** Replace `lavanya` with your PostgreSQL username if different.

### Step 2: Create Test Database

```bash
# Connect to PostgreSQL and create database
psql -d postgres -c "CREATE DATABASE engineo_test;"
```

If you get a permission error, try:

```bash
psql -U postgres -d postgres -c "CREATE DATABASE engineo_test;"
```

Or if the database already exists, that's fine - the migrations will work.

### Step 3: Run Migrations

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api
NODE_ENV=test ENGINEO_ENV=test pnpm db:test:migrate
```

This will:

- Load `.env.test`
- Validate the database URL is safe for tests
- Run Prisma migrations against the test database

### Step 4: Run Integration Tests

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api
NODE_ENV=test ENGINEO_ENV=test pnpm test:api:critical
```

## Troubleshooting

### "Database does not exist"

If you see `Database 'lavanya' does not exist`:

- The connection string is wrong
- Check your PostgreSQL username
- Update `DATABASE_URL_TEST` in `.env.test`

### "psql: command not found"

Install PostgreSQL:

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Or use existing installation
export PATH="/usr/local/bin:$PATH"
```

### "Connection refused"

Start PostgreSQL:

```bash
# macOS with Homebrew
brew services start postgresql@14

# Or manually
pg_ctl -D /usr/local/var/postgres start
```

### "Permission denied"

Try with a different user:

```bash
psql -U postgres -d postgres -c "CREATE DATABASE engineo_test;"
```

And update `.env.test`:

```env
DATABASE_URL_TEST=postgresql://postgres@localhost:5432/engineo_test
```

## Verify Setup

After setup, verify:

```bash
# Check database exists
psql -d engineo_test -c "SELECT 1;"

# Check tables exist
psql -d engineo_test -c "\dt"

# Run a quick test
cd /Users/lavanya/engineo/EngineO.ai/apps/api
NODE_ENV=test ENGINEO_ENV=test pnpm test:api:critical --testNamePattern="should" --maxWorkers=1
```

## Alternative: Use Existing Database

If you already have a test database, just update `.env.test`:

```env
DATABASE_URL_TEST=postgresql://username@localhost:5432/your_test_db
```

Make sure the database name includes `_test`, `-test`, or `testdb` in the name, OR the host is `localhost` or `127.0.0.1` (as required by the test environment guard).
