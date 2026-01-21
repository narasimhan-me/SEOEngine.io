# Shopify Integration Guide

> **Canonical documentation for Shopify app integration, Partner configuration, embedded app setup, and environment variables.**

---

## Overview

EngineO.ai integrates with Shopify as both a standalone web app and an embedded app within Shopify Admin. This document covers:

1. Shopify Partner App Configuration
2. OAuth Flow
3. Embedded App Setup (App Bridge v4)
4. Required Environment Variables
5. Troubleshooting

For permissions, re-consent UX, and safety contracts, see `docs/SHOPIFY_PERMISSIONS_AND_RECONSENT.md`.

---

## Shopify Partner App Configuration

Configure these settings in your Shopify Partner Dashboard → Apps → [Your App] → Configuration.

### App URLs

| Setting | Value | Notes |
|---------|-------|-------|
| **App URL** | `https://app.engineo.ai` | Frontend app URL (Next.js). Supports embedded context. |
| **Allowed redirection URL(s)** | `https://api.engineo.ai/shopify/callback` | Backend OAuth callback (NestJS API). Different subdomain! |
| **Embedded app home URL** | `https://app.engineo.ai/projects` | Entry point when opened from Shopify Admin. Shopify appends `host`, `embedded=1`, `shop`, etc. |

**Important:** The App URL (`app.engineo.ai`) and OAuth callback URL (`api.engineo.ai/shopify/callback`) intentionally use different subdomains:
- **App URL** → Next.js frontend (`apps/web`)
- **OAuth callback** → NestJS API (`apps/api`)

### GDPR Webhooks (Required for App Store)

| Endpoint | URL |
|----------|-----|
| Customer data request | `https://api.engineo.ai/shopify/webhooks/customers/data_request` |
| Customer data erasure | `https://api.engineo.ai/shopify/webhooks/customers/redact` |
| Shop data erasure | `https://api.engineo.ai/shopify/webhooks/shop/redact` |

### Required Scopes

See `docs/SHOPIFY_SCOPES_MATRIX.md` for the full scope matrix. Key scopes:

- `read_products` – Product catalog access (implied by `write_products`)
- `read_content` – Pages and blog posts access (implied by `write_content`)
- `write_products` – SEO metadata push to products
- `write_content` – SEO metadata push to pages

---

## OAuth Flow

### Standard OAuth (Standalone Installation)

1. User visits `/connect-shopify` or clicks "Connect Shopify" CTA
2. Backend redirects to Shopify OAuth authorization URL
3. Merchant approves scopes on Shopify
4. Shopify redirects to `https://api.engineo.ai/shopify/callback` with authorization code
5. Backend exchanges code for access token
6. Backend stores integration with normalized scopes
7. User redirected to project settings

### Embedded OAuth

When the app is opened from Shopify Admin, OAuth may be triggered if:
- User is not authenticated in EngineO.ai
- Store is not connected to current project

The embedded OAuth flow uses App Bridge for top-level navigation:

1. `ShopifyEmbeddedShell` detects unauthenticated state
2. User clicks "Reconnect Shopify" button
3. App performs top-level redirect to `/login?next=...` (embedded return URL preserved)
4. After login, user is redirected back to embedded context with `host` and `embedded=1` params

---

## Embedded App Setup (SHOPIFY-EMBEDDED-SHELL-1)

EngineO.ai uses Shopify App Bridge v4 for embedded app functionality.

### Required Environment Variable (Frontend)

```bash
# apps/web/.env.local
NEXT_PUBLIC_SHOPIFY_API_KEY=your_shopify_client_id_here
```

This must match the Shopify app's **Client ID** from the Partner Dashboard.

### App Bridge v4 Components

App Bridge v4 uses a CDN-hosted script approach (not an npm provider).

1. **Meta tag** (in `<head>` of `layout.tsx`):
   ```html
   <meta name="shopify-api-key" content="YOUR_SHOPIFY_API_KEY" />
   ```

2. **App Bridge script** (in `<head>` of `layout.tsx`):
   ```html
   <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
   ```

3. **ShopifyEmbeddedShell wrapper** (`apps/web/src/components/shopify/ShopifyEmbeddedShell.tsx`):
   - Detects embedded context (`embedded=1`, `host` param, or stored host in sessionStorage)
   - Persists `host`/`shop` to sessionStorage for navigation continuity
   - Auto-repairs URLs when host is missing but stored
   - Shows never-blank fallbacks for all error states

### Embedded Context Query Parameters

When opened from Shopify Admin, these params are appended to the App URL:

| Param | Description |
|-------|-------------|
| `host` | Base64-encoded Shopify Admin host (required for App Bridge) |
| `shop` | Shop domain (e.g., `mystore.myshopify.com`) |
| `embedded` | Set to `1` when in embedded context |
| `hmac` | HMAC signature for request validation |
| `timestamp` | Request timestamp |
| `locale` | Merchant's locale |

### Frame Embedding Headers

The Next.js middleware (`apps/web/src/middleware.ts`) adds a CSP `frame-ancestors` header when embedded context is detected:

```
Content-Security-Policy: frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com;
```

This allows the app to be iframed by Shopify Admin while blocking other origins.

---

## Required Environment Variables

### Backend (apps/api)

```bash
# Shopify App Credentials
SHOPIFY_API_KEY=your_client_id_here
SHOPIFY_API_SECRET=your_client_secret_here

# OAuth Configuration
SHOPIFY_REDIRECT_URI=https://api.engineo.ai/shopify/callback
SHOPIFY_SCOPES=read_products,write_products,read_content,write_content
```

### Frontend (apps/web)

```bash
# Required for App Bridge embedded context
NEXT_PUBLIC_SHOPIFY_API_KEY=your_client_id_here
```

**Note:** `NEXT_PUBLIC_SHOPIFY_API_KEY` must match the backend `SHOPIFY_API_KEY`. Both are the Shopify app's Client ID from the Partner Dashboard.

---

## Troubleshooting

### "Missing Shopify context" Error

**Cause:** Embedded context detected but no `host` available.

**Solutions:**
1. Reopen the app from Shopify Admin
2. Check that `NEXT_PUBLIC_SHOPIFY_API_KEY` is set correctly
3. Clear browser sessionStorage and retry

### "Unable to load inside Shopify" Error

**Cause:** App Bridge failed to initialize (e.g., missing API key).

**Solutions:**
1. Verify `NEXT_PUBLIC_SHOPIFY_API_KEY` matches Partner Dashboard Client ID
2. Check that App Bridge CDN script loads (Network tab)
3. Use standalone mode as fallback

### OAuth Callback Errors

**Cause:** OAuth flow failed during token exchange.

**Solutions:**
1. Verify `SHOPIFY_API_SECRET` is correct
2. Check that callback URL matches Partner Dashboard configuration exactly
3. Review API server logs for specific error

---

## Related Documentation

- `docs/SHOPIFY_PERMISSIONS_AND_RECONSENT.md` – Re-consent UX and safety contracts
- `docs/SHOPIFY_SCOPES_MATRIX.md` – Scope matrix and capability mapping
- `docs/manual-testing/SHOPIFY-EMBEDDED-SHELL-1.md` – Manual testing for embedded launch
- `docs/testing/CRITICAL_PATH_MAP.md` – CP-006 Shopify Sync critical path
