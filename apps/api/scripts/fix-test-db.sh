#!/bin/bash
# Fix test database connection and run tests

set -e

cd "$(dirname "$0")/.."

echo "🔧 Fixing test database configuration..."

# Update .env.test with correct DATABASE_URL_TEST
cat > .env.test << 'EOF'
NODE_ENV=test
ENGINEO_ENV=test
DATABASE_URL_TEST=postgresql://lavanya@localhost:5432/engineo_test
EOF

echo "✅ Updated .env.test with DATABASE_URL_TEST=postgresql://lavanya@localhost:5432/engineo_test"
echo ""

# Verify database exists
echo "📦 Verifying database connection..."
if psql -d engineo_test -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Database 'engineo_test' is accessible"
else
  echo "❌ Cannot connect to database 'engineo_test'"
  echo "   Please ensure PostgreSQL is running and the database exists"
  exit 1
fi

echo ""
echo "🔄 Running migrations..."
NODE_ENV=test ENGINEO_ENV=test pnpm db:test:migrate

echo ""
echo "🧪 Running critical integration tests..."
NODE_ENV=test ENGINEO_ENV=test pnpm test:api:critical

echo ""
echo "✅ All done!"

