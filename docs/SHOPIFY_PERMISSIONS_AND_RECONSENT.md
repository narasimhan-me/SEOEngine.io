# Shopify Permissions & Re-Consent (Internal)

> **Safety contracts and UX policies for Shopify OAuth permissions and re-consent flows.**
>
> For canonical Shopify integration setup (Partner configuration, embedded app, environment variables), see `SHOPIFY_INTEGRATION.md` (root).

---

## Overview

This document defines EngineO.ai's safety contracts and UX policies for:

1. Why re-consent exists
2. Safety contracts for OAuth
3. UX intent for permission notices
4. Security considerations

---

## Why Re-Consent Exists

Shopify does not automatically upgrade an app installation's OAuth scopes. If EngineO.ai ships a new read-only capability (for example, Pages sync requiring `read_content`), merchants who installed earlier must explicitly re-authorize.

---

## EngineO.ai Safety Contracts

### No Silent Re-Authorization

Users must click an explicit "Reconnect Shopify" CTA. EngineO.ai never silently redirects users to Shopify OAuth.

### Minimal Scope Requests

Re-consent requests the minimal union of:
- Scopes already granted for this installation, plus
- Missing required scopes for the specific capability (e.g., `pages_sync`)

### No Open Redirects

`returnTo` is accepted only when it is a same-project path beginning with `/projects/:projectId/...`. The `next` param (for embedded auth) is validated to be a relative path starting with `/`.

### Read-Only Features Request Read Scopes Only

EngineO.ai does not modify Shopify content without explicit approval and an apply action. Read-only features (sync, detection) only request read scopes.

### Scope Downgrade Prevention

Reconnects cannot reduce stored scopes. If the Access Scopes API returns fewer scopes than stored, the existing stored scopes are retained (SHOPIFY-SCOPE-TRUTH-1).

---

## UX Intent

### When a Capability is Blocked Due to Missing Scopes

UI shows a structured permission notice:

1. **Why** the permission is needed
2. **What** it enables (e.g., Pages/Collections sync + detection)
3. **"Reconnect Shopify"** CTA

After OAuth, the user returns to the originating screen and the blocked sync is retried automatically.

### Permission Notice Copy

The permission notice uses capability-aware wording:

| Missing Scope(s) | Copy |
|------------------|------|
| `read_products` only | "Product catalog access" |
| `read_content` only | "Pages and blog posts access" |
| Both | "Product catalog and content access" |

---

## Security Considerations

### OAuth Security

- **No open redirects:** `returnTo` and `next` params are validated to be relative paths starting with `/`
- **HMAC validation:** Shopify requests are validated using HMAC signature
- **Scope downgrade prevention:** Reconnects cannot reduce stored scopes

### Sensitive Data

- Never log access tokens or API secrets
- OAuth scope verification uses Access Scopes API for authoritative truth
- Suspicious OAuth responses (missing expected scopes) are logged but not persisted if they would downgrade existing scopes

---

## Related Documentation

- `SHOPIFY_INTEGRATION.md` (root) – Canonical integration guide (Partner config, embedded setup, env vars)
- `docs/SHOPIFY_SCOPES_MATRIX.md` – Scope matrix and capability mapping
- `docs/manual-testing/SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md` – Manual testing for scope truth
