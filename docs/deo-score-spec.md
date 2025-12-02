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
- `POST /projects/:projectId/deo-score/recompute`

## Computation (Placeholder in Phase 2.0)

In Phase 2.0, DEO Score computation is a placeholder. The current phase only defines:

- Data model
- API response shape
- Service entry points for workers

The actual scoring logic, signal weighting, and pipeline integration will be implemented in later Phase 2.x steps.

