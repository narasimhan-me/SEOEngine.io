# EngineO.ai – Manual Testing: ADMIN-OPS-1

> This document follows MANUAL_TESTING_TEMPLATE.md structure (all sections retained).

---

## Overview

- **Purpose of the feature/patch:**
  Validate ADMIN-OPS-1 internal-only admin control plane behavior: internal roles, read-only impersonation, safe actions, and immutable audit logging.

- **High-level user impact and what "success" looks like:**
  Support and Ops can operate safely without engineering, with all actions auditable.
  Management/CEO has read-only visibility.
  Admin views do not trigger AI work.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  Phase ADMIN-OPS-1

- **Related documentation:**
  - ADMIN_OPS.md
  - CRITICAL_PATH_MAP.md (CP-013)

---

## Preconditions

- **Environment requirements:**
  - ADMIN-OPS-1 migrations applied
  - API + Web running
  - No special AI provider credentials required for these tests

- **Test accounts and sample data:**
  - Internal admin users:
    - role=ADMIN, adminRole=SUPPORT_AGENT
    - role=ADMIN, adminRole=OPS_ADMIN
    - role=ADMIN, adminRole=MANAGEMENT_CEO
    - role=ADMIN, adminRole=null (must be blocked)
  - At least one regular user (impersonation target)
  - At least one Shopify-connected project (for safe resync visibility)
  - Some existing runs and AI usage data (for dashboards)

- **Required user roles or subscriptions:**
  - Support actions: SUPPORT_AGENT or OPS_ADMIN
  - Ops actions: OPS_ADMIN only
  - CEO: MANAGEMENT_CEO (read-only)

---

## Test Scenarios (Happy Path)

### Scenario 1: Internal admin role gating

**ID:** HP-001

**Steps:**

1. Login as role=ADMIN, adminRole=null.
2. Attempt to access /admin.
3. Login as role=ADMIN, adminRole=SUPPORT_AGENT.
4. Access /admin.

**Expected Results:**

- UI: Non-internal admin is blocked/redirected; internal roles can access.
- API: /admin/\* returns 403 when adminRole missing.

---

### Scenario 2: SUPPORT_AGENT reads + impersonates (read-only)

**ID:** HP-002

**Steps:**

1. Login as SUPPORT_AGENT.
2. Visit /admin/users and open a user detail.
3. Click "Impersonate (Read-only)" and obtain token.
4. Use impersonation token to load /projects.

**Expected Results:**

- UI: Admin pages render; impersonation action requires confirmation and indicates it is logged.
- API: Impersonation returns a token with mode=readOnly.
- Logs: Audit log contains an impersonation entry.

---

### Scenario 3: OPS_ADMIN performs quota reset (logged)

**ID:** HP-003

**Steps:**

1. Login as OPS_ADMIN.
2. Open a user detail page.
3. Reset quota with a reason.
4. Open /admin/audit-log and filter by quota reset.

**Expected Results:**

- UI: Quota reset succeeds and shows success feedback.
- API: Offset record is created; ledger is not deleted.
- Logs: Audit entry exists for quota reset.

---

### Scenario 4: Management/CEO read-only visibility

**ID:** HP-004

**Steps:**

1. Login as MANAGEMENT_CEO.
2. Visit all admin views: Overview, Users, Projects, Runs, Issues, AI Usage, System Health, Audit Log.

**Expected Results:**

- UI: All views render; no action controls are available.
- API: Any admin write action returns 403.

---

## Edge Cases

### EC-001: Empty datasets

**Description:** Admin pages with no users/projects/runs in DB.

**Steps:**

1. Load admin pages in a clean environment.

**Expected Behavior:**

- Pages render without crashes and show empty-state messaging.

---

## Error Handling

### ERR-001: Permission failures

**Scenario:** Non-admin or non-internal admin attempts /admin/\*.

**Steps:**

1. Use a normal user token to access /admin/overview.
2. Use role=ADMIN, adminRole=null token to access /admin/overview.

**Expected Behavior:**

- 403 returned; user is not granted access.

---

### ERR-002: Impersonation token write attempts

**Scenario:** Read-only impersonation attempts a write request.

**Steps:**

1. Obtain impersonation token.
2. Attempt POST/PUT/PATCH/DELETE on any authenticated endpoint.

**Expected Behavior:**

- 403 returned with read-only messaging; no mutations occur.

---

## Limits

### LIM-001: Quota pressure visibility

**Scenario:** User near plan quota should appear in quota pressure.

**Steps:**

1. Create runs to approach quota.
2. View /admin/overview quota pressure section.

**Expected Behavior:**

- Quota pressure counts reflect derived usage.

---

## Regression

### Areas potentially impacted:

- [ ] CP-001: Authentication & Authorization: Login/role loading, guarded routes
- [ ] CP-002: Billing & Limits: Quota evaluation logic (offset support)
- [ ] CP-006: Shopify Sync: Safe resync must not trigger automation/AI

### Quick sanity checks:

- [ ] Normal users cannot access /admin/\*
- [ ] Internal admin users can access /admin/\*
- [ ] Customer flows unchanged

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test users and projects created for ADMIN-OPS-1 validation
- [ ] Remove test quota reset offset records

### Follow-up verification:

- [ ] Confirm no unexpected ledger mutations occurred from admin views

---

## Known Issues

- **Intentionally accepted issues:**
  N/A

- **Out-of-scope items:**
  Deep infra tooling (admin UI shows only signals)

- **TODOs:**
  N/A
