#!/bin/bash
# Check PostgreSQL and Prisma connection status

echo "=== PostgreSQL & Prisma Status Check ==="
echo ""

# Check if PostgreSQL is running
echo "1. Checking PostgreSQL service..."
if pg_isready > /dev/null 2>&1; then
  echo "   ✅ PostgreSQL is running"
  pg_isready
else
  echo "   ❌ PostgreSQL is NOT running"
  echo ""
  echo "   To start PostgreSQL:"
  echo "     brew services start postgresql@14"
  echo "     # or"
  echo "     brew services start postgresql"
  exit 1
fi

echo ""

# Check PostgreSQL version
echo "2. PostgreSQL version:"
psql -d postgres -c "SELECT version();" 2>&1 | head -2

echo ""

# Check if engineo_test database exists
echo "3. Checking if engineo_test database exists..."
if psql -d postgres -c "\l" 2>&1 | grep -q engineo_test; then
  echo "   ✅ Database 'engineo_test' exists"
else
  echo "   ❌ Database 'engineo_test' does NOT exist"
  echo ""
  echo "   To create it:"
  echo "     psql -d postgres -c 'CREATE DATABASE engineo_test;'"
fi

echo ""

# Check .env.test configuration
echo "4. Checking .env.test configuration..."
if [ -f .env.test ]; then
  if grep -q "DATABASE_URL_TEST" .env.test; then
    echo "   ✅ DATABASE_URL_TEST is set in .env.test"
    echo "   Value:"
    grep "DATABASE_URL_TEST" .env.test | sed 's/.*=\(.*\)/     \1/'
  else
    echo "   ❌ DATABASE_URL_TEST is NOT set in .env.test"
  fi
else
  echo "   ❌ .env.test file does not exist"
fi

echo ""

# Test Prisma connection
echo "5. Testing Prisma connection to engineo_test..."
if [ -f .env.test ] && grep -q "DATABASE_URL_TEST" .env.test; then
  export NODE_ENV=test
  export ENGINEO_ENV=test
  source <(grep DATABASE_URL_TEST .env.test | sed 's/^/export /')
  
  if psql "$DATABASE_URL_TEST" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✅ Prisma can connect to engineo_test"
  else
    echo "   ❌ Prisma cannot connect to engineo_test"
    echo "   Check DATABASE_URL_TEST in .env.test"
  fi
else
  echo "   ⚠️  Cannot test - DATABASE_URL_TEST not configured"
fi

echo ""
echo "=== Status Check Complete ==="

