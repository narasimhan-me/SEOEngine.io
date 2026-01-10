# GEO Insights – Derivation & Display

> Read-only GEO metrics derived from Answer Units and fix applications.
>
> **Mental Model**: GEO Insights measure *internal readiness* – how well your content is structured for potential extraction by answer engines. These are explainable, auditable signals, **not** external citation guarantees.

---

## Decision Locks (v1)

The following decisions are locked for v1 and must not be changed without explicit approval:

### Mental Model
- GEO Insights measure **internal readiness signals**, not external citation guarantees
- All copy must avoid implying causation between readiness scores and actual citations
- Use "may," "can help," "supports" – never "will," "guarantees," "ensures"

### Competitor Handling
- Competitor visibility is opt-in only
- When displayed, use aggregated anonymized form (e.g., "Competitors average: Medium")
- Never expose specific competitor product names in dashboards

### Required Micro-Sections
- Every metric card includes a "Why this matters" explanation
- Every section includes a "What to do next" action or link
- Explainer text uses hedged language (see Mental Model)

### Trust Language
- "Attribution readiness" instead of "citation confidence" in exports
- "Answer engines" instead of specific vendor names (ChatGPT, Perplexity)
- Include disclaimer: "These metrics reflect internal content readiness signals. Actual citations by AI systems depend on many factors outside your control."

---

## Overview

GEO Insights extends the Project Insights Dashboard (INSIGHTS-1) with GEO-specific metrics. Like all insights, GEO Insights are **read-only** – they never trigger AI operations or database mutations when viewed.

---

## GEO Insights Response Shape

The `geoInsights` block is included in the `ProjectInsightsResponse`:

```typescript
interface GeoInsights {
  overview: {
    productsAnswerReadyPercent: number;
    productsAnswerReadyCount: number;
    productsTotal: number;
    answersTotal: number;
    answersMultiIntentCount: number;
    reuseRatePercent: number;
    confidenceDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    trustTrajectory: {
      improvedProducts: number;
      improvedEvents: number;
      windowDays: number;
      why: string;
    };
    whyThisMatters: string;
  };

  coverage: {
    byIntent: Array<{
      intentType: SearchIntentType;
      label: string;
      productsCovered: number;
      productsTotal: number;
      coveragePercent: number;
    }>;
    /** Intent types with zero product coverage */
    gaps: SearchIntentType[];
    whyThisMatters: string;
  };

  reuse: {
    topReusedAnswers: Array<{
      productId: string;
      productTitle: string;
      answerBlockId: string;
      questionId: string;
      questionText: string;
      mappedIntents: SearchIntentType[];
      potentialIntents: SearchIntentType[];
      why: string;
      href: string;
    }>;
    couldBeReusedButArent: Array<{
      productId: string;
      productTitle: string;
      answerBlockId: string;
      questionId: string;
      questionText: string;
      potentialIntents: SearchIntentType[];
      blockedBySignals: GeoReadinessSignalType[];
      why: string;
      href: string;
    }>;
    whyThisMatters: string;
  };

  trustSignals: {
    topBlockers: Array<{
      issueType: GeoIssueType;
      label: string;
      affectedProducts: number;
    }>;
    avgTimeToImproveHours: number | null;
    mostImproved: Array<{
      productId: string;
      productTitle: string;
      issuesResolvedCount: number;
      href: string;
    }>;
    whyThisMatters: string;
  };

  opportunities: Array<{
    id: string;
    title: string;
    why: string;
    estimatedImpact: 'high' | 'medium' | 'low';
    href: string;
    category: 'coverage' | 'reuse' | 'trust';
  }>;
}
```

---

## Derivation Logic

### Overview Metrics

| Metric | Source | Computation |
|--------|--------|-------------|
| `productsAnswerReadyCount` | Product + AnswerBlock | Products with at least one High-confidence Answer Block |
| `productsAnswerReadyPercent` | Derived | `(productsAnswerReadyCount / productsTotal) * 100` |
| `answersTotal` | AnswerBlock | Count of all Answer Blocks in project |
| `answersMultiIntentCount` | AnswerBlock + intent mapping | Answer Blocks serving 2+ intents (clarity+structure pass) |
| `reuseRatePercent` | Derived | `(answersMultiIntentCount / answersTotal) * 100` |
| `confidenceDistribution` | AnswerBlock | Aggregate of all Answer Block confidence levels |
| `trustTrajectory` | ProductGeoFixApplication | Count of products/events with improved confidence |

### Coverage by Intent

Coverage is computed using `computeGeoIntentCoverageCounts()`:

1. For each Answer Block, derive mapped intents using `deriveGeoAnswerIntentMapping()`
2. Count answers per intent type
3. Identify missing intents (zero coverage)
4. Generate gaps for intents with low coverage

All 5 SearchIntentTypes must appear in `byIntent`:
- `transactional`
- `comparative`
- `problem_use_case`
- `trust_validation`
- `informational`

### Reuse Metrics

Reuse is computed using `computeGeoReuseStats()`:

1. Count Answer Blocks with 2+ mapped intents
2. Identify canonical multi-intent questions (e.g., `why_choose_this`)
3. Flag answers that could be reused but aren't (structure/clarity issues)

### Trust Trajectory

Trust trajectory tracks confidence improvements over time:

1. Query `ProductGeoFixApplication` records for the project
2. Group by product, identify before/after confidence changes
3. Count products that improved (LOW→MEDIUM, MEDIUM→HIGH, LOW→HIGH)
4. Track total improvement events

---

## Integration with INSIGHTS-1

GEO Insights follows INSIGHTS-1 patterns:

### Read-Only Invariant

```typescript
// GEO Insights uses read-only methods only
const answerBlocks = await this.getAnswerBlocksReadOnly(projectId);
const geoApplications = await this.getGeoFixApplicationsReadOnly(projectId);
```

No AI calls, no mutations, no recomputation during view.

### Trust Messaging

Each section includes `whyThisMatters` explaining the metric's value using hedged language (per Decision Locks):

- **Overview**: "Answer readiness and intent coverage help your content be more extractable in AI answer experiences. These are internal, explainable signals — not ranking or citation guarantees."
- **Coverage**: "Coverage shows whether your answer-ready content maps to key intent types. Gaps indicate where engines may not find a suitable on-site answer."
- **Reuse**: "Reusable answers reduce duplication across intents. Multi-intent reuse is only counted when clarity and structure are strong enough to support reliable extraction."
- **Trust Signals**: "Trust signals summarize common GEO blockers and how quickly improvements are applied. These are internal readiness indicators, not external citation tracking."

---

## UI Pages

### GEO Insights Tab

**URL:** `/projects/:projectId/insights/geo-insights`

Displays:
- Overview cards (answer-ready %, confidence distribution)
- Intent coverage chart
- Top reused answers
- Trust trajectory (improved products)
- Opportunities list

### Product GEO Panel

**URL:** `/projects/:projectId/products/:productId` (GEO section)

Displays:
- Product-level readiness signals
- Answer Units with signal evaluations
- Citation confidence badge
- GEO issues with fix buttons

---

## API Endpoints

### GET /projects/:id/insights

Returns full `ProjectInsightsResponse` including `geoInsights` block.

**Authorization:** JWT required, project membership

**Response:**
```json
{
  "projectId": "...",
  "generatedAt": "...",
  "geoInsights": {
    "overview": { ... },
    "coverage": { ... },
    "reuse": { ... },
    "trustSignals": { ... },
    "opportunities": [ ... ]
  }
}
```

---

## Testing

### Unit Tests

`packages/shared/src/geo-types.test.ts`:
- `deriveGeoAnswerIntentMapping()` – intent derivation
- `computeGeoReuseStats()` – reuse metrics
- `computeGeoIntentCoverageCounts()` – coverage counts

### Integration Tests

`apps/api/test/integration/geo-insights-2.test.ts`:
- Full `geoInsights` response shape validation
- All 5 intents present in `byIntent`
- Trust trajectory reflects `ProductGeoFixApplication` records

### E2E Seed

```bash
curl -X POST http://localhost:3001/testkit/e2e/seed-geo-insights-2
```

Creates test data for GEO Insights validation.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-19 | Initial GEO Insights documentation (GEO-INSIGHTS-2) |
