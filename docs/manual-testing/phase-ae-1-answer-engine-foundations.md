# Phase AE-1 – Answer Engine Foundations (Model & Spec) Manual Testing

> Manual testing guide for Phase AE-1: Answer Engine shared types, specifications, and documentation.

---

## Overview

- **Purpose of this testing doc:**
  - Verify that the Answer Engine foundations are correctly implemented and documented.

- **Phase AE-1 covers:**
  - Shared Answer Engine types (`AnswerBlock`, `AnswerabilityStatus`)
  - Core Answer Block question taxonomy (10 canonical questions)
  - Answer Engine specification and integration design
  - Critical path and manual testing documentation

- **High-level user impact and what "success" looks like:**
  - Answer Engine model is well-defined and documented
  - Types are consistent between code and specifications
  - Integration points with DEO Score v2 and Issue Engine are clear
  - Foundation is ready for implementation phases (AE 1.1, 1.2)

- **Related phases/sections:**
  - Phase AE-1.1 (Detection implementation)
  - Phase AE-1.2 (Generation pipeline)
  - DEO Score v2 (Answerability component)
  - Issue Engine Full (Answerability issues)

---

## Preconditions

- **Repository requirements:**
  - [ ] Repo updated with Answer Engine shared types
  - [ ] Spec and documentation files created
  - [ ] DEO Score v2 metadata patch in place (Phase 2.6)

- **Files to verify:**
  - [ ] `packages/shared/src/answer-engine.ts` exists
  - [ ] `docs/ANSWER_ENGINE_SPEC.md` exists
  - [ ] `docs/answers-overview.md` updated with Answer Blocks concept
  - [ ] `docs/testing/answer-engine.md` exists
  - [ ] `docs/testing/CRITICAL_PATH_MAP.md` includes CP-011

---

## Test Scenarios

### Scenario 1: Shared types match conceptual model

**ID:** AE1-001

**Steps:**
1. Open `packages/shared/src/answer-engine.ts`
2. Compare types against `docs/ANSWER_ENGINE_SPEC.md` Section 2

**Expected Results:**

| Type | Code | Spec | Match |
|------|------|------|-------|
| `AnswerBlockQuestionId` | 10 values | 10 questions | [ ] |
| `AnswerBlockSourceType` | 3 values | 3 types | [ ] |
| `AnswerBlock` | All fields | Section 2.1 | [ ] |
| `AnswerabilityStatus` | All fields | Section 3 | [ ] |

**Verification:**
- [ ] All 10 question IDs present: `what_is_it`, `who_is_it_for`, `why_choose_this`, `key_features`, `how_is_it_used`, `problems_it_solves`, `what_makes_it_different`, `whats_included`, `materials_and_specs`, `care_safety_instructions`
- [ ] Source types: `generated`, `userEdited`, `legacy`
- [ ] AnswerBlock includes: `id`, `projectId`, `productId?`, `questionId`, `question`, `answer`, `confidence`, `sourceType`, `factsUsed`, `deoImpactEstimate?`, `version`, `createdAt`, `updatedAt`

---

### Scenario 2: Documentation references Answer Blocks correctly

**ID:** AE1-002

**Steps:**
1. Open `docs/answers-overview.md`
2. Verify Answer Blocks section exists
3. Verify question categories listed

**Expected Results:**
- [ ] Document mentions Answer Engine and Answer Blocks in introduction
- [ ] "Answer Blocks (Concept)" section exists
- [ ] All 10 question categories listed with descriptions
- [ ] No hallucination rule is clearly stated
- [ ] Relationship to DEO Score v2 explained
- [ ] Relationship to Issue Engine explained

---

### Scenario 3: Specification document completeness

**ID:** AE1-003

**Steps:**
1. Open `docs/ANSWER_ENGINE_SPEC.md`
2. Verify all required sections present

**Expected Results:**

| Section | Present | Complete |
|---------|---------|----------|
| 1. Purpose | [ ] | [ ] |
| 2. Answer Block Model | [ ] | [ ] |
| 3. Answerability Detection | [ ] | [ ] |
| 4. Lifecycle | [ ] | [ ] |
| 5. Integration Points | [ ] | [ ] |
| 6. Versioning | [ ] | [ ] |
| 7. Security & Safety | [ ] | [ ] |
| 8. Acceptance Criteria | [ ] | [ ] |

**Key Content Verification:**
- [ ] No-hallucination rule documented in Section 2
- [ ] "Cannot answer" behavior defined
- [ ] DEO Score v2 integration described in Section 5
- [ ] Issue Engine integration described (reserved issue IDs)
- [ ] Version scheme defined (ae_v1, ae_v1_1, ae_v2)

---

### Scenario 4: Critical path map updated

**ID:** AE1-004

**Steps:**
1. Open `docs/testing/CRITICAL_PATH_MAP.md`
2. Find CP-011 entry

**Expected Results:**
- [ ] CP-011 entry exists with title "Answer Engine (Answer Blocks & Answerability)"
- [ ] Manual Testing Doc(s) references:
  - `docs/testing/answer-engine.md`
  - `docs/manual-testing/phase-ae-1-answer-engine-foundations.md`
- [ ] Key scenarios include:
  - Answer Block model consistency
  - Answerability detection rules alignment
  - Non-hallucination rules defined
  - Integration points documented
- [ ] Coverage Summary includes CP-011 row

---

### Scenario 5: Build verification

**ID:** AE1-005

**Steps:**
1. Run `pnpm --filter shared build`
2. Check for TypeScript errors

**Expected Results:**
- [ ] Build completes successfully
- [ ] No TypeScript errors related to answer-engine.ts
- [ ] Types are exported correctly

---

## Edge Cases

### EC-001: Type consistency across packages

**Description:** Verify types are accessible from other packages.

**Steps:**
1. Check that shared package exports answer-engine types
2. Verify API package can import types (if needed)

**Expected Behavior:**
- Types are importable: `import { AnswerBlock } from '@engineo/shared'`
- No circular dependency issues

---

### EC-002: Documentation link integrity

**Description:** Verify all internal documentation links are valid.

**Steps:**
1. Check links in `docs/answers-overview.md`
2. Check links in `docs/ANSWER_ENGINE_SPEC.md`

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
- [ ] **Documentation:** No broken links to new files

### Quick sanity checks:

- [ ] `pnpm --filter shared build` passes
- [ ] `pnpm --filter api build` passes (if applicable)
- [ ] No new TypeScript errors anywhere in repo

---

## Post-Conditions

### Verification complete when:

- [ ] All 5 test scenarios pass
- [ ] Edge cases verified
- [ ] No build errors

### Follow-up:

- [ ] Phase AE-1.1 can begin (detection implementation)
- [ ] Types remain stable for implementation phases

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Phase AE-1 – Answer Engine Foundations (Model & Spec) |
