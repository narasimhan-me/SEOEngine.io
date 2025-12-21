# ENTERPRISE-GEO-1: Enterprise Governance & Approvals - Manual Testing Guide

**Feature:** Enterprise Governance Controls for GEO Reports
**Status:** Complete
**Date:** 2025-12-21

---

## Prerequisites

1. Local development environment running (API on port 3001, Web on port 3000)
2. Test user account with a project
3. Database seeded with test data (optional: use E2E seeder)

---

## Test Scenarios

### 1. Governance Settings UI

**Purpose:** Verify governance settings section appears and functions correctly.

**Steps:**
1. Login to the application
2. Navigate to Project Settings (`/projects/{id}/settings`)
3. Scroll to "Governance & Approvals" section
4. Verify all settings are visible:
   - Require Approval toggle
   - Restrict Share Links toggle
   - Share Link Expiry Days input
   - Export Audience dropdown
   - Allow Competitor Mentions toggle
   - PII toggle (should be locked/disabled)

**Expected Results:**
- [ ] Governance section is visible under Project Settings
- [ ] All toggles are interactive except PII
- [ ] PII toggle shows locked/disabled visual indicator
- [ ] Save button appears when changes are made

---

### 2. Approval Workflow

**Purpose:** Verify approval gating on GEO fixes and Answer Block sync.

**Steps:**
1. Navigate to Project Settings
2. Enable "Require Approval" toggle
3. Save settings
4. Navigate to a product with GEO issues
5. Click "Preview Fix" on a GEO issue
6. Click "Apply Fix"
7. Verify error message indicates approval required

**Expected Results:**
- [ ] Apply fails with "Approval Required" error when governance is enabled
- [ ] Error message includes guidance on requesting approval
- [ ] After approval is granted (via API), apply succeeds

---

### 3. Passcode-Protected Share Links

**Purpose:** Verify passcode creation, display, and verification.

**Steps:**
1. Navigate to Project Insights > GEO Insights
2. Click "Share Report" button
3. Select "Passcode Protected" audience
4. Create share link
5. Note the displayed passcode (8 characters, A-Z 0-9)
6. Copy the share URL
7. Open the URL in incognito/private window
8. Verify passcode entry form appears
9. Enter wrong passcode, click "View Report"
10. Verify error message
11. Enter correct passcode, click "View Report"
12. Verify report loads

**Expected Results:**
- [ ] Passcode shown only once at creation (8 chars, uppercase A-Z + 0-9)
- [ ] Share URL redirects to passcode entry form
- [ ] Last 4 characters shown as hint on entry form
- [ ] Wrong passcode shows "Invalid passcode" error
- [ ] Correct passcode loads the report
- [ ] Navigating away and back requires passcode again

---

### 4. Share Link Expiry Policy

**Purpose:** Verify governance policy controls share link expiry.

**Steps:**
1. Navigate to Project Settings > Governance
2. Set "Share Link Expiry Days" to 3
3. Save settings
4. Create a new share link
5. Check the expiration date in the share link list

**Expected Results:**
- [ ] New share links expire in 3 days (not default 14)
- [ ] Expiry date shown correctly in UI
- [ ] Expired links show "Expired" status when accessed

---

### 5. Audience Restrictions

**Purpose:** Verify governance policy restricts share link audience.

**Steps:**
1. Navigate to Project Settings > Governance
2. Enable "Restrict Share Links"
3. Set "Export Audience" to "Passcode"
4. Save settings
5. Navigate to Share Report dialog
6. Attempt to create a public (Anyone with Link) share

**Expected Results:**
- [ ] Creating public link fails with 403 error
- [ ] Error message indicates passcode protection required
- [ ] Creating passcode-protected link succeeds

---

### 6. Content Redaction

**Purpose:** Verify competitor mentions are redacted when policy is set.

**Steps:**
1. Navigate to Project Settings > Governance
2. Disable "Allow Competitor Mentions"
3. Save settings
4. Create a share link
5. View the shared report
6. Check for competitor-related text

**Expected Results:**
- [ ] Text patterns like "competitor X", "vs. X" show as "[REDACTED]"
- [ ] Redaction applies to gaps, summary, and opportunity text
- [ ] Authenticated view may still show unredacted (verify policy)

---

### 7. PII Protection (Hard Contract)

**Purpose:** Verify PII export is always blocked.

**API Test:**
```bash
curl -X PUT http://localhost:3001/projects/{id}/governance/policy \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"allowPII": true}'
```

**Expected Results:**
- [ ] API returns 400 Bad Request
- [ ] Error message: "PII export is not allowed"
- [ ] UI toggle remains locked/disabled
- [ ] No PII fields appear in any export

---

### 8. Audit Event Logging

**Purpose:** Verify all governance actions are logged.

**Steps:**
1. Perform various governance actions:
   - Update policy
   - Request approval
   - Approve/reject approval
   - Create share link
   - Revoke share link
   - Apply GEO fix
2. Query audit events via API:
```bash
curl http://localhost:3001/projects/{id}/governance/audit \
  -H "Authorization: Bearer {token}"
```

**Expected Results:**
- [ ] All actions appear in audit log
- [ ] Each event has correct eventType
- [ ] actorId matches the user who performed action
- [ ] metadata contains relevant details
- [ ] Share link events include passcodeLast4 (not full passcode)

---

### 9. Mutation-Free Views (Hard Contract)

**Purpose:** Verify public share view performs no DB writes.

**Steps:**
1. Create a share link (passcode or public)
2. Note the current database state (share link status)
3. Access the share link URL multiple times
4. Check database state after access
5. Access an expired share link
6. Check database state after accessing expired link

**Expected Results:**
- [ ] Share link status unchanged after view access
- [ ] No auto-update of EXPIRED status on read
- [ ] Status computed at read time, not persisted
- [ ] Passcode verification does not mutate database

---

### 10. Print/PDF Rendering

**Purpose:** Verify print output has no side effects.

**Steps:**
1. Access a shared report (public or with passcode)
2. Use browser print (Cmd+P / Ctrl+P)
3. Check print preview

**Expected Results:**
- [ ] Print preview shows clean layout
- [ ] White background for all sections
- [ ] Proper margins (no cut-off content)
- [ ] EngineO.ai branding present in print
- [ ] No JavaScript errors during print
- [ ] No API calls triggered by print action

---

## E2E Test File

Location: `apps/web/tests/enterprise-geo-1.spec.ts`

Run with:
```bash
cd apps/web && npx playwright test enterprise-geo-1.spec.ts
```

---

## Integration Test File

Location: `apps/api/test/integration/enterprise-geo-1.test.ts`

Run with:
```bash
cd apps/api && pnpm test:e2e -- --testPathPattern=enterprise-geo-1
```

---

## Related Documentation

- [ENTERPRISE_GEO_GOVERNANCE.md](../ENTERPRISE_GEO_GOVERNANCE.md) - Full specification
- [GEO_EXPORT.md](../GEO_EXPORT.md) - GEO export/sharing
- [API_SPEC.md](../../API_SPEC.md) - API documentation
- [CRITICAL_PATH_MAP.md](../testing/CRITICAL_PATH_MAP.md) - CP-018 entry
