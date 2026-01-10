# GEO-INSIGHTS-2: GEO Insights Dashboard - Manual Testing Guide

**Feature:** Read-only GEO metrics in Project Insights
**Critical Path:** CP-016 (extends), CP-017
**Date:** 2025-12-19

---

## Overview

GEO-INSIGHTS-2 extends the Project Insights Dashboard (INSIGHTS-1) with GEO-specific metrics including answer readiness, intent coverage, reuse efficiency, and trust trajectory. All metrics are derived from existing data and never trigger AI operations.

---

## Prerequisites

### Test Environment Setup

1. Start API and web servers:
   ```bash
   pnpm --filter api dev
   pnpm --filter web dev
   ```

2. Seed test data:
   ```bash
   curl -X POST http://localhost:3001/testkit/e2e/seed-geo-insights-2
   ```

3. Note the returned `accessToken` and `projectId` for testing.

---

## Test Scenarios

### 1. GEO Insights API Response

**Endpoint:** `GET /projects/:projectId/insights`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call insights endpoint with valid auth | Returns 200 with `geoInsights` block |
| 2 | Verify `geoInsights.overview` shape | Contains productsAnswerReadyPercent, confidenceDistribution, trustTrajectory |
| 3 | Verify `geoInsights.coverage.byIntent` | Contains all 5 SearchIntentTypes |
| 4 | Verify `geoInsights.reuse` shape | Contains topReusedAnswers, couldBeReusedButArent |
| 5 | Verify `geoInsights.trustSignals` shape | Contains topBlockers, avgTimeToImproveHours, mostImproved |
| 6 | Verify `geoInsights.opportunities` | Array of GEO improvement opportunities |

**cURL Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/projects/$PROJECT_ID/insights
```

---

### 2. GEO Insights Overview Tab

**URL:** `/projects/:projectId/insights/geo-insights`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to GEO Insights tab | Page loads with overview cards |
| 2 | Verify "Answer Ready" card | Shows percentage and count of ready products |
| 3 | Verify confidence distribution | Shows High/Medium/Low breakdown |
| 4 | Verify trust trajectory | Shows improved products count |
| 5 | Verify `whyThisMatters` text | Explanatory text is displayed |

---

### 3. Intent Coverage Section

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View intent coverage chart | All 5 intents displayed |
| 2 | Verify intent labels | Transactional, Comparative, Problem/Use Case, Trust Validation, Informational |
| 3 | Verify coverage metrics | Shows `productsCovered/productsTotal` and `coveragePercent` |
| 4 | Check gaps list | Missing intent types shown as tags (no severity) |

**Expected Intents:**
- `transactional`
- `comparative`
- `problem_use_case`
- `trust_validation`
- `informational`

**Expected coverage.byIntent shape:**
```json
{
  "intentType": "transactional",
  "label": "Transactional",
  "productsCovered": 5,
  "productsTotal": 10,
  "coveragePercent": 50
}
```

**Expected gaps shape:**
`gaps` is an array of intent type strings (e.g., `["problem_use_case"]`), not objects with severity.

---

### 4. Reuse Metrics Section

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View reuse rate | Shows percentage of multi-intent answers |
| 2 | View top reused answers | Lists products/questions serving multiple intents with links |
| 3 | View "could be reused" list | Shows answers blocked by readiness signals |
| 4 | Verify blocked signals | Shows `blockedBySignals` array (clarity, structure, etc.) |

**Expected topReusedAnswers shape:**
```json
{
  "productId": "...",
  "productTitle": "Product Name",
  "answerBlockId": "...",
  "questionId": "what_is_it",
  "questionText": "What is it?",
  "mappedIntents": ["transactional", "informational"],
  "potentialIntents": ["transactional", "informational", "comparative"],
  "why": "Explanation of intent mapping",
  "href": "/projects/.../products/...?focus=geo"
}
```

**Expected couldBeReusedButArent shape:**
```json
{
  "productId": "...",
  "productTitle": "Product Name",
  "answerBlockId": "...",
  "questionId": "why_choose_this",
  "questionText": "Why choose this?",
  "potentialIntents": ["comparative", "trust_validation"],
  "blockedBySignals": ["clarity", "structure"],
  "why": "Blocked by clarity and structure issues",
  "href": "/projects/.../products/...?focus=geo"
}
```

---

### 5. Trust Signals Section

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View top blockers | Lists GEO issues with label and affected count |
| 2 | View avg time to improve | Shows hours (or null if no data) |
| 3 | View most improved products | Lists products with issuesResolvedCount and links |
| 4 | Verify product links | Each product has a working href |

**Expected topBlockers shape:**
```json
{
  "issueType": "missing_clarity",
  "label": "Missing Clarity",
  "affectedProducts": 5
}
```

**Expected mostImproved shape:**
```json
{
  "productId": "...",
  "productTitle": "Product Name",
  "issuesResolvedCount": 3,
  "href": "/projects/.../products/...?focus=geo"
}
```

---

### 6. Trust Trajectory from Fix Applications

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create ProductGeoFixApplication with LOW→HIGH | Record saved |
| 2 | Refresh insights page | trustTrajectory.improvedProducts increments |
| 3 | Verify improvedEvents count | Reflects total improvement events |

---

### 7. Subnav Navigation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View InsightsSubnav | "GEO Insights" tab appears |
| 2 | Click "GEO Insights" tab | Navigates to `/projects/:id/insights/geo-insights` |
| 3 | Verify active tab styling | Blue border on active tab |
| 4 | Navigate between all tabs | Each tab shows correct content |

**Tab Order:**
1. Overview
2. DEO Progress
3. AI Efficiency
4. Issue Resolution
5. Opportunities
6. **GEO Insights** (new)

---

### 8. Read-Only Invariants

**Critical:** GEO Insights never triggers AI or mutations.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Monitor network requests | No POST/PUT/PATCH requests |
| 2 | Check database after viewing | No new records created |
| 3 | Verify no AI queue jobs | No automation runs enqueued |
| 4 | Refresh multiple times | Same data returned |

---

### 9. Product GEO Panel

**URL:** `/projects/:projectId/products/:productId`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to product detail page | GEO section visible |
| 2 | View readiness signals | All 5 signals displayed with status |
| 3 | View citation confidence badge | High/Medium/Low indicator |
| 4 | View GEO issues list | Issues with fix buttons |
| 5 | Click "Preview" on issue | Preview modal opens |
| 6 | Click "Apply" | Fix applied, confidence may improve |

---

## Trust Contracts

These invariants MUST be verified:

1. **Read-Only Viewing**: Insights page never triggers AI or mutations
2. **Complete Intent Coverage**: All 5 SearchIntentTypes appear in byIntent
3. **Trust Trajectory Accuracy**: Reflects actual ProductGeoFixApplication records
4. **Explanatory Text**: Each section has whyThisMatters explanation
5. **Draft-First Pattern**: Preview uses AI, Apply never uses AI

---

## Test Data Seeded by `seed-geo-insights-2`

The E2E seed endpoint creates:

- User with OWNER role
- Project with Shopify integration (Pro plan)
- Products with Answer Blocks
- DeoScoreSnapshot records with v2 metadata
- ProductGeoFixDraft records
- ProductGeoFixApplication records showing confidence improvements

---

## Related Documents

- [INSIGHTS-1.md](./INSIGHTS-1.md) - Base insights testing guide
- [GEO-FOUNDATION-1.md](./GEO-FOUNDATION-1.md) - GEO foundation testing
- [GEO_FOUNDATION.md](../GEO_FOUNDATION.md) - Core GEO concepts
- [GEO_INSIGHTS.md](../GEO_INSIGHTS.md) - GEO Insights derivation
- [CRITICAL_PATH_MAP.md](../testing/CRITICAL_PATH_MAP.md) - CP-016, CP-017

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-19 | Initial manual testing guide for GEO-INSIGHTS-2 |
