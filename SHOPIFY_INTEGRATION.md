# EngineO.ai – Shopify Integration Guide

This document describes how EngineO.ai integrates with Shopify, including OAuth, data sync, and SEO updates.

---

## 1. Overview

EngineO.ai integrates with Shopify as a **public app** installed by merchants.
Once connected, it can:

- Read product and collection data.
- Generate AI-driven SEO recommendations.
- Write SEO-optimized titles and meta descriptions back to Shopify.

---

## 2. Shopify App Setup

1. Create a Shopify Partner account.
2. Create a new **public app**.
3. Configure:
   - App URL: `https://<your-backend>/shopify/callback` (for OAuth).
   - Allowed redirection URLs: include `/shopify/callback`.
4. Obtain:
   - `API key` (client ID)
   - `API secret key`

These are stored as:

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL` (your backend base URL)
- `SHOPIFY_SCOPES`

---

## 3. Required Scopes

Example minimal scopes:

- `read_products`
- `write_products`
- `read_themes` (optional, for schema injection)
- `write_themes` (optional)
- `read_content` – **Required for Pages ingestion** [SHOPIFY-ASSET-SYNC-COVERAGE-1]
- `write_content` (future, if writing blogs)

> **Note [SHOPIFY-ASSET-SYNC-COVERAGE-1]:** The `read_content` scope is required to ingest Shopify Pages via the project-scoped sync endpoints (`POST /projects/:projectId/shopify/sync-pages`, `POST /projects/:projectId/shopify/sync-collections`). Stores connected before this scope was added will need to re-install to grant the additional permission. Pages and Collections sync is metadata-only (title, handle, SEO fields) – no content body ingestion or editing.

---

## 4. OAuth Flow

### Step 1 – Install Redirect

Endpoint: `GET /shopify/install?projectId=...`

- Validates that the authenticated user owns the project.
- Generates the Shopify OAuth URL:

  - `client_id`: `SHOPIFY_API_KEY`
  - `scope`: `SHOPIFY_SCOPES`
  - `redirect_uri`: `SHOPIFY_APP_URL + "/shopify/callback"`
  - `state`: random string + encoded `projectId`

- Redirects the browser to Shopify.

### Step 2 – Callback

Endpoint: `GET /shopify/callback`

- Shopify redirects back with:

  - `code`
  - `shop`
  - `state`
  - `hmac`

- Steps:

  1. Validate `hmac` using `API_SECRET`.
  2. Validate `state` matches a stored state, and extract `projectId`.
  3. Exchange `code` for access token using Shopify OAuth endpoint.
  4. Persist `ShopifyStore` record in DB:
     - `shopDomain = shop`
     - `accessToken`
     - `scope`
     - `projectId`
  5. Redirect user back to frontend (e.g. project page) with success message.

---

## 5. Data Sync – Products (GraphQL)

Endpoint: `POST /shopify/sync-products?projectId=...`

- Uses `Project` → `ShopifyStore` to retrieve:
  - `shopDomain`
  - `accessToken`

- Calls Shopify Admin GraphQL API to fetch products.

Example GraphQL endpoint:

- `POST https://{shopDomain}/admin/api/2024-01/graphql.json`

Example GraphQL query (paginated):

```graphql
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after, sortKey: ID) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        title
        handle
        descriptionHtml
        status
        productType
        vendor
        seo {
          title
          description
        }
        images(first: 10) {
          edges {
            node {
              id
              altText
              url
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
            }
          }
        }
      }
    }
  }
}
```

For each product:

- Extract:

  - `id`
  - `title`
  - `descriptionHtml` (mapped to local `description`/`body_html`)
  - SEO title / description from `seo { title, description }`
  - Image URLs from `images.edges[].node.url`
  - (Optionally) `status`, `productType`, `vendor`, basic variant data for future use

- Upsert into `Product` table by `shopifyId`.

---

## 6. SEO Updates – Products (GraphQL)

Endpoint: `POST /shopify/update-product-seo`

**Body:**

```json
{
  "productId": "local-product-id",
  "seoTitle": "SEO Title",
  "seoDescription": "SEO Description"
}
```

Steps:

1. Load `Product` by local `productId`.
2. Load related `ShopifyStore`.
3. Call Shopify Admin GraphQL API to update product SEO fields.

Example GraphQL mutation:

```graphql
mutation UpdateProductSeo($input: ProductInput!) {
  productUpdate(input: $input) {
    product {
      id
      seo {
        title
        description
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

Example variables:

```json
{
  "input": {
    "id": "gid://shopify/Product/1234567890",
    "seo": {
      "title": "SEO Title",
      "description": "SEO Description"
    }
  }
}
```

4. On success, EngineO.ai updates the local `Product` row with the new `seoTitle` and `seoDescription`.

---

## 7. Answer Block Metafield Sync (AEO-2)

EngineO.ai syncs Answer Blocks into Shopify metafields using Shopify's GraphQL metafield APIs:

- **Namespace and keys:**
  - Namespace: `engineo`
  - Keys (mapped from Answer Block question IDs):
    - `answer_what_is_it`
    - `answer_key_features`
    - `answer_how_it_works`
    - `answer_materials`
    - `answer_benefits`
    - `answer_dimensions`
    - `answer_usage`
    - `answer_warranty`
    - `answer_faq`
    - `answer_care_instructions`

- **Metafield definitions (per store):**
  - Uses `metafieldDefinitions(ownerType: PRODUCT, namespace: "engineo")` to list existing definitions.
  - Uses `metafieldDefinitionCreate` to create definitions for Answer Block keys under the `engineo` namespace when missing.
  - Definitions are created once per store and reused across all products.

- **Metafield values (per product):**
  - Uses `metafieldsSet` to upsert metafields for each Answer Block.
  - Each metafield contains the `answerText` from the corresponding Answer Block.
  - Type: `multi_line_text_field` for all Answer Block metafields.

> Note: Previous REST-based metafield endpoints (`/metafields.json`, `/metafield_definitions.json`) are deprecated for product flows and have been replaced with GraphQL Admin APIs in EngineO.ai.

---

## 8. Webhooks (Future)

To keep data in sync automatically, consider subscribing to webhooks:

- `products/create`
- `products/update`
- `products/delete`
- `app/uninstalled`

Webhook handler endpoints (e.g. `/shopify/webhooks/products-update`) should:

- Verify HMAC header.
- Process the payload.
- Update the `Product` table or mark store uninstalled.

---

## 9. Embedded App (Future)

EngineO.ai can optionally be embedded inside Shopify Admin using:

- Shopify App Bridge
- Polaris (Shopify's React component library)

The MVP can live as a standalone app; embedding is optional but improves UX.

---

END OF SHOPIFY INTEGRATION GUIDE
