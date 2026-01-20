# Redis Background Activity Flags – Manual Testing (Staging vs Production)

> Manual testing guide for environment-gated Redis usage in API/worker/cron runtimes, focused on reducing idle Upstash Redis commands in staging while preserving production behavior.

---

## Overview

- Purpose of the feature/patch:
  - Introduce environment feature flags to disable non-essential background Redis activity (cron + BullMQ workers) in staging while keeping production behavior unchanged.
  - Ensure REDIS_PREFIX is used consistently so staging and production do not share the same keyspace.
- High-level user impact and what "success" looks like:
  - Staging environment can run API tests and targeted worker tests without incurring continuous Upstash command usage from cron/idle workers.
  - Production continues to process scheduled crawls and queue jobs exactly as before.
- Related phases/sections in IMPLEMENTATION_PLAN.md:
  - Environment hardening / infrastructure cost controls for Redis.
  - Crawl Scheduler (nightly crawls) and BullMQ worker phases.
- Related documentation:
  - docs/REDIS_SETUP.md
  - docs/CRAWL_SCHEDULER.md
  - Render / Upstash environment configuration docs (deployment-specific).

---

## Preconditions

- Environment requirements:
  - Staging API + worker pointing at an Upstash Redis instance (shared or dedicated).
  - Production-like API + worker environment for comparison.
  - Environment variables wired for:
    - REDIS_URL
    - REDIS_PREFIX
    - ENABLE_CRON
    - ENABLE_QUEUE_PROCESSORS
    - ENABLE_QUEUE_EVENTS
    - ENABLE_QUEUE_SCHEDULERS
- Test accounts and sample data:
  - At least one project with crawl/DEO pipelines enabled (for cron tests).
  - At least one project with Answer Block automations enabled (for worker tests).
- Required user roles or subscriptions:
  - Admin-level account (for invoking crawl triggers where necessary).
  - Pro/Business plan user for Answer Block automation scenarios.

---

## Test Scenarios (Happy Path)

### Scenario 1: Staging – Cron disabled via ENABLE_CRON=false

ID: HP-REDIS-001

Preconditions:

- [ ] Staging environment with API + worker deployed.
- [ ] REDIS_PREFIX set to a staging-specific value (e.g., engineo_staging).
- [ ] ENABLE_CRON=false configured in the staging API environment.

Steps:

1. Deploy or restart the staging API so new env vars take effect.
2. Inspect API logs on startup and confirm a line similar to:
   - `[Runtime] api startup { NODE_ENV=..., REDIS_PREFIX=engineo_staging, ENABLE_CRON='false', ... }`
3. Wait for the nightly cron window or manually trigger the scheduler via the admin endpoint (if available).
4. Observe logs from CrawlSchedulerService.scheduleProjectCrawls().
5. In Upstash metrics, observe command rate before and after disabling cron.

Expected Results:

- Logs:
  - On each cron tick, a log such as:
    - `[CrawlScheduler] Cron flags: NODE_ENV=..., REDIS_PREFIX=engineo_staging, ENABLE_CRON=false`
    - `[CrawlScheduler] Cron disabled via ENABLE_CRON=false; skipping crawl scheduling tick.`
  - No `cron tick: enqueued X jobs` log appears when ENABLE_CRON=false.
- Upstash metrics:
  - Background commands attributed to nightly crawl scheduling drop in staging (compared to prior behavior), aside from any manual invocations.
- Behavior:
  - Manual crawl endpoints (e.g., /projects/:id/crawl/run) still work as expected.
  - Production cron behavior is unaffected (covered in Scenario 3).

---

### Scenario 2: Staging – Workers run without QueueEvents/QueueSchedulers

ID: HP-REDIS-002

Preconditions:

- [ ] Staging worker deployed with:
  - ENABLE_QUEUE_PROCESSORS=true
  - ENABLE_QUEUE_EVENTS=false
  - ENABLE_QUEUE_SCHEDULERS=false
  - REDIS_PREFIX=engineo_staging (or similar).
- [ ] At least one project where Answer Block automation and crawl/DEO jobs can be triggered.

Steps:

1. Restart the staging worker process.
2. Inspect worker logs on startup:
   - Look for `[Runtime] worker startup` with the runtime flags object showing:
     - `ENABLE_QUEUE_PROCESSORS='true'`
     - `ENABLE_QUEUE_EVENTS='false'`
     - `ENABLE_QUEUE_SCHEDULERS='false'`.
3. Trigger a DEO score recompute via /projects/:id/deo-score/recompute.
4. Trigger a manual crawl via /projects/:id/crawl/run.
5. Trigger Answer Block automation for a product (e.g., via the Product Workspace UI).

Expected Results:

- Worker behavior:
  - Jobs are processed as before:
    - DeoScoreProcessor consumes deo_score_queue jobs.
    - CrawlProcessor consumes crawl_queue jobs.
    - AnswerBlockAutomationProcessor consumes answer_block_automation_queue jobs.
  - No errors related to missing QueueEvents or QueueSchedulers appear in logs (none are instantiated when flags are false).
- Logs:
  - Worker startup log clearly shows the runtime flags for staging.
  - Where processors are disabled via ENABLE_QUEUE_PROCESSORS=false (if tested separately), logs indicate the worker initialization is skipped (see Edge Case EC-002).
- Upstash metrics:
  - Command usage reflects only active jobs; there is no additional noise from QueueEvents/QueueSchedulers.

---

### Scenario 3: Production – Default behavior unchanged

ID: HP-REDIS-003

Preconditions:

- [ ] Production API + worker using:
  - REDIS_PREFIX=engineo_prod (or equivalent production prefix).
  - No ENABLE\_\* flags set or all set to their default/true values:
    - ENABLE_CRON unset or true
    - ENABLE_QUEUE_PROCESSORS unset or true
    - ENABLE_QUEUE_EVENTS as appropriate (future use)
    - ENABLE_QUEUE_SCHEDULERS as appropriate (future use).

Steps:

1. Restart production API and worker with the new image/config.
2. Inspect startup logs for API and worker:
   - Confirm `[Runtime] api startup` and `[Runtime] worker startup` lines show REDIS_PREFIX=engineo_prod and ENABLE_CRON / ENABLE_QUEUE_PROCESSORS resolved to true/undefined.
3. Observe nightly cron behavior in logs:
   - Check CrawlScheduler logs around the scheduled time.
4. Trigger representative jobs:
   - /projects/:id/deo-score/recompute
   - /projects/:id/crawl/run
   - Answer Block automation for a product.

Expected Results:

- Cron:
  - Nightly scheduler runs as before:
    - Logs show the cron flags with ENABLE_CRON=true.
    - Logs include: `cron tick: enqueued X jobs (mode=queue|sync)` with non-zero X when projects are due.
- Workers:
  - All queue processors initialize and process jobs normally.
  - No regressions in DEO recompute, crawl, or Answer Block automation behavior.
- Redis keyspace:
  - REDIS_PREFIX=engineo_prod keeps production keys isolated from staging.

---

## Edge Cases

### EC-REDIS-001: ENABLE_CRON unset (backward compatibility)

Description: Validate behavior when ENABLE_CRON is not defined at all.

Steps:

1. In a test environment, remove ENABLE_CRON from the API env.
2. Restart the API and observe logs.

Expected Behavior:

- [CrawlScheduler] Cron flags log shows ENABLE_CRON=undefined.
- Cron behaves as previously (enabled by default); nightly scheduling still occurs.

---

### EC-REDIS-002: ENABLE_QUEUE_PROCESSORS=false in staging

Description: Staging worker with queue processors fully disabled.

Steps:

1. Set ENABLE_QUEUE_PROCESSORS=false for the staging worker.
2. Restart the worker and observe logs.
3. Trigger DEO recompute / crawl / Answer Block automation jobs from the API.

Expected Behavior:

- Worker logs show that each BullMQ processor logs a message indicating workers are disabled and no Worker instances are created.
- Jobs are enqueued but remain unprocessed until the flag is turned back on.
- Production worker behavior is unaffected.

---

## Error Handling

### ERR-REDIS-001: Misconfigured Redis (REDIS_URL missing)

Scenario: REDIS_URL is missing or invalid but feature flags are enabled.

Steps:

1. In a test environment, intentionally misconfigure REDIS_URL.
2. Start API + worker.

Expected Behavior:

- Queue initialization logs warn that Redis is not configured and queue functionality is disabled.
- Cron logs may still run but skip queue enqueues when crawlQueue is null.
- API endpoints that depend on queues fall back to documented behavior (e.g., sync operations where supported).

---

## Limits

### LIM-REDIS-001: Staging coverage vs cost

Scenario: Staging with background workers and cron disabled.

Steps:

1. Run staging with ENABLE_CRON=false and ENABLE_QUEUE_PROCESSORS=false.
2. Execute only API-level tests (no background workers).

Expected Behavior:

- Upstash commands drop to near-zero when no tests are running.
- Some background flows (nightly crawls, async automations) are not exercised in this configuration and must be validated in a production-like environment or via dedicated test runs with flags enabled.

---

## Regression

### Areas potentially impacted:

- [ ] Nightly crawl scheduler behavior and per-project crawl frequency.
- [ ] BullMQ queue processing for DEO recompute and Answer Block automations.
- [ ] Redis health checks and any code paths that assume Redis is always present.

### Quick sanity checks:

- [ ] Production cron continues to enqueue and process crawls nightly.
- [ ] Manual DEO recompute and crawls still function in all environments.
- [ ] Answer Block automations still run correctly when workers are enabled.

---

## Post-Conditions

### Data cleanup steps:

- [ ] Revert any temporary environment changes made during testing in staging.
- [ ] Clean up any test projects/products created solely for these scenarios.

### Follow-up verification:

- [ ] Confirm Upstash command metrics reflect the intended reductions in staging.
- [ ] Verify no unexpected spikes in production Redis activity after deployment.

---

## Known Issues

- Intentionally accepted issues:
  - When ENABLE_QUEUE_PROCESSORS=false, jobs may accumulate in queues until processors are re-enabled; this is expected and should be accounted for in staging usage.
- Out-of-scope items:
  - Adding or refactoring QueueEvents/QueueSchedulers (future phases may introduce them behind the same flags).
  - Changing job schemas or queue names.
- TODOs:
  - Extend automated monitoring around Redis commands by environment (dev/staging/prod).

---

## Approval

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| Tester Name    | [Name]                                |
| Date           | [YYYY-MM-DD]                          |
| Overall Status | [ ] Passed / [ ] Blocked / [ ] Failed |
| Notes          | [Any additional notes]                |
