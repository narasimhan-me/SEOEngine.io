# DEO Score – Technical Specification (v1 Draft)

The DEO Score is EngineO.ai’s primary metric for how discoverable a project is across search engines and AI assistants.

This document describes the data model and integration points for DEO Score v1. The scoring algorithm itself will be iterated in later phases.

## Objectives

- Provide a single **overall score (0–100)** per project.
- Break down the score into four components:
  - Content (answer-ready content quality)
  - Entities (coverage & correctness)
  - Technical (crawl & technical health)
  - Visibility (SEO, AEO, PEO, VEO signals)
- Store historical snapshots for trend analysis.
- Expose a simple API for the dashboard and external integrations.

## Data Model

- Table / model: `DeoScoreSnapshot`
- Columns:
  - `projectId`
  - `overallScore`
  - `contentScore`
  - `entityScore`
  - `technicalScore`
  - `visibilityScore`
  - `version`
  - `computedAt`
  - `metadata` (JSONB)

The `Project` model stores a denormalized `currentDeoScore` and `currentDeoScoreComputedAt` for fast access.

## API

- `GET /projects/:projectId/deo-score`
  - Returns the latest snapshot and score breakdown for the given project.
  - Response shape: `DeoScoreLatestResponse` (shared type).

Future endpoints (later phases):

- `GET /projects/:projectId/deo-score/history`

## Phase 2.1 – Recompute Pipeline

### Queue

- **Name:** `deo_score_queue`
- **Payload type:** `DeoScoreJobPayload` (shared type), which includes at least:
  - `projectId: string`
  - Optional metadata fields (e.g., `triggeredByUserId`, `reason`) may be added in later phases but are not required for Phase 2.1 behavior.

### API endpoint

- **POST /projects/:projectId/deo-score/recompute**
  - Validates project ownership before enqueueing.
  - Enqueues a job onto `deo_score_queue` with payload `{ projectId }` (plus any optional metadata).
  - Response: `{ "projectId": string, "enqueued": true }`.

### Worker

A worker process listens on `deo_score_queue` and, for each job:

1. Reads `projectId` from the payload.
2. Calls `DeoScoreService.createPlaceholderSnapshotForProject(projectId)`.
3. Logs success or failure, including `projectId` and `snapshotId` when available.

### Placeholder behavior

The worker uses `computePlaceholderDeoScore()` and `DeoScoreService.createPlaceholderSnapshotForProject` to:

- Insert a new `DeoScoreSnapshot` row with `overallScore = 50` and component scores `null`.
- Update `Project.currentDeoScore` and `Project.currentDeoScoreComputedAt` for fast access.

No real scoring, signals, or weighting are introduced in Phase 2.1; those arrive in Phase 2.2+.

## Computation (Placeholder in Phase 2.0)

In Phase 2.0, DEO Score uses a placeholder scoring function:

- **`computePlaceholderDeoScore()`** (shared package) returns:
  - `overall: 50`
  - `content`, `entities`, `technical`, `visibility`: `null`

- **getLatestForProject** auto-creates a placeholder snapshot if none exists.

- **createPlaceholderSnapshotForProject** calls the shared helper and persists the breakdown.

In later Phase 2.x steps, the placeholder will be replaced by signal-based scoring using `computeDeoScoreFromSignals()`.

## Scoring Model (v1)

DEO Score v1 is a weighted combination of four component scores (0–100):

- **Content**
- **Entities**
- **Technical**
- **Visibility (SEO/AEO/PEO/VEO)**

These component scores are computed from normalized signals (`DeoScoreSignals`), where each signal is typically in the range 0–1.

### Components

**Content**

- Inputs (examples):
  - `contentCoverage` – how many critical intents are covered
  - `contentDepth` – quality and completeness of answers
  - `contentFreshness` – recency of key content
- Score: average of available inputs, normalized 0–100.

**Entities**

- Inputs (examples):
  - `entityCoverage` – coverage of key entities
  - `entityAccuracy` – correctness of facts and schemas
  - `entityLinkage` – internal cross-linking and schema connections
- Score: average of available inputs, normalized 0–100.

**Technical**

- Inputs (examples):
  - `crawlHealth` – crawl success rate and errors
  - `coreWebVitals` – weighted LCP/FID/CLS
  - `indexability` – indexability of critical URLs
- Score: average of available inputs, normalized 0–100.

**Visibility**

- Inputs (examples):
  - `serpPresence` – presence in organic results/snippets
  - `answerSurfacePresence` – presence in AI/assistant responses
  - `brandNavigationalStrength` – success on brand queries
- Score: average of available inputs, normalized 0–100.

### Weights

The overall DEO Score is a weighted sum of the components, using:

- Content: **30%**
- Entities: **25%**
- Technical: **25%**
- Visibility: **20%**

Weights are defined in shared config (`DEO_SCORE_WEIGHTS`) and can be tuned in future versions.

### Versioning

- Current scoring version: `DEO_SCORE_VERSION = "v1"`.
- Stored in `deo_score_snapshots.version`.
- Future scoring versions (v2, v3, …) must:
  - Keep the same snapshot table
  - Evolve `DeoScoreSignals`
  - Update weight/aggregation logic behind a new version constant.

## Phase 2.2 – V1 Scoring Engine

Phase 2.2 replaces the placeholder scoring (fixed `overall=50`) with a real v1 engine that computes weighted component scores from normalized signals.

### Key Changes

- **`DeoSignalsService`** – new service that collects signals for a project. Phase 2.2 uses hardcoded stub values (0.4–0.8 range); Phase 2.3+ will integrate with real data sources.
- **`computeAndPersistScoreFromSignals`** – service method that takes signals, computes the breakdown via `computeDeoScoreFromSignals`, persists a `DeoScoreSnapshot`, and updates the project's denormalized `currentDeoScore`.
- **Processor update** – `DeoScoreProcessor` now calls `DeoSignalsService.collectSignalsForProject` and pipes the result through the v1 scoring engine instead of the placeholder.

### New Exports (shared package)

- `normalizeSignal(value)` – converts 0–1 to 0–100
- `computeDeoComponentScore(signals, component)` – compute one component score
- `computeOverallDeoScore(components)` – weighted sum from component scores

### Stub Signals (Phase 2.2)

All signals are hardcoded in `DeoSignalsService`:

| Signal | Stub Value |
|--------|------------|
| contentCoverage | 0.65 |
| contentDepth | 0.55 |
| contentFreshness | 0.70 |
| entityCoverage | 0.60 |
| entityAccuracy | 0.75 |
| entityLinkage | 0.50 |
| crawlHealth | 0.80 |
| coreWebVitals | 0.65 |
| indexability | 0.70 |
| serpPresence | 0.45 |
| answerSurfacePresence | 0.40 |
| brandNavigationalStrength | 0.55 |

With v1 weights, the computed overall score for stub signals is **~60**.

## Phase 2.3 – Real Signal Ingestion (Heuristic v1)

Phase 2.3 replaces stubbed signals in `DeoSignalsService` with real, heuristic-based signals derived from existing database tables only (no external APIs, no new schema).

### Pillar heuristics

**Content**

- `contentCoverage` – fraction of pages/products that have both a title and description-like field:
  - Pages: `CrawlResult.title` and `CrawlResult.metaDescription` present.
  - Products: `(seoTitle ?? title)` and `(seoDescription ?? description)` present.
- `contentDepth` – average word count across:
  - `CrawlResult.wordCount` and tokenized `Product.description`,
  - normalized as `min(avgWordCount / 800, 1)`.
- `contentFreshness` – average of `1 - min(age / 90 days, 1)` for:
  - Page age: `now - CrawlResult.scannedAt`
  - Product age: `now - Product.lastSyncedAt`.

All content signals are normalized to the 0–1 range.

**Technical**

- `crawlHealth` – fraction of crawl results that:
  - Have HTTP status 2xx/3xx, and
  - Do not include `HTTP_ERROR` or `FETCH_ERROR` in issues.
- `indexability` – fraction of crawl results that are:
  - Considered successful (as above), and
  - Not marked with `THIN_CONTENT` in issues.
- `coreWebVitals` – fixed placeholder value `0.5` until real CWV integration.

**Entities (proto)**

- `entityCoverage` – fraction of pages/products with "entity hints":
  - Pages: both `title` and `h1` present.
  - Products: `(seoTitle ?? title)` and `(seoDescription ?? description)` present.
- `entityAccuracy` – heuristic schema/structure quality:
  - `raw = 1 - (pagesWithStructuralIssues / totalPages)`, where structural issues include:
    - `MISSING_TITLE`, `MISSING_META_DESCRIPTION`, `MISSING_H1`, `THIN_CONTENT`.
  - Clamped to `[0.3, 0.9]`; if no pages exist, defaults to `0.5`.
- `entityLinkage` – simple proxy for internal linkage density:
  - Uses the same average word count as content depth, normalized as `min(avgWordCount / 1200, 1)`.

These are proto-entity signals and do not represent a full entity graph.

**Visibility (proto)**

- `serpPresence` – fraction of pages/products with SEO metadata:
  - Pages: `title` and `metaDescription` present.
  - Products: `(seoTitle ?? title)` and `(seoDescription ?? description)` present.
- `brandNavigationalStrength` – normalized count of brand-like pages:
  - Paths matching `/`, `/home`, `/about`, `/contact`, `/pricing`, `/blog`
  - Score = `min(brandPages / 3, 1)`; 0 pages → 0, 3+ pages → 1.
- `answerSurfacePresence` – fraction of pages that look "answer-ready":
  - Successful crawl,
  - `wordCount >= 400`,
  - `h1` present.

All visibility signals are normalized 0–1 and based solely on existing `CrawlResult` and `Product` data.

### Worker flow (updated for Phase 2.3)

The DEO Score worker (`DeoScoreProcessor`) now uses real heuristic signals:

1. Reads `projectId` from `DeoScoreJobPayload` on `deo_score_queue`.
2. Calls `DeoSignalsService.collectSignalsForProject(projectId)` to compute normalized signals (0–1) from:
   - `CrawlResult` rows for the project.
   - `Product` rows for the project.
3. Passes these signals into `DeoScoreService.computeAndPersistScoreFromSignals(projectId, signals)`.
4. `computeAndPersistScoreFromSignals`:
   - Validates the project.
   - Computes component and overall scores via the v1 scoring engine.
   - Inserts a `DeoScoreSnapshot` row with `version = "v1"`.
   - Updates `Project.currentDeoScore` and `Project.currentDeoScoreComputedAt`.
5. Logs success or failure for each recompute, including `projectId` and `snapshotId`.

For debugging, a developer endpoint `GET /projects/:projectId/deo-signals/debug` is available to inspect the current normalized signal values for a project.

Full-fidelity signals (including real entity graph and external visibility integrations) are deferred to later phases (Phase 3 and 4).

## Phase 2.4 – Crawl Signals (Heuristic v1)

Phase 2.4 upgrades `DeoSignalsService` to compute real crawl-based signals using only existing `CrawlResult` and `Product` data (no schema changes, no external APIs). All signals are normalized to the 0–1 range and continue to feed the v1 scoring engine via `DeoScoreSignals`.

### Technical

- `crawlHealth` – fraction of pages with HTTP status 2xx/3xx and no `HTTP_ERROR` or `FETCH_ERROR` in issues.
- `indexability` – fraction of healthy pages that have both `title` and `metaDescription` and are not marked `THIN_CONTENT` (and are not extremely short).
- `htmlStructuralQuality` – `1 - (issuePages / totalPages)`, where issue pages are missing `title`, `metaDescription`, or `h1`, or have `wordCount < 100`.
- `thinContentQuality` – `1 - (thinPages / totalPages)`, where thin pages have `wordCount < 150` or include `THIN_CONTENT` in issues.
- `coreWebVitals` – remains a fixed placeholder `0.5` until real CWV integration.

### Visibility

- `serpPresence` – fraction of pages that have `title`, `metaDescription`, and `h1`.
- `answerSurfacePresence` – fraction of pages that are healthy, have `h1`, `wordCount >= 400`, and are not marked `THIN_CONTENT`.
- `brandNavigationalStrength` – `min(navPages / 3, 1)`, where `navPages` are pages whose path is `/`, `/home`, `/about`, `/contact`, `/pricing`, `/faq`, or `/support`.

### Entities (heuristic v1)

- `entityHintCoverage` – fraction of crawled pages with both `title` and `h1`.
- `entityStructureAccuracy` – clamped inverse of entity structure issues:
  - `raw = 1 - (entityIssuePages / totalPages)` where entity issues include missing `title`, `metaDescription`, or `h1`, or thin content;
  - `entityStructureAccuracy = clamp(raw, 0.3, 0.9)`; if no pages exist, defaults to `0.5`.
- `entityLinkageDensity`:
  - If an `internalLinkCount` field is available on `CrawlResult`, compute `avgInternalLinks = sum(internalLinkCount) / totalPages` (treating pages without the field as 0) and `entityLinkageDensity = min(avgInternalLinks / 20, 1)`.
  - Otherwise fall back to the existing word-count heuristic `min(avgWordCount / 1200, 1)`.

### Worker behavior

- `DeoSignalsService.collectSignalsForProject(projectId)` now computes these enhanced signals from `CrawlResult` and `Product`.
- `DeoScoreProcessor` continues to call `collectSignalsForProject` and pipe the result into `DeoScoreService.computeAndPersistScoreFromSignals`, preserving the v1 scoring engine and weights.
- The debug endpoint `GET /projects/:projectId/deo-signals/debug` returns the enriched `DeoScoreSignals` object, including the new Phase 2.4 fields.

### Phase 2.4+ Plans

- Allow per-project signal overrides and custom weighting.
- Add signal freshness tracking and staleness detection.
- Integrate external data sources (GSC, Analytics) for visibility signals.

## Phase 2.5 – Product Signals (Heuristic v1)

Phase 2.5 extends `DeoSignalsService` so that **Product** metadata contributes to the Content and Entities components alongside crawled pages. All signals remain normalized to the 0–1 range and continue to feed the v1 scoring engine via `DeoScoreSignals`.

### Content Signals (Pages + Products)

Content signals now combine pages and products using weighted blending based on surface counts:

- **`contentCoverage`** – fraction of surfaces with title + description:
  - Pages: `title` and word count > 0.
  - Products: `(seoTitle ?? title)` and `(seoDescription ?? description)` present.
  - Combined: `(coveragePages * pageCount + coverageProducts * productCount) / totalSurfaces`.

- **`contentDepth`** – average word count normalized:
  - Pages: `min(avgPageWordCount / 800, 1)`.
  - Products: `min(avgProductWordCount / 600, 1)` (lower threshold for product descriptions).
  - Combined: weighted blend by surface count.

- **`contentFreshness`** – recency of content:
  - Pages: `1 - min(age / 90 days, 1)` using `CrawlResult.scannedAt`.
  - Products: fraction of products with `lastSyncedAt` within 90 days.
  - Combined: weighted blend by surface count.

### Entity Signals (Pages + Products)

Entity signals now combine pages and products:

- **`entityHintCoverage`** – fraction of surfaces with "entity hints":
  - Pages: both `title` and `h1` present.
  - Products: both `(seoTitle ?? title)` and `(seoDescription ?? description)` present.
  - Combined: `entityHintTotal / totalSurfaces`.

- **`entityStructureAccuracy`** – clamped inverse of entity structure issues:
  - Pages: missing `title`, `metaDescription`, `h1`, or thin content.
  - Products: missing title, missing description, or thin description (< 80 words).
  - Combined: `clamp(1 - entityIssueTotal / totalSurfaces, 0.3, 0.9)`.

- **`entityLinkage`** – weighted blend of linkage proxies:
  - Pages: `min(avgPageWordCount / 1200, 1)`.
  - Products: `min(avgProductWordCount / 800, 1)`.
  - Combined: weighted blend by surface count.

### Surface Definitions

- **`totalSurfaces`** = `pageCount + productCount`.
- **`pageCount`** = number of `CrawlResult` rows for the project.
- **`productCount`** = number of `Product` rows for the project.

All weighted blends use the formula:
```
combined = (pageMetric * pageCount + productMetric * productCount) / totalSurfaces
```

### Technical & Visibility Signals

Technical and Visibility signals remain page-only in Phase 2.5:
- `crawlHealth`, `indexability`, `htmlStructuralQuality`, `thinContentQuality`, `coreWebVitals` – derived from `CrawlResult` only.
- `serpPresence`, `answerSurfacePresence`, `brandNavigationalStrength` – derived from `CrawlResult` only.

Future phases may extend these to include product-specific metrics.

### Worker Behavior

- `DeoSignalsService.collectSignalsForProject(projectId)` now queries both `CrawlResult` and `Product` tables and computes combined signals.
- `DeoScoreProcessor` continues to call `collectSignalsForProject` and pipe the result into `DeoScoreService.computeAndPersistScoreFromSignals`, preserving the v1 scoring engine and weights.
- The debug endpoint `GET /projects/:projectId/deo-signals/debug` returns the enriched signals, now including product-influenced Content and Entity metrics.

### Phase 2.5+ Plans

- Add product-specific visibility signals (e.g., product page SEO readiness).
- Integrate product image alt text coverage into Entity signals.
- Add per-surface-type signal breakdown in debug endpoint.

## DEO Score v2 – Explainable AI Visibility Index

Phase 2.6 introduces DEO Score v2 as an explainability layer that provides richer insight into AI visibility factors. V2 is computed alongside v1 and stored in snapshot metadata—it does not replace v1 as the canonical score.

### Components & Weights (v2 model)

DEO Score v2 uses six components with weights defined in `DEO_SCORE_WEIGHTS_V2` (in `packages/shared/src/deo-score-config.ts`):

| Component | Weight | Description |
|-----------|--------|-------------|
| **Entity Strength** | 20% | How clearly the product/page defines what it is (entity coverage, attributes, schema hints). |
| **Intent Match Quality** | 20% | How well metadata/content align with user/buyer intent. |
| **Answerability** | 20% | How easily an AI assistant can answer core buyer questions. |
| **AI Visibility Factors** | 20% | Cleanliness and consistency of signals used by AI assistants. |
| **Content Completeness** | 15% | Presence of core content elements (images, copy, price, availability, etc.). |
| **Technical Quality** | 5% | Basic technical health (crawl, indexability, structural quality). |

V1 weights remain unchanged at Content (30%), Entities (25%), Technical (25%), Visibility (20%).

### Signals → v2 Component Mapping

V2 reuses the normalized `DeoScoreSignals` inputs to derive each component using heuristic averages. The mapping is implemented in `computeDeoComponentsV2FromSignals`:

| V2 Component | Input Signals |
|--------------|---------------|
| **Entity Strength** | entityCoverage, entityAccuracy, entityHintCoverage, entityStructureAccuracy, entityLinkage, entityLinkageDensity |
| **Intent Match Quality** | contentCoverage, contentDepth, serpPresence, answerSurfacePresence, brandNavigationalStrength |
| **Answerability** | contentDepth, contentCoverage, answerSurfacePresence, thinContentQuality |
| **AI Visibility Factors** | serpPresence, answerSurfacePresence, brandNavigationalStrength, indexability |
| **Content Completeness** | contentCoverage, contentDepth, contentFreshness, entityCoverage |
| **Technical Quality** | crawlHealth, indexability, htmlStructuralQuality, thinContentQuality, coreWebVitals |

V2 is an explanatory layer (not a new DB schema) and uses `normalizeSignal` to map all component values into 0–100.

### Snapshot Storage & Versioning

V2 explainability is stored inside `DeoScoreSnapshot.metadata`:

```json
{
  "signals": { /* DeoScoreSignals */ },
  "v1": {
    "modelVersion": "v1",
    "breakdown": { /* DeoScoreBreakdown */ }
  },
  "v2": {
    "modelVersion": "v2",
    "breakdown": { /* DeoScoreV2Breakdown */ },
    "components": {
      "entityStrength": 75,
      "intentMatch": 68,
      "answerability": 72,
      "aiVisibility": 65,
      "contentCompleteness": 70,
      "technicalQuality": 80
    },
    "topOpportunities": [
      { "key": "aiVisibility", "score": 65, "potentialGain": 35 },
      { "key": "intentMatch", "score": 68, "potentialGain": 32 },
      { "key": "contentCompleteness", "score": 70, "potentialGain": 30 }
    ],
    "topStrengths": [
      { "key": "technicalQuality", "score": 80, "potentialGain": 20 },
      { "key": "entityStrength", "score": 75, "potentialGain": 25 },
      { "key": "answerability", "score": 72, "potentialGain": 28 }
    ]
  }
}
```

Notes:
- `DeoScoreSnapshot.version` remains tied to the v1 model (`DEO_SCORE_VERSION = "v1"`).
- Older snapshots may lack `v1`/`v2` keys and only contain `signals`; consumers must handle this gracefully.

### Backward Compatibility & API Behavior

- `GET /projects/:projectId/deo-score` continues to return `DeoScoreLatestResponse` with `latestScore` based on v1 (`DeoScoreBreakdown`).
- No new endpoints are added in Phase 2.6; v2 data is discoverable via `latestSnapshot.metadata`.
- All existing v1 behavior and weightings remain unchanged.

### Integration Points (Answer Engine & Issue Engine)

V2 components connect to related systems:

- **Answer Engine**: Answer Blocks and answerability detection will feed into the v2 `answerability`, `intentMatch`, and `entityStrength` components in future phases (see `docs/ANSWER_ENGINE_SPEC.md` and `docs/answers-overview.md`).
- **Issue Engine**: Issue metadata (in `docs/deo-issues-spec.md`) will reference v2 components as impact fields (e.g., which component an issue primarily affects).

Phase 2.6 only stores v2 component scores and explainability; dynamic score recalculation based on issue resolution remains a future phase.

