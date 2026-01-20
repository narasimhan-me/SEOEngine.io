# DEO Issues Engine (Phase 3B + UX-7 + UX-8)

The DEO Issues Engine converts raw crawl + product data and aggregated DEO signals into a structured, human-readable issues list that merchants can act on.

It powers:

- Project Overview → Issues summary
- Product list → Issue badges
- Product optimization workspace → Issue insights
- Issues Engine page → Centralized issue management
- AI-powered fix actions → One-click optimization
- Future automation (e.g., "Fix all missing metadata")

## Evolution

| Phase | Name               | Scope                                          |
| ----- | ------------------ | ---------------------------------------------- |
| 3B    | Issues Engine Core | Backend-only aggregated issues                 |
| UX-7  | Issue Engine Lite  | Product-focused issues with fix actions        |
| UX-8  | Issue Engine Full  | Rich metadata, categories, and AI fix guidance |

## 1. Issue Model

Shared types (in `packages/shared/src/deo-issues.ts`):

```typescript
export type DeoIssueSeverity = 'critical' | 'warning' | 'info';

// Issue Engine Lite types (Phase UX-7)
export type DeoIssueType =
  | 'missing_seo_title'
  | 'missing_seo_description'
  | 'weak_title'
  | 'weak_description'
  | 'missing_long_description'
  | 'duplicate_product_content'
  | 'low_entity_coverage'
  | 'not_answer_ready'
  | 'weak_intent_match'
  | 'missing_product_image'
  | 'missing_price'
  | 'missing_category';

export type DeoIssueFixType = 'aiFix' | 'manualFix' | 'syncFix';

// Issue Engine Full types (Phase UX-8)
export type DeoIssueCategory =
  | 'metadata'
  | 'content_entity'
  | 'answerability'
  | 'technical'
  | 'schema_visibility';

export type DeoIssueFixCost = 'one_click' | 'manual' | 'advanced';

export interface DeoIssue {
  id: string;
  title: string;
  description: string;
  severity: DeoIssueSeverity;
  count: number;
  affectedPages?: string[];
  affectedProducts?: string[];

  // === Issue Engine Lite fields (Phase UX-7) ===
  type?: DeoIssueType;
  fixType?: DeoIssueFixType;
  fixReady?: boolean;
  primaryProductId?: string;

  // === Issue Engine Full fields (Phase UX-8) ===
  category?: DeoIssueCategory;
  confidence?: number;
  deoComponentKey?: string;
  deoImpactEstimate?: number;
  whyItMatters?: string;
  recommendedFix?: string;
  aiFixable?: boolean;
  fixCost?: DeoIssueFixCost;
  dependencies?: string[];
}

export interface DeoIssuesResponse {
  projectId: string;
  generatedAt: string; // ISO timestamp
  issues: DeoIssue[];
}
```

API response shape (JSON):

```json
{
  "projectId": "proj_123",
  "generatedAt": "2025-01-01T02:00:00.000Z",
  "issues": [
    {
      "id": "missing_metadata",
      "title": "Missing titles or descriptions",
      "description": "Some pages or products are missing SEO titles or meta descriptions, which reduces visibility and click-through rates.",
      "severity": "critical",
      "count": 42,
      "affectedPages": ["https://example.com/", "..."],
      "affectedProducts": ["prod_1", "prod_2"]
    }
  ]
}
```

## 2. Data Sources

The engine is computed on-demand and does not persist anything. It reads from:

- `CrawlResult` rows for the project
- `Product` rows for the project
- Aggregated `DeoScoreSignals` returned by `DeoSignalsService.collectSignalsForProject(projectId)`
- Existing DEO snapshots (indirectly via signals/score, not directly queried)

No new tables or columns are written in this phase.

## 3. Issue Categories & Detection Rules

Each category describes:

- **Definition** – what the issue represents
- **Detection** – how it is detected from crawl/product data and signals
- **Severity thresholds** – how to map metrics to critical / warning / info

Where counts are needed, they are computed directly from `CrawlResult` and `Product` rows.

### 3.1 Missing Metadata (`missing_metadata`)

**Definition**

Pages or products missing a title and/or meta description.

**Detection**

- Pages:
  - Missing `<title>` → contribute to `missingTitles`.
  - Missing `<meta name="description">` → contribute to `missingDescriptions`.
- Products:
  - Missing SEO title (`seoTitle`) or SEO description (`seoDescription`) → contribute to `missingProductMetadata`.

**Count:**

- `count = missingTitles + missingDescriptions + missingProductMetadata`.
- `affectedPages` includes up to 20 URLs with missing metadata.
- `affectedProducts` includes up to 20 product IDs with missing SEO metadata.

**Severity** (by fraction of surfaces with any missing metadata):

```
ratio = surfacesWithMissingMetadata / totalSurfaces
critical if ratio > 0.10
warning if ratio > 0.03
info if ratio > 0
```

### 3.2 Thin Content (`thin_content`)

**Definition**

Content that is too short to be useful or competitive.

**Detection**

- Pages:
  - Word count < 150 (from `CrawlResult.wordCount`).
- Products:
  - Description words < 80 (using `seoDescription ?? description`).

**Count:**

- `count = thinPages + thinProducts`.
- `affectedPages` includes up to 20 thin page URLs.
- `affectedProducts` includes up to 20 thin product IDs.

**Severity** (by fraction of surfaces that are thin):

```
thinRatio = (thinPages + thinProducts) / totalSurfaces
critical if thinRatio > 0.25
warning if thinRatio > 0.10
info if thinRatio > 0.02
```

### 3.3 Low Entity Coverage (`low_entity_coverage`)

**Definition**

Insufficient entity signals and schema coverage.

**Detection**

- Pages:
  - Missing title or H1 (no strong entity hint).
- Products:
  - Missing SEO title or SEO description, or
  - Weak description < 120 words.

**Count:**

- `count = surfacesWithEntityIssues` (pages + products that fail the above heuristics).
- `affectedPages` and `affectedProducts` list up to 20 impacted items.

**Severity** (using `entityCoverage` from `DeoScoreSignals` where available):

```
critical if entityCoverage < 0.35
warning if entityCoverage < 0.60
info if entityCoverage < 0.80
```

If `entityCoverage` is not available, it is approximated from the fraction of surfaces with entity hints.

### 3.4 Indexability Problems (`indexability_problems`)

**Definition**

Pages that are hard or impossible to index.

**Detection**

For each page:

- HTTP errors (status < 200 or ≥ 400), or
- `issues` includes `HTTP_ERROR` or `FETCH_ERROR`, or
- Missing title, meta description, or H1, or
- `issues` indicates noindex (e.g. `NOINDEX`, `NO_INDEX`, `META_ROBOTS_NOINDEX`).

**Count:**

- `count = indexabilityIssueCount` (number of pages with any of the above).
- `affectedPages` includes up to 20 problematic URLs.

**Severity** (using `indexability` from `DeoScoreSignals`):

```
critical if indexability < 0.5
warning if indexability < 0.75
info if indexability < 0.9
```

### 3.5 Answer Surface Weakness (`answer_surface_weakness`)

**Definition**

Pages that are not strong candidates for rich answer surfaces.

**Detection**

For each page:

- Word count < 400, or
- Missing H1.

**Count:**

- `count = weakAnswerPages`.
- `affectedPages` includes up to 20 URLs failing the above.

**Severity** (using `answerSurfacePresence` from `DeoScoreSignals`):

```
critical if answerSurfacePresence < 0.2
warning if answerSurfacePresence < 0.35
info if answerSurfacePresence < 0.5
```

### 3.6 Brand Navigational Weakness (`brand_navigational_weakness`)

**Definition**

Missing canonical navigational pages that support brand and trust.

**Detection**

From `CrawlResult.url` paths, detect presence of:

- `/`
- `/about`
- `/contact`
- `/faq`
- `/support`

**Count:**

- `count = number of missing canonical paths`.
- `affectedPages` lists the missing canonical paths (e.g., `["/about", "/contact"]`).

**Severity** (using `brandNavigationalStrength` from `DeoScoreSignals`):

```
critical if brandNavigationalStrength < 0.25
warning if brandNavigationalStrength < 0.40
info if brandNavigationalStrength < 0.60
```

### 3.7 Crawl Health / Errors (`crawl_health_errors`)

**Definition**

HTTP and fetch errors that reduce crawl coverage and visibility.

**Detection**

For each page:

- HTTP status < 200 or ≥ 400, or
- `issues` includes `HTTP_ERROR` or `FETCH_ERROR`.

**Count:**

- `count = errorPages`.
- `affectedPages` includes up to 20 URLs with errors.

**Severity** (using `crawlHealth` from `DeoScoreSignals`):

```
critical if crawlHealth < 0.6
warning if crawlHealth < 0.8
info if crawlHealth < 0.95
```

### 3.8 Product Content Depth (`product_content_depth`)

**Definition**

Product descriptions that are too shallow.

**Detection**

Per product:

- Description missing or < 50 words.

**Count:**

- `count = products with missing/very short descriptions`.
- `affectedProducts` includes up to 20 product IDs.

**Severity** (using product content depth heuristic):

- Compute average product description word count.
- Derive `contentDepthProducts = clamp(avgWords / 600, 0, 1)`.
- Severity:
  - `critical if contentDepthProducts < 0.25`
  - `warning if contentDepthProducts < 0.45`
  - `info if contentDepthProducts < 0.65`

## 4. API Endpoint

Backend endpoint (in `ProjectsController`):

```
GET /projects/:id/deo-issues
```

**Behavior:**

1. Validates project ownership (same as other project endpoints).
2. Calls `DeoIssuesService.getIssuesForProject(projectId, userId)`.
3. Returns a `DeoIssuesResponse` payload.

No pagination or persistence; issues are computed on-demand from latest data.

## 5. Constraints

- No new database fields or tables. Issues are derived from existing schema only.
- No UI changes in this phase; the frontend will consume this endpoint in a later UX phase.
- No DEO scoring changes. The v1 DEO formula and weights remain unchanged; the Issues Engine is an interpretation layer on top.

## 6. Acceptance Criteria

Phase 3B is complete when:

1. `GET /projects/:id/deo-issues` returns a structured `DeoIssuesResponse` with `projectId`, `generatedAt`, and a list of `DeoIssue` items.
2. All categories defined above are implemented with the specified detection rules and severity thresholds.
3. Issue count values match raw `CrawlResult` and `Product` data for representative test projects.
4. No new rows or columns are written as part of issue computation.
5. No frontend changes are required; the API is ready for consumption by UX-4.

---

## 7. Issue Engine Lite (Phase UX-7)

Issue Engine Lite extends the base issue model with product-focused issues and actionable fix buttons.

### 7.1 Additional Issue Types

| Issue ID                    | Type            | Severity | Fix Type  |
| --------------------------- | --------------- | -------- | --------- |
| `missing_seo_title`         | Metadata        | Critical | aiFix     |
| `missing_seo_description`   | Metadata        | Critical | aiFix     |
| `weak_seo_title`            | Content Quality | Warning  | aiFix     |
| `weak_seo_description`      | Content Quality | Warning  | aiFix     |
| `missing_long_description`  | Content Quality | Warning  | manualFix |
| `duplicate_product_content` | Content Quality | Warning  | aiFix     |
| `low_entity_coverage`       | AI Visibility   | Warning  | aiFix     |
| `not_answer_ready`          | AI Visibility   | Warning  | aiFix     |
| `weak_intent_match`         | AI Visibility   | Info     | aiFix     |
| `missing_product_image`     | Structural      | Critical | manualFix |
| `missing_price`             | Structural      | Critical | syncFix   |
| `missing_category`          | Structural      | Warning  | syncFix   |

### 7.2 Fix Action Types

- **aiFix**: Routes to product workspace for AI-powered optimization
- **manualFix**: Routes to product page for manual editing
- **syncFix**: Triggers Shopify sync to refresh product data

### 7.3 UI Components

- Issues Engine page at `/projects/[id]/issues`
- Severity filter buttons (All/Critical/Warning/Info)
- Fix action buttons per issue
- Issue badge in Products page header

---

## 8. Issue Engine Full (Phase UX-8)

Issue Engine Full extends all issues with rich metadata for better context, prioritization, and AI fix guidance.

### 8.1 Issue Categories

| Category            | Description                         | Example Issues                             |
| ------------------- | ----------------------------------- | ------------------------------------------ |
| `metadata`          | SEO titles, descriptions, meta tags | missing_seo_title, weak_title              |
| `content_entity`    | Content depth, entity coverage      | thin_content, low_entity_coverage          |
| `answerability`     | AI answer readiness                 | not_answer_ready, weak_intent_match        |
| `technical`         | Crawl health, indexability          | crawl_health_errors, indexability_problems |
| `schema_visibility` | Entity signals, brand pages         | brand_navigational_weakness                |

### 8.2 Fix Cost Levels

| Fix Cost    | Description                     | Time Estimate |
| ----------- | ------------------------------- | ------------- |
| `one_click` | AI-fixable with single action   | < 1 minute    |
| `manual`    | Requires human content creation | 10-30 minutes |
| `advanced`  | Technical or structural changes | 30+ minutes   |

### 8.3 New Fields

Each issue now includes:

- **category**: Classification for filtering and grouping
- **whyItMatters**: User-facing explanation of business impact
- **recommendedFix**: Actionable guidance for resolution
- **aiFixable**: Whether AI can fix this issue
- **fixCost**: Estimated effort level

### 8.4 Issue Enrichment by Category

**Metadata Issues:**

- category: `'metadata'`
- aiFixable: `true` (for missing/weak titles and descriptions)
- fixCost: `'one_click'`

**Content/Entity Issues:**

- category: `'content_entity'`
- aiFixable: varies (some require manual content)
- fixCost: `'manual'` or `'one_click'`

**Answerability Issues:**

- category: `'answerability'`
- aiFixable: `true`
- fixCost: `'one_click'`

**Technical Issues:**

- category: `'technical'`
- aiFixable: `false`
- fixCost: `'advanced'`

**Schema/Visibility Issues:**

- category: `'schema_visibility'`
- aiFixable: varies
- fixCost: `'manual'` or `'advanced'`

### 8.5 Acceptance Criteria (Phase UX-8)

1. All Phase 3B aggregated issues include `category`, `whyItMatters`, `recommendedFix`, `aiFixable`, and `fixCost` fields.
2. All Issue Engine Lite product issues include the same enrichment fields.
3. Categories align with the taxonomy defined in 8.1.
4. `whyItMatters` provides clear business context for each issue.
5. `recommendedFix` provides actionable guidance appropriate to the issue type.
6. `aiFixable` accurately reflects whether AI optimization can resolve the issue.
7. `fixCost` accurately reflects the effort level required.
8. Backward compatibility maintained (all new fields are optional).

---

## 9. PERFORMANCE-1: Discovery-Critical Performance Issues

Phase PERFORMANCE-1 extends the Technical & Indexability pillar with discovery-critical performance signals. Unlike full page-speed audits, these focus on signals that directly affect crawlability and rendering.

### 9.1 Performance Signal Types

```typescript
export type PerformanceSignalType =
  | 'render_blocking'
  | 'indexability_risk'
  | 'ttfb_proxy'
  | 'page_weight_risk'
  | 'mobile_readiness';
```

### 9.2 Performance Issue Types

| Issue ID                    | Signal Type         | Severity Thresholds                       | Description                                    |
| --------------------------- | ------------------- | ----------------------------------------- | ---------------------------------------------- |
| `render_blocking_resources` | `render_blocking`   | warning: ≥3 pages, critical: ≥5 pages     | Scripts/styles in `<head>` without async/defer |
| `indexability_conflict`     | `indexability_risk` | Always critical                           | noindex directives, canonical conflicts        |
| `slow_initial_response`     | `ttfb_proxy`        | warning: >10% pages, critical: >25% pages | HTML >500KB indicating slow TTFB               |
| `excessive_page_weight`     | `page_weight_risk`  | warning: >5% pages, critical: >10% pages  | HTML >1MB (very large)                         |
| `mobile_rendering_risk`     | `mobile_readiness`  | warning: >10% pages, critical: >25% pages | Missing viewport meta, layout issues           |

### 9.3 Detection Rules

#### Render-blocking Resources

**Detection (during crawl):**

- Scan `<head>` for `<script>` tags without `async`, `defer`, or `type="module"`
- Scan `<head>` for `<link rel="stylesheet">` without `media="print"` or preload hints

**Issue fields:**

- `pillarId`: `'technical_indexability'`
- `signalType`: `'render_blocking'`
- `category`: `'technical'`
- `aiFixable`: `false`
- `fixCost`: `'advanced'`

#### Indexability Conflict

**Detection (during crawl):**

- `<meta name="robots" content="noindex">`
- `X-Robots-Tag: noindex` response header
- Canonical URL pointing to different domain/page

**Issue fields:**

- `pillarId`: `'technical_indexability'`
- `signalType`: `'indexability_risk'`
- `category`: `'technical'`
- `severity`: Always `'critical'`
- `aiFixable`: `false`
- `fixCost`: `'manual'`

#### Slow Initial Response (TTFB Proxy)

**Detection (during crawl):**

- HTML bytes captured via `Buffer.byteLength(html, 'utf-8')`
- `htmlBytes > 500KB` → LARGE_HTML
- `htmlBytes > 1MB` → VERY_LARGE_HTML

**Issue fields:**

- `pillarId`: `'technical_indexability'`
- `signalType`: `'ttfb_proxy'`
- `category`: `'technical'`
- `aiFixable`: `false`
- `fixCost`: `'advanced'`

#### Excessive Page Weight

**Detection:**

- Same as Slow Initial Response but focuses on >1MB threshold
- Indicates pages that are problematic for crawlers and users

**Issue fields:**

- `pillarId`: `'technical_indexability'`
- `signalType`: `'page_weight_risk'`
- `category`: `'technical'`
- `aiFixable`: `false`
- `fixCost`: `'advanced'`

#### Mobile Rendering Risk

**Detection (during crawl):**

- Missing `<meta name="viewport">` tag
- Viewport without `width=device-width`
- Static viewport widths (e.g., `width=1024`)

**Issue fields:**

- `pillarId`: `'technical_indexability'`
- `signalType`: `'mobile_readiness'`
- `category`: `'technical'`
- `aiFixable`: `false`
- `fixCost`: `'manual'`

### 9.4 Crawl Data Fields

New fields captured during SEO scan:

```typescript
// In CrawlResult.data or issues array
{
  robotsHeader?: string;      // X-Robots-Tag header value
  canonicalHref?: string;     // Canonical URL from link tag
  robotsMeta?: string;        // robots meta content
  viewportContent?: string;   // viewport meta content
  htmlBytes?: number;         // Document size in bytes
}
```

### 9.5 Performance Scorecard

Frontend computes a scorecard from issues:

```typescript
interface PerformanceForDiscoveryScorecard {
  projectId: string;
  status: 'Strong' | 'Needs improvement' | 'Risky';
  issuesAffectingDiscovery: number;
  signals: PerformanceSignalStatus[];
}

interface PerformanceSignalStatus {
  signalType: PerformanceSignalType;
  status: 'ok' | 'needs_attention' | 'risky';
  issueCount: number;
}
```

**Status Calculation:**

- **Strong**: 0-2 total issues, no critical issues
- **Needs improvement**: 3-9 issues or 1 risky signal
- **Risky**: 10+ issues, 2+ risky signals, or any critical issue

### 9.6 Acceptance Criteria (PERFORMANCE-1)

1. All 5 performance issue types are detected during crawl and built into DEO issues.
2. Issues include `pillarId: 'technical_indexability'` and appropriate `signalType`.
3. Severity thresholds match the table in 9.2.
4. Frontend Performance page displays scorecard with signal breakdown.
5. Issues appear in Issues Engine under Technical & Indexability pillar.
6. No new database tables or columns required.
7. Backward compatibility maintained with existing Technical pillar issues.
