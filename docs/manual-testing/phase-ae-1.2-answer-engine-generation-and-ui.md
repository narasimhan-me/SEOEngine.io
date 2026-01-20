# Phase AE-1.2 – Answer Engine Generation & UI Integration

> Manual testing guide for Answer Engine AI generation and ProductAnswersPanel UI component.

---

## Overview

Phase AE-1.2 implements:

1. **AnswerGenerationService** – AI-based Answer Block generation using configured provider (OpenAI/Anthropic/Gemini)
2. **POST /ai/product-answers** – API endpoint returning `ProductAnswersResponse` with ephemeral answers
3. **ProductAnswersPanel** – UI component in Product Optimization workspace displaying generated answers
4. **Entitlements enforcement** – Daily AI limit applied to answer generation

---

## Prerequisites

- [ ] Backend API running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:3000`
- [ ] AI provider configured (AI_API_KEY and AI_PROVIDER env vars)
- [ ] Test project with at least one product
- [ ] User authenticated with valid session

---

## Test Scenarios

### Scenario 1: Generate answers for a product with rich content

**Steps:**

1. Navigate to Projects → Select project → Products
2. Click on a product with a detailed description (materials, features, usage info)
3. In the Product Optimization workspace, find the "AI Answers" panel
4. Click "Generate Answers"
5. Wait for generation to complete

**Expected Results:**

- [ ] Loading spinner appears during generation
- [ ] Success toast shows "Generated X answer(s) for this product"
- [ ] Answerability status badge shows (Answer Ready / Partially Ready / Needs Answers)
- [ ] Answerability score (0-100) is displayed
- [ ] List of generated answers appears
- [ ] Each answer has an expand/collapse button
- [ ] Expanded answers show the answer text, confidence badge, and facts used

**Verification:**

- [ ] Answers are factual and based on product data
- [ ] Confidence badges show High/Medium as appropriate
- [ ] Facts used lists the sources (title, description)

---

### Scenario 2: Generate answers for a product with minimal content

**Steps:**

1. Navigate to a product with minimal description (e.g., "Great product!")
2. Click "Generate Answers"
3. Review the response

**Expected Results:**

- [ ] Answerability status shows "Needs Answers"
- [ ] Answerability score is low (< 30)
- [ ] Warning message: "X question(s) cannot be answered"
- [ ] Few or no answers generated (AI returns cannotAnswer: true)
- [ ] Guidance text: "Add more product details to improve answerability"

---

### Scenario 3: Regenerate answers

**Steps:**

1. With answers already displayed, click "Regenerate Answers"
2. Confirm new generation starts

**Expected Results:**

- [ ] Loading state replaces existing answers
- [ ] New answers appear after generation completes
- [ ] Previous answers are replaced

---

### Scenario 4: Daily AI limit enforcement

**Steps:**

1. Exhaust daily AI limit by generating answers multiple times
2. Attempt one more generation

**Expected Results:**

- [ ] 429 error returned from API
- [ ] Error message: "Daily AI limit reached..."
- [ ] Upgrade link provided in error message
- [ ] Limit toast notification appears

---

### Scenario 5: Answer confidence display

**Steps:**

1. Generate answers for any product
2. Expand each answer to view details

**Expected Results:**

- [ ] High confidence (≥ 0.8): Green "High confidence" badge
- [ ] Medium confidence (0.5-0.79): Yellow "Medium confidence" badge
- [ ] Low confidence (< 0.5): Red "Low confidence" badge (if any appear)

---

### Scenario 6: API authorization

**Steps:**

1. Using API client or curl, call `POST /ai/product-answers` with:
   a. No auth token
   b. Another user's product ID

**Expected Results:**

- [ ] No auth: 401 Unauthorized
- [ ] Other user's product: 400 Bad Request (Access denied)

---

## UI Component Verification

### ProductAnswersPanel States

| State                  | Expected Display                                              |
| ---------------------- | ------------------------------------------------------------- |
| Empty (no response)    | "Generate AI-powered answers..." prompt with Generate button  |
| Loading                | Spinner with "Generating answers..." text                     |
| Error                  | Red error box with message                                    |
| Success (with answers) | Answerability status, score, answer list with expand/collapse |
| Success (no answers)   | "No answers could be generated" message                       |

---

## API Response Verification

### Expected ProductAnswersResponse shape:

```json
{
  "projectId": "uuid",
  "productId": "uuid",
  "generatedAt": "2025-12-09T...",
  "answerabilityStatus": {
    "status": "partially_answer_ready",
    "missingQuestions": ["who_is_it_for", "care_safety_instructions"],
    "weakQuestions": [],
    "answerabilityScore": 65
  },
  "answers": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "productId": "uuid",
      "questionId": "what_is_it",
      "question": "What is this?",
      "answer": "This is a premium organic cotton t-shirt...",
      "confidence": 0.9,
      "sourceType": "generated",
      "factsUsed": ["title", "description"],
      "version": "ae_v1",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

## Non-Hallucination Verification

**Critical:** Verify the AI does not fabricate content.

1. Create a product with only a title (no description)
2. Generate answers
3. Verify most questions return `cannotAnswer: true` (empty answers array)
4. Any answers that do appear should only reference data from the title

---

## Regression Checklist

- [ ] AE-1.1 detection endpoint (`/projects/:id/answerability`) still works
- [ ] Product Optimize (AI SEO suggestions) still works
- [ ] DEO Score v1/v2 APIs unchanged
- [ ] Shopify sync functionality unchanged
- [ ] Other AI features (metadata generation) work correctly

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Pending]                             |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | Phase AE-1.2 manual testing           |
