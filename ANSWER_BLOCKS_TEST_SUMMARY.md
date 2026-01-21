# Answer Blocks Endpoint Testing Summary

## ✅ Completed Steps

### 1. Prisma Migration

- **Status**: ✅ Completed
- **Migration**: `20251210110744_add_answer_block`
- **Table Created**: `AnswerBlock`
- **Columns Verified**:
  - `id` (TEXT, PRIMARY KEY)
  - `productId` (TEXT, FOREIGN KEY to Product)
  - `questionId` (TEXT)
  - `questionText` (TEXT)
  - `answerText` (TEXT)
  - `confidenceScore` (DOUBLE PRECISION)
  - `sourceType` (TEXT, DEFAULT 'generated')
  - `sourceFieldsUsed` (TEXT[], DEFAULT [])
  - `version` (TEXT, DEFAULT 'ae_v1')
  - `createdAt` (TIMESTAMP(3))
  - `updatedAt` (TIMESTAMP(3))
- **Indexes**:
  - Index on `productId`
  - Unique constraint on `(productId, questionId)`
- **Foreign Key**: Cascade delete on product deletion

### 2. TypeScript Compilation

- **Status**: ✅ Completed
- **Command**: `npx tsc --noEmit -p apps/api/tsconfig.json`
- **Result**: No errors

### 3. API Server

- **Status**: ✅ Running
- **Port**: 3001
- **Health Check**: `http://localhost:3001/health` returns `{"status":"ok"}`

## 📋 Manual Testing Required

To complete the testing, you need to manually test the following endpoints. The API server is running and ready for testing.

### Prerequisites

1. **Get Authentication Token**:

   ```bash
   # Sign up
   curl -X POST http://localhost:3001/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpassword123",
       "name": "Test User",
       "captchaToken": "test-token"
     }'

   # Login
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpassword123",
       "captchaToken": "test-token"
     }'
   # Save the accessToken from the response
   ```

2. **Create a Project** (if needed):

   ```bash
   curl -X POST http://localhost:3001/projects \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Project",
       "domain": "test.example.com"
     }'
   ```

3. **Get a Product ID**:
   - Option A: Use an existing product from your database
   - Option B: Create a product via Shopify sync
   - Option C: Insert directly into database using Prisma

### Test Cases

#### Test 1: GET /products/:id/answer-blocks

**Expected**: Empty array `[]` (no blocks yet)

```bash
curl -X GET http://localhost:3001/products/PRODUCT_ID/answer-blocks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**: `[]`

#### Test 2: POST /products/:id/answer-blocks

**Expected**: Created Answer Block with all fields

```bash
curl -X POST http://localhost:3001/products/PRODUCT_ID/answer-blocks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blocks": [{
      "questionId": "what_is_it",
      "question": "What is this product?",
      "answer": "A test answer.",
      "confidence": 0.85
    }]
  }'
```

**Expected Response**: Array with one Answer Block object containing:

- `id`
- `productId`
- `questionId`: "what_is_it"
- `questionText`: "What is this product?"
- `answerText`: "A test answer."
- `confidenceScore`: 0.85
- `sourceType`: "generated"
- `sourceFieldsUsed`: []
- `version`: "ae_v1"
- `createdAt`
- `updatedAt`

#### Test 3: Verify Upsert Behavior

**Expected**: Existing block is updated (not duplicated)

```bash
# POST the same questionId with different answer
curl -X POST http://localhost:3001/products/PRODUCT_ID/answer-blocks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blocks": [{
      "questionId": "what_is_it",
      "question": "What is this product?",
      "answer": "An updated test answer.",
      "confidence": 0.90
    }]
  }'

# Then GET to verify only one block exists
curl -X GET http://localhost:3001/products/PRODUCT_ID/answer-blocks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**:

- Only one block with `questionId: "what_is_it"`
- `answerText` should be "An updated test answer."
- `confidenceScore` should be 0.90

#### Test 4: Verify Ownership Check

**Expected**: 403 Forbidden or 404 Not Found for other user's product

```bash
# Use a token from a different user
curl -X GET http://localhost:3001/products/PRODUCT_ID/answer-blocks \
  -H "Authorization: Bearer OTHER_USER_TOKEN"
```

**Expected Response**:

- Status: `403` or `404`
- Body: Error message indicating access denied

## 📝 Test Scripts Created

Two test scripts have been created to help with automated testing:

1. **test-answer-blocks.sh** - Bash script for manual testing
2. **test-answer-blocks.js** - Node.js script for automated testing

Both scripts require a product ID to be provided or created first.

## 🎯 Summary

- ✅ Migration executed successfully
- ✅ Table structure verified (all required columns present)
- ✅ TypeScript compiles without errors
- ✅ API server running on port 3001
- ⏳ Manual endpoint testing required (need product ID and auth token)

All infrastructure is in place. The endpoints are ready for testing once you have:

1. A valid JWT token
2. A product ID that belongs to your authenticated user
