# Redis Setup – EngineO.ai

Redis is used as the backbone for EngineO's background processing and queues:

- BullMQ job queues (starting with `deo_score_queue`)
- Worker processes (DEO Score recompute today; more workers later)
- Future phases: crawl queues, entity extraction, answer-ready content, and test-track worker tests.

This document describes how to run Redis locally, how it is used in production with **Upstash Redis**, and how the NestJS API integrates with Redis and BullMQ.

---

## 1. Local Development (Docker)

For local development, Redis is provided via Docker.

### 1.1 Start Redis locally

From the repository root:

```bash
docker compose -f docker-compose.redis.yml up -d
```

This starts:

- Redis 7 (alpine)
- On `localhost:6379`
- With append-only mode disabled for simplicity.

### 1.2 Environment variables (apps/api)

The API reads the Redis URL from environment variables.

In `apps/api/.env` (development) and `apps/api/.env.example`:

```env
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=engineo
```

In `apps/api/.env.test` (already configured):

```env
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=engineo_test
```

Optional feature flags for background activity (API/worker runtimes):

```env
# Cron + BullMQ feature flags (defaults are safe for local dev/production)
ENABLE_CRON=true
ENABLE_QUEUE_PROCESSORS=true
ENABLE_QUEUE_EVENTS=false
ENABLE_QUEUE_SCHEDULERS=false
```

`REDIS_PREFIX` namespaces keys so multiple environments can share the same Redis instance if needed.

---

## 2. Production Environment – Upstash Redis

In production, Redis is provided by **Upstash Redis** (serverless, managed). Render no longer hosts Redis directly; instead, the API and worker connect to an external Upstash endpoint.

### 2.1 Create Upstash Redis Database

1. Log in to the [Upstash Dashboard](https://console.upstash.com)
2. Click **Redis** → **Create Database**
3. Configure:

| Setting | Value                                                                 |
| ------- | --------------------------------------------------------------------- |
| Name    | `engineo-redis-prod` (production) / `engineo-redis-staging` (staging) |
| Region  | Closest to your Render region                                         |
| TLS     | Enabled (default for `rediss://` URLs)                                |

4. Create the database
5. In the database view, locate and copy:
   - `UPSTASH_REDIS_URL` – Redis TLS URL, e.g.:  
     `rediss://default:<password>@<host>.upstash.io:6379`
   - `UPSTASH_REDIS_REST_URL` – REST URL (not used for BullMQ, but useful for serverless tasks)

> **Important:** For BullMQ and ioredis, we only use the Redis URL (`UPSTASH_REDIS_URL`). The REST URL is **not** used for job queues.

### 2.2 Map Upstash URL to `REDIS_URL`

To keep the application configuration simple, we use a single environment variable `REDIS_URL` everywhere, set to the Upstash TLS URL:

```env
REDIS_URL=<UPSTASH_REDIS_URL>
```

Use this mapping in:

- `.env.production` / `.env` in `apps/api` (if present)
- Render API service environment
- Render worker environment

### 2.3 Create Background Worker on Render (Production)

1. Click **New** → **Background Worker**
2. Connect your GitHub repository
3. Configure:

| Setting       | Value                                            |
| ------------- | ------------------------------------------------ |
| Name          | `engineo-worker`                                 |
| Language      | `Node`                                           |
| Branch        | `main`                                           |
| Region        | Same as Redis                                    |
| Build Command | `pnpm install && pnpm --filter api build`        |
| Start Command | `node apps/api/dist/apps/api/src/worker-main.js` |

4. Add Environment Variables (same as API service, plus Redis):

| Variable       | Value                                   |
| -------------- | --------------------------------------- |
| `NODE_ENV`     | `production`                            |
| `DATABASE_URL` | Your Neon connection string             |
| `REDIS_URL`    | Upstash Redis URL (`UPSTASH_REDIS_URL`) |
| `REDIS_PREFIX` | `engineo_prod`                          |

5. Click **Create Background Worker**

### 2.4 Configure API Service (Production)

Add Redis environment variables to your existing `engineo-api` Web Service:

1. Go to **engineo-api** → **Environment**
2. Add:

| Variable       | Value                                   |
| -------------- | --------------------------------------- |
| `REDIS_URL`    | Upstash Redis URL (`UPSTASH_REDIS_URL`) |
| `REDIS_PREFIX` | `engineo_prod`                          |

3. Click **Save Changes** (triggers redeploy)

The existing BullMQ configuration in `apps/api/src/config/redis.config.ts` reads `REDIS_URL` and `REDIS_PREFIX` and passes them to queues and workers.

### 2.5 Staging Environment (develop)

For a staging environment on the `develop` branch:

- Create a separate Upstash Redis database **or** reuse the same database with a different `REDIS_PREFIX` (for example, `engineo_staging`).
- Create a staging Render Web Service and Background Worker (for example, `engineo-api-staging`, `engineo-worker-staging`) that:
  - Use `Branch: develop`
  - Point `REDIS_URL` to the staging Upstash database (or shared database)
  - Set `REDIS_PREFIX` to a staging-specific prefix to avoid key collisions with production (for example, `engineo_staging`).
  - Optionally set `ENABLE_CRON=false` and/or `ENABLE_QUEUE_PROCESSORS=false` in staging to reduce background Redis activity when not actively testing cron/worker flows.

---

## 3. NestJS + BullMQ Integration (Upstash-Compatible)

Redis is wired into the API and worker runtime via BullMQ.

### 3.1 Redis configuration

`apps/api/src/config/redis.config.ts`:

- Reads `REDIS_URL` and `REDIS_PREFIX` from environment variables.
- Exposes a simple `redisConfig` object used by BullMQ:

```typescript
export const redisConfig = {
  url: process.env.REDIS_URL!, // must be provided (Upstash TLS URL in production)
  prefix: process.env.REDIS_PREFIX ?? 'engineo',
};
```

### 3.2 DEO Score queue

`apps/api/src/queues/queues.ts`:

Creates the DEO Score queue using BullMQ:

```typescript
import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.config';

export const deoScoreQueue = new Queue('deo_score_queue', {
  connection: {
    url: redisConfig.url,
  },
  prefix: redisConfig.prefix,
});
```

This queue is used by the API endpoint:

```
POST /projects/:id/deo-score/recompute
```

to enqueue recompute jobs.

### 3.3 Worker runtime

`apps/api/src/projects/deo-score.processor.ts`:

- Uses BullMQ `Worker` to process jobs from `deo_score_queue`.
- For each job:
  1. Reads `projectId` from the payload.
  2. Calls `DeoSignalsService.collectSignalsForProject(projectId)` to compute DEO signals.
  3. Calls `DeoScoreService.computeAndPersistScoreFromSignals(projectId, signals)` to compute v1 DEO Score and persist a `DeoScoreSnapshot`.
  4. Logs success or failure.

The worker connects to Redis using the same `redisConfig` URL and prefix.

### 3.4 Dedicated worker process

`apps/api/src/worker-main.ts`:

- Bootstraps the NestJS application context (using `AppModule`) without starting the HTTP server.
- Ensures that any workers registered via Nest modules (e.g., `DeoScoreProcessor`) are initialized and can consume jobs from Redis.
- Intended to be used as the entrypoint for Render's background worker:
  ```bash
  node dist/apps/api/src/worker-main.js
  ```

---

## 4. Optional Redis Health Check

While not fully wired into `/health` yet, a future phase (R1+) can:

- Add a small Redis health service (e.g., `RedisHealthService`) that:
  - Calls `PING` on Redis.
  - Reports status in the `/health` endpoint alongside the existing JSON `{ status: 'ok' }`.
- Integrate this with monitoring and alerts.

---

## 5. Troubleshooting

### Cannot connect to Redis locally

1. Ensure Docker is running.
2. Check `docker compose -f docker-compose.redis.yml ps`.
3. Verify `REDIS_URL=redis://localhost:6379` is set in `apps/api/.env`.

### BullMQ jobs stuck in "waiting"

1. Verify the worker process is running (API + worker-main in dev, Render worker in prod).
2. Check that API and worker use the same `REDIS_URL` and `REDIS_PREFIX`.

### Conflicting prefixes across environments

Use different `REDIS_PREFIX` values for dev, test, staging, and prod (for example, `engineo_dev`, `engineo_test`, `engineo_staging`, `engineo_prod`).

---

This Redis foundation supports the DEO Score queue today and will be extended in later phases for crawl, entity, and answer queues, as well as testing (Phase T2).
