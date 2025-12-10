#!/bin/bash

# Test script for Answer Blocks endpoints
# This script tests GET and POST /products/:id/answer-blocks

API_URL="http://localhost:3001"
TEST_EMAIL="test-answer-blocks-$(date +%s)@example.com"
TEST_PASSWORD="testpassword123"

echo "🧪 Testing Answer Blocks Endpoints"
echo "=================================="
echo ""

# Step 1: Sign up
echo "1. Signing up user..."
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"Test User\",
    \"captchaToken\": \"test-token\"
  }")

if echo "$SIGNUP_RESPONSE" | grep -q "id"; then
  echo "✅ Signup successful"
else
  echo "❌ Signup failed: $SIGNUP_RESPONSE"
  exit 1
fi

# Step 2: Login
echo "2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"captchaToken\": \"test-token\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Step 3: Create a project
echo "3. Creating project..."
PROJECT_RESPONSE=$(curl -s -X POST "$API_URL/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Project\",
    \"domain\": \"test.example.com\"
  }")

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Project creation failed: $PROJECT_RESPONSE"
  exit 1
fi

echo "✅ Project created: $PROJECT_ID"
echo ""

# Step 4: Create a product (using Prisma directly via a helper script)
# For now, we'll need to create it via database or use an existing one
# Let's check if there are any products first
echo "4. Checking for products..."
PRODUCTS_RESPONSE=$(curl -s -X GET "$API_URL/projects/$PROJECT_ID/products" \
  -H "Authorization: Bearer $TOKEN")

echo "Products response: $PRODUCTS_RESPONSE"
echo ""

# If no products, we need to create one
# For testing, let's create a product using a direct database insert
# or use the shopify sync endpoint if available

# For now, let's assume we have a product ID to test with
# In a real scenario, you would create a product via Shopify sync or direct DB insert

echo "⚠️  Note: You need to have a product in the project to test answer blocks."
echo "   To create a product, you can:"
echo "   1. Sync from Shopify (if integration exists)"
echo "   2. Insert directly into database"
echo "   3. Use an existing product ID"
echo ""

read -p "Enter a product ID to test with (or press Enter to skip): " PRODUCT_ID

if [ -z "$PRODUCT_ID" ]; then
  echo "Skipping endpoint tests (no product ID provided)"
  exit 0
fi

# Step 5: Test GET /products/:id/answer-blocks
echo "5. Testing GET /products/$PRODUCT_ID/answer-blocks..."
GET_RESPONSE=$(curl -s -X GET "$API_URL/products/$PRODUCT_ID/answer-blocks" \
  -H "Authorization: Bearer $TOKEN")

echo "GET Response: $GET_RESPONSE"

if echo "$GET_RESPONSE" | grep -q "\[\]"; then
  echo "✅ GET endpoint works - returned empty array (no blocks yet)"
elif echo "$GET_RESPONSE" | grep -q "id"; then
  echo "✅ GET endpoint works - returned answer blocks"
else
  echo "❌ GET endpoint failed or returned unexpected response"
  echo "Response: $GET_RESPONSE"
fi
echo ""

# Step 6: Test POST /products/:id/answer-blocks
echo "6. Testing POST /products/$PRODUCT_ID/answer-blocks..."
POST_RESPONSE=$(curl -s -X POST "$API_URL/products/$PRODUCT_ID/answer-blocks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"blocks\": [{
      \"questionId\": \"what_is_it\",
      \"question\": \"What is this product?\",
      \"answer\": \"A test answer.\",
      \"confidence\": 0.85
    }]
  }")

echo "POST Response: $POST_RESPONSE"

if echo "$POST_RESPONSE" | grep -q "id"; then
  echo "✅ POST endpoint works - created answer block"
else
  echo "❌ POST endpoint failed"
  echo "Response: $POST_RESPONSE"
  exit 1
fi
echo ""

# Step 7: Test upsert behavior (update existing)
echo "7. Testing upsert behavior (updating existing block)..."
UPSERT_RESPONSE=$(curl -s -X POST "$API_URL/products/$PRODUCT_ID/answer-blocks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"blocks\": [{
      \"questionId\": \"what_is_it\",
      \"question\": \"What is this product?\",
      \"answer\": \"An updated test answer.\",
      \"confidence\": 0.90
    }]
  }")

echo "Upsert Response: $UPSERT_RESPONSE"

if echo "$UPSERT_RESPONSE" | grep -q "updated test answer"; then
  echo "✅ Upsert works - existing block was updated"
else
  echo "⚠️  Upsert response doesn't show updated text (check manually)"
fi
echo ""

# Step 8: Verify ownership check
echo "8. Testing ownership check (should fail with 403/404)..."
# Create another user
OTHER_EMAIL="other-user-$(date +%s)@example.com"
OTHER_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$OTHER_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"Other User\",
    \"captchaToken\": \"test-token\"
  }")

OTHER_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$OTHER_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"captchaToken\": \"test-token\"
  }")

OTHER_TOKEN=$(echo "$OTHER_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

OWNERSHIP_CHECK=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/products/$PRODUCT_ID/answer-blocks" \
  -H "Authorization: Bearer $OTHER_TOKEN")

HTTP_CODE=$(echo "$OWNERSHIP_CHECK" | tail -n1)
RESPONSE_BODY=$(echo "$OWNERSHIP_CHECK" | head -n-1)

if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "404" ]; then
  echo "✅ Ownership check works - returned $HTTP_CODE (Forbidden/Not Found)"
else
  echo "❌ Ownership check failed - expected 403/404, got $HTTP_CODE"
  echo "Response: $RESPONSE_BODY"
fi
echo ""

echo "=================================="
echo "✅ All tests completed!"
echo ""

