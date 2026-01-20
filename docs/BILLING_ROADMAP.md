# EngineO.ai — Billing & Payments Roadmap

**Version 1.0** — December 2025  
**Author:** Narasimhan Mahendrakumar

---

## 1. Purpose

This document defines the billing roadmap for EngineO.ai, including:

- Stripe integration phases
- Subscription lifecycle management
- Usage-based billing (AI tokens)
- Handling product/page limits
- Add-ons & upsells
- Enterprise billing
- Annual billing
- Reporting & invoicing
- Fraud prevention
- Developer tasks & sequencing

This roadmap is designed to align with:

- `PRICING_STRATEGY.md`
- `PRICING_IMPLEMENTATION.md`

---

## 2. High-Level Vision

EngineO.ai's billing system must scale from:

- **Phase A: Basic subscription**
  - → Starter ($19) / Pro ($59) / Agency ($199)
- **Phase B: Usage-based automation & token billing**
  - → AI tokens, automation packs, entity packs
- **Phase C: Business & Enterprise**
  - → Advanced entitlements, multi-team, multi-brand
- **Phase D: Predictive billing**
  - → Usage forecasting, DEO visibility-based pricing (future innovation)

Billing must be modular, configurable, and Stripe-first.

---

## 3. Billing Phases Overview

| Phase | Goal                                              | Status      |
| ----- | ------------------------------------------------- | ----------- |
| 0     | Stripe project setup                              | Not started |
| 1     | Simple subscription billing                       | Planned     |
| 2     | Full subscription sync + plan gating              | Planned     |
| 3     | Usage tracking (AI tokens, items, automations)    | Planned     |
| 4     | Add-ons (extra tokens, extra projects, reporting) | Planned     |
| 5     | Annual billing, coupons, trials                   | Planned     |
| 6     | Enterprise SSO, invoice-based billing             | Planned     |
| 7     | Usage forecasting & DEO-based pricing             | Future      |

Each phase includes backend, frontend, and Stripe configuration tasks.

---

## 4. Phase 0 — Stripe Project Setup

**Goal:** Set up the Stripe environment.

### Tasks

- Create Stripe account and workspace
- Configure branding (EngineO.ai logo, colors)
- Create test & production API keys
- Configure webhooks for API endpoint
- Enable Tax settings (if required)
- Set up product catalog structure:

  **PRODUCT: EngineO Subscription**
  - Price: `starter_monthly`
  - Price: `pro_monthly`
  - Price: `agency_monthly`

---

## 5. Phase 1 — Basic Subscription Billing

**Goal:** Accept credit cards & assign a plan.

### Tasks (Backend)

- Endpoint: `POST /billing/checkout` → Create Checkout session
- Map Stripe product → EngineO plan (`starter`, `pro`, `agency`)
- Store Stripe `customerId` in DB
- Store Stripe `subscriptionId` in Subscription table

### Tasks (Frontend)

- Billing page with "Upgrade" button
- Redirect user to Stripe Checkout
- Success page (`/settings/billing/success`)
- Cancel page (`/settings/billing/cancel`)

### Stripe Webhooks Needed

- `customer.subscription.created`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 6. Phase 2 — Full Subscription Sync & Entitlements

**Goal:** Backend becomes fully Stripe-driven.

### Tasks

**On subscription update:**

- Update plan in DB
- Apply entitlements from `PLANS`

**On cancellation:**

- Disable editing
- Allow read-only access for 14 days

**On payment failure:**

- Grace period logic
- Email notifications

### Entitlements to apply (from `PRICING_IMPLEMENTATION.md`):

- max projects
- max products/pages
- AI tokens
- automation depth
- reporting tier
- team roles
- support tier

---

## 7. Phase 3 — Usage-Based Billing (AI Tokens + Items)

**Goal:** Meter consumption & allow soft/hard limits.

### Track:

- Tokens used
- Projects count
- Items synced (products/pages)
- Automation executions

### Data model additions:

```prisma
model TokenUsage { ... }
model ItemUsage { ... }
```

### Additional Stripe Webhooks

- `invoice.upcoming` → increase token limits before renewal
- `customer.subscription.updated` → adjust usage

### User Notifications

- 80% usage email
- 100% soft cap (auto slow-down)
- Hard cap (upgrade required)

---

## 8. Phase 4 — Add-ons & Upsells

**Goal:** Increase ARPU through targeted add-ons.

### Add-ons

- Extra AI tokens
- Extra projects
- Extra automations
- White-label reports
- Multi-brand dashboard
- Entity graph depth add-on
- Priority indexing

### Stripe Tasks

- Create "metered billing" prices
- Create one-time or recurring add-ons
- Update Checkout session to support add-ons

### UI Tasks

Upsell modals in:

- Dashboard
- DEO Score page
- Automations page
- Shopify sync page

---

## 9. DEO Compute Billing (Planned Phase)

**Goal:** Introduce metered DEO pipeline billing on top of base subscriptions.

Meter the following DEO operations:

- DEO Score recalculations
- Entity extraction calls
- Answer-ready content generation
- Visibility & crawl diagnostics

These metrics feed into usage dashboards and, for higher tiers, can be tied into usage-based billing or overage alerts.

---

## 10. Phase 5 — Annual Billing, Coupons, Trials

### Annual Billing

- 20% discount standard SaaS model
- Custom discount for agencies

### Coupons

- Limited-time launch promos
- Affiliate codes

### Trials

7–14 day trials recommended for:

- Pro
- Business (future)

### Stripe Tasks

- Add trial period to price
- Manage `trial_end` event

### Backend Checks

- Block automation if trial expired
- Convert trial → paid on first invoice

---

## 10. Phase 6 — Enterprise Billing

Enterprise billing operates differently.

### Support

- Invoice-based billing
- Custom quotes
- Dedicated Stripe customer
- Contract-based plan (annual commitment)
- SSO (SAML + SCIM)
- Multi-team access
- Dedicated success manager

### Stripe Requirements

- Create Enterprise Product
- Custom price quotes
- Manual invoicing
- ACH or wire transfer enabled

### Backend Requirements

- Dedicated org model
- Team seats
- Role-based billing access
- Entitlement overrides per organization

---

## 11. Phase 7 — Usage Forecasting & DEO-Based Pricing (Innovation Phase)

Long-term value:

- DEO score predicts organic growth
- AI usage predicts future token needs
- Entity graph depth predicts future visibility

### Potential features:

- Predictive billing
- Dynamic tier suggestions
- Auto-upgrade during seasonal spikes
- Visibility-based pricing (alpha)

This phase is future-facing and optional but strategically powerful.

---

## 12. Compliance & Security

Billing system must support:

### PCI Scope

- Stripe Checkout keeps us PCI SAQ-A
- No raw card data touches our servers

### Data Storage

Store only:

- `stripeCustomerId`
- `stripeSubscriptionId`
- `plan`
- `usage`

### GDPR

- Store consent for billing notifications
- Provide cancel & delete flows

### Audit Logging

Every billing event → audit log entry.

---

## 13. Developer Task Sequencing (Engineering Roadmap)

This tells your dev team EXACTLY how to implement billing.

### Sprint 1 — Stripe foundation

- Create products/prices in Stripe
- Create Checkout session endpoint
- Integrate webhook handler
- Save customer + subscription in DB
- Deploy to staging

### Sprint 2 — Entitlements backend

- Implement `PLANS` in `plans.ts`
- Add entitlements guard
- Add project/item limit validation
- Block automation beyond tier
- Attach entitlements to `/users/me`

### Sprint 3 — Billing UI (frontend)

- Billing settings page
- Upgrade CTA buttons
- Checkout redirections
- Billing success/cancel pages

### Sprint 4 — Usage tracking

- Token usage recording (AI service)
- Monthly reset job
- Usage meter in dashboard
- Usage alert emails

### Sprint 5 — Add-ons

- Stripe metered prices
- Add-on checkout flows
- Add-on entitlements guard

### Sprint 6 — Annual billing + coupons

- Add annual toggle
- Coupon support
- Trial support

### Sprint 7 — Enterprise

- Invoice-based billing
- SSO/SCIM
- Org management

### Sprint 8 — Predictive billing

- Basic forecasting
- Automated upgrade suggestions

---

## 14. Risks & Mitigations

| Risk                            | Mitigation                                  |
| ------------------------------- | ------------------------------------------- |
| Underbilling heavy AI usage     | Token metering + soft/hard caps             |
| Agency abuse (unlimited stores) | Track total items synced + automation usage |
| Webhook failures                | Retry logic + idempotency keys              |
| Plan mismatch (Stripe vs DB)    | Stripe → DB sync as source of truth         |
| Chargebacks                     | Clear refund/usage logs + audit trails      |

---

## Stripe Metadata Fields (Planned)

For DEO-aware billing and reporting, Stripe customer/subscription metadata should include:

- `deo_project_count`
- `deo_compute_pool`
- `deo_entity_count`
- `deo_answer_count`

---

## 16. Summary

EngineO.ai's billing roadmap is structured into predictable phases:

- Launch simple
- Scale with usage metering
- Expand with add-ons
- Grow into enterprise
- Innovate with DEO-based pricing

This ensures billing grows with platform maturity, customer value, and AI automation footprint.
