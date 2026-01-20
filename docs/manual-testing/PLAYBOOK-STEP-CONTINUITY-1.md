# Manual Testing: PLAYBOOK-STEP-CONTINUITY-1

> Playbook Step 2 → Step 3 Continuity & Explicit Terminal Outcomes

---

## Overview

- **Purpose of the feature/patch:**
  - Ensures the Playbooks workflow enforces deterministic state transitions with explicit terminal outcomes at every step. No silent stalls, no dead-click races, no ambiguous states.

- **High-level user impact and what "success" looks like:**
  - Step 2 "Continue to Apply" never silently fails
  - Blocker states (expired/failed/missing drafts, permission issues) show clear explanations and CTAs
  - Step 2 → Step 3 transition is immediate and deterministic
  - Zero-eligible state shows "No applicable changes found" with clear exit paths

- **Related phases/sections in docs/IMPLEMENTATION_PLAN.md:**
  - Phase PLAYBOOK-STEP-CONTINUITY-1

- **Related documentation:**
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-012: Automation Engine)
  - `docs/manual-testing/PLAYBOOK-ENTRYPOINT-INTEGRITY-1.md`
  - `docs/manual-testing/AUTOMATION-ENTRY-1.md`
  - `docs/manual-testing/ROLES-3.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] API and Web servers running locally or on staging
  - [ ] Database seeded with test projects and products
  - [ ] No specific feature flags required

- **Test accounts and sample data:**
  - [ ] Project with connected Shopify store
  - [ ] Products/Pages/Collections with missing SEO titles and/or descriptions
  - [ ] Products with ALL SEO fields filled (for zero-eligible testing)
  - [ ] Test users with OWNER, EDITOR, and VIEWER roles (for permission testing)

- **Required user roles or subscriptions:**
  - [ ] Pro or Business plan (Free plan blocks playbook apply)
  - [ ] OWNER role for apply scenarios
  - [ ] VIEWER/EDITOR roles for permission-blocked scenarios

- **Seed endpoint:**
  - N/A — no dedicated seed endpoint exists for this phase. Use existing project data or `seed-first-deo-win` endpoint for basic setup.

---

## Trust Contract: Step 2 Terminal Outcomes

At the end of Step 2 (Estimate), EXACTLY ONE of these outcomes must be visible:

| Outcome                    | Condition                                                  | UI Result                                                    |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| **A) Ready to Apply**      | Actionable items exist + draft is valid (READY or PARTIAL) | "Continue to Apply" button (enabled)                         |
| **B) No Actionable Items** | totalAffectedProducts = 0                                  | Zero-eligible empty state with "No applicable changes found" |
| **C) Permission Blocked**  | VIEWER or EDITOR role without apply permission             | Explicit role notice + resolution CTA                        |
| **D) Draft Invalid**       | draftStatus = EXPIRED, FAILED, or undefined                | Blocker panel with explanation + Retry/Regenerate CTA        |

---

## Test Scenarios (Happy Path)

### Scenario 1: Preview → Estimate → Apply (Step 2 → Step 3 Determinism)

**ID:** HP-001

**Preconditions:**

- Products with missing SEO titles/descriptions
- User is OWNER with Pro/Business plan

**Steps:**

1. Navigate to `/projects/{projectId}/playbooks`
2. Select "Fix missing SEO titles" playbook
3. Click "Generate Preview"
4. Wait for preview to complete
5. Click "Continue to Estimate"
6. Verify estimate displays (products to update, estimated tokens)
7. Click "Continue to Apply"

**Expected Results:**

- **UI:** Step 3 becomes visible immediately; page scrolls to Step 3; Step 3 section receives focus (accessibility)
- **API:** N/A (no direct API call on "Continue to Apply" click — state transition only)
- **Logs:** No console errors or uncaught promise rejections

---

### Scenario 2: Zero Actionable Items – "No applicable changes found"

**ID:** HP-002

**Preconditions:**

- Products with all SEO titles/descriptions already filled

**Steps:**

1. Navigate to `/projects/{projectId}/playbooks`
2. Select "Fix missing SEO titles" playbook (or whichever has zero eligible)

**Expected Results:**

- **UI:**
  - Zero-eligible empty state appears (`data-testid="playbook-zero-eligible-empty-state"`)
  - Primary message: **"No applicable changes found"** (exact phrase)
  - "Return to Playbooks" button links to `/projects/{projectId}/playbooks`
  - "View products that need optimization" CTA visible (for PRODUCTS asset type)
  - No stepper visible
  - No "Continue to Apply" button visible
- **API:** GET `/projects/:id/automation-playbooks/estimate` returns `totalAffectedProducts: 0`

---

## Edge Cases

### EC-001: Draft Expired – Blocker Panel with Regenerate CTA

**Description:** Draft exists but `expiresAt < now`. Step 2 must show blocker panel, not "Continue to Apply".

**Steps:**

1. Generate a preview to create a draft
2. Manually set `expiresAt` to a past date in the database (or wait for natural expiry)
3. Refresh the page and navigate to Step 2 (Estimate)

**Expected Behavior:**

- Amber blocker panel appears with title "Draft expired"
- Message: "The preview draft has expired. Regenerate the preview to continue with apply."
- "Regenerate Preview" button is visible and functional
- "Continue to Apply" button is NOT visible
- Clicking "Regenerate Preview" starts a new preview generation and clears the blocker

---

### EC-002: Draft Failed – Blocker Panel with Retry CTA

**Description:** Draft exists with `status = 'FAILED'`. Step 2 must show blocker panel.

**Steps:**

1. Manually set a draft's `status` to `'FAILED'` in the database
2. Navigate to Step 2 (Estimate)

**Expected Behavior:**

- Red blocker panel appears with title "Draft generation failed"
- "Retry Preview" button visible and functional
- "Continue to Apply" button is NOT visible

---

### EC-003: Draft Missing – Blocker Panel with Generate CTA

**Description:** No draft exists for the current scope (draftStatus is undefined). Step 2 must show blocker panel.

**Steps:**

1. Navigate to a playbook with eligible items but no draft generated yet
2. Navigate to Step 2 (Estimate) without generating a preview first

**Expected Behavior:**

- Gray blocker panel appears with title "No draft available"
- "Generate Preview" button visible and functional
- "Continue to Apply" button is NOT visible

---

### EC-004: Concurrent Estimate Refresh – No Race Condition

**Description:** Rapidly clicking "Continue to Apply" while estimate is loading should never silently fail.

**Steps:**

1. Generate a preview
2. Navigate to Step 2 (Estimate)
3. While estimate is loading (`loadingEstimate = true`), rapidly click "Continue to Apply"

**Expected Behavior:**

- Button is disabled during loading (no click possible)
- If click somehow occurs, toast shows: "Estimate data is not available. Please wait..."
- No silent navigation to Step 3 with null estimate

---

## Error Handling

### ERR-001: Apply with Expired Draft – API Returns PLAYBOOK_DRAFT_EXPIRED

**Scenario:** Force an apply attempt with an expired draft (bypass UI checks)

**Steps:**

1. Complete preview → estimate flow
2. Manually expire the draft (set `expiresAt` to past in DB)
3. Attempt to apply (via direct API call: `POST /projects/:id/automation-playbooks/apply`)

**Expected Behavior:**

- API returns 409 Conflict with `code: 'PLAYBOOK_DRAFT_EXPIRED'`
- Error message instructs to regenerate preview
- UI shows inline error panel for PLAYBOOK_DRAFT_EXPIRED if error is caught

---

### ERR-002: Apply with Missing Draft – API Returns PLAYBOOK_DRAFT_NOT_FOUND

**Scenario:** Apply attempt when no draft exists for the scope

**Steps:**

1. Attempt apply via API without generating a preview first

**Expected Behavior:**

- API returns 409 Conflict with `code: 'PLAYBOOK_DRAFT_NOT_FOUND'`
- Error message instructs to generate preview before applying

---

### ERR-003: Permission Failures – VIEWER/EDITOR Role Blocked at Apply

**Scenario:** Non-OWNER attempts to apply

**Steps:**

1. Log in as VIEWER or EDITOR
2. Navigate to Step 3 (Apply)
3. Attempt to apply

**Expected Behavior:**

- VIEWER: Notice shows "Viewer role cannot apply. Preview and export remain available." with "Request access" link to `/projects/{projectId}/settings/members`
- EDITOR: Notice shows "Editor role cannot apply. An owner must apply this playbook." with "Manage members" link
- Apply button is disabled or hidden
- No silent failures

---

### ERR-004: Permission Failures – VIEWER Role Blocked at Draft Blocker CTAs (FIXUP-2)

**Scenario:** VIEWER encounters expired/failed/missing draft in Step 2

**Steps:**

1. Log in as VIEWER
2. Navigate to a playbook with an expired draft (or failed draft, or no draft)
3. Navigate to Step 2 (Estimate)

**Expected Behavior:**

- Draft blocker panel appears (EXPIRED / FAILED / No draft available)
- **No actionable "Regenerate Preview" / "Retry Preview" / "Generate Preview" CTA is shown**
- Panel shows: "Viewer role cannot generate previews."
- **"Request access" link** is visible and links to `/projects/{projectId}/settings/members`
- No dead-click scenario where clicking a button fails silently

**Variants to test:**

1. **Expired draft:** Amber panel with "Draft expired" title shows permission message instead of "Regenerate Preview" button
2. **Failed draft:** Red panel with "Draft generation failed" title shows permission message instead of "Retry Preview" button
3. **No draft:** Gray panel with "No draft available" title shows permission message instead of "Generate Preview" button

---

## Limits

### LIM-001: Free Plan Blocked from Apply

**Scenario:** Free plan user attempts playbook apply

**Steps:**

1. Log in as free plan user
2. Navigate to Step 3 (Apply)
3. Attempt to apply

**Expected Behavior:**

- Apply blocked with upgrade prompt
- User remains on current page/state

---

## Regression

### Areas potentially impacted:

- [ ] **Playbook Preview → Estimate → Apply flow:** Full flow should still work end-to-end
- [ ] **Draft reuse:** Existing drafts should still be reused correctly
- [ ] **Role-based access:** OWNER/EDITOR/VIEWER permissions unchanged

### Quick sanity checks:

- [ ] Complete a full playbook run (preview → estimate → apply) and verify products are updated
- [ ] Verify apply results show correct counts (updated, skipped)
- [ ] Verify "View updated products" and "Return to Playbooks" CTAs work
- [ ] No console errors throughout the flow

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test drafts created during testing (optional — they expire naturally)
- [ ] Reset any manually modified draft statuses/expiresAt values

### Follow-up verification:

- [ ] Confirm no orphaned draft records
- [ ] Verify database state is clean

---

## API Contract Verification

### GET /projects/:id/automation-playbooks/estimate

Response should include:

```typescript
{
  // ... existing fields ...
  draftStatus?: 'READY' | 'PARTIAL' | 'FAILED' | 'EXPIRED',
  draftCounts?: {
    affectedTotal: number,
    draftGenerated: number,
    noSuggestionCount: number,
  }
}
```

- [ ] `draftStatus` is 'EXPIRED' when `expiresAt < now` (even if persisted status differs)
- [ ] `draftStatus` is 'FAILED' when draft generation failed
- [ ] `draftStatus` is 'READY' or 'PARTIAL' when draft is valid
- [ ] `draftStatus` is `undefined` when no draft exists

### POST /projects/:id/automation-playbooks/apply

- [ ] Returns 409 with `code: 'PLAYBOOK_DRAFT_EXPIRED'` when draft is expired
- [ ] Returns 409 with `code: 'PLAYBOOK_DRAFT_NOT_FOUND'` when no draft exists
- [ ] Returns 409 with `code: 'PLAYBOOK_RULES_CHANGED'` when rules hash mismatch

---

## Accessibility Verification

- [ ] Step 3 section has `tabIndex={-1}` for programmatic focus
- [ ] Clicking "Continue to Apply" scrolls AND focuses Step 3
- [ ] All blocker panels have proper heading hierarchy (`<p className="font-semibold">`)

---

## Known Issues

- **Intentionally accepted issues:**
  - VIEWER cannot generate previews (this is by design per ROLES-3)

- **Out-of-scope items:**
  - Playbook AI generation logic
  - Scope binding / rules hash computation
  - New playbook types or capabilities

- **TODOs:**
  - [ ] None

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |

---

## Document History

| Version | Date       | Changes                                                                                                                                                                                |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-19 | Initial PLAYBOOK-STEP-CONTINUITY-1 manual testing guide                                                                                                                                |
| 1.1     | 2026-01-19 | FIXUP-1: Restructured to match MANUAL_TESTING_TEMPLATE.md; corrected API endpoint paths; removed nonexistent seed endpoint; fixed VIEWER scenario preconditions                        |
| 1.2     | 2026-01-19 | FIXUP-2: Added ERR-004 scenario for VIEWER permission-blocked draft blocker CTAs (no actionable regenerate/retry/generate buttons; shows permission explanation + Request access link) |
