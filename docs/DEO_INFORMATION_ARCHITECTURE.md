# DEO Information Architecture

This document describes the information architecture for DEO (Discovery Engine Optimization) in EngineO.ai, establishing UX contracts and navigation patterns.

## Core Principles

### 1. Pillar-Centric Organization
All DEO issues, signals, and optimization paths are organized by the 8 canonical pillars. Users can navigate by pillar to focus on specific optimization areas.

### 2. Separation of Concerns
**Metadata status** (title/description presence) is distinct from **overall DEO health**. A product can have "Metadata optimized" while still having DEO issues in other pillars like Media or Content.

### 3. Deep Linking
All major views support URL-based filtering and navigation:
- `?pillar=metadata_snippet_quality` - Filter by pillar
- `?focus=metadata` - Scroll to metadata section
- `?focus=deo-issues` - Scroll to issues section

## Navigation Structure

```
Project Overview
├── DEO Overview (pillar scorecards)
├── Products (product catalog)
│   └── Product Workspace
│       ├── Metadata section
│       ├── Answer Blocks section
│       └── DEO Issues section
├── Metadata (pillar workspace placeholder)
├── Content (content pages + pillar context)
├── Media (pillar workspace placeholder)
├── Search & Intent (pillar workspace placeholder)
├── Competitors (pillar workspace placeholder)
├── Off-site Signals (pillar workspace placeholder)
├── Local Discovery (pillar workspace placeholder)
├── Technical (pillar workspace)
├── Automation (playbook management)
└── Settings
```

## Key Pages

### DEO Overview (`/projects/[id]/deo`)
Central hub showing:
- Overall DEO health summary
- Issue counts per pillar
- Pillar scorecards with links to filtered Issues Engine
- Quick access to pillar workspaces

### Issues Engine (`/projects/[id]/issues`)
Master issue list with:
- Pillar filter (always visible)
- Severity filter
- Issue cards with fix actions
- Deep links to product workspaces

### Products Page (`/projects/[id]/products`)
Product catalog with decision-first design (PRODUCTS-LIST-2.0):
- **Health filter** (All, Critical, Needs Attention, Healthy) - derived from issue presence/severity
- **Command Bar** with attention count and "Fix in bulk" CTA
- **Health pill** per row (3 states: Healthy, Needs Attention, Critical - no numbers)
- **Recommended action** per row (single, deterministic based on severity + pillar priority)
- **Progressive disclosure**: Click row to expand; inline issue breakdowns only in expanded details
- No always-visible "Scan SEO"; "Rescan" only when data is stale
- Metadata status is no longer the primary list filter/signal; it belongs in expanded details and product workspace

### Product Workspace (`/projects/[id]/products/[productId]`)
Individual product optimization with:
- Metadata section (SEO title, description)
- Answer Blocks section
- DEO Issues section (scrollable target)
- Status indicators for both metadata AND broader DEO issues

## UX Contracts

### IssueBadge
- Shows issue count and max severity
- Always says "X DEO issues" (not just "issues")
- Clickable when `onClick` provided
- Links to product workspace with `?focus=deo-issues`

### ProductRow (PRODUCTS-LIST-2.0)
- **Health pill** (3 states): Healthy (green), Needs Attention (yellow), Critical (red) - no numbers
- **Recommended action** shown as second line under product title
- **Progressive disclosure**: Click row to expand/collapse details
- No metadata status chips, no pillar chips, no overflow menu in default row
- "View details" button navigates to product workspace
- "Rescan" button only visible when data is stale (isDeoDataStale === true)
- Expanded details show: Handle/ID, Last synced, Meta title/description, Issues by category with deep links

### ProductDeoInsightsPanel
- Header says "Metadata & Content Status"
- Shows warning when metadata OK but DEO issues exist:
  > "Metadata is optimized but this product has DEO issues. Review the issues below."

### Pillar Filter
- Always shows "All pillars" option first
- Shows issue count per pillar
- Updates URL with `?pillar=X` parameter
- Preserves other query params

## Deep Linking Patterns

### Focus Parameters
| Parameter | Target Section |
|-----------|----------------|
| `?focus=metadata` | Scroll to metadata section |
| `?focus=deo-issues` | Scroll to DEO issues section |
| `?focus=answer-blocks` | Scroll to Answer Blocks section |

### Filter Parameters
| Parameter | Effect |
|-----------|--------|
| `?pillar=X` | Filter issues by pillar ID |
| `?from=products` | Show back navigation to products |
| `?from=issues` | Show back navigation to issues |

### Combined Examples
```
/projects/123/products/456?focus=metadata
  → Open product, scroll to metadata

/projects/123/products/456?focus=deo-issues&from=products
  → Open product, scroll to issues, show "Back to Products"

/projects/123/issues?pillar=media_accessibility
  → Open issues filtered to Media pillar
```

## Status vs Health Model

### Product Status (Metadata)
A product's **status** refers only to metadata completeness:
- `optimized` - Has SEO title AND description
- `needs-optimization` - Has one but not both
- `missing` - Has neither

### Product DEO Health
A product's **DEO health** considers all pillars:
- Issue count across all pillars
- Maximum severity of issues
- May have issues even with optimized metadata

### Visual Treatment
- Status chip: "Metadata optimized/needs work/missing"
- Issue badge: "X DEO issues" with severity color
- Both are always visible (not mutually exclusive)

## Pillar Vertical Slices

### Reference Implementation: Search & Intent Pillar (SEARCH-INTENT-1)

The **Search & Intent Fit** pillar is the first fully-implemented DEO vertical slice, serving as the reference pattern for all future pillar implementations.

#### Key Surfaces

| Surface | Location | Description |
|---------|----------|-------------|
| DEO Overview Card | `/projects/[id]/deo` | Shows coverage score and missing high-value intents |
| Product Tab | `/projects/[id]/products/[productId]?focus=search-intent` | Search & Intent panel in product workspace |
| Pillar Workspace | `/projects/[id]/keywords` | Project-level Search & Intent overview |
| Issues Filter | `/projects/[id]/issues?pillar=search_intent_fit` | Intent issues filtered view |
| Product Badge | Products list | "Intent coverage: Good/Needs work" indicator |

#### Draft-First Fix Flow

All pillar-specific fixes follow the draft-first pattern:

1. **Preview** — User clicks "Preview fix" on an issue
2. **Generate** — AI generates a draft (Answer Block or content snippet)
3. **Cache** — Draft is stored with deterministic `aiWorkKey`
4. **Review** — User reviews draft in preview drawer
5. **Apply** — Draft is written to storage (no AI call)

#### CACHE/REUSE v2 Integration

Preview requests use a deterministic key for caching:
- Same product + intent + query + mode = same draft
- Reused drafts show "No AI used (reused draft)"
- AI quota only decremented on new generation

#### Intent-Aware Issues

Search & Intent issues include additional fields:
- `intentType` — informational, comparative, transactional, etc.
- `exampleQueries` — Specific queries showing the gap
- `coverageStatus` — none, weak, partial, covered
- `recommendedAction` — "Add Answer Block", "Expand description"

For detailed documentation, see [SEARCH_INTENT_PILLAR.md](./SEARCH_INTENT_PILLAR.md).

### Second Implementation: Competitive Positioning Pillar (COMPETITORS-1)

The **Competitive Positioning** pillar is the second fully-implemented DEO vertical slice, following the patterns established by SEARCH-INTENT-1.

#### Key Surfaces

| Surface | Location | Description |
|---------|----------|-------------|
| DEO Overview Card | `/projects/[id]/deo` | Shows competitive score and products behind on high-impact areas |
| Product Tab | `/projects/[id]/products/[productId]?focus=competitors` | Competitors panel in product workspace |
| Pillar Workspace | `/projects/[id]/competitors` | Project-level Competitive Positioning overview |
| Issues Filter | `/projects/[id]/issues?pillar=competitive_positioning` | Competitive issues filtered view |
| Product Badge | Products list | "Ahead/On Par/Behind" status indicator |

#### Competitive Gap Taxonomy

Three types of competitive gaps:
- **Intent Gap** — Missing intent coverage that competitors likely have
- **Content Section Gap** — Missing comparison, buying guide, or "why choose us" sections
- **Trust Signal Gap** — Missing FAQ, guarantees, or review coverage

#### Ethical Boundaries

Critical principles enforced throughout:
- No scraping of competitor websites or content
- No storage or exposure of raw competitor text
- Coverage analysis uses "industry baseline" assumptions
- All generated content uses only merchant's product data

#### Integration with Search & Intent

Competitive analysis reuses Search Intent coverage:
- Intent gaps from SEARCH-INTENT-1 inform competitive intent gaps
- Same intent taxonomy (transactional, comparative, etc.)
- Severity calculation considers both intent importance and competitor count

#### Draft-First Fix Flow

Follows the same pattern as SEARCH-INTENT-1:
1. **Preview** — Generate/retrieve cached competitive fix draft
2. **Review** — User reviews positioning content in drawer
3. **Apply** — Write draft to Answer Blocks or content sections

#### CACHE/REUSE v2 Integration

Uses `INTENT_FIX_PREVIEW` run type with enriched metadata:
- `playbookId: 'competitive-positioning-fix'` distinguishes from search intent
- Metadata includes `pillar: 'competitive_positioning'` and `gapType`
- Same caching mechanics: deterministic `aiWorkKey` prevents duplicate AI calls

#### Competitive Issues

Competitive issues include additional fields:
- `gapType` — intent_gap, content_section_gap, trust_signal_gap
- `competitorCount` — How many competitors cover the area (1-3)
- `intentType` — For intent gaps, the specific intent type
- `recommendedAction` — "Add Answer Block", "Add comparison section"

For detailed documentation, see [COMPETITORS_PILLAR.md](./COMPETITORS_PILLAR.md).

### Third Implementation: Off-site Signals Pillar (OFFSITE-1)

The **Off-site Signals** pillar is the third fully-implemented DEO vertical slice, focusing on brand mentions, authoritative listings, reviews, and referenceable content.

#### Key Surfaces

| Surface | Location | Description |
|---------|----------|-------------|
| DEO Overview Card | `/projects/[id]/deo` | Shows presence score, status, signal/gap counts |
| Pillar Workspace | `/projects/[id]/backlinks` | Project-level Off-site Signals workspace |
| Issues Filter | `/projects/[id]/issues?pillar=offsite_signals` | Off-site issues filtered view |

#### Signal Type Taxonomy

Four types of off-site signals:
- **Trust Proof** — Third-party reviews, testimonials, certifications (highest weight)
- **Authoritative Listing** — Directory and marketplace presence
- **Brand Mention** — Articles, blogs, news references
- **Reference Content** — Guides, comparisons, studies that cite the brand

#### Gap Types

- **missing_brand_mentions** — No brand mentions in articles
- **missing_trust_proof** — No third-party reviews or certifications
- **missing_authoritative_listing** — Not in key directories
- **competitor_has_offsite_signal** — Competitors have signals merchant lacks

#### Ethical Boundaries (Critical)

Off-site Signals operates within strict ethical limits:
- **No link buying** — No support for purchasing backlinks
- **No scraping** — Signals via configuration/heuristics only
- **No automated outreach** — Drafts require human review
- **No DA metrics** — Focus on presence, not domain authority
- **Ethical review requests** — No incentives, respects customer autonomy

#### Draft Types

| Draft Type | Use Case | Output |
|-----------|----------|--------|
| Outreach Email | Request inclusion/mentions | Subject + body |
| PR Pitch | Media coverage requests | Subject + pitch |
| Brand Profile Snippet | Directory listings | Summary + bullets |
| Review Request Copy | Customer solicitation | Message + channel |

#### Draft-First Fix Flow

Follows the established pattern:
1. **Preview** — Generate/retrieve cached off-site fix draft
2. **Review** — User reviews content in modal
3. **Apply** — Save to Notes, Outreach Drafts, or Content Workspace
4. **No automated sending** — Human must review and send manually

#### CACHE/REUSE v2 Integration

Uses `INTENT_FIX_PREVIEW` run type with off-site metadata:
- `playbookId: 'offsite-signals-fix'`
- Metadata includes `pillar: 'offsite_signals'`, `gapType`, `signalType`
- Deterministic `aiWorkKey` prevents duplicate AI calls

#### Off-site Issues

Off-site issues include additional fields:
- `signalType` — brand_mention, trust_proof, authoritative_listing, reference_content
- `offsiteGapType` — The specific gap type
- `competitorCount` — For competitor-based gaps
- `recommendedAction` — "Add reviews", "Submit to directories", etc.

For detailed documentation, see [OFFSITE_PILLAR.md](./OFFSITE_PILLAR.md).

### Future Pillar Implementations

The following pillars will follow the established patterns:

| Pillar | Phase | Status |
|--------|-------|--------|
| Local Discovery | LOCAL-1 | Planned |

Each implementation should include:
- Shared types in `packages/shared/src/{pillar}.ts`
- Database models for coverage and drafts
- Service with coverage computation and issue generation
- Draft-first preview/apply endpoints
- Product workspace tab with deep-linking
- DEO Overview pillar card integration
- Issues Engine pillar filter support

## Implementation Files

| Component | File |
|-----------|------|
| Pillar definitions | `packages/shared/src/deo-pillars.ts` |
| Issue types | `packages/shared/src/deo-issues.ts` |
| Search intent types | `packages/shared/src/search-intent.ts` |
| Competitive types | `packages/shared/src/competitors.ts` |
| Off-site signals types | `packages/shared/src/offsite-signals.ts` |
| Issue builders | `apps/api/src/projects/deo-issues.service.ts` |
| Search intent service | `apps/api/src/projects/search-intent.service.ts` |
| Search intent controller | `apps/api/src/projects/search-intent.controller.ts` |
| Competitors service | `apps/api/src/projects/competitors.service.ts` |
| Competitors controller | `apps/api/src/projects/competitors.controller.ts` |
| Off-site signals service | `apps/api/src/projects/offsite-signals.service.ts` |
| Off-site signals controller | `apps/api/src/projects/offsite-signals.controller.ts` |
| Issues list | `apps/web/src/components/issues/IssuesList.tsx` |
| Issue badge | `apps/web/src/components/issues/IssueBadge.tsx` |
| Product row | `apps/web/src/components/products/ProductRow.tsx` |
| Search intent panel | `apps/web/src/components/products/optimization/ProductSearchIntentPanel.tsx` |
| Competitors panel | `apps/web/src/components/products/optimization/ProductCompetitorsPanel.tsx` |
| Off-site signals panel | `apps/web/src/components/projects/OffsiteSignalsPanel.tsx` |
| DEO Overview | `apps/web/src/app/projects/[id]/deo/page.tsx` |
| Issues page | `apps/web/src/app/projects/[id]/issues/page.tsx` |
| Search intent workspace | `apps/web/src/app/projects/[id]/keywords/page.tsx` |
| Competitors workspace | `apps/web/src/app/projects/[id]/competitors/page.tsx` |
| Off-site signals workspace | `apps/web/src/app/projects/[id]/backlinks/page.tsx` |
