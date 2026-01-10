#!/bin/bash
# Script to set up test database for integration tests

set -e

echo "🔧 Setting up test database..."

# Default values
DB_NAME="engineo_test"
DB_USER="${USER:-postgres}"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found. Please install PostgreSQL."
  exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" &> /dev/null; then
  echo "❌ PostgreSQL is not running on $DB_HOST:$DB_PORT"
  echo "   Please start PostgreSQL first."
  exit 1
fi

echo "✅ PostgreSQL is running"

# Try to create database (ignore error if it already exists)
echo "📦 Creating test database: $DB_NAME"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>&1 | grep -v "already exists" || true

echo "✅ Test database created or already exists"

# Generate DATABASE_URL_TEST
DB_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

echo ""
echo "📝 Add this to apps/api/.env.test:"
echo "DATABASE_URL_TEST=$DB_URL"
echo ""

# Check if .env.test exists
if [ -f ".env.test" ]; then
  # Check if DATABASE_URL_TEST is already set
  if grep -q "DATABASE_URL_TEST" .env.test; then
    echo "⚠️  DATABASE_URL_TEST is already set in .env.test"
    echo "   Current value:"
    grep "DATABASE_URL_TEST" .env.test
  else
    echo "➕ Adding DATABASE_URL_TEST to .env.test"
    echo "" >> .env.test
    echo "# Test database URL" >> .env.test
    echo "DATABASE_URL_TEST=$DB_URL" >> .env.test
    echo "✅ Added DATABASE_URL_TEST to .env.test"
  fi
else
  echo "📝 Creating .env.test file"
  cat > .env.test << EOF
# Test environment variables
NODE_ENV=test
ENGINEO_ENV=test
DATABASE_URL_TEST=$DB_URL
EOF
  echo "✅ Created .env.test with DATABASE_URL_TEST"
fi

echo ""
echo "✅ Test database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run migrations: pnpm db:test:migrate"
echo "  2. Run tests: pnpm test:api:critical"

