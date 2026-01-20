# OFFSITE-1 Manual Testing Script

## Overview

This document provides a manual testing script for the Off-site Signals pillar implementation (OFFSITE-1).

## Prerequisites

1. Running local development environment (API + Web)
2. Test project with products synced
3. Logged in as test user

## Test Scenarios

### 1. Off-site Pillar Visibility

**Steps:**

1. Navigate to DEO Overview (`/projects/[id]/deo`)
2. Locate the "Off-site Signals" pillar card

**Expected:**

- Pillar card is visible (not "Coming Soon")
- Shows presence score (0-100)
- Shows status (Low/Medium/Strong)
- Shows signal count and gap count
- "View issues" link works
- "Go to workspace" link navigates to backlinks page

### 2. Off-site Workspace Display

**Steps:**

1. Navigate to Off-site Signals workspace (`/projects/[id]/backlinks`)
2. Review the page layout

**Expected:**

- Page header shows "Off-site Signals"
- Ethical boundaries notice is displayed
- OffsiteSignalsPanel shows:
  - Overall presence score and status
  - Signal counts by type (Trust Proof, Authoritative Listing, Brand Mention, Reference Content)
  - Total signals and high-impact gaps count
- Gaps section shows detected gaps with severity badges
- Note about v1 limitations is visible

### 3. Gap Detection (No Signals)

**Steps:**

1. Use a project with no configured off-site signals
2. Navigate to Off-site Signals workspace

**Expected:**

- Presence score is low (close to 0)
- Status shows "Low"
- Gaps include:
  - Missing Trust Proof (critical severity)
  - Missing Authoritative Listing (critical/warning)
  - Missing Brand Mentions (warning)
  - Competitor gaps (if applicable)
- Each gap shows:
  - Severity badge
  - Signal type
  - Description/example
  - "Preview Fix" button

### 4. Preview Fix Flow

**Steps:**

1. Click "Preview Fix" on any gap
2. Select a draft type (e.g., "Outreach Email")
3. Wait for draft generation

**Expected:**

- Loading indicator shows while generating
- Draft preview modal opens
- Modal shows:
  - AI generation indicator (if AI was used)
  - Draft content (subject, body for email; summary, bullets for profile)
  - Apply action buttons
  - Cancel button
- Draft content is professional and ethical
- No spam or manipulative language

### 5. Draft Reuse (CACHE/REUSE v2)

**Steps:**

1. Preview a fix for a specific gap
2. Close the modal
3. Preview the same fix again

**Expected:**

- Second request returns quickly
- Draft is marked as reused (generatedWithAi = false)
- Content is identical to first request
- No additional AI usage recorded

### 6. Apply Fix Flow

**Steps:**

1. Preview a fix
2. Click "Save to Notes" or "Add to Outreach Queue"

**Expected:**

- Apply action completes without error
- Modal closes
- Coverage is refreshed
- No AI call is made during apply
- Success feedback is shown

### 7. DEO Issues Integration

**Steps:**

1. Navigate to Issues page (`/projects/[id]/issues`)
2. Filter by "Off-site Signals" pillar

**Expected:**

- Off-site issues are displayed
- Each issue shows:
  - Title (e.g., "Missing Trust Proof")
  - Description
  - Severity badge
  - Signal type
  - Recommended action
- Issues link to Off-site workspace

### 8. Off-site Scorecard in DEO Overview

**Steps:**

1. Navigate to DEO Overview
2. Observe the Off-site Signals pillar card

**Expected:**

- Card shows specific off-site data:
  - Presence score (e.g., "0/100 presence")
  - Signal and gap counts
- Status badge reflects scorecard status
- Card is not generic "Coming Soon"

### 9. Ethical Content Verification

**Steps:**

1. Generate multiple draft types:
   - Outreach Email
   - PR Pitch
   - Brand Profile Snippet
   - Review Request Copy

**Expected:**

- All generated content is:
  - Professional and respectful
  - Free of spam language
  - Non-manipulative
  - Contains no false promises
- Review request copy:
  - Does not offer incentives
  - Is polite and optional
  - Respects customer autonomy

### 10. Error Handling

**Steps:**

1. Simulate network error (disconnect)
2. Attempt to load off-site data

**Expected:**

- Error message is displayed
- "Try again" option is available
- No crash or blank screen

## Regression Testing

After any changes, verify:

1. DEO Overview still loads all pillars
2. Issues Engine includes off-site issues
3. Other pillar workspaces are not affected
4. AI usage ledger records off-site runs correctly
5. No console errors in browser

## Automated Test Coverage (OFFSITE-1-TESTS)

The following functionality is covered by automated tests and does not require manual verification:

### Unit Tests (47 tests)

**Shared Types (`tests/unit/offsite-signals/offsite-signals-types.test.ts`):**

- Score classification (Low/Medium/Strong thresholds)
- Severity calculation based on signal/gap types
- Work key generation for CACHE/REUSE v2
- Signal type to gap type mapping
- Type constants validation

**Service Logic (`tests/unit/offsite-signals/offsite-signals.service.test.ts`):**

- Coverage computation with weighted scoring
- Diminishing returns for multiple signals
- Gap generation from coverage data
- DEO issue building
- Signal CRUD operations
- Coverage caching

### Integration Tests (`tests/integration/offsite-signals/offsite-signals.integration.test.ts`)

- Signal creation and retrieval
- Coverage persistence
- Gap analysis with real data
- Access control

### Running Automated Tests

```bash
# Run all Off-site Signals tests
cd apps/api && npx jest --config jest.config.ts --testPathPattern="offsite-signals"

# Run with test database (integration tests)
ENGINEO_E2E=1 pnpm test:api -- --testPathPattern="offsite-signals"
```

## Future v1.1+ Considerations

Document expected behavior when:

- External data sources are added
- Product-level signals are implemented
- Automated detection is improved

These tests will be added when features are implemented.
