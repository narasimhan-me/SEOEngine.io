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
- `read_content` (blogs, pages – future)
- `write_content` (future, if writing blogs)

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

## 5. Data Sync – Products

Endpoint: `POST /shopify/sync-products?projectId=...`

- Uses `Project` → `ShopifyStore` to retrieve:
  - `shopDomain`
  - `accessToken`

- Calls Shopify Admin API to fetch products (GraphQL or REST).

Example REST endpoint:

- `GET https://{shopDomain}/admin/api/2023-10/products.json?limit=50`

For each product:

- Extract:

  - `id`
  - `title`
  - `body_html` or `description`
  - SEO title / description if present (e.g., `metafields` or `seo` fields)
  - Image URLs

- Upsert into `Product` table by `shopifyId`.

---

## 6. SEO Updates – Products

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
3. Call Shopify Admin API to update product:

For REST:

```http
PUT https://{shopDomain}/admin/api/2023-10/products/{shopifyId}.json
```

With body including updated metafields or SEO fields, e.g.:

```json
{
  "product": {
    "id": 1234567890,
    "title": "Existing title (or updated)",
    "metafields": [
      {
        "namespace": "global",
        "key": "seo_title",
        "value": "SEO Title",
        "type": "single_line_text_field"
      },
      {
        "namespace": "global",
        "key": "seo_description",
        "value": "SEO Description",
        "type": "multi_line_text_field"
      }
    ]
  }
}
```

4. On success, update local `Product` with new `seoTitle` and `seoDescription`.

---

## 7. Webhooks (Future)

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

## 8. Embedded App (Future)

EngineO.ai can optionally be embedded inside Shopify Admin using:

- Shopify App Bridge
- Polaris (Shopify’s React component library)

The MVP can live as a standalone app; embedding is optional but improves UX.

---

END OF SHOPIFY INTEGRATION GUIDE
