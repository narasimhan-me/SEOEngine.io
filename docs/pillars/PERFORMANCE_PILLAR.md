# Technical & Indexability Pillar – Performance for Discovery (PERFORMANCE-1)

> Phase: PERFORMANCE-1
> Status: Implemented
> Pillar ID: `technical_indexability`

## Overview

The **Performance for Discovery** feature extends the Technical & Indexability pillar with discovery-critical performance signals. Unlike full page-speed audits (e.g., Lighthouse), PERFORMANCE-1 focuses on signals that directly affect how search engines and AI systems can crawl, render, and index pages.

## Why It Matters

Performance issues that prevent or delay crawling/rendering hurt discoverability:

- **Render-blocking resources** delay first contentful paint for both users and crawlers
- **Indexability conflicts** (noindex, canonical mismatches) prevent pages from being indexed
- **Large HTML documents** indicate potential TTFB issues and can timeout crawlers
- **Mobile rendering issues** affect mobile-first indexing and AI visibility

## Signal Types

| Signal Type | Issue Type | Description |
|------------|-----------|-------------|
| `render_blocking` | `render_blocking_resources` | Scripts/styles in `<head>` without async/defer |
| `indexability_risk` | `indexability_conflict` | noindex directives, canonical pointing elsewhere |
| `ttfb_proxy` | `slow_initial_response` | HTML >500KB suggesting slow TTFB |
| `page_weight_risk` | `excessive_page_weight` | HTML >1MB (very problematic) |
| `mobile_readiness` | `mobile_rendering_risk` | Missing viewport meta, layout issues |

## Detection Logic

### Render-blocking Resources

Detected during crawl by scanning `<head>` for:
- `<script>` tags without `async`, `defer`, or `type="module"`
- `<link rel="stylesheet">` tags without `media="print"` or preload hints

**Thresholds:**
- 3+ blocking resources → warning
- 5+ blocking resources → critical

### Indexability Conflict

Detected from:
- `<meta name="robots" content="noindex">`
- `X-Robots-Tag: noindex` response header
- Canonical URL pointing to different domain/page

**Severity:** Always critical (pages won't be indexed)

### Slow Initial Response (TTFB Proxy)

HTML document size used as TTFB proxy:
- `htmlBytes > 500KB` → LARGE_HTML warning
- `htmlBytes > 1MB` → VERY_LARGE_HTML warning

**Thresholds:**
- >10% of pages with large HTML → warning
- >25% of pages with very large HTML → critical

### Excessive Page Weight

Same as TTFB proxy but focuses on the >1MB threshold:
- >5% of pages over 1MB → warning
- >10% of pages over 1MB → critical

### Mobile Rendering Risk

Detected from:
- Missing `<meta name="viewport">` tag
- Viewport without `width=device-width`
- Static viewport widths (potential layout issues)

**Thresholds:**
- >10% of pages with issues → warning
- >25% of pages with issues → critical

## Scorecard

The Performance for Discovery scorecard aggregates signal status:

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

## Implementation Files

### Backend (API)

| File | Purpose |
|------|---------|
| `apps/api/src/seo-scan/seo-scan.service.ts` | Crawl signal detection (render-blocking, indexability, page weight, mobile) |
| `apps/api/src/projects/deo-issues.service.ts` | Issue builders (5 PERFORMANCE issue types) |
| `packages/shared/src/performance-signals.ts` | Shared type definitions |
| `packages/shared/src/deo-issues.ts` | PerformanceSignalType added to signalType union |

### Frontend (Web)

| File | Purpose |
|------|---------|
| `apps/web/src/app/projects/[id]/performance/page.tsx` | Performance scorecard UI |
| `apps/web/src/components/issues/IssuesList.tsx` | PERFORMANCE issue display configs |
| `apps/web/src/lib/deo-issues.ts` | Frontend type definitions |

## Crawl Data Captured

New fields captured during SEO scan:

```typescript
// In crawl result data
robotsHeader?: string;      // X-Robots-Tag header value
canonicalHref?: string;     // Canonical URL from link tag
robotsMeta?: string;        // robots meta content
viewportContent?: string;   // viewport meta content
htmlBytes?: number;         // Document size in bytes
```

## Issue Examples

### Render-blocking Resources

```json
{
  "id": "render_blocking_resources",
  "type": "render_blocking_resources",
  "title": "Render-blocking Resources Detected",
  "description": "5 pages have scripts or stylesheets in <head> without async/defer that block initial rendering.",
  "severity": "warning",
  "pillarId": "technical_indexability",
  "signalType": "render_blocking",
  "count": 5
}
```

### Indexability Conflict

```json
{
  "id": "indexability_conflict",
  "type": "indexability_conflict",
  "title": "Indexability Conflicts",
  "description": "3 pages have noindex directives or canonical URLs pointing to different pages.",
  "severity": "critical",
  "pillarId": "technical_indexability",
  "signalType": "indexability_risk",
  "count": 3
}
```

## Testing

See [PERFORMANCE-1.md](../testing/PERFORMANCE-1.md) for manual testing procedures.

## Future Enhancements

Planned for future phases:

1. **Core Web Vitals integration** – LCP, FID, CLS from CrUX API
2. **Real TTFB measurement** – via timing API in headless browser
3. **JavaScript execution analysis** – client-side rendering impact
4. **Image optimization signals** – lazy loading, next-gen formats
5. **Fix suggestions** – AI-powered recommendations for performance issues

## Related Documentation

- [DEO Pillars Overview](./DEO_PILLARS.md)
- [Issue Engine Specification](../specs/deo-issues-spec.md)
- [Critical Path Map](../testing/CRITICAL_PATH_MAP.md)
