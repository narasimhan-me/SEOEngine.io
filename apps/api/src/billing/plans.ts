export type PlanId = 'free' | 'pro' | 'business';

export interface PlanLimits {
  projects: number; // -1 = unlimited
  crawledPages: number; // -1 = unlimited
  automationSuggestionsPerDay: number; // -1 = unlimited
}

/**
 * [BILLING-GTM-1] Parse AI quota limit from environment variable.
 * Pattern: AI_USAGE_MONTHLY_RUN_LIMIT_${PLAN_ID}
 * Returns null (unlimited) if missing, blank, non-positive, or non-numeric.
 */
function getAiQuotaLimitFromEnv(planId: string): number | null {
  const envKey = `AI_USAGE_MONTHLY_RUN_LIMIT_${planId.toUpperCase()}`;
  const envValue = process.env[envKey];

  if (!envValue || envValue.trim() === '') {
    return null; // Unlimited
  }

  const parsed = parseInt(envValue, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return null; // Unlimited
  }

  return parsed;
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // monthly price in cents
  features: string[];
  limits: PlanLimits;
  /** [BILLING-GTM-1] Monthly AI runs quota (null = unlimited) */
  aiQuotaMonthlyRuns: number | null;
}

/**
 * [BILLING-GTM-1] Get plans with AI quota populated from env.
 * This function is called at runtime so env vars are evaluated on each call.
 */
export function getPlansWithAiQuota(): Plan[] {
  return [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: [
        '1 project',
        '50 crawled pages',
        '5 automation suggestions per day',
        'Basic SEO analysis',
      ],
      limits: {
        projects: 1,
        crawledPages: 50,
        automationSuggestionsPerDay: 5,
      },
      aiQuotaMonthlyRuns: getAiQuotaLimitFromEnv('free'),
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 2900, // $29/month
      features: [
        '5 projects',
        '500 crawled pages',
        '25 automation suggestions per day',
        'Advanced SEO analysis',
        'Priority support',
      ],
      limits: {
        projects: 5,
        crawledPages: 500,
        automationSuggestionsPerDay: 25,
      },
      aiQuotaMonthlyRuns: getAiQuotaLimitFromEnv('pro'),
    },
    {
      id: 'business',
      name: 'Business',
      price: 9900, // $99/month
      features: [
        'Unlimited projects',
        'Unlimited crawled pages',
        'Unlimited automation suggestions',
        'Advanced SEO analysis',
        'Priority support',
        'API access',
      ],
      limits: {
        projects: -1,
        crawledPages: -1,
        automationSuggestionsPerDay: -1,
      },
      aiQuotaMonthlyRuns: getAiQuotaLimitFromEnv('business'),
    },
  ];
}

/** @deprecated Use getPlansWithAiQuota() for runtime access with env-driven AI quota */
export const PLANS: Plan[] = getPlansWithAiQuota();

export function getPlanById(planId: string): Plan | undefined {
  return getPlansWithAiQuota().find((p) => p.id === planId);
}

/** Stripe Price IDs - set via environment */
export const STRIPE_PRICES: Record<Exclude<PlanId, 'free'>, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};
