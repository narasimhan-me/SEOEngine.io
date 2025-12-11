# Manual Testing: Phase SHOP-API-1 – Shopify GraphQL Migration

## Overview

This document covers manual testing for the migration of EngineO.ai's Shopify product integration from REST Admin APIs to GraphQL Admin APIs.

### Scope

- **Product Sync**: Fetch products via GraphQL instead of REST
- **SEO Updates**: Update product SEO via `productUpdate` mutation
- **Metafield Definitions**: Create metafield definitions via GraphQL
- **Metafield Upserts**: Sync Answer Blocks to metafields via `metafieldsSet` mutation

## Prerequisites

1. Development store on Shopify Partners (or existing test store)
2. EngineO.ai app installed with `read_products,write_products` scopes
3. At least 3-5 test products in the store
4. Local environment running (`pnpm dev` in both api and web)

## Test Cases

### 1. Product Sync via GraphQL

**Steps:**
1. Navigate to Project Settings → Shopify Integration
2. Click "Sync Products"
3. Observe network tab for GraphQL request

**Expected:**
- Request goes to `/admin/api/2024-01/graphql.json`
- Request body contains `query GetProducts` operation
- Products are synced with additional fields (status, productType, vendor)
- Product list shows synced products

**Verification:**
```sql
-- Check products have new fields populated
SELECT id, title, status, product_type, vendor
FROM "Product"
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### 2. SEO Update via GraphQL

**Steps:**
1. Navigate to a product page
2. Enter/modify SEO Title and SEO Description
3. Click "Push to Shopify"
4. Observe network tab for GraphQL mutation

**Expected:**
- Request goes to `/admin/api/2024-01/graphql.json`
- Request body contains `mutation UpdateProductSeo` operation
- Success toast appears
- Verify in Shopify Admin that SEO fields are updated

**Verification in Shopify Admin:**
1. Go to Products → Select the product
2. Scroll to "Search engine listing"
3. Confirm title and description match what was pushed

### 3. Metafield Definitions via GraphQL

**Steps:**
1. Navigate to Project Settings
2. Click "Setup Answer Block Metafields" (or trigger via API)
3. Check browser console / network tab for GraphQL calls

**Expected:**
- GraphQL query `GetEngineoMetafieldDefinitions` is called first
- If definitions missing, `CreateEngineoMetafieldDefinition` mutations are called
- Response shows definitions created successfully

**Verification in Shopify Admin:**
1. Go to Settings → Custom Data → Products
2. Look for "engineo" namespace definitions:
   - `answer_what_is_it`
   - `answer_who_is_it_for`
   - `answer_benefits`
   - etc.

### 4. Answer Block Sync to Metafields via GraphQL

**Steps:**
1. Navigate to a product's Answer Blocks tab
2. Generate or edit Answer Blocks
3. Save the Answer Blocks
4. Verify metafields are synced

**Expected:**
- `metafieldsSet` mutation is called with product GID
- Metafields appear in Shopify Admin under product metafields
- Namespace is "engineo"
- Keys match answer block question IDs (e.g., `answer_what_is_it`)

**Verification in Shopify Admin:**
1. Go to Products → Select product
2. Scroll to "Metafields" section
3. Confirm Answer Block content appears as metafield values

### 5. Product Handle Fetch via GraphQL

**Steps:**
1. Navigate to a product page
2. Click "Run SEO Scan on Product Page"
3. Observe network requests

**Expected:**
- GraphQL query `GetProductHandle` is called
- Product handle is resolved correctly
- SEO scan runs on the correct product URL

### 6. Pagination Test (Larger Catalogs)

**Steps:**
1. Connect a store with 50+ products
2. Trigger product sync
3. Monitor GraphQL requests

**Expected:**
- Multiple paginated GraphQL requests if > 50 products
- All products are synced (check product count in DB)
- No rate limit errors (250ms delay between pages)

## Error Scenarios

### 7. Invalid Access Token

**Steps:**
1. Manually corrupt the access token in database
2. Try to sync products

**Expected:**
- Clear error message about authentication failure
- User prompted to reconnect Shopify

### 8. Rate Limiting

**Steps:**
1. Trigger multiple rapid syncs
2. Observe behavior

**Expected:**
- Built-in delays prevent rate limiting
- If rate limited, graceful error handling
- Retry logic or user-friendly message

## API Verification

### GraphQL Request Format

All Shopify GraphQL requests should:
- Go to `https://{shop}/admin/api/2024-01/graphql.json`
- Include `X-Shopify-Access-Token` header
- Include `operationName` in request body
- Use proper GID format for IDs (e.g., `gid://shopify/Product/123`)

### Sample Requests to Verify

**Product Sync:**
```json
{
  "operationName": "GetProducts",
  "query": "query GetProducts($first: Int!, $after: String) { ... }",
  "variables": { "first": 50 }
}
```

**SEO Update:**
```json
{
  "operationName": "UpdateProductSeo",
  "query": "mutation UpdateProductSeo($input: ProductInput!) { ... }",
  "variables": {
    "input": {
      "id": "gid://shopify/Product/123",
      "seo": { "title": "...", "description": "..." }
    }
  }
}
```

**Metafields Upsert:**
```json
{
  "operationName": "SetEngineoMetafields",
  "query": "mutation SetEngineoMetafields($metafields: [MetafieldsSetInput!]!) { ... }",
  "variables": {
    "metafields": [
      {
        "ownerId": "gid://shopify/Product/123",
        "namespace": "engineo",
        "key": "answer_what_is_it",
        "type": "multi_line_text_field",
        "value": "..."
      }
    ]
  }
}
```

## Regression Checks

- [ ] Existing product data is preserved after sync
- [ ] SEO updates work for products synced before migration
- [ ] Answer Blocks persist correctly after sync
- [ ] Metafield sync still works for stores connected before AEO-2
- [ ] All existing tests pass

## Sign-Off

| Test Case | Status | Tester | Date | Notes |
|-----------|--------|--------|------|-------|
| 1. Product Sync | | | | |
| 2. SEO Update | | | | |
| 3. Metafield Definitions | | | | |
| 4. Answer Block Sync | | | | |
| 5. Product Handle Fetch | | | | |
| 6. Pagination Test | | | | |
| 7. Invalid Token Error | | | | |
| 8. Rate Limiting | | | | |
