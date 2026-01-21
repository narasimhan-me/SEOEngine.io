# EngineO.ai – Activation & First DEO Win Metrics

This document defines how to measure onboarding and activation for the First DEO Win flow using existing database models. No new analytics provider or schema changes are required for this phase; all metrics can be computed via reporting/analytics queries on the production database.

---

## Onboarding Steps & Completion Criteria

### Step 1 – Connect your store or site

A project is counted as having completed this step when it has at least one **Integration** row for that project (any `IntegrationType`, including `SHOPIFY` or `CUSTOM_WEBSITE`).

**Query logic:**

```sql
SELECT project_id
FROM "Integration"
WHERE project_id = :projectId
LIMIT 1;
```

### Step 2 – Run your first DEO crawl

Completed when the project has at least one **CrawlResult** row or a non-null `Project.lastCrawledAt`.

**Query logic:**

```sql
SELECT id
FROM "CrawlResult"
WHERE project_id = :projectId
LIMIT 1;

-- OR

SELECT id
FROM "Project"
WHERE id = :projectId AND last_crawled_at IS NOT NULL;
```

### Step 3 – Review your DEO Score & issues

Completed when at least one **DeoScoreSnapshot** exists for the project (proxying "DEO Score is visible").

**Query logic:**

```sql
SELECT id
FROM "DeoScoreSnapshot"
WHERE project_id = :projectId
LIMIT 1;
```

### Step 4 – Optimize 3 key products with AI

Completed when `ProjectOverview.productsWithAppliedSeo` is at least 3, or when there are at least three **AiUsageEvent** rows with the product-optimization feature for that project.

**Query logic:**

```sql
-- Option A: Check productsWithAppliedSeo from ProjectOverview API
-- (computed field based on Product.seoTitle / seoDescription populated)

-- Option B: Count AI usage events
SELECT COUNT(*)
FROM "AiUsageEvent"
WHERE project_id = :projectId
  AND feature = 'product-optimization'
HAVING COUNT(*) >= 3;
```

---

## Activation Metrics

### % of projects completing each onboarding step

For each step, calculate the fraction of active projects satisfying the completion condition above.

| Metric                 | Formula                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| Step 1 completion rate | Projects with ≥1 Integration / Total active projects                  |
| Step 2 completion rate | Projects with ≥1 CrawlResult or lastCrawledAt / Total active projects |
| Step 3 completion rate | Projects with ≥1 DeoScoreSnapshot / Total active projects             |
| Step 4 completion rate | Projects with ≥3 AI product optimizations / Total active projects     |

### Time-to-first-crawl

For each project, time elapsed between `Project.createdAt` and the earliest crawl timestamp (`CrawlResult.scannedAt` or `Project.lastCrawledAt`).

**Query logic:**

```sql
SELECT
  p.id AS project_id,
  p.created_at,
  MIN(cr.scanned_at) AS first_crawl_at,
  EXTRACT(EPOCH FROM (MIN(cr.scanned_at) - p.created_at)) / 3600 AS hours_to_first_crawl
FROM "Project" p
LEFT JOIN "CrawlResult" cr ON cr.project_id = p.id
GROUP BY p.id, p.created_at;
```

### Time-to-first-Optimize

Time from `Project.createdAt` to the first AI product optimization usage event.

**Query logic:**

```sql
SELECT
  p.id AS project_id,
  p.created_at,
  MIN(aue.created_at) AS first_optimize_at,
  EXTRACT(EPOCH FROM (MIN(aue.created_at) - p.created_at)) / 3600 AS hours_to_first_optimize
FROM "Project" p
LEFT JOIN "AiUsageEvent" aue ON aue.project_id = p.id AND aue.feature = 'product-optimization'
GROUP BY p.id, p.created_at;
```

### Time-to-3-Optimizations

Time from `Project.createdAt` to the third AI product optimization usage event.

**Query logic:**

```sql
WITH ranked_events AS (
  SELECT
    project_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS event_num
  FROM "AiUsageEvent"
  WHERE feature = 'product-optimization'
)
SELECT
  p.id AS project_id,
  p.created_at,
  re.created_at AS third_optimize_at,
  EXTRACT(EPOCH FROM (re.created_at - p.created_at)) / 3600 AS hours_to_3_optimizations
FROM "Project" p
LEFT JOIN ranked_events re ON re.project_id = p.id AND re.event_num = 3
GROUP BY p.id, p.created_at, re.created_at;
```

---

## Data Sources

All metrics can be derived from the following existing tables:

- **Project** – `id`, `createdAt`, `lastCrawledAt`
- **Integration** – `id`, `projectId`, `type`, `createdAt`
- **CrawlResult** – `id`, `projectId`, `scannedAt`
- **DeoScoreSnapshot** – `id`, `projectId`, `computedAt`
- **AiUsageEvent** – `id`, `projectId`, `feature`, `createdAt`
- **Product** – `id`, `projectId`, `seoTitle`, `seoDescription` (for productsWithAppliedSeo)

No additional schema changes or analytics providers are required for this phase.
