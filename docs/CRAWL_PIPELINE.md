# Crawl + DEO Pipeline (Phase 3.2)

This document describes the integrated crawl and DEO recompute pipeline added in Phase 3.2. After any crawl completes, the system automatically collects fresh signals and recomputes the project's DEO score.

## Overview

The pipeline ensures DEO scores stay up-to-date without manual intervention:

1. **Crawl** - Fetch and store crawl results for the project
2. **Signal Collection** - Gather DEO signals from crawl data, products, etc.
3. **Score Computation** - Compute DEO breakdown and persist a new snapshot
4. **Project Update** - Update `lastCrawledAt` and `lastDeoComputedAt` timestamps

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Crawl Trigger                               │
│  (Nightly scheduler, manual /seo-scan/start, product scan, etc.)   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SeoScanService.runFullProjectCrawl()             │
│  - Determines domain (Shopify store or project.domain)              │
│  - Fetches homepage, extracts SEO signals                           │
│  - Creates CrawlResult row                                          │
│  - Updates project.lastCrawledAt                                    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│               DeoSignalsService.collectSignalsForProject()          │
│  - Loads all CrawlResults and Products for the project              │
│  - Computes normalized signals (content, entity, technical,         │
│    visibility) in the 0–1 range                                     │
│  - Returns DeoScoreSignals object                                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│        DeoScoreService.computeAndPersistScoreFromSignals()          │
│  - Calls computeDeoScoreFromSignals() (shared lib)                  │
│  - Creates DeoScoreSnapshot row with breakdown                      │
│  - Stores signals in snapshot.metadata                              │
│  - Updates project.currentDeoScore, currentDeoScoreComputedAt,      │
│    and lastDeoComputedAt                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Environment Behavior

### Production (with Redis)

- `CrawlProcessor` worker consumes jobs from `crawl_queue`
- After each crawl, the worker runs the full DEO pipeline synchronously
- Logs timing metrics for crawl, signal collection, and score computation

### Local / Dev (without Redis)

- `CrawlSchedulerService` runs crawls directly (no queue)
- After each scheduled crawl, DEO recompute runs synchronously
- Manual crawls via `SeoScanService.startScan()` and `scanProductPage()` also trigger DEO recompute

## New Schema Field

**`Project.lastDeoComputedAt`** (optional DateTime)

Tracks when the DEO score was last recomputed. This allows:
- Staleness detection (e.g., show warning if DEO score is older than crawl data)
- Dashboard indicators for score freshness
- Future scheduling of DEO-only recomputes if needed

## Key Files

| File | Role |
|------|------|
| `crawl.processor.ts` | BullMQ worker that runs crawl + DEO pipeline for queued jobs |
| `crawl-scheduler.service.ts` | Cron-triggered scheduler; runs DEO recompute in local/dev mode |
| `seo-scan.service.ts` | Core crawl logic; triggers DEO recompute after manual crawls in local/dev |
| `deo-score.service.ts` | DEO score computation and persistence |
| `@engineo/shared` | `computeDeoScoreFromSignals()` pure function and type definitions |

## Logging

The pipeline logs timing metrics at each stage:

```
[CrawlProcessor] Crawl complete for project abc123 at 2024-12-03T02:00:15.000Z
[CrawlProcessor] Signals computed for project abc123 in 45ms
[CrawlProcessor] DEO recompute complete for project abc123 (snapshot snap456, overall=72) in 120ms
[CrawlProcessor] Crawl + DEO pipeline for project abc123 completed in 2450ms
```

## Related Documentation

- `docs/CRAWL_SCHEDULER.md` - Nightly scheduling details
- `docs/deo-score-spec.md` - DEO scoring formula and signals
- `IMPLEMENTATION_PLAN.md` - Overall implementation roadmap
