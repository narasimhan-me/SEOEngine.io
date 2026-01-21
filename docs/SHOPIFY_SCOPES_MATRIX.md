# EngineO.ai – Shopify Scopes Matrix

> Internal documentation for SHOPIFY-SCOPES-MATRIX-1

## Overview

This document defines the authoritative mapping between EngineO.ai capabilities and Shopify OAuth scopes. The scope matrix is the **single source of truth** for:

1. Which Shopify scopes are required for each EngineO.ai feature
2. How scopes are computed during OAuth install/reconnect flows
3. How missing scopes are detected and reported

## Scope Matrix

| Capability         | Required Scopes  | Description                              |
| ------------------ | ---------------- | ---------------------------------------- |
| `products_sync`    | `read_products`  | Sync products from Shopify to EngineO.ai |
| `products_apply`   | `write_products` | Apply SEO changes to Shopify products    |
| `collections_sync` | `read_products`  | Sync collections from Shopify            |
| `pages_sync`       | `read_content`   | Sync pages from Shopify                  |
| `blogs_sync`       | `read_content`   | Sync blog posts from Shopify             |
| `themes_read`      | `read_themes`    | Read theme information                   |

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

### Scope Parsing (SHOPIFY-SCOPE-PARSE-ROBUSTNESS-1)

The `parseShopifyScopesCsv()` function handles multiple input formats for backward compatibility with legacy DB storage:

| Format                       | Example                                            | Notes                           |
| ---------------------------- | -------------------------------------------------- | ------------------------------- |
| Comma-separated string       | `"read_products,write_products"`                   | Standard format                 |
| Whitespace-separated string  | `"read_products write_products"`                   | Legacy/alternative format       |
| Mixed delimiters             | `"read_products, write_products read_content"`     | Any combination                 |
| JSON array                   | `["read_products", "write_products"]`              | Legacy Prisma Json field format |
| Array with nested delimiters | `["read_products,write_products", "read_content"]` | Elements may contain delimiters |

**Trust Invariant**: Legacy scope storage formats (JSON array, whitespace-delimited) must not cause false missing-scope blocks. The parser silently handles all formats and returns `[]` for non-parseable inputs (null, undefined, numbers, plain objects).

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

## Scope Implications (SHOPIFY-SCOPE-IMPLICATIONS-1)

Shopify write scopes implicitly grant read access. The scope coverage system accounts for this to prevent false "missing read_X" warnings when `write_X` is already granted.

### Implication Rules

| Write Scope      | Implies         |
| ---------------- | --------------- |
| `write_products` | `read_products` |
| `write_content`  | `read_content`  |
| `write_themes`   | `read_themes`   |

### How It Works

The `expandGrantedScopesWithImplications()` function expands granted scopes with their implied read scopes:

```typescript
import { expandGrantedScopesWithImplications } from './shopify-scopes';

const granted = ['write_products'];
const expanded = expandGrantedScopesWithImplications(granted);
// Set { 'write_products', 'read_products' }
```

This is used by `checkScopeCoverage()` and `getScopeStatusFromIntegration()` to compute effective scope coverage.

### Trust Invariant

**No false "missing read_X" warnings when `write_X` is granted.**

If a user has `write_products`, they should never see "Missing read_products" warnings because write access implicitly includes read access.

### Important Notes

1. **Implications are for COVERAGE CHECKS ONLY** — The actual OAuth scopes requested/stored are unchanged
2. **Write → Read only** — Read scopes do NOT imply write access (no reverse implication)
3. **Future-proof** — `write_content` and `write_themes` implications are defined for when those capabilities are added

## Missing Scope Detection

The `checkScopeCoverage()` function detects when granted scopes don't cover required capabilities.

**[SHOPIFY-SCOPE-IMPLICATIONS-1]** Coverage checks use implication-aware expansion: `write_products` satisfies `read_products` requirements.

```typescript
import { checkScopeCoverage } from './shopify-scopes';

// Example: write_products covers collections_sync (requires read_products)
const granted = ['write_products'];
const capabilities = ['collections_sync'];

const result = checkScopeCoverage(granted, capabilities);
// { covered: true, missingScopes: [] }

// Example: Missing read_content for pages_sync
const granted2 = ['read_products', 'write_products'];
const capabilities2 = ['pages_sync']; // requires read_content

const result2 = checkScopeCoverage(granted2, capabilities2);
// { covered: false, missingScopes: ['read_content'] }
```

This is used by:

- `GET /projects/:id/shopify/missing-scopes?capability=...`
- Pages/Collections sync error handling
- Permission notice UI

## Related Files

| File                                                       | Purpose                                 |
| ---------------------------------------------------------- | --------------------------------------- |
| `apps/api/src/shopify/shopify-scopes.ts`                   | Authoritative scope matrix + helpers    |
| `apps/api/src/shopify/shopify.service.ts`                  | OAuth URL generation + scope validation |
| `apps/api/src/shopify/shopify.controller.ts`               | OAuth callback logging                  |
| `apps/api/test/unit/shopify/shopify-scopes-matrix.test.ts` | Unit tests for scope matrix             |

## Changelog

| Version | Date       | Changes                                                                         |
| ------- | ---------- | ------------------------------------------------------------------------------- |
| 1.0     | 2026-01-17 | Initial version with SHOPIFY-SCOPES-MATRIX-1                                    |
| 1.1     | 2026-01-20 | Added SHOPIFY-SCOPE-IMPLICATIONS-1: Scope implication rules for coverage checks |

## Locked Contract

**Do not modify the scope matrix without explicit phase approval.** Changes to scope requirements affect:

1. OAuth install/reconnect flows
2. Missing scope detection
3. Permission notice messaging
4. Environment configuration requirements
