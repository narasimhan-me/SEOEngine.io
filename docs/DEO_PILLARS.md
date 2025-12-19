# DEO Pillars Reference

This document defines the canonical 8-pillar DEO (Discovery Engine Optimization) model used throughout EngineO.ai.

## Overview

DEO is a framework for optimizing content visibility across AI-powered discovery engines (ChatGPT, Perplexity, Google AI Overviews, etc.). Unlike traditional SEO which focuses on link-based ranking, DEO focuses on making content understandable and trustworthy for AI systems.

The 8 pillars represent distinct aspects of discovery optimization, each with specific signals, issues, and optimization paths.

## The 8 DEO Pillars

### 1. Metadata & Snippet Quality
**ID:** `metadata_snippet_quality`
**Short Name:** Metadata

Covers SEO titles, meta descriptions, Open Graph tags, and how content appears in search snippets and social shares.

**Why it matters:** Metadata is the first thing discovery engines see. Clear, accurate metadata helps AI understand and surface your content correctly.

**Key signals:**
- SEO title presence and quality
- Meta description presence and length
- Open Graph completeness
- Structured data accuracy

**Issue types:**
- Missing SEO title
- Missing SEO description
- Truncated metadata
- Duplicate metadata

---

### 2. Content & Commerce Signals
**ID:** `content_commerce_signals`
**Short Name:** Content

Covers on-page content quality, product descriptions, Answer Blocks, and content freshness.

**Why it matters:** AI engines prioritize content that directly answers user questions. Rich, structured product content is essential for commerce visibility.

**Key signals:**
- Product description depth
- Answer Block coverage
- Content uniqueness
- FAQ presence

**Issue types:**
- Thin product descriptions
- Missing Answer Blocks
- Duplicate content
- Stale content

---

### 3. Media & Accessibility
**ID:** `media_accessibility`
**Short Name:** Media

Covers image alt text coverage, alt text quality classification, image presence, and contextual media usage.

**Why it matters:** AI systems rely on alt text to understand visual content. Images with proper alt text improve accessibility, image search rankings, and AI-powered discovery. Missing or generic alt text creates invisible content.

**Score model:** Weighted coverage where:
- Good alt text = 100% credit
- Generic alt text = 40% credit
- Missing alt text = 0% credit (penalized more severely)

**Status thresholds:**
- ≥ 80: Strong
- 40-79: Needs improvement
- < 40: Weak

**Key signals:**
- Alt text coverage (any alt present)
- Good alt text coverage (descriptive alt text)
- Generic alt text count (product image, title only, etc.)
- Missing alt text count
- Image count per product
- Contextual media (captions, descriptive alt)

**Issue types (MEDIA-1):**
- `missing_product_image` - Products without images
- `missing_image_alt_text` - Images without alt text (high severity)
- `generic_image_alt_text` - Images with generic alt text
- `insufficient_image_coverage` - Products with only 0-1 images
- `missing_media_context` - Images without captions or contextual descriptions

**Alt text classification:**
- **Missing**: Empty, whitespace, or null
- **Generic**: "product image", "photo", product title only, very short (< 5 chars)
- **Good**: Descriptive, image-specific, reflects visible content

---

### 4. Search & Intent Fit
**ID:** `search_intent_fit`
**Short Name:** Search Intent

Covers keyword targeting, search intent alignment, and topic coverage.

**Why it matters:** Understanding and matching user intent determines whether your content gets surfaced for relevant queries.

**Key signals:**
- Keyword-to-content alignment
- Search volume coverage
- Intent match score
- Topic completeness

**Issue types:**
- Intent mismatch
- Missing high-value keywords
- Topic gaps

---

### 5. Competitive Positioning
**ID:** `competitive_positioning`
**Short Name:** Competitors

Covers competitor analysis, share of voice, and relative positioning.

**Why it matters:** Understanding competitive landscape helps identify gaps and opportunities in AI-powered discovery.

**Key signals:**
- Share of voice
- Competitor content gaps
- Feature parity
- Ranking position

**Issue types:**
- Competitor outranking
- Feature gaps
- Market share loss

---

### 6. Off-site Signals
**ID:** `offsite_signals`
**Short Name:** Off-site

Covers backlinks, citations, mentions, and external authority signals.

**Why it matters:** External signals help AI systems assess trustworthiness and authority of content sources.

**Key signals:**
- Backlink quality
- Brand mentions
- Citation frequency
- Domain authority

**Issue types:**
- Low authority signals
- Negative mentions
- Citation gaps

---

### 7. Local Discovery
**ID:** `local_discovery`
**Short Name:** Local

Covers local SEO, Google Business Profile, and location-based signals.

**Why it matters:** For businesses with physical presence, local signals determine visibility in "near me" and location-based AI queries.

**Key signals:**
- GMB completeness
- NAP consistency
- Local review signals
- Location relevance

**Issue types:**
- Incomplete GMB profile
- NAP inconsistencies
- Missing local content

---

### 8. Technical & Indexability
**ID:** `technical_indexability`
**Short Name:** Technical

Covers Core Web Vitals, crawl health, indexability status, and technical SEO foundations.

**Why it matters:** Technical issues can prevent discovery engines from crawling and indexing your content at all.

**Key signals:**
- Core Web Vitals (LCP, FID, CLS)
- Crawl success rate
- Index coverage
- Mobile-friendliness

**Issue types:**
- Slow page speed
- Crawl errors
- Indexability blocks
- Mobile usability issues

---

## Issue Actionability

Each DEO issue is classified by how it can be resolved:

| Actionability | Description |
|---------------|-------------|
| `manual` | Requires manual human intervention to fix |
| `automation` | Can be fixed automatically via playbooks/rules |
| `informational` | Insight only, no direct fix available |

## Using Pillars in the UI

Pillars serve as the primary organizational model for:

1. **DEO Overview page** - Shows pillar scorecards and health status
2. **Issues Engine** - Groups issues by pillar with filtering
3. **Product workspace** - Maps product-level issues to pillars
4. **Navigation** - Pillar workspaces accessible from sidebar

## Source of Truth

The canonical pillar definitions are maintained in:
```
packages/shared/src/deo-pillars.ts
```

All pillar references throughout the codebase should derive from this single source.
