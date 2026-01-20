# EngineO.ai — AI Token Usage, Metering & Billing Model

**Version 1.0** — December 2025  
**Author:** Narasimhan Mahendrakumar

---

## 1. Purpose

This document defines the token usage architecture for EngineO.ai across:

- DEO audits
- AI metadata generation
- AI content & FAQ generation
- Answer-ready content
- Entity extraction
- Schema generation
- Product/page optimization
- Automation playbooks
- Bulk operations
- Multi-engine visibility insights (future)

It describes exactly how to:

- Measure tokens (prompt + completion)
- Store usage
- Enforce limits
- Reset monthly usage
- Bill for add-ons
- Expose usage in dashboard
- Implement predictive forecasts (optional)

This spec ties into:

- `PRICING_STRATEGY.md`
- `PRICING_IMPLEMENTATION.md`
- `BILLING_ROADMAP.md`

---

## 2. Why a Token Usage Model?

DEO operations are compute-heavy:

- Metadata generation
- FAQ/Answer block generation
- Entity extraction
- Schema markup
- Crawl analysis
- Multi-engine ranking fetch
- Product catalog processing

We must meter tokens for:

- Cost control
- Plan enforcement
- Billing accuracy
- Customer transparency
- Usage-based add-ons

---

## 3. What Counts as Token Usage?

Tokens must be counted for:

| Feature               | Tokens Count? | Notes                                                |
| --------------------- | ------------- | ---------------------------------------------------- |
| Metadata generation   | ✅            | Titles, descriptions, alt text                       |
| FAQ / answer blocks   | ✅            | Completion-heavy                                     |
| Schema generation     | ✅            | Typically < 300 tokens                               |
| DEO audit             | ⚠️ Mixed      | Only LLM components (classification, interpretation) |
| Product sync          | ❌ No         | Does not use AI                                      |
| Page crawl            | ❌ No         | Uses scraper / fetch                                 |
| Entity graph (future) | ✅            | LLM-based                                            |
| Visibility analysis   | ⚠️ Partial    | If LLM used for interpretation                       |
| Automations           | ✅            | If they trigger AI tasks via the Automation Engine   |
| AI-powered fixes      | ✅            | Each fix consumes tokens                             |

## 3.1 DEO Pillar Token Categories

Token usage can also be categorized by DEO pillar:

- **DEO Score computation** – recalculating composite scores
- **Entity extraction + enrichment** – identifying and linking entities
- **Answer unit generation** – creating answer-ready content blocks
- **Multi-engine visibility checks (VEO)** – video and voice surface analysis
- **Crawl & technical diagnostics** – page-level SEO analysis
- **Automation Engine operations** – token usage should be tagged with a source value indicating the automation rule (e.g., `source: 'automation:auto_generate_metadata_on_new_product'`) so that dashboards and audits can distinguish automation-driven AI usage

---

## 4. Token Calculation Rules

EngineO uses:

- OpenAI-compatible SDKs
- Anthropic-compatible SDKs

Model responses including:

- `prompt_tokens`
- `completion_tokens`
- `total_tokens`

**Token formula:**

```typescript
tokensUsed = response.usage.total_tokens;
```

If the provider doesn't provide totals:

```typescript
tokensUsed = promptTokens + completionTokens;
```

### Multi-step operations

If a workflow calls multiple AI tasks:

```typescript
totalTokens = sum(all steps)
```

Store each step separately for granular auditing.

---

## 5. Backend Architecture (NestJS)

### 5.1 Create TokenUsage model in Prisma

```prisma
model TokenUsage {
  id        String   @id @default(cuid())
  userId    String
  source    String   // e.g. "metadata", "faq", "schema", "audit", "automation"
  amount    Int
  createdAt DateTime @default(now())
}
```

### 5.2 Token Logging Helper (apps/api)

Create: `apps/api/src/usage/token-logger.service.ts`

```typescript
@Injectable()
export class TokenLoggerService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string, amount: number, source: string) {
    return this.prisma.tokenUsage.create({
      data: { userId, amount, source },
    });
  }

  async getMonthlyUsage(userId: string) {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    return this.prisma.tokenUsage.aggregate({
      where: { userId, createdAt: { gte: start } },
      _sum: { amount: true },
    });
  }
}
```

### 5.3 Inject usage logging into all AI workflows

In: `apps/api/src/ai/ai.service.ts`

Wrap all OpenAI / Anthropic calls:

```typescript
const response = await this.openai.chat.completions.create({ ... });

await this.tokenLogger.log(userId, response.usage.total_tokens, 'metadata');
```

Repeat for:

- FAQ generation
- Schema markup
- Answer-ready content
- Entity extraction
- DEO audit (LLM-only parts)
- Automation Engine tasks

**Automation Engine Token Logging:**

The Automation Engine and `AutomationService` must call the token logger with a distinct source label for automation-triggered AI operations, in line with the Automation Engine spec (`docs/AUTOMATION_ENGINE_SPEC.md`). For example:

```typescript
await this.tokenLogger.log(
  userId,
  tokens,
  'automation:auto_generate_metadata_for_missing_metadata'
);
```

This enables:

- Tracking automation-specific token consumption
- Distinguishing manual vs automated AI usage
- Per-rule token budgeting (future)

---

## 6. Usage Enforcement

This is tied to the subscription entitlements via `PLANS`.

### 6.1 Monthly usage check

```typescript
const usage = await this.tokenLogger.getMonthlyUsage(userId);
const used = usage._sum.amount ?? 0;

if (used + tokensNeeded > entitlements.tokens) {
  throw new ForbiddenException(
    'Token limit reached. Upgrade your plan for more capacity.'
  );
}
```

### 6.2 Soft vs Hard caps

EngineO supports two modes:

**Soft cap (recommended for launch)**

When user hits 100% tokens:

- Trigger upgrade modal
- Notify via email
- Slow automations (queue delay)
- Allow small overruns (up to 20% of limit)

**Hard cap (future)**

- Block any AI call beyond limit
- Only allowed with explicit opt-in

---

## 7. Monthly Reset

Reset mechanism:

Every new Stripe billing period:

- Webhook (`invoice.payment_succeeded`) fires
- Backend resets token counters:

```typescript
await prisma.tokenUsage.deleteMany({
  where: { userId },
});
```

**Alternatives:**

- Archive into `TokenUsageHistory` (enterprise)
- Keep rolling 30-day window (future option)

---

## 8. Dashboard Exposure (Frontend)

### API Endpoint

Add `/usage/tokens`:

```json
{
  "used": 220300,
  "limit": 2000000,
  "remaining": 1789700,
  "percentage": 11
}
```

### UI Components

Place inside: `/dashboard`

**Elements:**

- Progress bar
- Numerical usage
- Reset date
- "Upgrade Plan" CTA (if > 70% used)
- "Over your limit — automations slowed" message

---

## 9. Forecasting Model (Optional Future)

Predict 7-day future usage:

Use linear regression on:

- Daily tokens
- Project count
- Run frequency of automations
- DEO audits

**Forecast output:**

```json
{
  "forecast_7d": 1203300,
  "risk_level": "medium",
  "recommendation": "Upgrade to Pro to avoid interruptions."
}
```

**Use cases:**

- In-product upsells
- Plan recommendations
- Automated email nudges
- Enterprise forecasting

---

## 10. Multi-User & Agency Model

For future "Team" / "Agency" tiers:

### Token ownership

Token usage is tied to:

- User ID (for personal operations)
- Project ID (for project-specific tasks)
- Organization ID (for teams/agencies)

In DB, add:

```prisma
projectId String?
orgId     String?
```

This allows:

- Shared usage
- Shared limits
- Team-level billing
- Enterprise reporting

---

## 11. Add-On Token Packs

Stripe → create metered products:

| Add-on       | Price |
| ------------ | ----- |
| +100k tokens | $8    |
| +500k tokens | $30   |
| +1M tokens   | $55   |

### Implementation

Add a new endpoint:

- `POST /billing/addons/tokens`
- Stripe Checkout session → "token_pack_100k" etc.

**Webhook:**

- `customer.subscription.updated`

**Backend:**

- Increase `entitlements.tokens` for current period
- Log add-on purchase

---

## 12. Fraud & Abuse Prevention

Required safeguards:

1. **Rate-limiting AI calls**

   Per user:
   - 10 calls/minute (Starter)
   - 30 calls/minute (Pro)
   - 60 calls/minute (Agency)

2. **Automation throttling**

   If user exceeds token limit by >20% (soft cap), pause automations.

3. **Sudden spike detection**

   If token usage spikes > 3x normal baseline → email + throttle.

4. **Abuse patterns**

   Detect:
   - Repetitive low-quality generation
   - Token stuffing
   - Excessive retries
   - Automated spam submissions

---

## 13. Alerts & Notifications

- **60% tokens used**
  - In-app alert
  - Optional email

- **80% tokens used**
  - Upgrade CTA
  - Stronger warnings

- **100% tokens used**
  - Soft cap → slow automations
  - Hard cap → block (if enabled)

- **120% limit (soft cap overflow)**
  - Block all AI operations
  - Require plan upgrade

---

## 14. Developer Task List

### Backend

- Implement `TokenUsage` model
- Add `TokenLoggerService`
- Add entitlements middleware
- Add usage check logic
- Add monthly reset
- Stripe webhook → auto reset counters

### Frontend

- Add `/usage/tokens` API consumption
- Add usage bar + upgrade CTA
- Add warning banners
- Add usage in billing page

### DevOps

- Cron jobs for resets (for backup)
- Logging & alerts

---

## 15. Future Enhancements

- **GPT model cost-weighting**
  - Tokens are not equal cost across providers/models.
  - Implement: `cost = tokens * modelSpecificCost`

- **Predictive token budgeting**
  - Warn users BEFORE they exceed usage.

- **Per-project token quotas**
  - Agencies can allocate tokens per project.

- **Entity depth weighting**
  - Entity extraction may become a separate billing metric.

---

## 16. Summary

The token usage model enables:

- Predictable AI compute usage
- Accurate billing
- Hard/soft enforcement
- Transparent user dashboards
- Add-on monetization
- Agency & enterprise scalability

It is aligned with the DEO-first strategy where:

- Metadata
- Answer content
- Entity markup
- Automation
- Multi-engine visibility

all rely on AI-powered pipelines.
