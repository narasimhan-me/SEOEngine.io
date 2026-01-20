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

Returns integration status for all platform types.

Connected definition (server-authoritative):

- connected: true only when the integration has a usable connection credential for that platform (e.g., Shopify requires externalId + accessToken).
- The integrations[] list reflects active (connected) integrations.

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

### GET `/shopify/reconnect`

[SHOPIFY-SCOPE-RECONSENT-UX-1] Explicit, user-initiated Shopify re-consent flow for missing scopes.

Query parameters:

- `projectId` (required)
- `token` (required, JWT)
- `capability` (required): `pages_sync` | `collections_sync`
- `returnTo` (optional): path beginning with `/projects/:projectId/...`

Behavior:

- Computes missing scopes server-side for the requested capability
- Redirects to Shopify OAuth with the minimal union of (granted scopes) + (missing required scopes)
- After OAuth completes, redirects back to `returnTo` (or `/projects/:projectId`) with:
  - `shopify=reconnected`
  - `reconnect=<capability>`

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

### POST `/projects/:projectId/shopify/sync-pages` (auth required)

**[SHOPIFY-ASSET-SYNC-COVERAGE-1]** Sync Shopify Pages into CrawlResult table. OWNER-only.

**Response:**

```json
{
  "projectId": "string",
  "fetched": 5,
  "upserted": 5,
  "skipped": 0,
  "completedAt": "2026-01-11T00:00:00.000Z",
  "warnings": []
}
```

**Errors:**

- `403 Forbidden` – Only project owners can sync Shopify Pages
- `400 Bad Request` – Missing required Shopify scope(s) (code: `SHOPIFY_MISSING_SCOPES`)
- `404 Not Found` – No Shopify store connected

---

### POST `/projects/:projectId/shopify/sync-collections` (auth required)

**[SHOPIFY-ASSET-SYNC-COVERAGE-1]** Sync Shopify Collections into CrawlResult table. OWNER-only.

**Response:**

```json
{
  "projectId": "string",
  "fetched": 3,
  "upserted": 3,
  "skipped": 0,
  "completedAt": "2026-01-11T00:00:00.000Z",
  "warnings": []
}
```

**Errors:**

- `403 Forbidden` – Only project owners can sync Shopify Collections
- `400 Bad Request` – Missing required Shopify scope(s) (code: `SHOPIFY_MISSING_SCOPES`)
- `404 Not Found` – No Shopify store connected

---

### POST `/projects/:projectId/shopify/sync-blogs` (auth required)

**[BLOGS-ASSET-SYNC-COVERAGE-1]** Sync Shopify Blog Posts (Articles) into CrawlResult table. OWNER-only.

Requires `read_content` scope (same as pages_sync).

**Response:**

```json
{
  "projectId": "string",
  "fetched": 10,
  "upserted": 10,
  "skipped": 0,
  "completedAt": "2026-01-17T00:00:00.000Z",
  "warnings": []
}
```

**Errors:**

- `403 Forbidden` – Only project owners can sync Shopify Blog Posts
- `400 Bad Request` – Missing required Shopify scope(s) (code: `SHOPIFY_MISSING_SCOPES`)
- `404 Not Found` – No Shopify store connected

---

### GET `/projects/:projectId/shopify/missing-scopes` (auth required)

[SHOPIFY-SCOPE-RECONSENT-UX-1] Server-authoritative missing scope detection for a capability.

Query parameters:

- `capability` (required): `pages_sync` | `collections_sync` | `blogs_sync`

Response:

```json
{
  "projectId": "string",
  "connected": true,
  "capability": "pages_sync",
  "requiredScopes": ["read_content"],
  "grantedScopes": ["read_products", "write_products"],
  "missingScopes": ["read_content"]
}
```

---

### GET `/projects/:projectId/shopify/reconnect-url` (auth required)

**[SHOPIFY-SCOPE-RECONSENT-UX-1-FIXUP-1]** Returns a Shopify OAuth authorize URL for explicit, user-initiated re-consent.

**Query parameters:**

- `capability` (required): `pages_sync` | `collections_sync` | `blogs_sync`
- `returnTo` (optional): path beginning with `/projects/:projectId/...`

**Access:**

- OWNER-only

**Response:**

```json
{
  "url": "https://{shop}.myshopify.com/admin/oauth/authorize?client_id=...&scope=...&redirect_uri=...&state=..."
}
```

---

### GET `/projects/:projectId/shopify/connect-url` (auth required)

[SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1] Returns a Shopify OAuth authorize URL for explicit, user-initiated initial connection.

Query parameters:

- returnTo (optional): path beginning with /projects/:projectId/...

Access:

- OWNER-only

Response:

```json
{
  "url": "https://{shop}.myshopify.com/admin/oauth/authorize?client_id=...&scope=...&redirect_uri=...&state=..."
}
```

---

### GET `/projects/:projectId/shopify/sync-status` (auth required)

**[SHOPIFY-ASSET-SYNC-COVERAGE-1]** Get sync timestamps for products, pages, and collections. Any project member can read.

**Response:**

```json
{
  "projectId": "string",
  "lastProductsSyncAt": "2026-01-10T00:00:00.000Z",
  "lastPagesSyncAt": "2026-01-11T00:00:00.000Z",
  "lastCollectionsSyncAt": "2026-01-11T00:00:00.000Z"
}
```

All timestamps are nullable (null if never synced).

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

## 7. Automation Playbooks

Bulk AI-powered SEO automation for products, pages, and collections.

### GET `/projects/:id/automation-playbooks/estimate` (auth required)

Estimate token usage and eligibility for a playbook.

**Query parameters:**

- `playbookId` (required): `missing_seo_title` | `missing_seo_description`

**[ASSETS-PAGES-1.1] Canonical Playbook IDs Only:**

- Only two playbook IDs exist: `missing_seo_title`, `missing_seo_description`
- Asset type differentiation (PRODUCTS, PAGES, COLLECTIONS) is done via the `assetType` parameter in POST requests

---

### POST `/projects/:id/automation-playbooks/estimate` (auth required)

Scoped estimate for a playbook with explicit asset targeting.

**Body:**

```json
{
  "playbookId": "missing_seo_title",
  "scopeProductIds": ["product-id-1", "product-id-2"],
  "assetType": "PRODUCTS",
  "scopeAssetRefs": []
}
```

**[ASSETS-PAGES-1.1] Asset-scoped parameters:**

- `assetType` (optional): `PRODUCTS` | `PAGES` | `COLLECTIONS` (default: `PRODUCTS`)
- `scopeAssetRefs` (optional): Handle-based refs for non-product assets

**Asset reference format:**

- Pages: `page_handle:<handle>` (e.g., `page_handle:about-us`)
- Collections: `collection_handle:<handle>` (e.g., `collection_handle:summer-sale`)

**Validation rules:**

- `scopeProductIds` can only be used with `assetType: PRODUCTS`
- `scopeAssetRefs` can only be used with `assetType: PAGES` or `COLLECTIONS`
- Ref format must match asset type (page_handle:_ for PAGES, collection_handle:_ for COLLECTIONS)

---

### POST `/projects/:id/automation-playbooks/:playbookId/preview` (auth required)

Generate preview drafts for sample assets.

**Body:**

```json
{
  "rules": { "enabled": true, "maxLength": 60 },
  "sampleSize": 3,
  "scopeProductIds": ["product-id"],
  "assetType": "PRODUCTS",
  "scopeAssetRefs": []
}
```

**[ASSETS-PAGES-1.1] Supports same asset-scoped parameters as estimate.**

**Response:**

```json
{
  "projectId": "string",
  "playbookId": "missing_seo_title",
  "scopeId": "abc123",
  "rulesHash": "def456",
  "draftId": "draft-id",
  "status": "PARTIAL",
  "counts": {
    "affectedTotal": 10,
    "draftGenerated": 3,
    "noSuggestionCount": 0
  },
  "samples": [
    {
      "productId": "product-id",
      "field": "seoTitle",
      "productTitle": "Product Name",
      "currentTitle": "",
      "currentDescription": "",
      "rawSuggestion": "AI generated title",
      "finalSuggestion": "AI generated title",
      "ruleWarnings": []
    }
  ],
  "aiCalled": true
}
```

---

### POST `/projects/:id/automation-playbooks/:playbookId/draft/generate` (auth required)

Generate full drafts for all affected assets.

**Body:**

```json
{
  "scopeId": "abc123",
  "rulesHash": "def456",
  "scopeProductIds": ["product-id"],
  "assetType": "PRODUCTS",
  "scopeAssetRefs": []
}
```

**[ASSETS-PAGES-1.1] Supports same asset-scoped parameters as estimate.**

---

### GET `/projects/:id/automation-playbooks/:playbookId/draft/latest` (auth required)

Get the most recent draft for a playbook.

---

### POST `/projects/:id/automation-playbooks/apply` (auth required)

Apply playbook drafts to Shopify.

**CRITICAL INVARIANT:** Apply never uses AI. All suggestions come from pre-generated drafts.

**Body:**

```json
{
  "playbookId": "missing_seo_title",
  "scopeId": "abc123",
  "rulesHash": "def456",
  "scopeProductIds": ["product-id"],
  "approvalId": "optional-approval-id",
  "assetType": "PRODUCTS",
  "scopeAssetRefs": []
}
```

**[ASSETS-PAGES-1.1] Supports same asset-scoped parameters as estimate.**

**Access control [ROLES-3]:**

- OWNER: Can apply directly
- EDITOR: Must request approval first (returns `APPROVAL_REQUIRED` error)
- VIEWER: Cannot apply (returns `403 Forbidden`)

---

## 11. Work Queue (WORK-QUEUE-1)

Unified action bundle work queue that derives bundles from existing persisted artifacts.

### GET `/projects/:projectId/work-queue` (auth required)

Get prioritized action bundles for a project.

**Query parameters:**

- `tab` (optional): Filter by tab - `Critical` | `NeedsAttention` | `PendingApproval` | `DraftsReady` | `AppliedRecently`
- `bundleType` (optional): Filter by bundle type - `ASSET_OPTIMIZATION` | `AUTOMATION_RUN` | `GEO_EXPORT`
- `actionKey` (optional): Filter by recommended action - `FIX_MISSING_METADATA` | `RESOLVE_TECHNICAL_ISSUES` | `IMPROVE_SEARCH_INTENT` | `OPTIMIZE_CONTENT` | `SHARE_LINK_GOVERNANCE`
- `scopeType` (optional): Filter by scope type - `PRODUCTS` | `PAGES` | `COLLECTIONS` | `STORE_WIDE` [ASSETS-PAGES-1]
- `bundleId` (optional): Filter to specific bundle ID

**Response:**

```json
{
  "viewer": {
    "role": "OWNER",
    "capabilities": {
      "canGenerateDrafts": true,
      "canApply": true,
      "canApprove": true,
      "canRequestApproval": true
    },
    "isMultiUserProject": false
  },
  "items": [
    {
      "bundleId": "ASSET_OPTIMIZATION:FIX_MISSING_METADATA:PRODUCTS:project-id",
      "bundleType": "ASSET_OPTIMIZATION",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "scopeType": "PRODUCTS",
      "scopeCount": 5,
      "scopePreviewList": ["Product A", "Product B", "+3 more"],
      "health": "CRITICAL",
      "impactRank": 100,
      "recommendedActionKey": "FIX_MISSING_METADATA",
      "recommendedActionLabel": "Fix missing metadata",
      "aiUsage": "NONE",
      "aiDisclosureText": "No AI is used for this action.",
      "state": "NEW"
    }
  ]
}
```

**Notes:**

- All bundles are derived at request time from existing persisted artifacts
- No new storage tables are created
- Sorting is deterministic: state priority → health priority → impact rank → updatedAt → bundleId
- `scopeType` filter added in ASSETS-PAGES-1 for filtering by asset type (products, pages, collections)

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
  "passcode": "AB12XY34" // Only shown once at creation
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

## 13. Governance Viewer (GOV-AUDIT-VIEWER-1)

Read-only governance viewer endpoints for viewing approval requests, audit events, and share links. These endpoints are accessible to any project member (VIEWER, EDITOR, OWNER) and never perform mutations.

### Key Invariants

1. **Read-Only**: All endpoints are GET; no mutations
2. **Allowlist-Filtered Audit Events**: Only these event types are returned:
   - `APPROVAL_REQUESTED`
   - `APPROVAL_APPROVED`
   - `APPROVAL_REJECTED`
   - `SHARE_LINK_CREATED`
   - `SHARE_LINK_REVOKED`
   - `SHARE_LINK_EXPIRED`
3. **Passcode Security**: Passcode hash is NEVER returned; only `passcodeLast4` for display
4. **Cursor-Based Pagination**: Stable ordering (timestamp DESC, id DESC)
5. **Server-Side Filtering**: Allowlist enforced on server, not client

---

### GET `/projects/:projectId/governance/viewer/approvals` (auth required)

List approval requests for governance viewer with cursor-based pagination.

**Query parameters:**

- `status` (optional): `'pending'` (PENDING_APPROVAL) or `'history'` (APPROVED/REJECTED)
- `cursor` (optional): Pagination cursor (format: `{timestamp}:{id}`)
- `limit` (optional): Max results per page (default 50)

**Response:**

```json
{
  "items": [
    {
      "id": "string",
      "projectId": "string",
      "resourceType": "AUTOMATION_PLAYBOOK_APPLY" | "GEO_FIX_APPLY" | "ANSWER_BLOCK_SYNC" | "GEO_REPORT_SHARE_LINK",
      "resourceId": "string",
      "status": "PENDING_APPROVAL" | "APPROVED" | "REJECTED",
      "requestedByUserId": "string",
      "requestedByName": "User Name",
      "requestedAt": "2024-01-01T00:00:00.000Z",
      "decidedByUserId": "string (optional)",
      "decidedByName": "User Name (optional)",
      "decidedAt": "2024-01-01T00:00:00.000Z (optional)",
      "decisionReason": "string (optional)",
      "consumed": false,
      "consumedAt": "2024-01-01T00:00:00.000Z (optional)",
      "bundleId": "string (optional, for traceability)",
      "playbookId": "string (optional)",
      "assetType": "PRODUCTS" | "PAGES" | "COLLECTIONS" (optional)
    }
  ],
  "nextCursor": "string (optional)",
  "hasMore": true
}
```

**Role access:** Any project member (VIEWER, EDITOR, OWNER) can read.

---

### GET `/projects/:projectId/governance/viewer/audit-events` (auth required)

List audit events for governance viewer with cursor-based pagination. **IMPORTANT: Only returns events in ALLOWED_AUDIT_EVENT_TYPES allowlist.** Any request for other event types is silently filtered.

**Query parameters:**

- `types` (optional): Comma-separated list of event types (e.g., `APPROVAL_REQUESTED,SHARE_LINK_CREATED`)
- `actor` (optional): Filter by actorUserId
- `from` (optional): ISO timestamp for date range start
- `to` (optional): ISO timestamp for date range end
- `cursor` (optional): Pagination cursor (format: `{timestamp}:{id}`)
- `limit` (optional): Max results per page (default 50)

**Response:**

```json
{
  "items": [
    {
      "id": "string",
      "projectId": "string",
      "actorUserId": "string",
      "actorName": "User Name",
      "eventType": "APPROVAL_REQUESTED" | "APPROVAL_APPROVED" | "APPROVAL_REJECTED" | "SHARE_LINK_CREATED" | "SHARE_LINK_REVOKED" | "SHARE_LINK_EXPIRED",
      "resourceType": "string (optional)",
      "resourceId": "string (optional)",
      "metadata": { ... },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "string (optional)",
  "hasMore": true
}
```

**Allowlist enforcement:** The following event types are NEVER returned even if they exist in storage:

- `POLICY_CHANGED`
- `APPLY_EXECUTED`
- Any other event types not in the allowlist

**Role access:** Any project member (VIEWER, EDITOR, OWNER) can read.

---

### GET `/projects/:projectId/governance/viewer/share-links` (auth required)

List share links for governance viewer with cursor-based pagination. **IMPORTANT: Passcode is NEVER returned; only `passcodeLast4` is included for display.**

**Query parameters:**

- `status` (optional): `'ACTIVE'`, `'EXPIRED'`, `'REVOKED'`, or `'all'` (default: `'all'`)
- `cursor` (optional): Pagination cursor (format: `{timestamp}:{id}`)
- `limit` (optional): Max results per page (default 50)

**Response:**

```json
{
  "items": [
    {
      "id": "string",
      "projectId": "string",
      "reportType": "GEO_INSIGHTS",
      "title": "string (optional)",
      "audience": "ANYONE_WITH_LINK" | "PASSCODE" | "ORG_ONLY",
      "passcodeLast4": "AB12 (optional, only for PASSCODE audience)",
      "status": "ACTIVE" | "EXPIRED" | "REVOKED",
      "expiresAt": "2024-01-14T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "createdByUserId": "string",
      "createdByName": "User Name",
      "revokedAt": "2024-01-01T00:00:00.000Z (optional)",
      "revokedByUserId": "string (optional)",
      "revokedByName": "User Name (optional)",
      "viewCount": 5,
      "lastViewedAt": "2024-01-01T00:00:00.000Z (optional)",
      "statusHistory": [
        {
          "status": "ACTIVE" | "EXPIRED" | "REVOKED",
          "changedAt": "2024-01-01T00:00:00.000Z",
          "changedByUserId": "string (optional)",
          "changedByName": "User Name (optional)"
        }
      ]
    }
  ],
  "nextCursor": "string (optional)",
  "hasMore": true
}
```

**Status derivation:** Status is derived deterministically:

- `REVOKED`: If `revokedAt` is set (or status enum is REVOKED)
- `EXPIRED`: If `expiresAt` is in the past
- `ACTIVE`: Otherwise

**Data minimization:** The following fields are NEVER returned:

- `passcode` (plaintext)
- `passcodeHash` (bcrypt hash)
- `shareToken` (only returned at creation, not in list views)

**Role access:** Any project member (VIEWER, EDITOR, OWNER) can read.

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
