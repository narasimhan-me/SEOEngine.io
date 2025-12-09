# EngineO.ai – System-Level Manual Testing: Automation Engine Product Automations (Phase AE-2)

> System-level testing document for Product Automations within the Automation Engine.

---

## 1. Overview

This document covers testing for **Phase AE-2 – Product Automation Library**, which introduces product-level automations for metadata, content, drift correction, and Shopify sync operations.

**Reference Documents:**
- `docs/AUTOMATION_ENGINE_SPEC.md` (Section 8 – Product Automations)
- `docs/testing/automation-engine.md` (AE-1 Framework testing)
- `docs/ENTITLEMENTS_MATRIX.md` (Section 4.4 Automations)

---

## 2. Automation Categories to Test

### 2.1 Metadata Automations

**Rules:**
- `AUTO_GENERATE_METADATA_ON_NEW_PRODUCT`
- `AUTO_GENERATE_METADATA_FOR_MISSING_METADATA`
- `AUTO_GENERATE_METADATA_FOR_THIN_CONTENT`

**Test Scenarios:**

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| META-001 | New product synced with missing SEO title | Automation triggers, generates title based on product data |
| META-002 | New product synced with missing SEO description | Automation triggers, generates description based on product data |
| META-003 | Product has weak/short title (< 30 chars) | Automation detects and improves title |
| META-004 | Product has thin description (< 40 words) | Automation detects and expands description |
| META-005 | Product has insufficient data for generation | Automation skips with logged reason ("insufficient_data") |
| META-006 | Daily automation limit reached | Automation skips with logged reason ("daily_limit_reached") |
| META-007 | User on Free plan hits automation cap | Automation blocked, user notified |

### 2.2 Content Automations

**Test Scenarios:**

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| CONT-001 | Product missing long description | Automation generates long description from available data |
| CONT-002 | Product has thin description (< 60 words) | Automation expands description with factual content |
| CONT-003 | Product missing feature bullet list | Automation generates bullets from specs/attributes |
| CONT-004 | Source data insufficient for content | Automation skips rather than hallucinating |
| CONT-005 | Generated content reviewed for factual accuracy | Content traces back to source product data |

### 2.3 Drift Correction Automations

**Test Scenarios:**

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| DRIFT-001 | Shopify overwrites optimized SEO title | Drift detected, logged in automation run |
| DRIFT-002 | Manual edit removes required field | Drift detected, flagged for review |
| DRIFT-003 | Free plan user with drift detected | Notify-only, no auto-correction |
| DRIFT-004 | Pro plan user with drift detected | Auto-correct when allowed by settings |
| DRIFT-005 | Business plan with proactive drift scanning | Scheduled drift scan runs, corrections applied |
| DRIFT-006 | Drift correction respects user settings | If mode is `review_before_apply`, suggestion created instead |

### 2.4 Shopify Sync Automations

**Test Scenarios:**

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| SYNC-001 | Metadata automation completes, write-back needed | Auto-sync triggers for Shopify metafields |
| SYNC-002 | Free plan user attempts auto-sync | Blocked, suggestions created instead |
| SYNC-003 | Pro plan user with auto-sync enabled | Limited sync operations allowed |
| SYNC-004 | Business plan with full sync | Unrestricted sync for products, pages, answers |
| SYNC-005 | Sync failure due to Shopify API error | Error logged, user notified, retry scheduled |
| SYNC-006 | Sync respects daily execution caps | Sync blocked when cap reached |

---

## 3. Safety & Quality Tests

### 3.1 No-Hallucination Rule

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| SAFE-001 | Generate content with minimal product data | Automation skips, logs "cannot_generate_safely" |
| SAFE-002 | Verify generated content sources | All facts traceable to product attributes |
| SAFE-003 | Confidence score below threshold | Content flagged for review, not auto-applied |

### 3.2 Data Safety

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| SAFE-004 | User-written content exists | Never overwritten without high confidence + rule allowance |
| SAFE-005 | Automation fails mid-execution | Graceful failure, no partial writes, error logged |
| SAFE-006 | Rollback capability | Before/after snapshots stored for audit |

### 3.3 Plan Limit Enforcement

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| LIMIT-001 | Free: >5 automations/day attempted | 6th automation blocked |
| LIMIT-002 | Pro: >25 automations/day attempted | 26th automation blocked |
| LIMIT-003 | Business: high volume automations | Allowed up to safety limits |
| LIMIT-004 | Token limit reached | AI automations blocked, user notified |

---

## 4. Integration Tests

### 4.1 Crawl Pipeline Integration

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| INT-001 | Crawl completes for project | Eligible metadata automations triggered |
| INT-002 | Crawl detects thin content | `AUTO_GENERATE_METADATA_FOR_THIN_CONTENT` eligible to run |
| INT-003 | Multiple products need automation | Queue processes within daily limits |

### 4.2 Issue Engine Integration

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| INT-004 | Issue `missing_seo_title` detected | Metadata automation eligible |
| INT-005 | Issue `thin_content` detected | Content automation eligible |
| INT-006 | AI-fixable issue fixed by automation | Issue marked resolved after automation success |

### 4.3 Entitlements Integration

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| INT-007 | EntitlementsService queried before AI call | Entitlements checked, limits enforced |
| INT-008 | TokenUsageService tracks automation tokens | Usage logged with source `automation:{ruleId}` |
| INT-009 | Plan upgrade mid-month | New limits immediately available |

---

## 5. Logging & Audit Tests

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| LOG-001 | Successful automation run | AutomationRun created with status `succeeded` |
| LOG-002 | Skipped automation | AutomationRun created with status `skipped`, `reasonSkipped` populated |
| LOG-003 | Failed automation | AutomationRun created with status `failed`, error details logged |
| LOG-004 | Before/after snapshots | Snapshots stored for audit trail |
| LOG-005 | Token usage logged | TokenUsage record created with automation source label |

---

## 6. UI/UX Tests (Future – AE-6)

These tests are placeholders for when Automation Center UI is implemented:

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| UI-001 | Automation Activity Log displays runs | All automation runs visible with status |
| UI-002 | User can enable/disable automation categories | Settings persist and affect automation behavior |
| UI-003 | User can switch between auto_apply and review modes | Mode change reflected in automation execution |
| UI-004 | Daily limit usage displayed | Progress bar shows automations used/remaining |

---

## 7. Regression Tests

After any changes to automation logic, verify:

- [ ] Existing `AutomationSuggestion` flows still work (v0 compatibility)
- [ ] `AutomationService.scheduleSuggestionsForProject` unchanged behavior
- [ ] All automation types respect entitlements
- [ ] Token logging includes automation source labels
- [ ] No data corruption on automation failure

---

## 8. Test Environment Setup

### Prerequisites

1. Test project with Shopify connection
2. Products with varying metadata completeness:
   - Product with complete metadata
   - Product with missing SEO title
   - Product with missing SEO description
   - Product with thin description (< 40 words)
   - Product with weak title (< 30 chars)
3. User accounts on each plan tier (Free, Pro, Business)
4. Access to automation settings

### Test Data Requirements

- At least 10 products per test scenario
- Products with traceable source attributes for verification
- Clear before/after states for drift testing

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-08 | Initial Product Automations testing document (Phase AE-2) |
