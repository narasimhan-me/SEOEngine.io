# Customer Self-Service Control Plane (SELF-SERVICE-1)

This document describes the Customer Self-Service Control Plane feature, which provides customers with complete self-service management of their accounts, profiles, preferences, and billing.

## Overview

The Self-Service Control Plane enables customers to:

- Manage their profile and preferences
- View and manage their organization and connected stores
- View their subscription plan and billing (via Stripe portal)
- Monitor AI usage and quotas
- Manage active sessions and security settings
- Access help and support

## Architecture

### Database Models

#### CustomerAccountRole Enum

```
OWNER   - Full access to all account settings including billing
EDITOR  - Can edit profile, organization, preferences (no billing)
VIEWER  - Read-only access to all settings
```

#### UserPreferences (1:1 with User)

```
- notifyQuotaWarnings: boolean (default: true)
- notifyRunFailures: boolean (default: true)
- notifyWeeklyDeoSummary: boolean (default: true)
- autoOpenIssuesTab: boolean (default: false)
- preferredPillarLanding: string? (nullable)
- additionalPrefs: Json? (extensible)
```

#### UserSession

```
- id: string (cuid)
- userId: string
- deviceInfo: string? (browser, OS, etc.)
- ipAddress: string?
- sessionType: SessionType (WEB_LOGIN, API_TOKEN, IMPERSONATION)
- lastSeenAt: DateTime
- createdAt: DateTime
```

#### User Extensions

```
- accountRole: CustomerAccountRole (default: OWNER)
- tokenInvalidBefore: DateTime? (for sign-out-all)
- avatarUrl: string?
- timezone: string?
- locale: string?
```

### API Endpoints

All endpoints are under `/account/*` and require JWT authentication.

| Endpoint                                | Method | Description           | Access        |
| --------------------------------------- | ------ | --------------------- | ------------- |
| `/account/profile`                      | GET    | Get user profile      | All           |
| `/account/profile`                      | PATCH  | Update profile        | OWNER, EDITOR |
| `/account/preferences`                  | GET    | Get preferences       | All           |
| `/account/preferences`                  | PATCH  | Update preferences    | OWNER, EDITOR |
| `/account/ai-usage`                     | GET    | Get AI usage summary  | All           |
| `/account/stores`                       | GET    | List connected stores | All           |
| `/account/stores/:projectId/disconnect` | POST   | Disconnect a store    | OWNER only    |
| `/account/sessions`                     | GET    | List active sessions  | All           |
| `/account/sign-out-all`                 | POST   | Sign out all sessions | All           |

### Frontend Pages

| Path                     | Description             | Role Restrictions                    |
| ------------------------ | ----------------------- | ------------------------------------ |
| `/settings`              | Settings hub            | None                                 |
| `/settings/profile`      | Profile management      | VIEWER: read-only                    |
| `/settings/organization` | Organization & stores   | VIEWER: read-only, OWNER: disconnect |
| `/settings/billing`      | Plan & billing          | VIEWER/EDITOR: read-only             |
| `/settings/ai-usage`     | AI usage visibility     | None                                 |
| `/settings/preferences`  | Notification toggles    | VIEWER: read-only                    |
| `/settings/security`     | Sessions & sign-out-all | None                                 |
| `/settings/help`         | Help & support          | None                                 |

## Role-Based Access Control

### OWNER (Default)

- Full access to all settings
- Can manage billing (via Stripe portal)
- Can disconnect stores
- Can update organization name
- Can modify preferences

### EDITOR

- Can view all settings
- Can update profile (name, avatar, timezone, locale)
- Can update organization name
- Can update preferences
- Cannot manage billing
- Cannot disconnect stores

### VIEWER

- Read-only access to all settings
- Cannot modify any settings
- UI displays "read-only access" notices

## Session Management

### Session Tracking

- Sessions are created on login
- `lastSeenAt` is updated with 5-minute throttling to reduce DB writes
- Sessions store device info and IP address for visibility

### Sign Out All Sessions

- Sets `tokenInvalidBefore` to current timestamp
- All tokens issued before this timestamp are rejected
- Current session remains valid (user stays logged in)
- Impersonation tokens are not affected (admin-initiated)

## AI Usage Visibility

The AI Usage page displays:

- **Period Label**: Current billing period (e.g., "December 2024")
- **Total Runs**: Number of AI runs this period
- **Quota Limit**: Plan-based AI quota (null = unlimited)
- **Quota Used Percent**: Percentage of quota consumed
- **Reuse Count**: Number of reused outputs (non-AI)
- **Reuse Percent**: Reuse effectiveness rate

### APPLY Invariant

The UI prominently displays: "APPLY never uses AI. Applying fixes consumes zero tokens."

This reinforces that only GENERATE/PREVIEW operations consume AI tokens; APPLY operations are deterministic.

## Billing Integration

### Stripe Portal

- Card details are never stored in EngineO
- All billing changes go through Stripe Portal
- UI displays: "Billing is handled securely via Stripe portal — we never store your card details."

### Owner-Only Restrictions

- Only OWNER can create checkout sessions
- Only OWNER can access billing portal
- Backend enforces these restrictions at API level
- Frontend displays "Owner Only" on disabled buttons

## Testing

### Integration Tests

Located at: `apps/api/test/integration/self-service-1.test.ts`

Tests cover:

- CP-001: Sessions and sign-out-all
- CP-002: Owner-only billing restrictions
- Preferences persistence
- Store disconnect (owner-only)
- AI usage data (no AI side effects)

### Playwright E2E Tests

Located at: `apps/web/tests/self-service-1.spec.ts`

Tests cover:

- All settings pages load correctly
- Profile updates work
- Organization updates work
- Role-based UI restrictions
- Account menu navigation
- Settings hub navigation

### Critical Path

- CP-014: Self-service account preferences persist

## Migration Notes

### Initial Migration

1. Add new enums: `CustomerAccountRole`, `SessionType`
2. Extend `User` model with new fields
3. Create `UserPreferences`, `UserSession`, `UserAccountAuditLog` tables
4. Backfill existing users with `accountRole: 'OWNER'`

### Backfill Script

```sql
UPDATE "User" SET "accountRole" = 'OWNER' WHERE "accountRole" IS NULL;
```

## Security Considerations

1. **tokenInvalidBefore**: Enforced at JWT strategy level
2. **Session Validation**: Checked on every authenticated request
3. **Owner-Only Guards**: Enforced at controller level
4. **Audit Logging**: All profile/preference changes logged (immutable)
5. **No Card Storage**: All billing via Stripe Portal

## API Client Usage

```typescript
import { accountApi } from '@/lib/api';

// Get profile
const profile = await accountApi.getProfile();

// Update profile
await accountApi.updateProfile({
  name: 'New Name',
  timezone: 'America/New_York',
});

// Get preferences
const prefs = await accountApi.getPreferences();

// Update preferences
await accountApi.updatePreferences({
  notifyQuotaWarnings: false,
});

// Get AI usage
const usage = await accountApi.getAiUsage();

// Get connected stores
const stores = await accountApi.getStores();

// Disconnect store (owner only)
await accountApi.disconnectStore(projectId);

// Get sessions
const sessions = await accountApi.getSessions();

// Sign out all sessions
await accountApi.signOutAll();
```

## Related Documents

- [TESTING.md](./TESTING.md) - Testing strategy
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Stripe integration
- [ADMIN_OPS.md](./ADMIN_OPS.md) - Admin operations
