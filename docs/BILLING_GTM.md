# BILLING-GTM-1 — Pricing, Upgrade UX & Monetization Flows

## Purpose

EngineO.ai billing and upgrades must convert measurable DEO value into clear, trust-safe upgrades without surprise enforcement.

## Non‑Negotiables

- Value before price: users see progress and savings before upgrade CTAs.
- Predict → Warn → Enforce: warnings precede limits; no surprise blocks.
- Stripe is the source of truth; EngineO.ai never handles card data.
- Apply remains AI‑free; billing must not change Apply semantics.
- No ranking guarantees, no revenue attribution, no ROI promises.

## What Plans Affect (v1)

- AI usage quota (measured as "AI runs").
- Daily automation suggestions/day entitlement (existing system limit).
- Core resource limits (projects, crawled pages).
- Collaboration features are future-ready but not required in v1.

## What Plans Do NOT Affect (v1)

- Visibility of DEO pillars and Insights (users can see what's happening).
- Apply's trust contract: Apply never consumes AI quota.

## Upgrade Moments (Contextual)

- Quota warning (soft threshold): allow action, show warning + Upgrade CTA.
- Quota blocked (hard limit enabled): block AI action, show Upgrade CTA.
- Insights value moments: when progress/savings are strong, show a non-blocking upgrade suggestion.

## Stripe Flow

- In-app upgrade uses Stripe Checkout.
- Subscription management uses Stripe Customer Portal.
- Webhook sync updates plan state in-app.

## Copy Guidelines

- Use "AI runs", "reuse saves AI usage", "Apply never uses AI".
- Use directional, explanatory language; never promise outcomes.

## AI Quota Configuration

AI usage quotas are configured via environment variables:

```bash
AI_USAGE_MONTHLY_RUN_LIMIT_FREE=10
AI_USAGE_MONTHLY_RUN_LIMIT_PRO=100
AI_USAGE_MONTHLY_RUN_LIMIT_BUSINESS=  # Empty = Unlimited
```

Rules:

- Missing or empty → Unlimited
- Non-positive or non-numeric → Unlimited
- Positive integer → That is the monthly limit

## Plan Limits Summary

| Plan     | Projects  | Crawled Pages | Suggestions/Day | Monthly AI Runs           |
| -------- | --------- | ------------- | --------------- | ------------------------- |
| Free     | 1         | 50            | 5               | Limited (env-driven)      |
| Pro      | 5         | 500           | 25              | Higher quota (env-driven) |
| Business | Unlimited | Unlimited     | Unlimited       | Unlimited                 |

## Trust Invariants

1. **APPLY Never Uses AI**: All apply operations set `aiUsed=false` in AutomationPlaybookRun records.
2. **Reuse Saves AI Runs**: Cached results are reused when similar content is detected.
3. **No Surprise Blocks**: Quota warnings appear before hard enforcement.
4. **Value Before Price**: Users see their progress and savings before upgrade prompts.

## Related Documents

- [BILLING-GTM-1.md](./manual-testing/BILLING-GTM-1.md) - Manual testing guide
- [SELF_SERVICE.md](./SELF_SERVICE.md) - Account self-service documentation
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-002 entry
