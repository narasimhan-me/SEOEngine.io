# Phase AE-1 – Automation Engine Foundations (Framework & Spec) Manual Testing

> Manual testing guide for Phase AE-1: Automation Engine shared types, specifications, and framework documentation.

---

## Overview

- **Purpose of this testing doc:**
  - Verify that the Automation Engine foundations are correctly implemented and documented.

- **Phase AE-1 covers:**
  - Shared Automation Engine types in `@engineo/shared`
  - Automation rule model and classification (immediate, scheduled, background)
  - Trigger → Evaluate → Execute → Log lifecycle specification
  - Integration of automation concepts into entitlements and architecture docs
  - Critical path registration

- **High-level user impact and what "success" looks like:**
  - Automation Engine model is well-defined and documented
  - Types are consistent between code and specifications
  - Integration points with existing systems are clear
  - Foundation is ready for implementation phases (AE-2+)

- **Related phases/sections:**
  - Phase AE-2 (Product Automation Library)
  - Phase AE-3 (DEO Score Automations)
  - Phase AE-4 (Issues Engine Automations)
  - Phase AE-5 (Answer Engine Automations)
  - Phase AE-6 (Automation Center UI)

---

## Preconditions

- **Repository requirements:**
  - [ ] Repo updated with Automation Engine shared types
  - [ ] Spec and documentation files created
  - [ ] Entitlements and token usage docs updated

- **Files to verify:**
  - [ ] `packages/shared/src/automation-engine.ts` exists
  - [ ] `docs/AUTOMATION_ENGINE_SPEC.md` exists
  - [ ] `docs/testing/automation-engine.md` exists
  - [ ] `docs/testing/CRITICAL_PATH_MAP.md` includes CP-012

---

## Test Scenarios

### Scenario 1: Shared types match conceptual model

**ID:** AE1-AUT-001

**Steps:**

1. Open `packages/shared/src/automation-engine.ts`
2. Compare types against `docs/AUTOMATION_ENGINE_SPEC.md` Section 4

**Expected Results:**

| Type                        | Code       | Spec       | Match |
| --------------------------- | ---------- | ---------- | ----- |
| `AutomationKind`            | 3 values   | 3 kinds    | [ ]   |
| `AutomationTargetSurface`   | 6 values   | 6 surfaces | [ ]   |
| `AutomationExecutionStatus` | 5 values   | 5 statuses | [ ]   |
| `AutomationRuleId`          | 9 values   | 9 rules    | [ ]   |
| `AutomationRuleConfig`      | All fields | Section 4  | [ ]   |
| `AutomationRule`            | All fields | Section 4  | [ ]   |
| `AutomationRun`             | All fields | Section 4  | [ ]   |
| `AutomationSettings`        | All fields | Section 4  | [ ]   |

**Verification:**

- [ ] All 3 automation kinds: `immediate`, `scheduled`, `background`
- [ ] All 6 target surfaces: `product`, `page`, `answer_block`, `entity`, `project`, `deo_score`
- [ ] All 5 execution statuses: `pending`, `running`, `succeeded`, `failed`, `skipped`
- [ ] All 9 rule IDs present and documented

---

### Scenario 2: Specification document completeness

**ID:** AE1-AUT-002

**Steps:**

1. Open `docs/AUTOMATION_ENGINE_SPEC.md`
2. Verify all required sections present

**Expected Results:**

| Section                              | Present | Complete |
| ------------------------------------ | ------- | -------- |
| 1. Purpose & Vision                  | [ ]     | [ ]      |
| 2. Automation Types                  | [ ]     | [ ]      |
| 3. Decision Framework                | [ ]     | [ ]      |
| 4. Schema-Level Concepts             | [ ]     | [ ]      |
| 5. Integration with Existing Systems | [ ]     | [ ]      |
| 6. Entitlements & Limits             | [ ]     | [ ]      |
| 7. Phasing Roadmap                   | [ ]     | [ ]      |
| 8. Security & Safety                 | [ ]     | [ ]      |
| 9. Acceptance Criteria               | [ ]     | [ ]      |

**Key Content Verification:**

- [ ] Trigger → Evaluate → Execute → Log lifecycle documented
- [ ] Entitlement interactions described by plan
- [ ] Integration with crawl pipeline documented
- [ ] AE-1 through AE-6 roadmap listed
- [ ] Non-destructive behavior requirements specified

---

### Scenario 3: Entitlements matrix updated

**ID:** AE1-AUT-003

**Steps:**

1. Open `docs/ENTITLEMENTS_MATRIX.md`
2. Find Section 4.4 Automations

**Expected Results:**

- [ ] Basic vs Advanced automation distinction documented
- [ ] Free/Pro/Business automation expectations described
- [ ] Reference to Automation Engine spec included
- [ ] Token usage reference for AI-powered automations

---

### Scenario 4: Token usage model updated

**ID:** AE1-AUT-004

**Steps:**

1. Open `docs/TOKEN_USAGE_MODEL.md`
2. Verify automation-related updates

**Expected Results:**

- [ ] Automations mentioned in token usage table
- [ ] Automation source label guidance included
- [ ] Reference to Automation Engine spec

---

### Scenario 5: Critical path map updated

**ID:** AE1-AUT-005

**Steps:**

1. Open `docs/testing/CRITICAL_PATH_MAP.md`
2. Find CP-012 entry

**Expected Results:**

- [ ] CP-012 entry exists with title "Automation Engine (Framework & Rules)"
- [ ] Manual Testing Doc(s) references:
  - `docs/testing/automation-engine.md`
  - `docs/manual-testing/phase-ae-1-automation-engine-foundations.md`
- [ ] Key scenarios include:
  - Automation rule model documented
  - Entitlement interactions specified
  - Integration with crawl pipeline documented
  - Non-destructive behavior defined
- [ ] Coverage Summary includes CP-012 row

---

### Scenario 6: Build verification

**ID:** AE1-AUT-006

**Steps:**

1. Run `pnpm --filter shared build`
2. Check for TypeScript errors

**Expected Results:**

- [ ] Build completes successfully
- [ ] No TypeScript errors related to automation-engine.ts
- [ ] Types are exported correctly from `@engineo/shared`

---

## Edge Cases

### EC-001: Type consistency across packages

**Description:** Verify types are accessible from other packages.

**Steps:**

1. Check that shared package exports automation-engine types
2. Verify API package can import types (if needed)

**Expected Behavior:**

- Types are importable: `import { AutomationRule } from '@engineo/shared'`
- No circular dependency issues

---

### EC-002: Documentation link integrity

**Description:** Verify all internal documentation links are valid.

**Steps:**

1. Check links in `docs/AUTOMATION_ENGINE_SPEC.md`
2. Check links in `docs/testing/automation-engine.md`

**Expected Behavior:**

- All referenced files exist
- No broken internal links

---

## Error Handling

### ERR-001: Missing prerequisite files

**Scenario:** Required files don't exist.

**Expected Behavior:**

- Test fails with clear indication of missing file
- Checklist shows which files are missing

---

## Regression

### Areas potentially impacted:

- [ ] **Shared package:** Types compile correctly
- [ ] **Existing code:** No imports break
- [ ] **Existing automation:** AutomationSuggestion behavior unchanged
- [ ] **Documentation:** No broken links to new files

### Quick sanity checks:

- [ ] `pnpm --filter shared build` passes
- [ ] `pnpm --filter api build` passes (if applicable)
- [ ] No new TypeScript errors anywhere in repo
- [ ] Existing automation suggestions still generate after crawl

---

## Post-Conditions

### Verification complete when:

- [ ] All 6 test scenarios pass
- [ ] Edge cases verified
- [ ] No build errors

### Follow-up:

- [ ] Phase AE-2 can begin (product automation library)
- [ ] Types remain stable for implementation phases

---

## Approval

| Field              | Value                                                         |
| ------------------ | ------------------------------------------------------------- |
| **Tester Name**    | [Pending]                                                     |
| **Date**           | [YYYY-MM-DD]                                                  |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed                         |
| **Notes**          | Phase AE-1 – Automation Engine Foundations (Framework & Spec) |
