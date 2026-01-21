# EngineO.ai – System-Level Manual Testing: Answer Engine (Answer Blocks & Answerability)

> Manual tests for the Answer Engine subsystem: Answerability detection, Answer Block generation rules, and DEO Score integration.

---

## Overview

- **Purpose of this testing doc:**
  - Validate the Answer Engine model, detection concepts, generation rules, and integration points with DEO Score v2 and Issue Engine.

- **High-level user impact and what "success" looks like:**
  - Products have clear, AI-ready answers to key buyer questions
  - Answerability detection is now implemented via the backend and `/projects/:id/answerability` endpoint (Phase AE-1.1)
  - Missing/weak answers surface as actionable issues (future phase)
  - No hallucinated or fabricated content is generated

- **Related phases/sections:**
  - Phase AE-1 (Answer Engine Foundations)
  - Phase AE-1.1 (Answerability Detection & API)
  - DEO Score v2 (Answerability component)
  - Issue Engine Full (Answerability issues)

- **Related documentation:**
  - `packages/shared/src/answer-engine.ts` (Shared types)
  - `docs/ANSWER_ENGINE_SPEC.md` (Technical specification)
  - `docs/manual-testing/phase-ae-1.1-answer-engine-detection.md` (AE-1.1 manual testing)

- **Note:** Answerability detection is now partially implemented (AE-1.1). Generation remains conceptual and will be implemented in AE-1.2+.

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Database with test project and products

- **Test accounts and sample data:**
  - [ ] Project with synced products
  - [ ] At least one crawl completed
  - [ ] DEO Score v2 metadata available (signals and components)
  - [ ] Products with varying levels of content richness:
    - Rich descriptions with all key attributes
    - Minimal descriptions with few attributes
    - Products missing critical information

- **Required documentation in place:**
  - [ ] `packages/shared/src/answer-engine.ts` exists
  - [ ] `docs/ANSWER_ENGINE_SPEC.md` exists
  - [ ] Answer Engine types compile without errors

---

## Test Scenarios (Happy Path – Design-Level)

### Scenario 1: Detection of missing answers via API

**ID:** AE-001

**Description:** Validate detection logic for products missing key answers using the `/projects/:id/answerability` endpoint.

**Test Data:**

- Product A: Rich description mentioning materials, target audience, and features
- Product B: Minimal description with no attribute data

**Steps:**

1. Create project with Product A and Product B
2. Call `GET /projects/:id/answerability` with valid auth token
3. Inspect per-product entries in response

**Expected Detection Outcome:**

| Product | what_is_it  | who_is_it_for | key_features | materials_and_specs |
| ------- | ----------- | ------------- | ------------ | ------------------- |
| A       | Strong/Weak | Strong/Weak   | Strong/Weak  | Strong/Weak         |
| B       | Missing     | Missing       | Missing      | Missing             |

**AnswerabilityStatus for Product B (from API response):**

```json
{
  "status": "needs_answers",
  "missingQuestions": ["what_is_it", "who_is_it_for", "key_features", ...],
  "weakQuestions": [],
  "answerabilityScore": 10
}
```

**Verification:**

- [ ] Product A status is NOT `needs_answers`
- [ ] Product B status IS `needs_answers`
- [ ] Product B has 5+ missing questions

---

### Scenario 2: Detection of weak answers via API

**ID:** AE-002

**Description:** Identify products with low-confidence or incomplete answers using the `/projects/:id/answerability` endpoint.

**Test Data:**

- Product C: Has description but content is vague ("Great product, you'll love it!")
- Product D: Has description but conflicts with attributes (description says "leather" but material attribute says "synthetic")

**Steps:**

1. Create products C and D with vague/contradictory descriptions
2. Call `GET /projects/:id/answerability`
3. Inspect per-product entries in response

**Expected Detection Outcome:**

| Product | Status       | Issue                         |
| ------- | ------------ | ----------------------------- |
| C       | Weak answers | Vague content, low confidence |
| D       | Weak answers | Conflicting information       |

**AnswerabilityStatus (from API response):**

```json
{
  "status": "partially_answer_ready",
  "missingQuestions": [],
  "weakQuestions": ["what_is_it", "materials_and_specs"],
  "answerabilityScore": 45
}
```

**Verification:**

- [ ] Affected questions appear in `weakQuestions` (not `missingQuestions`)
- [ ] Status is `partially_answer_ready`
- [ ] `answerabilityScore` is in mid-range (30-60)

---

### Scenario 3: Answer generation rules validation

**ID:** AE-003

**Description:** Confirm that generation rules follow the spec.

**For each question category, verify:**

1. **Expected answer structure** is defined in spec
2. **Data constraints** specify required source attributes
3. **"Cannot answer" behavior** is triggered when data is insufficient

**Validation Checklist:**

| Question ID              | Required Data                               | Cannot Answer Trigger       |
| ------------------------ | ------------------------------------------- | --------------------------- |
| what_is_it               | title, category, description                | No title or category        |
| who_is_it_for            | description, tags, audience attributes      | No audience indicators      |
| why_choose_this          | description, features, benefits             | No differentiators          |
| key_features             | features, specifications                    | No feature data             |
| how_is_it_used           | description, usage instructions             | No usage info               |
| problems_it_solves       | description, pain points                    | No problem/solution content |
| what_makes_it_different  | description, competitors, unique attributes | No differentiation data     |
| whats_included           | contents, components, accessories           | No inclusion list           |
| materials_and_specs      | materials, dimensions, specifications       | No material/spec data       |
| care_safety_instructions | care instructions, warnings                 | No care/safety info         |

---

### Scenario 4: No hallucination enforcement

**ID:** AE-004

**Description:** Verify that the system never fabricates content.

**Test Cases:**

1. **Insufficient data scenario:**
   - Input: Product with only title "Blue Widget"
   - Expected: "Cannot answer" for most questions
   - NOT Expected: Generated description inventing features

2. **Partial data scenario:**
   - Input: Product with title and material ("Cotton T-Shirt, 100% organic cotton")
   - Expected: Can answer `what_is_it`, `materials_and_specs`
   - Expected: Cannot answer `who_is_it_for`, `care_safety_instructions` (unless data exists)

3. **Conflicting data scenario:**
   - Input: Description says "waterproof" but no waterproof attribute
   - Expected: Low confidence, flagged as weak answer

---

### Scenario 5: DEO Score v2 integration

**ID:** AE-005

**Description:** Verify answerability signals map correctly to DEO Score.

**Expected Behavior:**

| Answerability Status   | Expected DEO Impact                     |
| ---------------------- | --------------------------------------- |
| answer_ready           | Answerability component at/near maximum |
| partially_answer_ready | Answerability component at medium level |
| needs_answers          | Answerability component at low level    |

**Signal Mapping:**

- `answerabilityScore` (0-100) → Answerability component input
- Missing questions count → Negative weight
- Weak questions count → Reduced weight

---

## Edge Cases

### EC-001: Products with conflicting descriptions vs attributes

**Description:** Product description claims one thing, attributes say another.

**Test Data:**

- Description: "Made from genuine leather"
- Material attribute: "Faux leather"

**Expected Behavior:**

- Detection flags this as a data quality issue
- Confidence score reduced for `materials_and_specs`
- Answer marked as "weak" until resolved

---

### EC-002: Products with almost no description but rich attribute data

**Description:** Minimal description but comprehensive Shopify metafields.

**Test Data:**

- Description: "Widget"
- Metafields: material, dimensions, weight, care instructions, target audience

**Expected Behavior:**

- Detection can still identify answerable questions from attributes
- `materials_and_specs` and `care_safety_instructions` may be answerable
- Other questions depend on attribute richness

---

### EC-003: Products with only images (no text content)

**Description:** Product has images but no description or attributes.

**Expected Behavior:**

- Status: `needs_answers`
- All questions marked as missing
- No answers generated (cannot extract from images in Phase 1)

---

## Error Handling

### ERR-001: When the engine must abstain from answering

**Scenario:** Insufficient data for confident answer generation.

**Expected Behavior:**

- System emits "cannot answer" status
- Question marked in `missingQuestions` array
- No low-quality answer is generated
- User can manually provide answer

---

### ERR-002: Answerability signals integration without breaking v1

**Scenario:** DEO Score v2 receives answerability signals while v1 is still active.

**Expected Behavior:**

- v1 scoring continues to work unchanged
- v2 components receive new answerability signals
- No breaking changes to existing DEO Score API

---

## Regression

### Areas potentially impacted:

- [ ] **Shared types:** Answer Engine types compile correctly
- [ ] **DEO Score v2:** Answerability component accepts signals
- [ ] **Issue Engine:** Reserved issue IDs don't conflict with existing issues
- [ ] **Product Workspace:** Future Answers tab integration
- [ ] `/projects/:id/answerability` endpoint returns stable shapes and respects auth/ownership rules

### Quick sanity checks:

- [ ] `packages/shared/src/answer-engine.ts` exports all types
- [ ] `pnpm --filter shared build` passes
- [ ] No TypeScript errors in dependent packages
- [ ] Spec document is internally consistent
- [ ] Answerability endpoint returns 200 for valid requests
- [ ] Answerability endpoint returns 403 for non-owner access

**Note:** DEO Score v2 integration remains conceptual; AE-1.1 only surfaces detection signals via the API.

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup required (spec/model phase only)

### Follow-up verification:

- [ ] Types remain stable as implementation proceeds
- [ ] Detection implementation matches conceptual model
- [ ] Generation implementation follows spec rules

---

## Known Issues

- **Intentionally accepted limitations:**
  - Image-based answer extraction not in Phase 1 scope
  - Batch answer generation deferred to later phase

- **Out-of-scope items:**
  - Shopify metafield write-back
  - Schema.org JSON-LD generation
  - UI implementation

- **TODOs:**
  - [ ] Implement detection heuristics (Phase AE 1.1)
  - [ ] Implement generation pipeline (Phase AE 1.2)
  - [ ] Add Answer Blocks to Issue Engine (Phase AE 1.x)

---

## Approval

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| **Tester Name**    | [Pending]                                       |
| **Date**           | [YYYY-MM-DD]                                    |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed           |
| **Notes**          | Answer Engine system-level testing (Phase AE-1) |
