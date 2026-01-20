# LOCAL-1 – Local Discovery & Geo-Intent Signals Manual Testing

> Manual testing guide for the Local Discovery pillar (LOCAL-1).

---

## Overview

- **Purpose of the feature/patch:**
  - Implement the Local Discovery pillar for DEO, enabling stores with physical presence or geographic service areas to optimize for local search queries ("near me", city-specific terms) and local trust signals.

- **High-level user impact and what "success" looks like:**
  - Stores with physical locations see their Local Discovery score and actionable gaps in the DEO Overview.
  - Global stores (no local presence) see "Not Applicable" status with NO penalty to their overall DEO score.
  - Users can preview and apply AI-generated local content fixes (Answer Blocks, city sections, service area descriptions).

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase LOCAL-1 – Local Discovery & Geo-Intent Signals
  - Phase LOCAL-1-TESTS – Local Discovery Automated Tests

- **Related documentation:**
  - `packages/shared/src/local-discovery.ts` (type definitions)
  - `apps/api/src/projects/local-discovery.service.ts` (service logic)
  - `apps/api/src/projects/local-discovery.controller.ts` (API endpoints)

---

## Preconditions

- **Environment requirements:**
  - [ ] Database running with LOCAL-1 migration applied
  - [ ] API server running
  - [ ] Web app running (for UI testing)

- **Test accounts and sample data:**
  - [ ] Test user with at least one project
  - [ ] For global store tests: Project with no local config or `hasPhysicalLocation=false`
  - [ ] For local store tests: Project with `hasPhysicalLocation=true` or `enabled=true`

- **Required user roles or subscriptions:**
  - [ ] Local Discovery is available to all tiers (no tier restriction)

---

## Test Scenarios (Happy Path)

### Scenario 1: Global Store - No Penalty

**ID:** HP-001

**Preconditions:**

- Project has no local config, or local config with `hasPhysicalLocation=false` and `enabled=false`

**Steps:**

1. Navigate to DEO Overview for the project
2. View the Local Discovery pillar tab

**Expected Results:**

- **UI:** Shows "Not Applicable" status badge
- **API:** `GET /projects/:id/local-discovery/scorecard` returns:
  - `applicabilityStatus: "not_applicable"`
  - `score: undefined` (no score)
  - `missingLocalSignalsCount: 0` (no penalty)
- **Issues Engine:** No local discovery issues appear for this project

---

### Scenario 2: Local Store - Initial Setup

**ID:** HP-002

**Preconditions:**

- Project exists with no local configuration

**Steps:**

1. Navigate to Local Discovery settings
2. Enable "Has Physical Location" toggle
3. Save configuration

**Expected Results:**

- **UI:** Local config saved successfully toast
- **API:** `PUT /projects/:id/local-discovery/config` accepts `{ hasPhysicalLocation: true }`
- **Scorecard:** Project now shows `applicabilityStatus: "applicable"` with initial score of 0

---

### Scenario 3: Local Store - Coverage Computation

**ID:** HP-003

**Preconditions:**

- Project configured as local (`hasPhysicalLocation=true`)
- No local signals present

**Steps:**

1. View Local Discovery scorecard
2. Verify score is 0 (weak)
3. Add a location_presence signal (via API or UI)
4. Refresh scorecard

**Expected Results:**

- **Initial:** Score = 0, Status = "weak"
- **After adding location_presence:** Score = 31 (10/32 \* 100), Status = "weak"
- **API:** `signalCounts.location_presence` = 1

---

### Scenario 4: Local Store - Full Coverage

**ID:** HP-004

**Preconditions:**

- Project configured as local

**Steps:**

1. Add signals for all 4 types:
   - location_presence
   - local_intent_coverage
   - local_trust_signals
   - local_schema_readiness
2. View scorecard

**Expected Results:**

- **Score:** 100
- **Status:** "strong"
- **Gaps:** Empty (no gaps)
- **Issues:** No local discovery issues

---

### Scenario 5: Fix Preview Flow (Draft-First)

**ID:** HP-005

**Preconditions:**

- Project configured as local with missing local_intent_coverage

**Steps:**

1. View gaps in Local Discovery
2. Click "Preview Fix" for local_intent_coverage gap
3. Select draft type: `local_answer_block`

**Expected Results:**

- **API:** `POST /projects/:id/local-discovery/preview` returns draft with:
  - `draftPayload.question` and `draftPayload.answer` populated
  - `generatedWithAi: true` (first time)
- **UI:** Shows preview with question/answer content

---

### Scenario 6: Fix Apply Flow

**ID:** HP-006

**Preconditions:**

- Draft from HP-005 exists

**Steps:**

1. Review draft content
2. Click "Apply" with target `ANSWER_BLOCK`

**Expected Results:**

- **API:** `POST /projects/:id/local-discovery/apply` succeeds
- **Response:** `success: true`, `issuesResolved: true`
- **Scorecard:** Updates to reflect new signal
- **Issues:** Related issue resolved

---

## Edge Cases

### EC-001: Unknown Applicability Status

**Description:** Project has no local config at all (not even empty config row)

**Steps:**

1. Create new project
2. Immediately check local discovery scorecard (before any config interaction)

**Expected Behavior:**

- Scorecard returns `applicabilityStatus: "unknown"`
- `applicabilityReasons: ["no_local_indicators"]`
- No score (undefined), no penalty

---

### EC-002: Manual Override Enabled

**Description:** User enables local discovery manually even without physical location

**Steps:**

1. Set config: `{ hasPhysicalLocation: false, enabled: true }`
2. Check applicability

**Expected Behavior:**

- `applicabilityStatus: "applicable"`
- `applicabilityReasons: ["manual_override_enabled"]`
- Score and gaps computed normally

---

### EC-003: Diminishing Returns for Multiple Signals

**Description:** Adding multiple signals of same type should have diminishing returns

**Steps:**

1. Add 3 location_presence signals
2. Check score

**Expected Behavior:**

- Score = 47 (15/32 _ 100), NOT 93 (30/32 _ 100)
- Bonus formula: base + min(count-1, 2) _ 0.25 _ weight

---

### EC-004: Draft Reuse (CACHE/REUSE v2)

**Description:** Same preview request should reuse cached draft

**Steps:**

1. Preview a fix with specific parameters
2. Preview again with identical parameters

**Expected Behavior:**

- Second request returns `generatedWithAi: false`
- Same draft content returned (from cache)

---

## Error Handling

### ERR-001: Project Not Found

**Scenario:** Accessing local discovery for non-existent project

**Steps:**

1. Call `GET /projects/fake-id/local-discovery`

**Expected Behavior:**

- 404 Not Found response
- Error message: "Project not found"

---

### ERR-002: Unauthorized Access

**Scenario:** User tries to access another user's project

**Steps:**

1. Authenticate as User A
2. Call `GET /projects/{user-b-project-id}/local-discovery`

**Expected Behavior:**

- 403 Forbidden response
- Error message: "You do not have access to this project"

---

### ERR-003: Invalid Config Values

**Scenario:** Submitting invalid config payload

**Steps:**

1. Call `PUT /projects/:id/local-discovery/config` with invalid JSON

**Expected Behavior:**

- 400 Bad Request response
- Validation error message

---

### ERR-004: Apply Without Valid Draft

**Scenario:** Trying to apply a draft that doesn't exist or is expired

**Steps:**

1. Call `POST /projects/:id/local-discovery/apply` with `draftId: "fake-id"`

**Expected Behavior:**

- 404 Not Found or appropriate error
- Clear error message about missing draft

---

## Limits

### LIM-001: No Tier Restrictions

**Scenario:** Local Discovery is available to all subscription tiers

**Steps:**

1. Test with Free tier user
2. Test with Pro tier user
3. Test with Business tier user

**Expected Behavior:**

- All tiers can access Local Discovery features
- No upgrade prompts for basic functionality

---

### LIM-002: AI Generation Limits

**Scenario:** AI-powered fix previews may be subject to AI usage limits

**Steps:**

1. Generate many fix previews

**Expected Behavior:**

- Respects AI usage quotas from CACHE/REUSE v2
- Shows appropriate message if quota exceeded
- (Note: Specific limits depend on tier and AI quota implementation)

---

## Regression

### Areas potentially impacted:

- [ ] **DEO Issues Engine:** Local issues should integrate correctly with other pillar issues
- [ ] **DEO Score Computation:** Local Discovery pillar should not affect score for global stores
- [ ] **Project Overview:** Local Discovery tab should appear correctly in pillar navigation

### Quick sanity checks:

- [ ] Global store DEO score unaffected by Local Discovery
- [ ] Other pillars (Metadata, Content, etc.) still work correctly
- [ ] Issues Engine shows correct pillarId for local issues

---

## Post-Conditions

### Data cleanup steps:

- [ ] Remove test local signals created during testing
- [ ] Reset local config for test projects
- [ ] Delete test fix drafts

### Follow-up verification:

- [ ] Confirm no orphaned local discovery records
- [ ] Verify coverage cache invalidation works correctly

---

## Known Issues

- **Intentionally accepted issues:**
  - No GMB (Google My Business) management in v1
  - No map rank tracking in v1
  - No multi-location/franchise tooling in v1
  - No geo-rank promises or external location API integrations in v1

- **Out-of-scope items:**
  - Physical location verification
  - Automatic local intent detection from product categories (future enhancement)
  - Content analysis for region mentions (future enhancement)

- **TODOs:**
  - [ ] Add UI components for Local Discovery pillar tab
  - [ ] Implement fix preview/apply UI flows
  - [ ] Add local config settings UI

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | [Any additional notes]                |
