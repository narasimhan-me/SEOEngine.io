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

