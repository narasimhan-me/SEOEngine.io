# Phase AE-2 – Product Automations (Metadata, Content, Drift, Sync)

> Manual testing checklist for Phase AE-2: Product Automation Library design and specification.

---

## Phase Overview

**Phase:** AE-2 – Product Automations
**Type:** Design & Test Scaffolding
**Status:** Documentation Complete
**Depends On:** Phase AE-1 (Automation Engine Foundations)

---

## Deliverables Checklist

### Documentation

- [ ] `docs/AUTOMATION_ENGINE_SPEC.md` Section 8 complete
  - [ ] Section 8.1 Goals defined
  - [ ] Section 8.2 Product Automation Categories defined
    - [ ] A. Metadata Automations
    - [ ] B. Content Automations
    - [ ] C. Drift Correction Automations
    - [ ] D. Shopify Sync Automations
  - [ ] Section 8.3 Conditions & Safeguards defined
  - [ ] Section 8.4 AE-2 Sub-Phases defined

- [ ] `docs/testing/automation-engine-product-automations.md` created
  - [ ] Metadata automation test scenarios
  - [ ] Content automation test scenarios
  - [ ] Drift correction test scenarios
  - [ ] Shopify sync test scenarios
  - [ ] Safety & quality tests
  - [ ] Integration tests
  - [ ] Logging & audit tests

- [ ] `docs/manual-testing/phase-ae-2-product-automations.md` created (this file)

- [ ] `docs/testing/CRITICAL_PATH_MAP.md` updated
  - [ ] CP-012 references AE-2 testing doc

- [ ] `IMPLEMENTATION_PLAN.md` updated
  - [ ] Phase AE-2 section added after AE-1

- [ ] `docs/answers-overview.md` updated
  - [ ] AE-2 reference added (if applicable)

---

## Specification Verification

### 8.1 Goals Verification

Verify the spec defines these goals for Product Automations:

- [ ] Automatically improve product metadata when safe
- [ ] Automatically generate or enrich product content elements
- [ ] Detect and correct metadata drift
- [ ] Orchestrate Shopify sync operations for automated changes
- [ ] Scope limited to product surfaces (pages deferred to later phases)

### 8.2 Automation Categories Verification

#### A. Metadata Automations

- [ ] Auto-generate missing SEO Titles defined
- [ ] Auto-generate missing SEO Descriptions defined
- [ ] Auto-improve weak titles defined
- [ ] Auto-improve weak descriptions defined
- [ ] Auto-generate alt text mentioned (future AE-2.1.x)
- [ ] Auto-populate missing product type defined
- [ ] Triggers documented:
  - [ ] New product detected (Shopify sync)
  - [ ] Product updated with missing/changed metadata
  - [ ] Crawl signals indicate missing/weak metadata
  - [ ] Issue Engine flags metadata issues
- [ ] Safety rules documented:
  - [ ] No hallucination rule
  - [ ] Skip if insufficient data
  - [ ] Respect daily limits
  - [ ] Log generation attempts with confidence

#### B. Content Automations

- [ ] Auto-generate long description defined
- [ ] Auto-expand thin descriptions defined
- [ ] Auto-enhance entity completeness defined
- [ ] Auto-generate feature bullet lists defined
- [ ] Triggers documented
- [ ] Safety rules documented:
  - [ ] Only factual content from structured data
  - [ ] Avoid promotional tone
  - [ ] Skip when source data insufficient

#### C. Drift Correction Automations

- [ ] Definition of "Drift" documented:
  - [ ] Shopify overwriting optimized metadata
  - [ ] Manual edits removing required fields
  - [ ] External tools reverting changes
- [ ] Detect metadata drift defined
- [ ] Optionally reverse regressions defined
- [ ] Notify users on detection defined
- [ ] Triggers documented:
  - [ ] Sync mismatch detected
  - [ ] Periodic drift scan
- [ ] Modes by Plan defined:
  - [ ] Free: Notify-only
  - [ ] Pro: Auto-correct when allowed
  - [ ] Business: Full auto-correct with proactive scanning

#### D. Shopify Sync Automations

- [ ] Auto-sync metadata after automation changes defined
- [ ] Auto-sync Answer Blocks mentioned (future AE-5)
- [ ] Auto-sync structured data defined
- [ ] Attempt repair of missing Shopify fields defined
- [ ] Triggers documented
- [ ] Entitlements by plan defined:
  - [ ] Free: No automated writes
  - [ ] Pro: Limited auto-sync
  - [ ] Business: Full sync capabilities

### 8.3 Conditions & Safeguards Verification

#### Data Safety

- [ ] Never overwrite user content without:
  - [ ] Reliable confidence score
  - [ ] Applicable rule allowing correction
  - [ ] Recorded log entry with snapshots

#### AI Safety

- [ ] No hallucinations rule documented
- [ ] Skip and log when data insufficient
- [ ] All AI content must trace to source data

#### Plan Limits

- [ ] Free: Minimal automations with small caps
- [ ] Pro: Moderate daily caps with drift corrections
- [ ] Business: Higher/unlimited executions

#### Testing Expectations

- [ ] Metadata automations testing required
- [ ] Content automations testing required
- [ ] Drift detection testing required
- [ ] Shopify sync testing required
- [ ] Skipped automation paths testing required
- [ ] Confidence thresholds testing required

### 8.4 AE-2 Sub-Phases Verification

- [ ] AE-2.1 defined: Metadata Automations
- [ ] AE-2.2 defined: Content Automations
- [ ] AE-2.3 defined: Drift Correction System
- [ ] AE-2.4 defined: Shopify Sync Automations

---

## Type Alignment Verification

Verify Product Automations align with existing shared types:

### AutomationRuleId Alignment

- [ ] `AUTO_GENERATE_METADATA_ON_NEW_PRODUCT` maps to Metadata Automations
- [ ] `AUTO_GENERATE_METADATA_FOR_MISSING_METADATA` maps to Metadata Automations
- [ ] `AUTO_GENERATE_METADATA_FOR_THIN_CONTENT` maps to Content Automations

### AutomationTargetSurface Alignment

- [ ] `product` surface used for all AE-2 automations
- [ ] `page` surface deferred to later phases

### AutomationKind Alignment

- [ ] Metadata automations use `immediate` kind
- [ ] Drift scanning uses `scheduled` kind
- [ ] Background content improvements use `background` kind

---

## Cross-Reference Verification

### Entitlements Matrix

- [ ] `docs/ENTITLEMENTS_MATRIX.md` Section 4.4 reflects AE-2 automation types
- [ ] Plan-specific automation capabilities match spec

### Token Usage Model

- [ ] `docs/TOKEN_USAGE_MODEL.md` includes automation source labels
- [ ] Product automation token logging documented

### Critical Path Map

- [ ] CP-012 includes AE-2 testing document reference
- [ ] Key scenarios updated for product automations

### Implementation Plan

- [ ] Phase AE-2 section added
- [ ] Dependencies on AE-1 documented
- [ ] Sub-phases (AE-2.1 through AE-2.4) listed

---

## Integration Point Verification

### Crawl Pipeline

- [ ] Crawl completion triggers metadata automations documented
- [ ] Thin content detection triggers content automations documented

### Issue Engine

- [ ] Issue types that trigger automations listed
- [ ] Auto-fix flow documented

### Shopify Sync

- [ ] Write-back triggers documented
- [ ] Sync entitlements by plan documented

### Existing AutomationService

- [ ] v0 compatibility maintained
- [ ] `scheduleSuggestionsForProject` behavior unchanged

---

## Document Quality Checks

- [ ] All tables render correctly in markdown
- [ ] All cross-references to other docs are valid paths
- [ ] No placeholder text remaining
- [ ] Consistent terminology with AE-1 framework
- [ ] Version history updated

---

## Phase Completion Criteria

Phase AE-2 is complete when:

1. [ ] All documentation deliverables created
2. [ ] All specification sections verified
3. [ ] All type alignments confirmed
4. [ ] All cross-references verified
5. [ ] All integration points documented
6. [ ] This manual testing checklist passes

---

## AE-2.1 Implementation Test Scenarios

### Schema Migration Tests

- [ ] Run `npx prisma migrate dev` successfully
- [ ] Verify `appliedAt` column added to `AutomationSuggestion` table
- [ ] Verify existing suggestions retain `applied = false` and `appliedAt = null`

### Backend Tests

#### EntitlementsService

- [ ] `canAutoApplyMetadataAutomations` returns `false` for Free plan users
- [ ] `canAutoApplyMetadataAutomations` returns `true` for Pro plan users
- [ ] `canAutoApplyMetadataAutomations` returns `true` for Business plan users

#### AutomationService Auto-Apply Logic

**Free Plan User (suggestions only):**
- [ ] Create new product with missing SEO metadata
- [ ] Trigger crawl or automation suggestion generation
- [ ] Verify `AutomationSuggestion` created with `applied = false`, `appliedAt = null`
- [ ] Verify product's `seoTitle` and `seoDescription` remain empty
- [ ] User can manually apply suggestion from UI

**Pro/Business Plan User (auto-apply):**
- [ ] Create new product with missing SEO metadata
- [ ] Trigger crawl or automation suggestion generation
- [ ] Verify `AutomationSuggestion` created with `applied = true`, `appliedAt = <timestamp>`
- [ ] Verify product's `seoTitle` and `seoDescription` are populated
- [ ] Product optimization page shows "Applied by Automation Engine" badge

**Auto-Apply Safety (only empty fields):**
- [ ] Create product with existing `seoTitle` but missing `seoDescription`
- [ ] Trigger automation for Pro user
- [ ] Verify only `seoDescription` is filled (existing title preserved)
- [ ] Verify `appliedAt` is set even for partial fills

**Thin Content (suggestions only for all plans):**
- [ ] Create product with thin content (short description)
- [ ] Trigger automation for Pro/Business user
- [ ] Verify suggestion created with `applied = false` (thin content requires review)
- [ ] Verify product content is NOT auto-modified

### Frontend Tests

#### ProductAiSuggestionsPanel

- [ ] When `automationSuggestion.applied === true && appliedAt` is set:
  - [ ] Green "Applied by Automation Engine" badge displays
  - [ ] Checkmark icon visible
  - [ ] Applied timestamp visible (if date is recent)
- [ ] When `automationSuggestion.applied === false`:
  - [ ] No applied badge shown
  - [ ] "Apply to editor" buttons visible

#### Product Optimization Page

- [ ] **Recent auto-apply detection:**
  - [ ] Navigate to product with auto-applied suggestion (within 24 hours)
  - [ ] Verify success toast appears: "Automation Engine improved this product's metadata automatically."
  - [ ] Verify toast only appears once per page load (not on re-fetch)
- [ ] **No auto-apply (old or none):**
  - [ ] Navigate to product without recent auto-apply
  - [ ] Verify no auto-apply toast appears
- [ ] **Editor pre-populated:**
  - [ ] Verify SEO editor fields show the auto-applied values
  - [ ] User can still edit and save to Shopify

#### Automation Activity Page

- [ ] Page loads at `/projects/[id]/automation/`
- [ ] Summary stats show:
  - [ ] Total suggestions count
  - [ ] Applied count (green)
  - [ ] Pending count (amber)
- [ ] Applied suggestions section:
  - [ ] Green styling
  - [ ] "Applied" badge with checkmark
  - [ ] Applied timestamp displayed
  - [ ] Link to product optimization page
  - [ ] Suggested title/description preview
- [ ] Pending suggestions section:
  - [ ] Amber styling
  - [ ] "Pending" badge
  - [ ] Generated timestamp displayed
  - [ ] "Review & Apply" link to product page
- [ ] Empty state when no suggestions

### Integration Tests

- [ ] **Full flow (Pro user):**
  1. Create new Shopify product (missing metadata)
  2. Trigger product sync
  3. Automation generates and auto-applies metadata
  4. Navigate to product optimization page
  5. See toast notification
  6. See "Applied by Automation Engine" badge
  7. Navigate to Automation Activity page
  8. See suggestion in "Applied" section

- [ ] **Full flow (Free user):**
  1. Create new Shopify product (missing metadata)
  2. Trigger product sync
  3. Automation generates suggestion (not auto-applied)
  4. Navigate to product optimization page
  5. No auto-apply toast
  6. See suggestion in panel (not applied)
  7. Manually apply suggestion
  8. Navigate to Automation Activity page
  9. See suggestion still in "Pending" section (until user applies)

---

## Notes

- **AE-2.1 implementation complete**: Metadata automations with plan-aware auto-apply are now implemented
- **Implementation deferred for AE-2.2-2.4**: Content, drift, and sync automations remain design-only
- **Product-only scope**: Page automations are explicitly out of scope for AE-2

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-08 | Initial Phase AE-2 manual testing document |
| 1.1 | 2025-12-08 | Added AE-2.1 Implementation Test Scenarios |
