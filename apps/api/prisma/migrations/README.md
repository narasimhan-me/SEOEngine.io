# Prisma Migrations

This directory contains Prisma migrations for the EngineO.ai database schema.

## ADMIN-OPS-1 Migration Notes

**Migration name suggestion:** `admin_ops_1_internal_roles_audit_log_quota_reset`

### Schema Changes

1. **New Enums:**
   - `InternalAdminRole`: `SUPPORT_AGENT`, `OPS_ADMIN`, `MANAGEMENT_CEO`
   - `AccountStatus`: `ACTIVE`, `SUSPENDED`

2. **User Model Updates:**
   - Added `adminRole` (nullable `InternalAdminRole`)
   - Added `accountStatus` (defaults to `ACTIVE`)

3. **New Models:**
   - `AdminAuditLog`: Immutable audit log for admin actions
   - `AiMonthlyQuotaReset`: Quota reset tracking without deleting ledger

### Data Backfill

After running the migration, execute the following to ensure existing admins have a role:

```sql
-- Backfill: Existing User.role=ADMIN records get adminRole=OPS_ADMIN when null (to avoid lockout)
UPDATE "User"
SET "adminRole" = 'OPS_ADMIN'
WHERE "role" = 'ADMIN' AND "adminRole" IS NULL;
```

Alternatively, include this in a follow-up migration or script.

## Running Migrations

```bash
# Development
pnpm --filter api prisma migrate dev

# Production
pnpm --filter api prisma migrate deploy

# Test database
pnpm db:test:migrate
```

---

## SELF-SERVICE-1 Migration Notes

**Migration name suggestion:** `self_service_1_account_profile_prefs_sessions`

### Schema Changes

1. **New Enums:**
   - `CustomerAccountRole`: `OWNER`, `EDITOR`, `VIEWER` (customer-facing, separate from internal UserRole)
   - `SessionType`: `USER_LOGIN` (extensible for future session types)

2. **User Model Updates:**
   - Added `accountRole` (defaults to `OWNER`)
   - Added `avatarUrl` (nullable)
   - Added `timezone` (nullable)
   - Added `locale` (nullable)
   - Added `organizationName` (nullable)
   - Added `lastLoginAt` (nullable)
   - Added `lastLoginIp` (nullable)
   - Added `tokenInvalidBefore` (nullable, for sign-out-all-sessions)

3. **New Models:**
   - `UserPreferences`: 1:1 with User for notification toggles and default behaviors
   - `UserSession`: Active sessions tracking for security visibility
   - `UserAccountAuditLog`: Immutable customer self-service audit log

### Data Backfill Guidance

After running the migration, ensure:

1. **Default accountRole for existing users:**

   ```sql
   -- Existing users default to OWNER (already handled by schema default)
   -- No explicit backfill needed for accountRole
   ```

2. **UserPreferences initialization:**
   - **Recommended approach:** Initialize lazily on first read (via AccountService.getPreferences)
   - The service creates a default UserPreferences row if none exists when fetching
   - Alternatively, run a one-time migration script:
   ```sql
   INSERT INTO "UserPreferences" ("id", "userId", "createdAt", "updatedAt")
   SELECT gen_random_uuid()::text, "id", NOW(), NOW()
   FROM "User"
   WHERE "id" NOT IN (SELECT "userId" FROM "UserPreferences");
   ```

### Indexes

The following indexes are created for query performance:

- `UserSession`: `(userId, createdAt DESC)` for listing active sessions
- `UserSession`: `(userId, revokedAt)` for filtering revoked sessions
- `UserAccountAuditLog`: `(actorUserId, createdAt DESC)` for user audit history
- `UserAccountAuditLog`: `(actionType, createdAt DESC)` for action type filtering
