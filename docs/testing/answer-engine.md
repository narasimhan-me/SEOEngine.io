# EngineO.ai – System-Level Manual Testing: Answer Engine (Answer Blocks & Answerability)

> Manual tests for the Answer Engine subsystem: Answerability detection, Answer Block generation rules, and DEO Score integration.

---

## Overview

- **Purpose of this testing doc:**
  - Validate the Answer Engine model, detection concepts, generation rules, and integration points with DEO Score v2 and Issue Engine.

- **High-level user impact and what "success" looks like:**
  - Products have clear, AI-ready answers to key buyer questions
  - Answerability signals feed into DEO Score v2 accurately
  - Missing/weak answers surface as actionable issues
  - No hallucinated or fabricated content is generated

- **Related phases/sections:**
  - Phase AE-1 (Answer Engine Foundations)
  - DEO Score v2 (Answerability component)
  - Issue Engine Full (Answerability issues)

- **Related documentation:**
  - `packages/shared/src/answer-engine.ts` (Shared types)
  - `docs/ANSWER_ENGINE_SPEC.md` (Technical specification)
  - `docs/answers-overview.md` (Concept overview)

- **Note:** In this initial phase, tests are largely conceptual and will become concrete as backend and UI implementations land.

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

### Scenario 1: Conceptual detection of missing answers

**ID:** AE-001

**Description:** Walk through detection logic for products missing key answers.

**Test Data:**
- Product A: Rich description mentioning materials, target audience, and features
- Product B: Minimal description with no attribute data

**Expected Detection Outcome:**

| Product | what_is_it | who_is_it_for | key_features | materials_and_specs |
|---------|------------|---------------|--------------|---------------------|
| A | Answerable | Answerable | Answerable | Answerable |
| B | Missing | Missing | Missing | Missing |

**AnswerabilityStatus for Product B:**
```json
{
  "status": "needs_answers",
  "missingQuestions": ["what_is_it", "who_is_it_for", "key_features", ...],
  "weakQuestions": [],
  "answerabilityScore": 10
}
```

---

### Scenario 2: Conceptual detection of weak answers

**ID:** AE-002

**Description:** Identify products with low-confidence or incomplete answers.

**Test Data:**
- Product C: Has description but content is vague ("Great product, you'll love it!")
- Product D: Has description but conflicts with attributes (description says "leather" but material attribute says "synthetic")

**Expected Detection Outcome:**

| Product | Status | Issue |
|---------|--------|-------|
| C | Weak answers | Vague content, low confidence |
| D | Weak answers | Conflicting information |

**AnswerabilityStatus:**
```json
{
  "status": "partially_answer_ready",
  "missingQuestions": [],
  "weakQuestions": ["what_is_it", "materials_and_specs"],
  "answerabilityScore": 45
}
```

---

### Scenario 3: Answer generation rules validation

**ID:** AE-003

**Description:** Confirm that generation rules follow the spec.

**For each question category, verify:**

1. **Expected answer structure** is defined in spec
2. **Data constraints** specify required source attributes
3. **"Cannot answer" behavior** is triggered when data is insufficient

**Validation Checklist:**

| Question ID | Required Data | Cannot Answer Trigger |
|-------------|---------------|----------------------|
| what_is_it | title, category, description | No title or category |
| who_is_it_for | description, tags, audience attributes | No audience indicators |
| why_choose_this | description, features, benefits | No differentiators |
| key_features | features, specifications | No feature data |
| how_is_it_used | description, usage instructions | No usage info |
| problems_it_solves | description, pain points | No problem/solution content |
| what_makes_it_different | description, competitors, unique attributes | No differentiation data |
| whats_included | contents, components, accessories | No inclusion list |
| materials_and_specs | materials, dimensions, specifications | No material/spec data |
| care_safety_instructions | care instructions, warnings | No care/safety info |

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

| Answerability Status | Expected DEO Impact |
|---------------------|---------------------|
| answer_ready | Answerability component at/near maximum |
| partially_answer_ready | Answerability component at medium level |
| needs_answers | Answerability component at low level |

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

### Quick sanity checks:

- [ ] `packages/shared/src/answer-engine.ts` exports all types
- [ ] `pnpm --filter shared build` passes
- [ ] No TypeScript errors in dependent packages
- [ ] Spec document is internally consistent

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

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Answer Engine system-level testing (Phase AE-1) |
