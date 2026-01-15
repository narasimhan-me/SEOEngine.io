# Shopify Permissions & Re-Consent (Internal)

## Why re-consent exists

Shopify does not automatically upgrade an app installation's OAuth scopes. If EngineO.ai ships a new read-only capability (for example, Pages sync requiring `read_content`), merchants who installed earlier must explicitly re-authorize.

## EngineO.ai safety contracts

- **No silent re-authorization:** users must click an explicit "Reconnect Shopify" CTA.
- **Minimal scope requests:** re-consent requests the minimal union of:
  - scopes already granted for this installation, plus
  - missing required scopes for the specific capability (e.g., `pages_sync`)
- **No open redirects:** `returnTo` is accepted only when it is a same-project path beginning with `/projects/:projectId/...`.
- **Read-only features request read scopes only;** EngineO.ai does not modify Shopify content without explicit approval and an apply action.

## UX intent

When a capability is blocked due to missing scopes:

- UI shows a structured permission notice:
  - why the permission is needed
  - what it enables (Pages/Collections sync + detection)
  - "Reconnect Shopify" CTA
- After OAuth, the user returns to the originating screen and the blocked sync is retried automatically.
