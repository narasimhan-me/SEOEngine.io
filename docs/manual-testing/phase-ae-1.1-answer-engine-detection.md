# EngineO.ai – Phase AE-1.1 Manual Testing: Answer Engine Detection & API

> Manual testing checklist for Answer Engine answerability detection heuristics and the `/projects/:id/answerability` API.

---

## Overview

- **Purpose of this testing doc:**
  - Validate that Answer Engine detection heuristics and the `/projects/:id/answerability` API behave as specified and do not hallucinate content.

- **High-level user impact and what "success" looks like:**
  - Products with rich descriptions show fewer missing questions and higher answerability scores.
  - Products with vague/minimal descriptions show many missing questions and lower scores.
  - The system never fabricates answers or classifications for insufficient data.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase AE-1.1 – Answer Engine Detection & API

- **Related documentation:**
  - `docs/ANSWER_ENGINE_SPEC.md` (Section 9: Phase AE-1.1)
  - `docs/testing/answer-engine.md` (System-level testing)
  - `packages/shared/src/answer-engine.ts` (Shared types)

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database accessible
  - [ ] Authentication in place (JWT)

- **Test accounts and sample data:**
  - [ ] Test user with at least one project
  - [ ] Products with varying content:
    - Rich descriptions (clear features, materials, usage, audience)
    - Vague descriptions (generic phrases, minimal content)
    - Minimal/no descriptions (empty or near-empty)

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario AE-1.1-HP-001: Basic detection & response shape

**ID:** HP-001

**Preconditions:**

- Project with synced products

**Steps:**

1. Create a project with at least 2 products (one rich, one minimal)
2. Call `GET /projects/:id/answerability` with valid auth token
3. Inspect response structure

**Expected Results:**

- [ ] HTTP 200 OK
- [ ] Response contains `projectId` matching the project
- [ ] Response contains `generatedAt` (valid ISO timestamp)
- [ ] Response contains `overallStatus` with:
  - [ ] `status` (one of: answer_ready, partially_answer_ready, needs_answers)
  - [ ] `missingQuestions` (array of question IDs)
  - [ ] `weakQuestions` (array of question IDs)
  - [ ] `answerabilityScore` (number 0-100)
- [ ] Response contains `products` array with one entry per product
- [ ] Each product entry has `productId`, `productTitle`, and `status`

---

### Scenario AE-1.1-HP-002: Missing vs weak answers detection

**ID:** HP-002

**Test Data:**

- Product A: Rich description with materials, audience, features, usage
- Product B: Extremely short, vague description ("Great product!")

**Steps:**

1. Set up products as described
2. Call `GET /projects/:id/answerability`
3. Compare Product A and Product B statuses

**Expected Results:**

- [ ] Product A has few or no `missingQuestions`
- [ ] Product A status is NOT `needs_answers`
- [ ] Product A `answerabilityScore` is higher than Product B
- [ ] Product B has many `missingQuestions` (5+)
- [ ] Product B status IS `needs_answers`
- [ ] Product B `answerabilityScore` is low (<30)

---

### Scenario AE-1.1-HP-003: Conflicting / low-quality content yields weak

**ID:** HP-003

**Test Data:**

- Product C: Description with vague benefit language ("You'll feel amazing!")

**Steps:**

1. Create product with vague but present description
2. Call answerability endpoint
3. Inspect classification

**Expected Results:**

- [ ] Affected questions appear in `weakQuestions` (not strong, not missing)
- [ ] Status is `partially_answer_ready` with mid-range `answerabilityScore`
- [ ] System does NOT classify vague content as `strong`

---

## Edge Cases

### EC-001: Project with no products

**Description:** Project has no products synced.

**Steps:**

1. Create project with no products
2. Call answerability endpoint

**Expected Behavior:**

- [ ] `products` array is empty
- [ ] `overallStatus.status` is `needs_answers`
- [ ] `overallStatus.answerabilityScore` is 0
- [ ] All 10 questions in `missingQuestions`

---

### EC-002: Products with only images / empty descriptions

**Description:** Product has no description text at all.

**Steps:**

1. Create product with empty `description`, `seoDescription`, and minimal title
2. Call answerability endpoint

**Expected Behavior:**

- [ ] All 10 questions marked as `missing`
- [ ] Status is `needs_answers`
- [ ] `answerabilityScore` is very low (≤10)

---

### EC-003: Mixed project (some rich, some poor)

**Description:** Project has mix of well-described and poorly-described products.

**Steps:**

1. Create project with 3 products: rich, medium, poor
2. Call answerability endpoint
3. Verify aggregate calculation

**Expected Behavior:**

- [ ] `overallStatus` reflects aggregate (likely `partially_answer_ready`)
- [ ] `overallStatus.answerabilityScore` is average of individual scores
- [ ] `overallStatus.missingQuestions` contains union of all missing questions

---

## Error Handling

### ERR-001: Unauthorized access (no token)

**Scenario:** Call endpoint without authentication.

**Steps:**

1. Call `GET /projects/:id/answerability` without Authorization header

**Expected Behavior:**

- [ ] HTTP 401 Unauthorized

---

### ERR-002: Forbidden access (non-owner)

**Scenario:** User B tries to access User A's project.

**Steps:**

1. Create project for User A
2. With User B's token, call answerability endpoint for A's project

**Expected Behavior:**

- [ ] HTTP 403 Forbidden

---

### ERR-003: Invalid project (not found)

**Scenario:** Request answerability for non-existent project.

**Steps:**

1. Call `GET /projects/non-existent-id/answerability` with valid token

**Expected Behavior:**

- [ ] HTTP 404 Not Found

---

## Regression

### Areas potentially impacted:

- [ ] **DEO Score endpoints:** Unchanged behavior
- [ ] **Issue Engine:** No new issues surfaced (AE-1.1 detection only)
- [ ] **Product endpoints:** No changes to product CRUD
- [ ] **Shared types:** New types compile correctly

### Quick sanity checks:

- [ ] `pnpm --filter shared build` passes
- [ ] `pnpm --filter api build` passes
- [ ] DEO score recompute still works
- [ ] Product sync still works

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup required (detection is read-only)

### Follow-up verification:

- [ ] Answerability endpoint consistently returns same results for same data
- [ ] No side effects on products or DEO scores

---

## Known Issues

- **Intentionally accepted limitations:**
  - Detection based on keyword heuristics, not semantic understanding
  - `why_choose_this` detection relies on value proposition keywords

- **Out-of-scope items:**
  - Answer Block persistence
  - AI answer generation
  - UI Answers tab

- **TODOs:**
  - [ ] Phase AE-1.2: Implement Answer Block generation
  - [ ] Phase AE-2.x: Integrate with DEO Score v2 Answerability component

---

## Approval

| Field              | Value                                        |
| ------------------ | -------------------------------------------- |
| **Tester Name**    | [Pending]                                    |
| **Date**           | [YYYY-MM-DD]                                 |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed        |
| **Notes**          | Phase AE-1.1 Answer Engine detection and API |
