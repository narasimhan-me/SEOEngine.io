# EngineO.ai – Shopify Scopes Matrix

> Internal documentation for SHOPIFY-SCOPES-MATRIX-1

## Overview

This document defines the authoritative mapping between EngineO.ai capabilities and Shopify OAuth scopes. The scope matrix is the **single source of truth** for:

1. Which Shopify scopes are required for each EngineO.ai feature
2. How scopes are computed during OAuth install/reconnect flows
3. How missing scopes are detected and reported

## Scope Matrix

| Capability | Required Scopes | Description |
|------------|-----------------|-------------|
| `products_sync` | `read_products` | Sync products from Shopify to EngineO.ai |
| `products_apply` | `write_products` | Apply SEO changes to Shopify products |
| `collections_sync` | `read_products` | Sync collections from Shopify |
| `pages_sync` | `read_content` | Sync pages from Shopify |
| `blogs_sync` | `read_content` | Sync blog posts from Shopify |
| `themes_read` | `read_themes` | Read theme information |

## Scope Computation

Scopes are computed server-side in `shopify.service.ts` using:

```typescript
import { computeShopifyRequiredScopes } from './shopify-scopes';

const enabledCapabilities = ['products_sync', 'products_apply', 'pages_sync'];
const requiredScopes = computeShopifyRequiredScopes(enabledCapabilities);
// Result: ['read_content', 'read_products', 'write_products']
```

Key behaviors:
- **Sorted**: Scopes are alphabetically sorted for deterministic comparison
- **Deduplicated**: Shared scopes (e.g., `read_content` for pages and blogs) are only included once
- **Minimal**: Only scopes actually required by enabled capabilities are computed

## Environment Configuration

### SHOPIFY_SCOPES (Allowlist)

The `SHOPIFY_SCOPES` environment variable defines the allowlist of scopes that may be requested during OAuth. It must be a superset of server-computed `requestedScopes` (install: minimal required scopes; reconnect: granted ∪ missing required scopes).

```bash
SHOPIFY_SCOPES=read_products,write_products,read_themes,read_content
```

**Validation behavior:**
- Non-production: Throws `BadRequestException` if allowlist is missing requested scopes
- Production: Logs error and returns a safe `SHOPIFY_SCOPES_CONFIG_INVALID` error response (no OAuth redirect)

## OAuth Flow Integration

### Install Flow

1. Server computes `enabledCapabilities` for the project (default: `products_sync`, `products_apply`, `collections_sync`, `pages_sync`)
2. Server computes `requiredScopes` from enabled capabilities
3. Server validates `SHOPIFY_SCOPES` is a superset of `requestedScopes`
4. Server stores `enabledCapabilities`, `requiredScopes`, `requestedScopes` in OAuth state
5. OAuth redirect uses `requestedScopes` (computed minimal required scopes)
6. Callback logs scope metadata for debugging

### Reconnect Flow

Reconnect requests `grantedScopes ∪ missingRequiredScopes` for the triggering capability (user-initiated) and still validates the env allowlist is a superset of requested scopes.

## Missing Scope Detection

The `checkScopeCoverage()` function detects when granted scopes don't cover required capabilities:

```typescript
import { checkScopeCoverage } from './shopify-scopes';

const granted = ['read_products', 'write_products'];
const capabilities = ['pages_sync']; // requires read_content

const result = checkScopeCoverage(granted, capabilities);
// { covered: false, missingScopes: ['read_content'] }
```

This is used by:
- `GET /projects/:id/shopify/missing-scopes?capability=...`
- Pages/Collections sync error handling
- Permission notice UI

## Related Files

| File | Purpose |
|------|---------|
| `apps/api/src/shopify/shopify-scopes.ts` | Authoritative scope matrix + helpers |
| `apps/api/src/shopify/shopify.service.ts` | OAuth URL generation + scope validation |
| `apps/api/src/shopify/shopify.controller.ts` | OAuth callback logging |
| `apps/api/test/unit/shopify/shopify-scopes-matrix.test.ts` | Unit tests for scope matrix |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-17 | Initial version with SHOPIFY-SCOPES-MATRIX-1 |

## Locked Contract

**Do not modify the scope matrix without explicit phase approval.** Changes to scope requirements affect:

1. OAuth install/reconnect flows
2. Missing scope detection
3. Permission notice messaging
4. Environment configuration requirements
