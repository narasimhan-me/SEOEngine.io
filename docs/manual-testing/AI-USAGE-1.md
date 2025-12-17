# AI-USAGE-1: AI Work Ledger, Attribution, and Trust Visibility

> Manual testing document for the AI-USAGE-1 patch batch implementing AI usage tracking and visibility.

---

## Overview

- **Purpose of the feature/patch:**
  - Introduce AI Usage Ledger service to track AI usage from AutomationPlaybookRun records
  - Add read-only API endpoints to query AI usage summaries and run histories
  - Surface AI usage summary on Playbooks page for user visibility
  - Label all AI-triggering CTAs with "(uses AI)" suffix
  - Enforce and document the contract: Apply must never use AI when valid drafts exist

- **High-level user impact and what "success" looks like:**
  - Users can see their AI usage summary on the Playbooks page
  - Every button that triggers AI is clearly labeled with "(uses AI)"
  - Apply buttons do NOT have "(uses AI)" label (they use saved drafts)
  - API endpoints return accurate AI usage counts

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase AI-USAGE-1: AI Usage Ledger & Reuse
  - Phase RUNS-1: Async Playbook Runs (dependency)
  - Phase AUTO-PB-1.3: Scope Binding and Draft Persistence (dependency)

- **Related documentation:**
  - [DOC-AUTO-PB-1.3.md](./DOC-AUTO-PB-1.3.md) - Draft lifecycle and Apply contract
  - [RUNS-1.md](./RUNS-1.md) - Async playbook runs
  - [TEST-PB-RULES-1.md](./TEST-PB-RULES-1.md) - Rules semantics
  - [AI-USAGE-v2.md](./AI-USAGE-v2.md) - Plan-aware quotas and predictive guards for Automation Playbooks

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running (`pnpm --filter api dev`)
  - [ ] PostgreSQL database running with migrations applied
  - [ ] Frontend web app running (`pnpm --filter web dev`)

- **Test accounts and sample data:**
  - [ ] Test user with valid authentication
  - [ ] Test project with products that have missing SEO fields
  - [ ] Pro plan subscription (for AI generation entitlements)

- **Required user roles or subscriptions:**
  - [ ] Pro plan or higher

---

## Test Scenarios (Happy Path)

### Scenario 1: AI Usage Increments on Preview Generation

**ID:** HP-001

**Preconditions:**
- User has a project with products missing SEO titles
- No prior playbook runs in the current month

**Steps:**
1. Navigate to Playbooks page (`/projects/:id/automation/playbooks`)
2. Select "Fix missing SEO titles" playbook
3. Click "Generate preview (uses AI)"
4. Observe the AI usage summary chip above Step 1

**Expected Results:**
- **UI:**
  - Preview generates successfully
  - AI usage summary chip shows: "Previews and drafts generated: 1"
  - If any AI runs exist: secondary text "Apply uses saved drafts only — no new AI runs."
- **API:**
  - `GET /ai/projects/:projectId/usage/summary` returns `previewRuns >= 1`
  - `totalAiRuns >= 1`

---

### Scenario 2: Apply Does NOT Increment AI Usage

**ID:** HP-002

**Preconditions:**
- Preview has been generated (Scenario 1 completed)
- Estimate has been calculated

**Steps:**
1. Click "Apply playbook" button
2. Wait for apply to complete
3. Check AI usage summary via API

**Expected Results:**
- **UI:**
  - Apply completes successfully
  - Apply button labeled "Apply playbook" (NO "(uses AI)" suffix)
- **API:**
  - `GET /ai/projects/:projectId/usage/summary` returns `applyAiRuns = 0`
  - `totalAiRuns` has NOT increased from the apply operation
- **Logs:**
  - `apply.completed { ... aiCalled: false }`

---

### Scenario 3: Stale Preview Regeneration Increments AI Usage

**ID:** HP-003

**Preconditions:**
- Preview has been generated with rules A

**Steps:**
1. Change rules (e.g., add a prefix)
2. Observe stale preview banner
3. Click "Regenerate preview (uses AI)"
4. Check AI usage summary

**Expected Results:**
- **UI:**
  - Stale preview banner appears with warning
  - Regenerate button labeled "Regenerate preview (uses AI)"
  - AI usage summary chip updates after regeneration
- **API:**
  - `previewRuns` increases by 1
  - `totalAiRuns` increases by 1

---

### Scenario 4: AI CTA Labeling Verification

**ID:** HP-004

**Preconditions:**
- User can access Playbooks page

**Steps:**
1. Navigate to Playbooks page
2. Find "Generate preview" button - verify it says "Generate preview (uses AI)"
3. If preview exists, find stale regenerate buttons - verify "(uses AI)" suffix
4. Find "Apply playbook" button - verify it does NOT have "(uses AI)" suffix

**Expected Results:**
- **UI:**
  - All preview/regenerate buttons: "Generate preview (uses AI)" or "Regenerate preview (uses AI)"
  - Apply button: "Apply playbook" (no AI suffix)

---

### Scenario 5: Resume Behavior + AI Usage Summary

**ID:** HP-005

**Preconditions:**
- Preview and draft have been generated previously

**Steps:**
1. Navigate away from Playbooks page
2. Return to Playbooks page
3. Observe resume helper and AI usage summary

**Expected Results:**
- **UI:**
  - Resume helper shows saved preview found
  - AI usage summary reflects existing runs from this month
  - No new AI usage until user explicitly regenerates
- **API:**
  - Run summaries show historical runs with correct `aiUsed` flags

---

### Scenario 6: Run History Visibility

**ID:** HP-006

**Preconditions:**
- Multiple playbook runs have occurred

**Steps:**
1. Call `GET /ai/projects/:projectId/usage/runs`
2. Examine returned run summaries

**Expected Results:**
- **API:**
  - Returns array of run summaries ordered by createdAt desc
  - PREVIEW_GENERATE runs: `aiUsed = true`
  - DRAFT_GENERATE runs: `aiUsed = true`
  - APPLY runs: `aiUsed = false`

---

## Edge Cases

### EC-001: No Runs Yet

**Description:** New project with no playbook runs

**Steps:**
1. Create new project
2. Navigate to Playbooks page

**Expected Behavior:**
- AI usage summary chip is hidden or shows skeleton loading briefly
- `GET /ai/projects/:projectId/usage/summary` returns all zeros

---

### EC-002: API Error on Usage Fetch

**Description:** Backend fails to return usage summary

**Steps:**
1. Simulate API failure (e.g., disconnect database temporarily)
2. Load Playbooks page

**Expected Behavior:**
- Page still loads successfully
- AI usage chip is hidden or shows subtle error text
- Other functionality is not blocked

---

## Error Handling

### ERR-001: Unauthorized Access to Usage Summary

**Scenario:** User tries to access another user's project usage

**Steps:**
1. Get project ID for another user's project
2. Call `GET /ai/projects/:projectId/usage/summary`

**Expected Behavior:**
- 400 Bad Request with "Access denied"
- No usage data returned

---

## Limits

### LIM-001: AI-USAGE-1 Scope vs AI-USAGE v2

AI-USAGE-1 is read-only and informational. It introduces the ledger and visibility but does not enforce quotas by itself.

Plan-aware monthly quotas and predictive guards for Automation Playbooks are implemented in AI-USAGE v2 (see [AI-USAGE-v2.md](./AI-USAGE-v2.md)). AI-USAGE-1 remains the foundational "ledger + visibility" layer.

---

## Regression

### Areas potentially impacted:

- [ ] **Preview playbook flow:** Should continue working; now tracks AI usage
- [ ] **Apply playbook flow:** Should continue working; must NOT use AI
- [ ] **Draft persistence:** Drafts should still be created and reused correctly
- [ ] **Scope binding:** scopeId/rulesHash enforcement unchanged

### Quick sanity checks:

- [ ] Generate preview via Playbooks UI - verify it works
- [ ] Apply playbook via Playbooks UI - verify it works and doesn't call AI
- [ ] AI usage summary chip appears when runs exist
- [ ] All AI CTAs have "(uses AI)" suffix

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test runs from `AutomationPlaybookRun` table if needed
- [ ] Reset test product SEO fields if modified

### Follow-up verification:

- [ ] Confirm no orphaned run records
- [ ] Verify usage summary API returns accurate data

---

## Known Issues

- **Intentionally accepted issues:**
  - AI usage summary chip only shows playbook runs (non-playbook AI usage tracked in AI-USAGE-2)
  - No real-time updates to usage chip (refreshes on page load)

- **Out-of-scope items:**
  - Quota-based blocking (future phase)
  - Token-level usage tracking (AI-USAGE-2)
  - Monthly usage charts (AI-USAGE-2)

- **TODOs:**
  - [ ] AI-USAGE-2: Integrate AiUsageEvent and TokenUsage for non-playbook AI
  - [ ] AI-USAGE-2: Add token-based usage views
  - [ ] Consider real-time usage updates via WebSocket

---

## Key Contracts

### Contract 1: Apply Must Never Use AI
- **Rule:** When a valid draft exists for the current scope and rules, Apply MUST NOT call AI
- **Verification:** `aiUsed = false` on all APPLY runs
- **Invariant:** `applyAiRuns` in usage summary is always 0

### Contract 2: AI CTA Labeling
- **Rule:** Every button that triggers AI generation MUST be labeled with "(uses AI)"
- **Verification:** Buttons include: "Generate preview", "Regenerate preview", "Generate full draft"
- **Exclusion:** Apply buttons do NOT have "(uses AI)" because they use saved drafts

---

## API Reference

### Get Usage Summary
```
GET /ai/projects/:projectId/usage/summary

Response:
{
  "projectId": "...",
  "periodStart": "2025-12-01T00:00:00.000Z",
  "periodEnd": "2025-12-31T23:59:59.999Z",
  "totalRuns": 5,
  "totalAiRuns": 3,
  "previewRuns": 2,
  "draftGenerateRuns": 1,
  "applyRuns": 2,
  "applyAiRuns": 0
}
```

### Get Usage Runs
```
GET /ai/projects/:projectId/usage/runs
  ?runType=PREVIEW_GENERATE|DRAFT_GENERATE|APPLY
  &limit=20

Response:
[
  {
    "runId": "...",
    "runType": "PREVIEW_GENERATE",
    "status": "SUCCEEDED",
    "aiUsed": true,
    "scopeId": "...",
    "rulesHash": "...",
    "createdAt": "2025-12-17T12:00:00.000Z"
  }
]
```

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | |
| **Date** | |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | |
