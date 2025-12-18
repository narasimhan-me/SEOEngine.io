# Search & Intent Pillar — Reference Documentation

## Overview

The **Search & Intent Fit** pillar is one of the 8 canonical DEO (Discovery Engine Optimization) pillars. It focuses on how well your content matches user search intent, query coverage, and Answer Block readiness for AI-powered answer engines.

This document describes the intent taxonomy, coverage model, detection heuristics, and fix flows implemented in SEARCH-INTENT-1.

---

## Intent Taxonomy

EngineO uses a 5-type intent taxonomy to classify search queries:

| Intent Type | Description | Priority | Example Queries |
|-------------|-------------|----------|-----------------|
| `transactional` | Purchase-intent queries | High | "buy X", "X price", "X discount", "order X" |
| `comparative` | Comparison and alternatives | High | "X vs Y", "best X for Y", "X alternatives", "X or Y" |
| `informational` | Learning and understanding | Medium | "what is X", "how X works", "X explained" |
| `problem_use_case` | Problem-solving and use cases | Medium | "X for beginners", "X for powder", "how to use X" |
| `trust_validation` | Trust and social proof | Medium | "X reviews", "is X good", "X worth it" |

### Priority Weighting

Transactional and comparative intents are weighted higher in coverage scoring because:
- They have stronger purchase intent signals
- They're more likely to drive conversions
- AI answer engines prioritize these for product recommendations

---

## Query Template System

Query templates define the expected queries for each product based on its attributes.

### Template Structure

```typescript
interface IntentQueryTemplate {
  id: string;                    // Stable template ID
  label: string;                 // Human-readable name
  intentType: SearchIntentType;  // One of the 5 intent types
  pattern: string;               // Query pattern with tokens
  tokens: string[];              // Available tokens: {title}, {type}, {tags}
  categoryFilters?: string[];    // Optional product type filters
  importanceWeight: number;      // 1-10, higher = more important
}
```

### Default Templates

| Template | Intent Type | Pattern | Weight |
|----------|-------------|---------|--------|
| Buy Product | transactional | "buy {title}" | 10 |
| Product Price | transactional | "{title} price" | 9 |
| Product vs Alternative | comparative | "{title} vs" | 9 |
| Best Product For | comparative | "best {type} for" | 8 |
| What Is Product | informational | "what is {title}" | 6 |
| How Product Works | informational | "how {title} works" | 6 |
| Product For Beginners | problem_use_case | "{title} for beginners" | 7 |
| Product Reviews | trust_validation | "{title} reviews" | 7 |
| Is Product Good | trust_validation | "is {title} good" | 6 |

---

## Coverage Model

### Per-Product Coverage

For each product, the system computes coverage per intent type:

```typescript
interface ProductIntentCoverage {
  productId: string;
  intentType: SearchIntentType;
  coverageScore: number;           // 0-100
  coverageStatus: CoverageStatus;  // none | weak | partial | covered
  missingQueries: string[];        // Queries with no coverage
  weakQueries: string[];           // Queries with weak coverage
  coveredQueries: string[];        // Queries with strong coverage
  expectedQueries: string[];       // All expected queries for this intent
  computedAt: Date;
}
```

### Coverage Status Thresholds

| Status | Score Range | Meaning |
|--------|-------------|---------|
| `covered` | 80-100 | Strong coverage, minimal gaps |
| `partial` | 50-79 | Some coverage, notable gaps |
| `weak` | 20-49 | Significant gaps |
| `none` | 0-19 | Missing coverage |

### Scorecard

Project-level aggregation produces a scorecard:

```typescript
interface SearchIntentScorecard {
  overallScore: number;              // Weighted average 0-100
  perIntentCoverage: {
    intentType: SearchIntentType;
    score: number;
    productsWithGaps: number;
  }[];
  missingHighValueIntents: number;   // Count of missing transactional/comparative
  status: 'Good' | 'Needs improvement';
}
```

---

## Detection Heuristics

Coverage is computed using lightweight heuristics, not external SEO APIs:

### 1. Answer Block Matching
- Check if product has Answer Blocks addressing the query
- Strong match if question text closely matches query pattern
- Partial match if related topics are covered

### 2. Description Analysis
- Search product description and SEO fields for query-relevant phrases
- Check for question-answer patterns
- Analyze semantic coverage of key terms

### 3. SEO Field Coverage
- Title optimization for transactional queries
- Description coverage for informational queries
- Tags and categories for comparative queries

### 4. Optional: Search Console Data
- If available, use impression data to validate coverage
- Not required; system works without external data

---

## Issue Types

Search & Intent issues are generated when coverage gaps are detected:

| Issue ID | Severity | Description |
|----------|----------|-------------|
| `missing_transactional_intent` | critical | No coverage for purchase-intent queries |
| `missing_comparative_intent` | critical | No coverage for comparison queries |
| `weak_informational_coverage` | warning | Poor coverage for learning queries |
| `missing_problem_use_case_intent` | warning | No coverage for use-case queries |
| `missing_trust_validation_intent` | info | No coverage for trust/review queries |

### Issue Structure

```typescript
interface SearchIntentIssue extends DeoIssue {
  pillarId: 'search_intent_fit';
  intentType: SearchIntentType;
  exampleQueries: string[];        // Specific queries showing the gap
  coverageStatus: CoverageStatus;
  recommendedAction: string;       // "Add Answer Block", "Expand description", etc.
}
```

---

## Fix Flows

### Draft-First Pattern

All fixes follow the draft-first pattern:

1. **Preview** — AI generates a draft (Answer Block or content snippet)
2. **Review** — User reviews the draft in a preview drawer
3. **Apply** — Draft is written to storage (no AI call)

### CACHE/REUSE v2 Integration

Each preview request uses a deterministic `aiWorkKey`:

```typescript
const aiWorkKey = hash({
  projectId,
  productId,
  intentType,
  query,
  fixMode
});
```

If a prior draft exists with the same key and hasn't expired:
- Reuse the draft
- Mark `generatedWithAi: false`
- Show "No AI used (reused draft)" in UI
- Don't decrement AI quota

### Fix Modes

| Mode | Target | Description |
|------|--------|-------------|
| `answer_block` | Answer Blocks | Create Q&A Answer Block addressing the query |
| `content_snippet` | Description | Generate paragraph for product description |
| `metadata_guidance` | SEO Fields | Suggest title/description optimizations |

### Apply Targets

| Target | Action |
|--------|--------|
| `ANSWER_BLOCK` | Create Answer Block via AnswerBlockService |
| `CONTENT_SNIPPET_SECTION` | Store in local content drafts (no external sync) |

---

## AI Usage & Quotas

### Quota Enforcement

- **Preview endpoint**: Checks and decrements AI quota
- **Apply endpoint**: No quota check (no AI call)
- **Reuse**: No quota decrement when draft is reused

### Usage Tracking

All AI calls are logged with:
- Work kind: `search-intent-preview`
- aiWorkKey for deduplication
- reusedFromWorkKey when applicable
- Token counts and latency

---

## UI Integration

### Product Workspace

- **Search & Intent Tab**: Shows coverage scorecard and issues
- **Focus Parameter**: `?focus=search-intent` deep-links to tab
- **Preview Drawer**: Shows draft with AI usage indicator
- **Apply Button**: Writes draft and refreshes coverage

### DEO Overview

- **Pillar Card**: Shows Search & Intent score and missing high-value count
- **View Issues Link**: Navigates to Issues page with pillar filter

### Issues Engine

- **Pillar Filter**: `?pillar=search_intent_fit`
- **Intent Badge**: Shows intent type per issue
- **Fix Link**: Deep-links to product with query pre-populated

### Products List

- **Intent Badge**: Shows "Intent coverage: Good/Needs work"
- **Click Action**: Navigates to Search & Intent tab

---

## Future Roadmap

SEARCH-INTENT-1 serves as the reference implementation for:

- **COMPETITORS-1**: Competitive positioning pillar
- **OFFSITE-1**: Off-site signals pillar
- **LOCAL-1**: Local discovery pillar

Each future pillar should follow the same patterns:
- Shared types in `packages/shared`
- Database models for coverage and drafts
- Service with coverage computation and issue generation
- Draft-first preview/apply endpoints
- CACHE/REUSE v2 integration
- Product workspace tab and DEO Overview integration
