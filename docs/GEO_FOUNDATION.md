# GEO (Generative Engine Optimization) – Foundation

> Explainable answer readiness signals that help merchants understand how AI engines evaluate their product content.

---

## Overview

GEO (Generative Engine Optimization) is EngineO.ai's framework for making product content **AI-engine-ready**. Unlike traditional SEO which focuses on keyword rankings, GEO focuses on preparing content to be **cited by AI engines** like ChatGPT, Claude, Perplexity, and Google AI Overviews.

GEO does **not** guarantee rankings or citations. Instead, it provides **explainable readiness signals** that help merchants understand and improve the quality of their product content from an AI citation perspective.

---

## Core Concepts

### Answer Units (v1: Answer Blocks)

An **Answer Unit** is a concise, factual response to a specific question about a product. Answer Units are:

- **Question-scoped**: Each unit answers one specific question (e.g., "What is it?", "Why choose this?")
- **Fact-grounded**: Content is derived from existing product data, never hallucinated
- **Structured**: Written for scannability with clear formatting
- **Versionable**: Tracked with version identifiers for evolution

### Readiness Signals

GEO evaluates Answer Units against five **readiness signals**:

| Signal            | Description                                  | Why It Matters                                                              |
| ----------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| **Clarity**       | Is the answer clear and easy to understand?  | AI engines prefer content that directly answers questions without ambiguity |
| **Specificity**   | Does the answer include concrete details?    | Vague answers are less likely to be cited than specific ones                |
| **Structure**     | Is the answer scannable (bullets, headings)? | AI engines often extract bullet points or structured content                |
| **Context**       | Does the answer provide enough background?   | AI engines need context to understand when to cite content                  |
| **Accessibility** | Is the content readable and well-formatted?  | Technical issues (broken formatting, encoding) reduce citability            |

Each signal has a status:

- `pass`: Signal criteria met
- `needs_improvement`: Signal has room for improvement

### Citation Confidence

**Citation Confidence** is a derived score (Low / Medium / High) computed from readiness signals:

- **High**: All 5 signals pass
- **Medium**: 1–2 non-core signals need improvement
- **Low**: Any core signal (clarity or structure) needs improvement, OR no Answer Units exist

Citation Confidence is an **internal quality indicator**, not a guarantee of external AI engine behavior.

---

## GEO Issues

GEO integrates with EngineO.ai's Issue Engine to surface actionable improvements. Common GEO issue types:

| Issue Type                  | Severity | Description                                             |
| --------------------------- | -------- | ------------------------------------------------------- |
| `no_answer_units`           | Critical | Product has no Answer Units at all                      |
| `poor_answer_structure`     | Warning  | Answer lacks scannable structure                        |
| `answer_overly_promotional` | Warning  | Answer contains promotional language that reduces trust |
| `missing_specificity`       | Info     | Answer could include more concrete details              |
| `missing_context`           | Info     | Answer needs more background information                |

---

## Trust Contracts

GEO follows EngineO.ai's core trust principles:

### 1. No Ranking Guarantees

GEO measures **content readiness**, not external AI engine behavior. We never claim to guarantee:

- AI engine citations
- Specific ranking positions
- Traffic or conversion outcomes

### 2. Explainability First

Every GEO signal includes:

- A human-readable **why** explanation
- Specific **evidence** from the content
- Actionable **fix guidance**

### 3. Draft-First Pattern

GEO improvements follow the Draft-First pattern:

```
Preview (uses AI) → Draft (stored) → Apply (no AI)
```

- **Preview**: Generates AI improvements and caches them as drafts
- **Apply**: Persists the cached draft without any AI calls
- Drafts are **reusable** – the same improvement can be applied multiple times without consuming AI quota

### 4. No Hallucination

GEO never fabricates facts about products:

- All Answer Units are grounded in existing product data
- Missing data results in `cannotAnswer: true`, not invented content
- Confidence scores reflect data availability, not AI creativity

---

## Integration Points

### DEO Score v2

GEO readiness contributes to the DEO Score v2 explainability layer:

- `aiVisibility` component reflects aggregate GEO readiness
- Products with High citation confidence boost the visibility component

### Issue Engine

GEO issues are surfaced through the standard Issue Engine:

- Issues have severity, pillar (`GEO`), and fix guidance
- Issues can be fixed via automation (preview + apply)

### Insights Dashboard

GEO metrics appear in the Project Insights dashboard:

- `geoInsights.overview`: Summary of product readiness
- `geoInsights.coverage`: Intent coverage analysis
- `geoInsights.reuse`: Answer reuse efficiency
- `geoInsights.trustSignals`: Trust trajectory metrics

---

## Canonical Question Taxonomy

GEO uses a canonical set of question IDs mapped to user intents:

| Question ID        | Label                 | Intent Mapping                  |
| ------------------ | --------------------- | ------------------------------- |
| `what_is_it`       | What is it?           | Informational                   |
| `who_is_it_for`    | Who is it for?        | Informational, Problem/Use Case |
| `why_choose_this`  | Why choose this?      | Comparative, Trust Validation   |
| `how_to_use`       | How to use?           | Informational                   |
| `key_features`     | Key features?         | Informational, Transactional    |
| `comparisons`      | Comparisons?          | Comparative                     |
| `pricing_value`    | Pricing/value?        | Transactional                   |
| `shipping_returns` | Shipping/returns?     | Transactional                   |
| `warranty_support` | Warranty/support?     | Trust Validation                |
| `reviews_social`   | Reviews/social proof? | Trust Validation                |

---

## API Reference

### Evaluate Answer Unit

```typescript
evaluateGeoAnswerUnit({
  unitId: string;
  questionId: string;
  answer: string;
  factsUsed: string[];
}): GeoAnswerUnitEvaluation
```

Returns:

- `signals`: Array of readiness signal evaluations
- `issues`: Array of GEO issues detected
- `citationConfidence`: Derived confidence level

### Evaluate Product

```typescript
evaluateGeoProduct(
  answerUnits: GeoAnswerUnit[]
): GeoProductEvaluation
```

Aggregates Answer Unit evaluations into a product-level readiness assessment.

### Derive Citation Confidence

```typescript
deriveCitationConfidence(
  signals: GeoReadinessSignal[]
): { level: 'high' | 'medium' | 'low'; reason: string }
```

Computes confidence level from signal statuses.

---

## Document History

| Version | Date       | Changes                                                 |
| ------- | ---------- | ------------------------------------------------------- |
| 1.0     | 2025-12-19 | Initial GEO foundation documentation (GEO-FOUNDATION-1) |
| 1.1     | 2025-12-19 | Added GEO-INSIGHTS-2 integration points                 |
