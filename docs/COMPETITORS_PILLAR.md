# Competitive Positioning Pillar (COMPETITORS-1)

## Overview

The Competitive Positioning pillar helps merchants identify and address coverage gaps relative to typical competitors in their product category. Unlike traditional competitive analysis tools that rely on scraping competitor websites or SERP data, EngineO.ai uses **ethical, heuristic-based analysis** that focuses on what the merchant can control.

**Key Principle:** We analyze your product's coverage against industry baselines and common category patterns, not actual competitor content.

---

## What Are "Competitive Gaps"?

Competitive gaps are areas where your product page lacks content that similar products in your category typically provide. These gaps can hurt discoverability and conversions because search engines and AI systems favor comprehensive, well-structured content.

### Gap Types

| Gap Type | Description | Example |
|----------|-------------|---------|
| **Intent Gap** | Missing coverage for a search intent that competitors typically address | "Similar products answer 'Is this good for beginners?' — your page does not" |
| **Content Section Gap** | Missing a content section that's standard in your category | "No comparison section explaining why to choose this product over alternatives" |
| **Trust Signal Gap** | Missing trust-building content that competitors provide | "No FAQ addressing common purchase concerns" |

---

## Competitor Model

### How Competitors Are Identified

For v1, competitors are identified through:

1. **Heuristic Analysis** — Products in the same collection or category are assumed to share a competitive space
2. **Merchant Configuration** — Merchants can optionally configure specific competitor references

**Important:** We do NOT:
- Scrape competitor websites
- Track competitor prices or inventory
- Copy or store any competitor content
- Make specific claims about named competitors

### Competitor References

Each product can have up to **3 competitor references** stored. These contain only:
- Display name (e.g., "Leading Brand A")
- Optional logo URL (if merchant-provided)
- Optional homepage URL (for reference only)
- Source (e.g., "collection heuristic" or "merchant configured")

---

## Coverage Analysis

### Areas Analyzed

The competitive coverage analysis evaluates three dimensions:

#### 1. Intent Coverage (from SEARCH-INTENT-1)
Reuses the Search Intent taxonomy to identify intent gaps:
- **Transactional** — Buy, price, order queries
- **Comparative** — vs, alternatives, best queries
- **Problem/Use Case** — for beginners, how to use queries
- **Trust/Validation** — reviews, is it good queries
- **Informational** — what is, how it works queries

#### 2. Content Sections
Detects presence/absence of key content sections:
- Comparison section ("Which product is right for me?")
- "Why choose this product" section
- Buying guide or usage guidance
- Feature highlights with benefits

#### 3. Trust Signals
Analyzes trust-building content:
- FAQ/Answer Blocks coverage
- Satisfaction guarantee mentions
- Reviews or testimonials sections
- Expert recommendations or certifications

### Scoring

**Per-Product Competitive Score (0-100):**
Weighted average of coverage areas where:
- High-value intents (transactional, comparative) weight more heavily
- Areas where multiple competitors are expected to have coverage weight more

**Status Classification:**
| Score | Status | Meaning |
|-------|--------|---------|
| 70+ | Ahead | Product covers more high-impact areas than typical competitors |
| 40-69 | On Par | Coverage is roughly equivalent to industry baseline |
| <40 | Behind | Meaningful gaps in high-impact areas |

---

## Issues & Severity

### Issue Types

| Issue ID | Description | Severity Factors |
|----------|-------------|------------------|
| `competitive_missing_intent` | Missing intent coverage that competitors likely have | Intent importance + competitor count |
| `competitive_missing_section` | Missing content section standard in category | Section importance + competitor count |
| `competitive_missing_trust_signal` | Missing trust-building content | Trust signal type + competitor count |

### Severity Rules

Severity is calculated based on:

1. **Competitor Count** — More competitors covering an area = higher severity
   - 1 competitor: Lower severity
   - 2+ competitors: Higher severity (critical for high-value areas)

2. **Intent/Area Importance**
   - Transactional/comparative gaps: Higher severity
   - Informational/trust gaps: Lower severity

3. **Combined Impact**
   - Gap in high-value area + 2+ competitor coverage = Critical
   - Gap in lower-value area + 1 competitor = Warning

---

## Fix Flows

### Draft-First Pattern

Competitive fixes follow the same draft-first pattern as Search Intent fixes:

1. **Preview** — Generate or retrieve a cached draft
   - AI is only called if no cached draft exists
   - Uses CACHE/REUSE v2 with deterministic work keys
   - Shows "AI used" vs "No AI used (reused draft)" indicator

2. **Apply** — Persist the draft content
   - No AI call on apply
   - Creates Answer Blocks or content sections
   - Updates coverage and resolves issues

### Fix Types

| Draft Type | Description | Apply Target |
|------------|-------------|--------------|
| Answer Block | Q&A addressing the competitive gap | Product Answer Blocks |
| Comparison Copy | "Why choose this product vs others" text | Product description or dedicated section |
| Positioning Section | "Why choose this product" content | Product content section |

### AI Content Generation

All AI-generated content:
- Uses only the merchant's product data (title, description, features)
- References generic category patterns, not specific competitors
- Uses neutral positioning language ("Compared to similar products...")
- Does NOT incorporate any scraped competitor text

---

## Ethical Boundaries

### What We Do
- Analyze coverage patterns using industry baselines
- Identify gaps based on what comprehensive product pages typically include
- Generate original content using merchant's own product information
- Provide actionable recommendations for improvement

### What We Don't Do
- Scrape competitor websites or content
- Store or expose competitor text, prices, or offers
- Make specific claims about named competitors
- Track competitor SERP rankings or visibility
- Encourage plagiarism or copying competitor content

### Why This Matters

Search engines and AI systems reward comprehensive, original content. By focusing on coverage gaps rather than competitive copying, merchants:
- Build genuine content authority
- Avoid duplicate content penalties
- Create sustainable competitive advantages
- Maintain brand integrity

---

## Integration Points

### DEO Overview
The Competitive Positioning pillar card shows:
- Overall competitive score
- Status classification (Ahead/On Par/Behind)
- Count of products behind on high-impact areas
- Link to Issues page with pillar filter

### Product Workspace
The Competitors tab provides:
- Per-product competitive scorecard
- Competitor references (up to 3)
- Gap cards with severity and recommendations
- Preview/apply fix flows

### Issues Engine
Competitive issues appear with:
- Gap type badges
- Competitor count indicators
- Intent type (where applicable)
- "Fix" link to product Competitors tab

### Automation Integration
The draft-first pattern integrates with:
- AI usage quota enforcement (on preview only)
- CACHE/REUSE v2 for draft reuse
- Automation history logging

---

## API Endpoints

### Product-Level

```
GET /products/:productId/competitors
```
Returns product competitive data, scorecard, gaps, and open drafts.

```
POST /products/:productId/competitors/preview
```
Generate or retrieve a cached fix draft for a competitive gap.

```
POST /products/:productId/competitors/apply
```
Apply a draft without AI call; creates Answer Blocks or content sections.

### Project-Level

```
GET /projects/:projectId/competitors/summary
```
Returns project-level competitive scorecard aggregated across products.

---

## Related Documentation

- [SEARCH_INTENT_PILLAR.md](./SEARCH_INTENT_PILLAR.md) — Search Intent pillar (dependency)
- [DEO_INFORMATION_ARCHITECTURE.md](./DEO_INFORMATION_ARCHITECTURE.md) — Overall DEO architecture
- [manual-testing/COMPETITORS-1.md](./manual-testing/COMPETITORS-1.md) — Manual testing checklist
