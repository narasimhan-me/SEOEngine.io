# AUTO-PB-1.3: Scope Binding Manual Testing

**Phase:** AUTO-PB-1.3 – Scope Binding for Automation Playbooks
**Date:** 2025-12-16
**Status:** Implementation Complete

## Overview

This phase adds server-issued `scopeId` to bind Preview → Estimate → Apply to a single consistent scope. The scopeId is a SHA-256 hash of the affected product IDs, ensuring that the Apply endpoint only runs on the exact same set of products that was previewed/estimated.

## Key Changes

1. **Estimate Response** now includes `scopeId` field
2. **Apply Request** requires `scopeId` parameter
3. **Scope Validation** returns HTTP 409 `PLAYBOOK_SCOPE_INVALID` if scope has changed
4. **Frontend** automatically passes scopeId from estimate to apply

## Test Prerequisites

- User with Pro or Business plan (playbooks require paid plan)
- Project with Shopify integration and synced products
- At least 2-3 products missing SEO titles/descriptions

## Test Scenarios

### TC-1: Successful Scope Binding Flow

**Steps:**
1. Navigate to `/projects/{id}/automation/playbooks`
2. Select "Fix missing SEO titles" playbook
3. Click "Generate preview" to see sample suggestions
4. Click "Continue to Estimate" to view impact
5. Observe the estimate response (check Network tab):
   - Response should include `scopeId` field (16-char hex string)
6. Check "I understand..." checkbox and click "Apply playbook"
7. Verify apply succeeds and products are updated

**Expected:**
- Estimate response includes `scopeId`
- Apply request includes same `scopeId`
- Apply succeeds without scope validation errors

---

### TC-2: Scope Change Detection (Product Added)

**Steps:**
1. Navigate to playbooks page
2. Select "Fix missing SEO titles" playbook
3. Click "Generate preview" and proceed to Estimate step
4. Note the `scopeId` from the estimate response
5. **In another tab/window:** Add a new product without SEO title to the project (e.g., via Shopify sync)
6. Return to playbooks tab
7. Check "I understand..." and click "Apply playbook"

**Expected:**
- API returns HTTP 409 with code `PLAYBOOK_SCOPE_INVALID`
- Error message indicates scope has changed
- User should re-run estimate to get updated scopeId

---

### TC-3: Scope Change Detection (Product Removed)

**Steps:**
1. Navigate to playbooks page
2. Select "Fix missing SEO descriptions" playbook
3. Click "Generate preview" and proceed to Estimate step
4. Note the estimate shows N affected products
5. **In another tab:** Fix one product's SEO description (remove it from scope)
6. Return to playbooks tab and click "Apply playbook"

**Expected:**
- API returns HTTP 409 with code `PLAYBOOK_SCOPE_INVALID`
- Response includes `expectedScopeId` (new) and `providedScopeId` (old)

---

### TC-4: Missing scopeId Validation

**Steps:**
1. Using API client (curl/Postman), call:
   ```
   POST /projects/{id}/automation-playbooks/apply
   Authorization: Bearer {token}
   Content-Type: application/json

   { "playbookId": "missing_seo_title" }
   ```

**Expected:**
- API returns HTTP 400 "scopeId is required"

---

### TC-5: Session Storage Preservation

**Steps:**
1. Navigate to playbooks page
2. Select playbook and generate preview
3. Proceed to Estimate step
4. Navigate away (e.g., to Products page)
5. Click browser back button to return to playbooks

**Expected:**
- Playbook state is restored from sessionStorage
- scopeId is preserved in the estimate state
- User can continue to Apply step without re-running estimate

---

### TC-6: Same scopeId for Identical Scope

**Steps:**
1. Get estimate for a playbook, note the scopeId
2. Refresh the page
3. Get estimate again for the same playbook

**Expected:**
- scopeId should be identical (deterministic hash)
- Same set of products produces same scopeId

---

## API Contract

### Estimate Response
```json
{
  "projectId": "...",
  "playbookId": "missing_seo_title",
  "totalAffectedProducts": 5,
  "estimatedTokens": 2500,
  "planId": "pro",
  "eligible": true,
  "canProceed": true,
  "reasons": [],
  "aiDailyLimit": {
    "limit": 100,
    "used": 10,
    "remaining": 90
  },
  "scopeId": "abc123def456789a"
}
```

### Apply Request
```json
{
  "playbookId": "missing_seo_title",
  "scopeId": "abc123def456789a"
}
```

### Scope Invalid Error (409)
```json
{
  "statusCode": 409,
  "message": "The product scope has changed since the preview was generated. Please re-run the estimate to get an updated scopeId.",
  "error": "PLAYBOOK_SCOPE_INVALID",
  "code": "PLAYBOOK_SCOPE_INVALID",
  "expectedScopeId": "new123hash456789",
  "providedScopeId": "abc123def456789a"
}
```

## Automated Test Coverage

E2E tests in `apps/api/test/e2e/automation-playbooks.e2e-spec.ts`:
- `returns estimate with scopeId field`
- `returns 400 when scopeId is missing`
- `returns 409 when scopeId does not match current scope (scope changed)`
- All existing apply tests updated to obtain and use scopeId

## Files Changed

- `apps/api/src/projects/automation-playbooks.service.ts` - scopeId computation and validation
- `apps/api/src/projects/projects.controller.ts` - scopeId required in apply body
- `apps/web/src/lib/api.ts` - AutomationPlaybookEstimate interface with scopeId
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` - scopeId state management
- `apps/api/test/e2e/automation-playbooks.e2e-spec.ts` - E2E tests for scopeId validation

## Sign-off

| Tester | Date | Result |
|--------|------|--------|
| | | |
