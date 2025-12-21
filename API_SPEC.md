# EngineO.ai – API Specification

This document defines the main REST endpoints exposed by the EngineO.ai backend (NestJS).
All endpoints are prefixed with `/api` in production (e.g. `https://api.seoengine.io/api/...`) depending on deployment.

Authentication is JWT-based unless otherwise stated.

---

## 1. Authentication

### POST `/auth/signup`

**Description:** Create a new user.

**Request body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "plain-text-password",
  "name": "Optional Name"
}
```

**Responses:**

- `201 Created` – User created.
- `400 Bad Request` – Invalid input or email already exists.

---

### POST `/auth/login`

**Description:** Authenticate user and return JWT.

**Request body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "plain-text-password"
}
```

**Responses:**

- `200 OK`:

```json
{
  "accessToken": "jwt-token-here",
  "user": {
    "id": "string",
    "email": "user@example.com",
    "name": "Optional Name"
  }
}
```

- `401 Unauthorized` – Invalid credentials.

---

### GET `/users/me` (auth required)

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "id": "string",
  "email": "user@example.com",
  "name": "Optional Name",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 2. Projects

### GET `/projects` (auth required)

List projects belonging to authenticated user.

**Response:**

```json
[
  {
    "id": "project-id",
    "name": "My Store SEO",
    "domain": "mystore.com",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### POST `/projects` (auth required)

**Body:**

```json
{
  "name": "My Store SEO",
  "domain": "mystore.com"
}
```

**Response:**

- `201 Created` – Returns created project.

---

### GET `/projects/:id` (auth required)

Fetch single project by ID (only if belongs to user).

---

### DELETE `/projects/:id` (auth required)

Delete a project (MVP: hard delete).

---

### GET `/projects/:id/overview` (auth required)

Returns aggregated stats:

```json
{
  "crawlCount": 10,
  "issueCount": 42,
  "avgSeoScore": 78,
  "productCount": 120,
  "productsWithAppliedSeo": 30
}
```

---

### GET `/projects/:id/integration-status` (auth required)

Returns integration status for all platform types:

```json
{
  "projectId": "project-id",
  "projectName": "My Store SEO",
  "integrations": [
    {
      "type": "SHOPIFY",
      "externalId": "mystore.myshopify.com",
      "connected": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "config": { "scope": "read_products,write_products" }
    }
  ],
  "shopify": {
    "connected": true,
    "shopDomain": "mystore.myshopify.com",
    "installedAt": "2025-01-01T00:00:00.000Z",
    "scope": "read_products,write_products"
  },
  "woocommerce": { "connected": false },
  "bigcommerce": { "connected": false },
  "magento": { "connected": false },
  "customWebsite": { "connected": false }
}
```

---

## 3. Integrations

### GET `/integrations` (auth required)

**Query parameters:**

- `projectId` – ID of project

**Response:**

```json
{
  "projectId": "project-id",
  "integrations": [
    {
      "id": "integration-id",
      "type": "SHOPIFY",
      "externalId": "mystore.myshopify.com",
      "hasAccessToken": true,
      "config": { "scope": "read_products,write_products" },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET `/integrations/:type` (auth required)

**Query parameters:**

- `projectId` – ID of project

**Path parameters:**

- `type` – Integration type (SHOPIFY, WOOCOMMERCE, BIGCOMMERCE, MAGENTO, CUSTOM_WEBSITE)

**Response:**

```json
{
  "id": "integration-id",
  "projectId": "project-id",
  "type": "SHOPIFY",
  "externalId": "mystore.myshopify.com",
  "hasAccessToken": true,
  "config": { "scope": "read_products,write_products" },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

### POST `/integrations` (auth required)

Create a new integration.

**Body:**

```json
{
  "projectId": "project-id",
  "type": "WOOCOMMERCE",
  "externalId": "https://mystore.com",
  "accessToken": "ck_xxxx",
  "config": {
    "consumerSecret": "cs_xxxx",
    "version": "wc/v3"
  }
}
```

**Response:**

```json
{
  "id": "integration-id",
  "projectId": "project-id",
  "type": "WOOCOMMERCE",
  "externalId": "https://mystore.com",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

### PUT `/integrations/:type` (auth required)

Update an existing integration.

**Query parameters:**

- `projectId` – ID of project

**Body:**

```json
{
  "externalId": "https://newstore.com",
  "accessToken": "new_token",
  "config": { "version": "wc/v3" }
}
```

---

### DELETE `/integrations/:type` (auth required)

Remove an integration.

**Query parameters:**

- `projectId` – ID of project

**Response:**

```json
{
  "success": true,
  "message": "Integration of type WOOCOMMERCE has been removed"
}
```

---

### GET `/integrations/types/available`

Get list of all available integration types.

**Response:**

```json
{
  "types": [
    {
      "value": "SHOPIFY",
      "label": "Shopify",
      "description": "Connect your Shopify store for product sync and SEO optimization"
    },
    {
      "value": "WOOCOMMERCE",
      "label": "WooCommerce",
      "description": "Connect your WooCommerce store via REST API"
    },
    {
      "value": "BIGCOMMERCE",
      "label": "BigCommerce",
      "description": "Connect your BigCommerce store for product management"
    },
    {
      "value": "MAGENTO",
      "label": "Magento",
      "description": "Connect your Magento 2 store via REST API"
    },
    {
      "value": "CUSTOM_WEBSITE",
      "label": "Custom Website",
      "description": "Connect any website for SEO scanning and analysis"
    }
  ]
}
```

---

## 4. Shopify Integration

### GET `/shopify/install` (auth required)

**Query parameters:**

- `shop` – Shopify store domain (e.g., mystore.myshopify.com)
- `projectId` – ID of project to connect

Redirects to Shopify OAuth install URL.

---

### GET `/shopify/callback`

OAuth callback from Shopify.
Validates HMAC, exchanges `code` for access token, creates Integration record and links it to project.
Returns a simple success page or redirects back to frontend.

---

### POST `/shopify/sync-products` (auth required)

**Query parameters:**

- `projectId`

Fetches products from Shopify and upserts into `Product` table.

**Response example:**

```json
{
  "synced": 50
}
```

---

### POST `/shopify/update-product-seo` (auth required)

**Body:**

```json
{
  "productId": "local-product-id",
  "seoTitle": "New SEO Title",
  "seoDescription": "New SEO Meta Description"
}
```

Updates Shopify product SEO fields and local DB.

---

## 5. SEO Scan

### POST `/seo-scan/start` (auth required)

**Body:**

```json
{
  "projectId": "project-id"
}
```

Starts a basic SEO scan (initial MVP: home page `/` only).

**Response:**

```json
{
  "status": "started",
  "scannedCount": 1
}
```

---

### GET `/seo-scan/results` (auth required)

**Query params:**

- `projectId`

**Response:**

```json
[
  {
    "id": "crawl-result-id",
    "url": "https://mystore.com/",
    "statusCode": 200,
    "title": "My Store - Home",
    "metaDescription": "Welcome to my store...",
    "h1": "Welcome",
    "wordCount": 500,
    "issues": ["THIN_CONTENT"],
    "scannedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

## 6. AI Metadata

### POST `/ai/metadata` (auth required)

Generate SEO title & description for a scanned URL.

**Body:**

```json
{
  "crawlResultId": "string",
  "targetKeywords": ["shopify", "shoes"]
}
```

**Response:**

```json
{
  "suggestedTitle": "Shopify Shoe Store – Trendy Footwear Online",
  "suggestedDescription": "Discover our collection of stylish shoes for every occasion. Free shipping on orders over $50."
}
```

---

### POST `/ai/product-metadata` (auth required)

Generate SEO title & description for a product.

**Body:**

```json
{
  "productId": "string",
  "targetKeywords": ["running shoes", "lightweight"]
}
```

**Response:**

```json
{
  "suggestedTitle": "Lightweight Running Shoes – Comfort & Speed",
  "suggestedDescription": "Run farther and faster with our ultra-light running shoes, engineered for comfort and performance."
}
```

---

## 12. Enterprise Governance (ENTERPRISE-GEO-1)

Enterprise-grade governance controls including approval workflows, audit logging, and export controls.

### GET `/projects/:projectId/governance/policy` (auth required)

Get governance policy for a project. Returns default values if no policy exists.

**Response:**

```json
{
  "projectId": "string",
  "requireApprovalForApply": false,
  "restrictShareLinks": false,
  "shareLinkExpiryDays": 14,
  "allowedExportAudience": "ANYONE_WITH_LINK",
  "allowCompetitorMentionsInExports": false,
  "allowPIIInExports": false,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### PUT `/projects/:projectId/governance/policy` (auth required)

Update governance policy settings.

**Body:**

```json
{
  "requireApprovalForApply": true,
  "restrictShareLinks": true,
  "shareLinkExpiryDays": 7,
  "allowedExportAudience": "PASSCODE",
  "allowCompetitorMentionsInExports": false
}
```

**Note:** `allowPIIInExports` is always false and cannot be changed.

---

### POST `/projects/:projectId/governance/approvals` (auth required)

Create an approval request.

**Body:**

```json
{
  "resourceType": "GEO_FIX_APPLY" | "ANSWER_BLOCK_SYNC",
  "resourceId": "string"
}
```

**Response:** `201 Created` with the approval request object.

---

### POST `/projects/:projectId/governance/approvals/:approvalId/approve` (auth required)

Approve an approval request.

**Body:**

```json
{
  "reason": "Optional reason for approval"
}
```

---

### POST `/projects/:projectId/governance/approvals/:approvalId/reject` (auth required)

Reject an approval request.

**Body:**

```json
{
  "reason": "Optional reason for rejection"
}
```

---

### GET `/projects/:projectId/governance/approvals` (auth required)

List approval requests for a project.

**Query parameters:**
- `status` (optional): Filter by status (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`)

---

### GET `/projects/:projectId/governance/audit-events` (auth required)

Get audit events for a project.

**Query parameters:**
- `cursor` (optional): Pagination cursor
- `limit` (optional): Max results (default 50)
- `eventType` (optional): Filter by event type

**Event types:**
- `POLICY_CHANGED`
- `APPROVAL_REQUESTED`
- `APPROVAL_APPROVED`
- `APPROVAL_REJECTED`
- `APPLY_EXECUTED`
- `SHARE_LINK_CREATED`
- `SHARE_LINK_REVOKED`

---

### POST `/projects/:projectId/geo-reports/share-links` (auth required)

Create a share link with optional passcode protection.

**Body:**

```json
{
  "title": "Optional title",
  "audience": "ANYONE_WITH_LINK" | "PASSCODE"
}
```

**Response:**

```json
{
  "shareLink": {
    "id": "string",
    "shareToken": "string",
    "shareUrl": "https://...",
    "audience": "PASSCODE",
    "passcodeLast4": "AB12",
    "expiresAt": "2024-01-14T00:00:00.000Z"
  },
  "passcode": "AB12XY34"  // Only shown once at creation
}
```

---

### POST `/public/geo-reports/:shareToken/verify` (public)

Verify passcode for a protected share link.

**Body:**

```json
{
  "passcode": "AB12XY34"
}
```

**Response:**

```json
{
  "status": "valid",
  "report": { ... },
  "expiresAt": "2024-01-14T00:00:00.000Z"
}
```

Or:

```json
{
  "status": "passcode_invalid",
  "passcodeLast4": "AB12"
}
```

---

## 10. Admin Endpoints (Internal)

All admin endpoints require JWT authentication and internal admin role (SUPPORT_AGENT, OPS_ADMIN, or MANAGEMENT_CEO).

### GET `/admin/governance-audit-events` (admin required)

[ENTERPRISE-GEO-1] Read-only access to governance audit events across all projects.

**Query parameters:**
- `projectId` (optional): Filter by project ID
- `actorUserId` (optional): Filter by actor user ID
- `eventType` (optional): Filter by event type
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)
- `page` (optional): Page number (default 1)
- `limit` (optional): Max results per page (default 50)

**Response:**

```json
{
  "events": [
    {
      "id": "string",
      "createdAt": "2025-12-21T00:00:00.000Z",
      "eventType": "POLICY_CHANGED",
      "actorUserId": "string",
      "actorEmail": "user@example.com",
      "resourceType": "GOVERNANCE_POLICY",
      "resourceId": "string",
      "projectId": "string",
      "projectName": "My Project",
      "metadata": { ... }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

**Event types:**
- `POLICY_CHANGED`
- `APPROVAL_REQUESTED`
- `APPROVAL_APPROVED`
- `APPROVAL_REJECTED`
- `SHARE_LINK_CREATED`
- `SHARE_LINK_REVOKED`
- `APPLY_EXECUTED`

---

END OF API SPEC
