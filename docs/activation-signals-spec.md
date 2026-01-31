# EA-37: Activation & Success Signals Specification

## Overview

This document defines the activation milestones and success indicators for EngineO.ai.
All signals are **internal-only** (admin dashboards) and align to **real user value**,
not activity volume or engagement proxies.

## Trust Contract

- ✅ Metrics reflect user outcomes, not activity volume
- ✅ Signals do not pressure or shame users
- ✅ Success indicators align to actual user value
- ❌ No user-facing scores or gamification elements
- ❌ No vanity metrics (pageviews, session duration, etc.)

## Activation Milestones

Activation milestones represent meaningful user progress toward deriving value from the product.

| Milestone ID | Label | Definition | Success Criterion |
|-------------|-------|------------|-------------------|
| `project_created` | Created project | User created their first project | `Project.createdAt` exists |
| `store_connected` | Connected store | User connected a Shopify (or other) store | `Integration.accessToken` is set |
| `first_crawl_completed` | First crawl | System completed first crawl of user's store | `CrawlResult` exists for project |
| `first_deo_score_computed` | Discovery score | System computed first DEO score | `DeoScoreSnapshot` exists |
| `first_issue_identified` | Issues found | System identified optimization opportunities | `CrawlResult.issues` is non-empty |
| `first_draft_generated` | Draft generated | User generated their first optimization draft | `AutomationPlaybookDraft` exists |
| `first_draft_applied` | Draft applied | User applied an optimization to their store | `AutomationPlaybookDraft.appliedAt` is set |
| `first_optimization_live` | Optimization live | Optimization is live on user's store | `Product.seoTitle` or `seoDescription` is set |

### Activation Definition

A user is considered **activated** when they have completed the `first_draft_applied` milestone.
This represents meaningful value delivery—the user has made a real improvement to their store.

## Activation Tiers

Internal segmentation for product analytics and support intervention targeting.

| Tier | Definition | Typical Behavior |
|------|------------|------------------|
| `new` | Just signed up | No milestones completed |
| `exploring` | Has project | Created project, browsing features |
| `connected` | Store connected | Data flowing, viewing reports |
| `activated` | Applied optimization | Made first real improvement |
| `successful` | Multiple optimizations | Ongoing engagement and value |

## Success Indicators

Success indicators measure outcomes aligned to user value, computed per-project.

| Indicator ID | Label | What It Measures | Why It Matters |
|-------------|-------|------------------|----------------|
| `products_optimized` | Products with SEO | Products with title or description | Direct store improvement |
| `pages_optimized` | Pages with metadata | Pages with proper metadata | Site-wide optimization |
| `drafts_applied` | Optimizations applied | Drafts applied in period | Ongoing engagement |
| `deo_score_improved` | Discovery Score | Score change over period | Overall progress |

## Stall Detection

Internal-only signals for proactive support, not exposed to users.

### Stall Criteria
- User has project but no activity in 7+ days
- User stuck at specific milestone (e.g., connected but never generated draft)

### Intervention Levels
- `none`: No intervention needed
- `soft_nudge`: Internal note for support awareness
- `support_outreach`: Direct support contact may be helpful

## Admin Dashboard Integration

The activation signals are exposed in the admin overview endpoint:

```json
{
  "activation": {
    "activatedUsers": 150,
    "activationRate": 23,
    "usersWithProjects": 500,
    "usersWithConnectedStores": 350,
    "usersActivelyOptimizing": 80,
    "funnel": {
      "signedUp": 650,
      "createdProject": 500,
      "connectedStore": 350,
      "appliedOptimization": 150
    }
  }
}
```

## Implementation Notes

### Data Derivation
All activation signals are **computed from existing data**—no separate event storage is needed.
The `ActivationSignalsService` queries existing tables to determine milestone completion.

### No User Exposure
These signals are strictly for internal product insight. They should never be:
- Displayed to end users
- Used in user-facing notifications
- Incorporated into gamification or scoring systems
- Used to create pressure or shame

### Performance Considerations
- Funnel calculations sample recent users (limit 100) for tier distribution
- Individual user status queries are optimized with parallel DB calls
- Admin overview caches activation metrics alongside other overview stats

## Files

- `apps/api/src/activation/activation-signals.types.ts` - Type definitions
- `apps/api/src/activation/activation-signals.service.ts` - Computation service
- `apps/api/src/activation/activation-signals.module.ts` - NestJS module
- `apps/web/src/lib/activation-signals.ts` - Frontend types for admin UI
