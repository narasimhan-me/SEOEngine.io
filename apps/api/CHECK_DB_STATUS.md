# Check PostgreSQL & Prisma Status

## Quick Check Commands

### 1. Check if PostgreSQL is running:
```bash
pg_isready
```

If it says "accepting connections", PostgreSQL is running.

### 2. Check PostgreSQL version:
```bash
psql -d postgres -c "SELECT version();"
```

### 3. Check if engineo_test database exists:
```bash
psql -d postgres -c "\l" | grep engineo_test
```

### 4. Test connection to engineo_test:
```bash
psql -d engineo_test -c "SELECT 1;"
```

### 5. Check Prisma configuration:
```bash
cd apps/api
cat .env.test | grep DATABASE_URL_TEST
```

## Automated Status Check

Run the diagnostic script:

```bash
cd /Users/lavanya/engineo/EngineO.ai/apps/api
./scripts/check-db-status.sh
```

## Common Issues

### PostgreSQL Not Running

**Symptoms:**
- `pg_isready` fails
- `psql` connection refused

**Solution:**
```bash
# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql@14

# Or
brew services start postgresql

# Check status
brew services list | grep postgres
```

### Database Doesn't Exist

**Symptoms:**
- `psql -d engineo_test` fails with "database does not exist"

**Solution:**
```bash
psql -d postgres -c "CREATE DATABASE engineo_test;"
```

### Wrong Connection String

**Symptoms:**
- Prisma errors about database not existing
- Connection string points to wrong database

**Solution:**
Update `apps/api/.env.test`:
```env
DATABASE_URL_TEST=postgresql://lavanya@localhost:5432/engineo_test
```

## Prisma vs PostgreSQL

**Note:** Prisma is an ORM (Object-Relational Mapping) library, not a service. It doesn't "run" - it connects to PostgreSQL.

- **PostgreSQL** = The database server (needs to be running)
- **Prisma** = The library that connects to PostgreSQL (configured via DATABASE_URL)

So when you ask "is Prisma running", you're really asking "is PostgreSQL running and can Prisma connect to it?"

