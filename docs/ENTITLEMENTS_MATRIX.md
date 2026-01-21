# EngineO.ai — Plan Entitlements, Limits & Feature Access

**Author:** Narasimhan Mahendrakumar  
**Version:** 1.0 — December 2025

---

## 1. Purpose

This document defines the complete entitlements matrix for all EngineO.ai subscription tiers. It supports:

- Backend gating logic
- Frontend UI gating
- Billing validation
- Stripe subscription mapping
- Resource limitations (projects, tokens, items)
- Automation depth
- Reporting access
- Team role controls
- Future expansion to Business & Enterprise tiers

This matrix pairs with:

- `PRICING_STRATEGY.md`
- `PRICING_IMPLEMENTATION.md`
- `TOKEN_USAGE_MODEL.md`
- `BILLING_ROADMAP.md`

---

## 2. Plan Overview (Current Implementation)

As of BILLING-1 (December 2025), we support:

- **Free** — $0/mo (default for all new users)
- **Pro** — $29/mo
- **Business** — $99/mo

These are enforced via the `EntitlementsService` and `BillingService` with Stripe integration.

---

## 3. Entitlement Categories

Each plan defines limits and access across:

### Core Limits

- Projects
- Products/Pages (items)
- AI Token Allowance

### DEO Features

- DEO Audit
- DEO Score
- Entity Intelligence
- Schema Generation
- Answer Block Generation

### AI Content Features

- Metadata (titles, descriptions, alt text)
- FAQs & Answer-Ready Content
- Product Optimization
- Bulk Content Ops

### Automations

- Basic automations
- Advanced automations
- Automation scheduling
- Bulk apply

### Integrations

- Shopify
- Web crawler
- WooCommerce (future)
- CMS integrations (future)

### Team & Collaboration

- Team roles
- Permissions
- Shared projects

### Reporting

- Basic reports
- Advanced DEO visibility
- Competitor intelligence
- Weekly summaries

### Support

- Standard
- Priority
- Enterprise-level (future)

---

## 4. Full Entitlements Matrix

### 4.1 Core Resource Limits (v1 Implementation)

| Feature                    | Free | Pro | Business  |
| -------------------------- | ---- | --- | --------- |
| Projects                   | 1    | 5   | Unlimited |
| Crawled Pages              | 50   | 500 | Unlimited |
| Automation Suggestions/Day | 5    | 25  | Unlimited |
| API Access                 | ❌   | ❌  | ✔         |

**Note:** The above reflects the current `apps/api/src/billing/plans.ts` implementation.

### 4.1.1 Legacy Tiers (Planned for Future)

| Feature                    | Starter | Pro   | Agency        |
| -------------------------- | ------- | ----- | ------------- |
| DEO Projects per workspace | 3       | 10    | Unlimited     |
| Max Products/Pages         | 500     | 5,000 | Unlimited     |
| AI Tokens / Month          | 200k    | 2M    | 10M+          |
| API Access                 | ❌      | ❌    | ✔ (in future) |

### 4.2 DEO Features

| DEO Feature             | Starter | Pro        | Agency |
| ----------------------- | ------- | ---------- | ------ |
| DEO Audit               | ✔ Basic | ✔ Full     | ✔ Full |
| DEO Score               | ✔       | ✔          | ✔      |
| Entity Intelligence     | ❌      | ✔ Basic    | ✔ Full |
| Schema Generation       | ✔ Basic | ✔ Advanced | ✔ Full |
| Answer-Ready Content    | ❌      | ✔          | ✔      |
| Multi-Engine Visibility | ❌      | ✔ Basic    | ✔ Full |

### 4.3 AI Content & Optimization

| Feature                      | Starter | Pro        | Agency     |
| ---------------------------- | ------- | ---------- | ---------- |
| Metadata Generation          | ✔ Basic | ✔ Advanced | ✔ Advanced |
| Bulk Metadata Ops            | ❌      | ✔          | ✔          |
| FAQ / Q&A Generation         | ❌      | ✔          | ✔          |
| Product Optimization         | ✔       | ✔          | ✔          |
| Content Optimization         | Limited | ✔          | ✔          |
| Image Alt Generation         | ✔       | ✔          | ✔          |
| Auto Title/Description Fixer | ✔       | ✔ Advanced | ✔ Advanced |

### 4.4 Automations

| Automation Tier           | Starter | Pro    | Agency         |
| ------------------------- | ------- | ------ | -------------- |
| Basic Automations         | ✔       | ✔      | ✔              |
| Advanced Automations      | ❌      | ✔      | ✔              |
| DEO Improvement Playbooks | ❌      | ✔      | ✔              |
| Automation Frequency      | Monthly | Weekly | Daily (future) |
| Scheduled Automations     | ❌      | ✔      | ✔              |

#### Automation Engine Classification

The Automation Engine (see `docs/AUTOMATION_ENGINE_SPEC.md`) classifies automations into three categories:

- **Basic Automations** — Reactive, metadata-oriented automations (e.g., auto-generate titles/descriptions after sync)
- **Advanced Automations** — Multi-surface, scheduled, and background automations governed by the Automation Engine

#### Automation Engine Expectations by Tier

| Plan         | Automation Engine Capabilities                                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Free**     | Reactive metadata-only automations for a limited number of items per day (aligned with `Automation Suggestions/Day` limits). No scheduled or background automations. Automation Activity Log is view-only (future UI).                                             |
| **Pro**      | Reactive + scheduled automations for products (and later pages). Daily automation execution caps aligned with `Automation Suggestions/Day` plus future Automation Engine limits. Shopify metadata auto-sync for selected rules.                                    |
| **Business** | Full Automation Engine capabilities: reactive, scheduled, and background automations across products, pages, answers, and entities. Higher or unlimited daily automation executions (subject to safety). Access to entity and answer automations once implemented. |

#### Entitlement Enforcement

- Automation Engine rules must query entitlements via `EntitlementsService` before AI-powered actions
- Automation-triggered AI calls must respect the token model in `docs/TOKEN_USAGE_MODEL.md`
- See `docs/AUTOMATION_ENGINE_SPEC.md` Section 6 for detailed enforcement requirements

### 4.5 Integrations

| Integration              | Starter | Pro | Agency |
| ------------------------ | ------- | --- | ------ |
| Shopify                  | ✔       | ✔   | ✔      |
| Custom Website (crawler) | ✔       | ✔   | ✔      |
| WooCommerce (future)     | ❌      | ✔   | ✔      |
| BigCommerce (future)     | ❌      | ✔   | ✔      |
| CMS (future)             | ❌      | ✔   | ✔      |
| Multi-Store              | ❌      | ❌  | ✔      |

### 4.6 Team Features

| Feature             | Starter | Pro       | Agency     |
| ------------------- | ------- | --------- | ---------- |
| Team Members        | ❌      | ❌        | ✔          |
| Roles & Permissions | ❌      | ❌        | ✔          |
| Shared Projects     | ❌      | ✔ Limited | ✔ Full     |
| Client Access Links | ❌      | ❌        | ✔ (future) |

### 4.7 Reporting

| Reporting Feature       | Starter | Pro | Agency |
| ----------------------- | ------- | --- | ------ |
| Basic Reports           | ✔       | ✔   | ✔      |
| Advanced DEO Visibility | ❌      | ✔   | ✔      |
| Competitor Insights     | ❌      | ✔   | ✔      |
| Weekly Summary Emails   | ❌      | ✔   | ✔      |
| White-Label Reports     | ❌      | ❌  | ✔      |

### 4.8 Support

| Support                  | Starter | Pro | Agency        |
| ------------------------ | ------- | --- | ------------- |
| Standard Support         | ✔       | ✔   | ✔             |
| Priority Support         | ❌      | ✔   | ✔             |
| Dedicated DEO Strategist | ❌      | ❌  | Future Add-on |

### 4.9 DEO-Specific Entitlements

Across tiers, the system must also model:

- Entity editing rights
- Answer unit creation rights
- DEO compute pool multipliers

Each plan's entitlement definition (in code and config) should specify:

- DEO Projects per workspace
- Item limits (products/pages)
- DEO pipeline frequency (how often full DEO runs may execute)
- Token pool size
- Role capabilities for admin vs editor vs viewer (where applicable)

---

## 5. Stripe Mapping

### Current Implementation (v1)

Stripe Price IDs are configured via environment variables:

| Environment Variable    | Internal Plan |
| ----------------------- | ------------- |
| `STRIPE_PRICE_PRO`      | `pro`         |
| `STRIPE_PRICE_BUSINESS` | `business`    |

The `free` plan has no Stripe mapping (no payment required).

### Legacy/Future tiers:

| Stripe Price ID     | Plan         |
| ------------------- | ------------ |
| `starter_monthly`   | `starter`    |
| `pro_monthly`       | `pro`        |
| `agency_monthly`    | `agency`     |
| `enterprise_annual` | `enterprise` |

---

## 6. Backend Enforcement Logic

Every write-modifying route should:

1. Extract user → subscription → plan
2. Load plan entitlements via:

   ```typescript
   const plan = PLANS[subscription.plan];
   ```

3. Validate against:
   - Project count
   - Product/page limit
   - AI tokens
   - Automation depth
   - Reporting tier
   - Entity intelligence tier
   - Team roles (future)

4. Block actions with descriptive errors:

   ```typescript
   throw new ForbiddenException(
     'Your plan does not include advanced automations. Upgrade to Pro.'
   );
   ```

---

## 7. Frontend (UI) Gating

Expose entitlements via `/users/me`:

```json
{
  "id": "user123",
  "email": "me@example.com",
  "entitlements": {
    "projects": 3,
    "tokens": 200000,
    "automations": "basic",
    "reporting": "basic",
    "teamRoles": false
  }
}
```

Use React gating:

```tsx
{
  !entitlements.entityIntelligence && (
    <UpgradeBanner message="Unlock Entity Intelligence on the Pro plan." />
  );
}
```

---

## 8. Future Tiers (for 2026)

### Business Tier

- 20 projects
- 15M tokens
- Team roles
- Full reporting
- Priority indexing API
- Multi-brand dashboard

### Enterprise

- Unlimited projects
- Unlimited tokens
- SSO / SCIM
- Dedicated strategist
- Private cloud (optional)
- Annual contract

All entitlements follow same structure → simply extend `PLANS`.

---

## 9. Versioning

This file will evolve as:

- New features launch
- Stripe pricing updates
- Usage analytics inform tier changes
- Business and Enterprise tiers launch

Version each update as:

**Version X.Y** — YYYY-MM-DD

With changelog.

---

## 10. Summary

This entitlements matrix defines:

- Exactly what each tier can access
- How the backend enforces limits
- How the UI shows upsells
- The structure for future tiers
- Alignment to DEO strategy & pricing roadmap

This ensures EngineO.ai can:

- Grow from simple subscription → usage-based billing
- Monetize advanced DEO features
- Create a clear upgrade path
- Support agencies and enterprise teams
- Maintain predictable compute costs
