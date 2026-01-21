# EngineO.ai – System-Level Manual Testing: AI Systems

> Cross-cutting manual tests for AI provider integration, usage tracking, error handling, and fallback behavior.

---

## Overview

- **Purpose of this testing doc:**
  - Validate AI integrations (Gemini, future providers) including prompt execution, usage tracking, error handling, and graceful degradation.

- **High-level user impact and what "success" looks like:**
  - AI-powered features (product optimization, content generation) work reliably.
  - Usage is tracked accurately per project and user.
  - Errors from AI providers are handled gracefully with user-friendly messages.
  - System degrades gracefully when AI services are unavailable.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase 2.3 (AI product optimization)
  - Phase 3.x (AI content generation)

- **Related documentation:**
  - `docs/ARCHITECTURE.md` (AI service layer)
  - `docs/ENTITLEMENTS_MATRIX.md` (AI usage limits)
  - `docs/ACTIVATION_METRICS.md` (AI usage tracking)

---

## Preconditions

- **Environment requirements:**
  - [ ] `GEMINI_API_KEY` set to valid API key
  - [ ] Backend API running with AI service initialized
  - [ ] Database accessible for usage tracking

- **Test accounts and sample data:**
  - [ ] Test users on each plan tier (different AI limits)
  - [ ] Sample projects with products to optimize
  - [ ] Projects with varying usage states (fresh, near limit, at limit)

- **Required user roles or subscriptions:**
  - [ ] Free tier user (10 daily AI calls)
  - [ ] Pro tier user (100 daily AI calls)
  - [ ] Business tier user (500 daily AI calls)

---

## Test Scenarios (Happy Path)

### Scenario 1: AI product optimization generates valid SEO content

**ID:** HP-001

**Preconditions:**

- User has available AI quota
- Project has products without SEO content

**Steps:**

1. Navigate to project's Products page
2. Select a product without SEO title/description
3. Click "Optimize with AI"
4. Wait for generation to complete

**Expected Results:**

- **UI:** Loading state shown, then SEO fields populated
- **API:** `POST /api/ai/optimize-product` returns generated content
- **Database:**
  - Product's `seoTitle` and `seoDescription` updated
  - `AiUsageEvent` record created with feature='product-optimization'
- **Quality:** Generated content is relevant to product, follows SEO best practices

---

### Scenario 2: Bulk AI optimization for multiple products

**ID:** HP-002

**Preconditions:**

- User has sufficient AI quota for batch
- Project has multiple unoptimized products

**Steps:**

1. Navigate to Products page
2. Select multiple products (e.g., 5)
3. Click "Optimize Selected"
4. Wait for batch completion

**Expected Results:**

- **UI:** Progress indicator shows batch progress
- **API:** Each product optimized sequentially or in parallel
- **Database:** 5 `AiUsageEvent` records created
- **Quota:** User's daily usage incremented by 5

---

### Scenario 3: AI usage tracking is accurate

**ID:** HP-003

**Preconditions:**

- User starts with known usage count

**Steps:**

1. Note current AI usage (from Settings or API)
2. Perform 3 AI operations
3. Check updated usage count

**Expected Results:**

- **UI:** Usage counter increments by 3
- **Database:** 3 new `AiUsageEvent` records
- **API:** `/api/projects/:id/overview` reflects updated count

---

## Edge Cases

### EC-001: AI response contains inappropriate content

**Description:** AI provider returns content that needs filtering.

**Steps:**

1. Submit product with edge-case name/description
2. Observe generated content

**Expected Behavior:**

- Content is sanitized before storage
- No harmful/inappropriate content displayed

---

### EC-002: Very long product descriptions

**Description:** Product with extremely long description exceeds AI context limits.

**Steps:**

1. Create product with 10,000+ character description
2. Attempt AI optimization

**Expected Behavior:**

- Description truncated for AI prompt
- Generation still succeeds
- User informed if truncation occurred

---

### EC-003: Non-English product content

**Description:** Product content is in a non-English language.

**Steps:**

1. Create product with non-English title/description
2. Attempt AI optimization

**Expected Behavior:**

- AI generates content in same language OR
- Clear messaging about language support

---

### EC-004: Concurrent AI requests from same user

**Description:** User triggers multiple AI operations simultaneously.

**Steps:**

1. Open multiple product pages in tabs
2. Click "Optimize" on all simultaneously

**Expected Behavior:**

- All requests processed (may be queued)
- Usage tracked accurately for all
- No race conditions in quota checking

---

## Error Handling

### ERR-001: Gemini API returns error

**Scenario:** AI provider returns 500 or other error.

**Steps:**

1. Trigger AI operation when provider is having issues (or mock error)

**Expected Behavior:**

- User sees: "AI service temporarily unavailable. Please try again."
- Error logged with context
- No partial data saved
- Usage not counted for failed request

---

### ERR-002: Gemini API rate limited

**Scenario:** Too many requests to AI provider.

**Steps:**

1. Rapid-fire AI requests to trigger provider rate limit

**Expected Behavior:**

- User sees: "Please wait a moment before trying again."
- Exponential backoff in API layer
- Request can be retried

---

### ERR-003: Gemini API key invalid or expired

**Scenario:** API key configuration issue.

**Steps:**

1. Set invalid GEMINI_API_KEY
2. Attempt AI operation

**Expected Behavior:**

- User sees generic error (not exposing key details)
- Admin-level alert/log for configuration issue
- Clear error in server logs

---

### ERR-004: AI response timeout

**Scenario:** AI provider takes too long to respond.

**Steps:**

1. Trigger operation when provider is slow

**Expected Behavior:**

- Timeout after reasonable period (30s)
- User informed of timeout
- Retry option available

---

### ERR-005: Malformed AI response

**Scenario:** AI provider returns unexpected format.

**Steps:**

1. Mock malformed response from provider

**Expected Behavior:**

- Parsing error caught
- User sees generic error
- Original product data unchanged
- Error logged for debugging

---

## Limits

### LIM-001: Daily AI usage limits by plan

**Scenario:** Verify AI usage limits are enforced per plan.

| Plan     | Daily Limit |
| -------- | ----------- |
| Free     | 10          |
| Pro      | 100         |
| Business | 500         |

**Steps:**

1. For each plan, perform AI operations up to limit
2. Attempt one more operation

**Expected Behavior:**

- At limit: Clear message with upgrade prompt
- API returns 403 with `AI_LIMIT_REACHED` code
- Usage resets at midnight UTC

---

### LIM-002: Per-request token limits

**Scenario:** Individual request doesn't exceed provider limits.

**Steps:**

1. Submit very large content for optimization
2. Observe request handling

**Expected Behavior:**

- Content chunked or truncated as needed
- Operation succeeds with reasonable output

---

## Regression

### Areas potentially impacted:

- [ ] **Product page:** Ensure optimization buttons work
- [ ] **Overview page:** Ensure AI usage stats display
- [ ] **Settings page:** Ensure usage limits shown correctly
- [ ] **Billing flow:** Ensure limit enforcement ties to subscription

### Quick sanity checks:

- [ ] Single product optimization works
- [ ] Usage count increments
- [ ] Error states show user-friendly messages
- [ ] Limits are enforced at threshold

---

## Post-Conditions

### Data cleanup steps:

- [ ] Revert any test product SEO changes if needed
- [ ] Clear test `AiUsageEvent` records if testing quota
- [ ] Reset any mocked error conditions

### Follow-up verification:

- [ ] AI service healthy and responding
- [ ] Usage tracking accurate in database

---

## Known Issues

- **Intentionally accepted issues:**
  - AI-generated content may occasionally need manual review for quality

- **Out-of-scope items:**
  - AI model selection/configuration UI
  - A/B testing of AI prompts
  - Multi-provider fallback (future enhancement)

- **TODOs:**
  - [ ] Add monitoring for AI response quality
  - [ ] Consider caching for repeated similar requests

---

## Approval

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| **Tester Name**    | [Pending]                                       |
| **Date**           | [YYYY-MM-DD]                                    |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed           |
| **Notes**          | Cross-cutting system-level tests for AI systems |
