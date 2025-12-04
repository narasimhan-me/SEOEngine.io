# Crawl Scheduler (Phase 3.1)

EngineO.ai's crawl scheduler keeps crawl data fresh without manual intervention by running automatic crawls for every project on a nightly schedule.

## Cron Schedule

- **Cron expression**: `0 2 * * *`
- Runs nightly at 02:00 server time.
- Implemented via NestJS `@nestjs/schedule` (`@Cron('0 2 * * *')`).

## Environment Behavior

### Production

1. `CrawlSchedulerService` enumerates all projects from the `Project` table.
2. For each project it enqueues a job onto `crawl_queue` with payload:
   ```json
   { "projectId": "string" }
   ```
3. A BullMQ worker (`CrawlProcessor`) consumes jobs from `crawl_queue`:
   - Calls `SeoScanService.runFullProjectCrawl(projectId)` to perform the crawl.
   - Updates `project.lastCrawledAt` to the crawl timestamp.
   - Logs success or failure for observability.
4. Requires Redis to be configured via `REDIS_URL` and `redisConfig`.

### Local / Dev

1. Scheduler does not depend on Redis.
2. For each project, `CrawlSchedulerService` calls:
   - `SeoScanService.runFullProjectCrawl(projectId)` directly from the API process.
3. After each crawl it updates `project.lastCrawledAt`.
4. Behavior mirrors production (same crawl path and timestamp updates) but avoids Redis requirements for local development.

## Queue Behavior

- **Queue name**: `crawl_queue`
- **Backend**: BullMQ using the shared `redisConfig`/`REDIS_URL`.
- **Producer**: `CrawlSchedulerService` (production mode only).
- **Consumer**: `CrawlProcessor` (runs in the worker runtime via `worker-main.ts` and `AppModule`).
- **Payload shape**:
  ```json
  { "projectId": "string" }
  ```
- Jobs are idempotent per run; each nightly execution simply enqueues one crawl per project.

## Flow Diagram (Textual)

### 1. Nightly trigger (02:00)

`CrawlSchedulerService.scheduleProjectCrawls()` fires via `@Cron('0 2 * * *')`.

### 2. Project enumeration

Scheduler loads all projects from the database.

### 3. Environment branch

- **If `NODE_ENV === 'production'` and Redis is enabled (and `IS_LOCAL_DEV` is not set)**:
  - For each project, enqueue `{ projectId }` on `crawl_queue`.
- **Otherwise (local/dev or Redis unavailable)**:
  - For each project, call `SeoScanService.runFullProjectCrawl(projectId)` directly and update `project.lastCrawledAt`.

### 4. Queue processing (production)

`CrawlProcessor` consumes jobs from `crawl_queue`.

For each job:
- Runs a full project crawl via `SeoScanService`.
- Updates `project.lastCrawledAt`.
- Logs success or failure.

### 5. Downstream effects (Phase 3.2 Auto DEO Recompute)

- New `CrawlResult` rows feed existing overview metrics and DEO signal collection.
- **Auto DEO Recompute**: After each crawl, the pipeline collects DEO signals and recomputes the DEO score automatically.
- Both `project.lastCrawledAt` and `project.lastDeoComputedAt` are updated.
- See `docs/CRAWL_PIPELINE.md` for full pipeline details.

## Redis Configuration

BullMQ requires Redis to use the `noeviction` memory policy. If you see this warning in your logs:

```
IMPORTANT! Eviction policy is optimistic-volatile. It should be "noeviction"
```

This means your Redis instance may evict queue data when memory is full, potentially causing job loss.

**To fix on Render:**
1. Navigate to your Redis instance in the Render Dashboard
2. Configure the `maxmemory-policy` to `noeviction`
3. If Render doesn't allow this setting, consider upgrading to a larger Redis plan or using a provider like Upstash that supports `noeviction`

**Why this matters:** With eviction policies like `volatile-lru`, Redis may delete queue jobs when under memory pressure, causing scheduled crawls to be silently dropped.

## Notes

- `lastCrawledAt` is stored as an optional timestamp on the `Project` model.
- Future UX phases can use this field to display staleness badges and "Last Crawl" indicators.
- Manual crawls (e.g., via `/seo-scan/start` and product scans) also update `lastCrawledAt`, keeping the timestamp consistent regardless of whether the crawl was manual or scheduled.
