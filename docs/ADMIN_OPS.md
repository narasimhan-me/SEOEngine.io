# ADMIN-OPS-1: Support & Management Operations Dashboard

> Internal-only operational control plane for Support Agents, Ops Admins, and Management/CEO.

## Overview

The Admin Operations Dashboard provides a locked, internal-only interface for EngineO staff to perform customer support, operational management, and executive oversight functions. All actions are logged immutably for compliance and audit purposes.

## Internal Admin Roles

| Role | Capabilities | Typical Use Case |
|------|-------------|------------------|
| `SUPPORT_AGENT` | Read + Support Actions | Customer support, read-only impersonation, basic troubleshooting |
| `OPS_ADMIN` | Read + Support + Ops Actions | Quota resets, plan overrides, safe resyncs, run retries |
| `MANAGEMENT_CEO` | Read Only | Executive dashboards, audit review, metrics oversight |

### Capability Matrix

| Action | SUPPORT_AGENT | OPS_ADMIN | MANAGEMENT_CEO |
|--------|---------------|-----------|----------------|
| View Overview Dashboard | Yes | Yes | Yes |
| View Users/Projects/Runs | Yes | Yes | Yes |
| View AI Usage Metrics | Yes | Yes | Yes |
| View Audit Log | Yes | Yes | Yes |
| Read-Only Impersonation | Yes | Yes | No |
| Quota Reset | No | Yes | No |
| Plan Override | No | Yes | No |
| Safe Resync | No | Yes | No |
| Run Retry | No | Yes | No |
| Admin Role Change | No | Yes | No |

## Dashboard Sections

### D1: Overview (`/admin`)
High-level platform metrics:
- Total users/projects/runs
- Runs today with AI usage
- APPLY invariant red alert (APPLY runs with aiUsed=true is a critical bug)

### D2: Users (`/admin/users`)
User management with filtering:
- Search by email
- Filter by plan, status, admin role
- View user details, subscription info, AI usage
- Perform impersonation, quota reset, plan override

### D3: User Detail (`/admin/users/[id]`)
Detailed user view:
- Account information
- Subscription and plan details
- AI usage quota status
- Recent projects and runs
- Admin action buttons (context-dependent)

### D4: Projects (`/admin/projects`)
Project oversight:
- All projects with owner info
- Last sync timestamp
- Product/run counts
- Safe resync trigger

### D5: Runs (`/admin/runs`)
Run explorer:
- Filter by runType, status, date range
- View run details and metadata
- Retry failed runs (ops only)
- Linked to project/product context

### D6: Issues (`/admin/issues`)
Issue Engine summary:
- Aggregated issue counts by type
- Platform-wide issue distribution

### D7: AI Usage (`/admin/ai-usage`)
AI consumption metrics:
- Top users by AI runs
- Monthly trends
- Quota reset history

### D8: Audit Log (`/admin/audit-log`)
Immutable action log:
- All admin actions with timestamps
- Actor, action type, target
- Filter by action type
- Cannot be modified or deleted

## Security Model

### Access Control
1. User must have `role = 'ADMIN'` (standard role check)
2. User must have `adminRole` set (SUPPORT_AGENT, OPS_ADMIN, or MANAGEMENT_CEO)
3. Specific endpoints check capability requirements via `AdminRolesGuard`

### Read-Only Impersonation
- Impersonation tokens include `impersonation: { mode: 'readOnly', originalAdminId }`
- JWT auth guard blocks all POST/PUT/PATCH/DELETE when in impersonation mode
- Allows support staff to see exactly what customer sees without risk of modification

### Audit Logging
All admin actions are logged to `AdminAuditLog` table:
- `performedByUserId` - The admin who performed the action
- `performedByAdminRole` - Their role at time of action
- `actionType` - Type of action (impersonation, quota_reset, etc.)
- `targetUserId` / `targetProjectId` / `targetRunId` - What was affected
- `metadata` - Additional context (JSON)
- `createdAt` - Immutable timestamp

## API Endpoints

### Overview
- `GET /admin/overview` - Dashboard metrics

### Users
- `GET /admin/users` - List users with pagination/filters
- `GET /admin/users/:id` - User detail
- `POST /admin/users/:id/impersonate` - Generate read-only token (support_action)
- `POST /admin/users/:id/quota-reset` - Reset AI quota (ops_action)
- `PATCH /admin/users/:id/admin-role` - Update admin role (ops_action)

### Projects
- `GET /admin/projects` - List projects with pagination/filters
- `POST /admin/projects/:id/resync` - Trigger safe resync (ops_action)

### Runs
- `GET /admin/runs` - List runs with pagination/filters
- `GET /admin/runs/:id` - Run detail
- `POST /admin/runs/:id/retry` - Retry failed run (ops_action)

### Issues
- `GET /admin/issues` - Issue summary

### AI Usage
- `GET /admin/ai-usage` - AI consumption metrics

### System Health
- `GET /admin/system-health` - System health metrics

### Audit Log
- `GET /admin/audit-log` - Audit log with pagination/filters

## Safe Resync

The "safe resync" feature allows ops admins to trigger a Shopify product sync without invoking AI automations. This is useful for:
- Debugging sync issues
- Recovering from failed syncs
- Testing sync behavior

The `triggerAutomation: false` flag is passed to `ShopifyService.syncProducts()` to skip the automation trigger.

## Quota Reset

Quota reset does NOT delete ledger entries. Instead, it creates an offset record in `AiMonthlyQuotaReset`:
- `userId` - Target user
- `resetMonth` - Month being reset (start of month)
- `offsetCount` - Number of runs to offset (typically current usage)
- `reason` - Required justification
- `performedByAdminId` - Who performed the reset

The `AiUsageQuotaService.evaluateQuotaForAction()` method subtracts the sum of offsets from the ledger count when calculating quota usage.

## Files Modified

### Backend (apps/api)
- `prisma/schema.prisma` - New enums and models
- `src/auth/admin.guard.ts` - Updated gating
- `src/auth/admin-roles.guard.ts` - NEW capability guard
- `src/auth/jwt.strategy.ts` - Impersonation payload
- `src/auth/jwt-auth.guard.ts` - Read-only enforcement
- `src/admin/admin.controller.ts` - All endpoints
- `src/admin/admin.service.ts` - All service methods
- `src/ai/ai-usage-quota.service.ts` - Quota offset support
- `src/shopify/shopify.service.ts` - Safe resync option

### Frontend (apps/web)
- `src/components/layout/AdminSideNav.tsx` - Navigation
- `src/app/admin/layout.tsx` - Auth gating
- `src/lib/api.ts` - API client methods
- `src/app/admin/page.tsx` - Overview
- `src/app/admin/users/page.tsx` - Users list
- `src/app/admin/users/[id]/page.tsx` - User detail
- `src/app/admin/projects/page.tsx` - Projects
- `src/app/admin/runs/page.tsx` - Runs list
- `src/app/admin/runs/[id]/page.tsx` - Run detail
- `src/app/admin/issues/page.tsx` - Issues
- `src/app/admin/ai-usage/page.tsx` - AI Usage
- `src/app/admin/system-health/page.tsx` - System Health
- `src/app/admin/audit-log/page.tsx` - Audit Log

## Testing

Integration tests: `apps/api/test/integration/admin-ops-1.test.ts`

Manual testing checklist: `docs/manual-testing/ADMIN-OPS-1.md`
