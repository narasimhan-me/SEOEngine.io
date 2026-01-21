# Off-site Signals Pillar (OFFSITE-1)

## Overview

The Off-site Signals pillar focuses on brand mentions, authoritative listings, reviews, certifications, and referenceable content that build trust and authority. Unlike traditional backlink-focused SEO, this pillar emphasizes the **presence and quality of off-site trust signals** that help discovery engines and AI models understand a brand's authority and relevance.

## Signal Types

The pillar tracks four types of off-site signals:

| Signal Type               | Description                                         | Examples                                                         |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| **Trust Proof**           | Third-party reviews, testimonials, certifications   | Trustpilot, G2, BBB accreditation                                |
| **Authoritative Listing** | Presence in industry directories and marketplaces   | Google Business Profile, Shopify App Store, industry directories |
| **Brand Mention**         | Brand referenced in articles, blogs, or news        | Industry blogs, news publications, social media                  |
| **Reference Content**     | Guides, comparisons, or studies that cite the brand | Comparison sites, industry reports                               |

## Scoring

### Off-site Presence Score (0-100)

The presence score is calculated based on:

- Weighted presence of each signal type
- Trust Proof and Authoritative Listings carry higher weights
- Bonus points for multiple signals per type (with diminishing returns)

### Status Classification

| Status     | Score Range | Description                       |
| ---------- | ----------- | --------------------------------- |
| **Low**    | 0-39        | Missing critical trust signals    |
| **Medium** | 40-69       | Partial off-site presence         |
| **Strong** | 70-100      | Good coverage across signal types |

## Gap Types

When signals are missing, the following gap types are identified:

1. **missing_brand_mentions** - No brand mentions in articles or publications
2. **missing_trust_proof** - No third-party reviews or certifications
3. **missing_authoritative_listing** - Not present in key directories
4. **competitor_has_offsite_signal** - Competitors have signals the merchant lacks

## Fix Flows

The pillar supports draft-first fix flows that generate content for human review:

### Draft Types

| Draft Type                | Use Case                      | Output                     |
| ------------------------- | ----------------------------- | -------------------------- |
| **Outreach Email**        | Request inclusion or mentions | Subject + body for email   |
| **PR Pitch**              | Media coverage requests       | Subject + pitch paragraphs |
| **Brand Profile Snippet** | Directory listings            | Summary + bullet points    |
| **Review Request Copy**   | Customer review solicitation  | Message + channel hint     |

### Apply Targets

- **NOTES** - Save draft for later use
- **OUTREACH_DRAFTS** - Add to outreach queue
- **CONTENT_WORKSPACE** - Create reusable content snippet

## Ethical Boundaries

**The Off-site Signals pillar operates within strict ethical boundaries:**

1. **No link buying** - We do not support or facilitate purchasing backlinks
2. **No spam tactics** - All generated content is professional and non-manipulative
3. **No automated outreach** - Drafts require human review before sending
4. **No scraping** - Signals are detected through configuration and heuristics, not crawling
5. **No DA metrics** - We focus on presence and quality, not raw backlink counts
6. **Ethical review requests** - No incentives for positive reviews, respectful of customer autonomy

## How EngineO.ai Helps

### What We Do

- Surface off-site signal gaps and opportunities
- Generate professional outreach and PR draft content
- Provide brand profile snippets for directory listings
- Create ethical review request copy
- Track presence status over time

### What We Don't Do

- Automatically send outreach emails
- Purchase links or placements
- Scrape competitor websites
- Provide domain authority scores
- Guarantee placements or mentions

## Technical Implementation

### Backend Files

- `apps/api/src/projects/offsite-signals.service.ts` - Core service
- `apps/api/src/projects/offsite-signals.controller.ts` - REST endpoints
- `apps/api/prisma/schema.prisma` - Database models

### Frontend Files

- `apps/web/src/components/projects/OffsiteSignalsPanel.tsx` - Reusable panel
- `apps/web/src/app/projects/[id]/backlinks/page.tsx` - Off-site workspace

### Shared Types

- `packages/shared/src/offsite-signals.ts` - Type definitions

## API Endpoints

| Method | Endpoint                                  | Description                     |
| ------ | ----------------------------------------- | ------------------------------- |
| GET    | `/projects/:id/offsite-signals`           | Get signals, coverage, and gaps |
| GET    | `/projects/:id/offsite-signals/scorecard` | Get scorecard only              |
| POST   | `/projects/:id/offsite-signals/preview`   | Generate fix draft              |
| POST   | `/projects/:id/offsite-signals/apply`     | Apply fix draft                 |

## Integration with DEO

The Off-site Signals pillar integrates with the DEO framework:

1. **DEO Overview** - Shows off-site presence score and status
2. **Issues Engine** - Generates DEO issues for missing signals
3. **AI Usage** - Tracks AI usage via the ledger (INTENT_FIX_PREVIEW run type)
4. **CACHE/REUSE v2** - Reuses drafts with deterministic work keys

## Future Enhancements (v1.1+)

- External data source integrations (with user consent)
- Product-level off-site signal tracking
- Automated signal detection improvements
- Outreach tracking and follow-up reminders
