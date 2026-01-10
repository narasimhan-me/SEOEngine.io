import Link from 'next/link';

type PlanId = 'free' | 'pro' | 'business';

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  popular?: boolean;
  ctaLabel: string;
  ctaHref: string;
  features: string[];
}

/**
 * [BILLING-GTM-1] Marketing pricing plans aligned with backend:
 * - Free: 1 project, 50 crawled pages, 5 suggestions/day
 * - Pro: 5 projects, 500 crawled pages, 25 suggestions/day
 * - Business: Unlimited projects/pages/suggestions
 */
const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    tagline: 'Get started with DEO on a single site.',
    ctaLabel: 'Start Free',
    ctaHref: '/signup',
    features: [
      '1 project',
      '50 crawled pages',
      'Weekly crawl',
      'DEO Score & Insights',
      'Full Issues Engine',
      'Product Workspace',
      'Content Workspace (view-only)',
      '5 automation suggestions/day',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/mo',
    tagline: 'Most merchants and teams start here.',
    popular: true,
    ctaLabel: 'Get Pro',
    ctaHref: '/signup',
    features: [
      '5 projects',
      '500 crawled pages',
      'Daily crawl',
      'Full Issues Engine',
      'Full Product Workspace',
      'Full Content Workspace',
      '25 automation suggestions/day',
      'Higher monthly AI quota',
      'Shopify SEO sync',
      'Priority support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '$99',
    period: '/mo',
    tagline: 'For larger teams and multi-site setups.',
    ctaLabel: 'Get Business',
    ctaHref: '/signup',
    features: [
      'Unlimited projects',
      'Unlimited crawled pages',
      'Unlimited automation suggestions',
      'Unlimited monthly AI runs',
      'Team roles (coming soon)',
      'API access',
      'Audit exports',
      'Priority support',
    ],
  },
];

/**
 * [BILLING-GTM-1] Comparison features aligned with backend limits.
 * - Removed "Critical issues only" (all plans get full Issues Engine)
 * - Replaced "DEO Trends (coming soon)" with "Insights" (INSIGHTS-1 exists)
 * - AI suggestions = automation suggestions/day entitlement
 */
const comparisonFeatures: {
  label: string;
  free: string;
  pro: string;
  business: string;
}[] = [
  {
    label: 'Projects',
    free: '1',
    pro: '5',
    business: 'Unlimited',
  },
  {
    label: 'Crawled pages',
    free: '50',
    pro: '500',
    business: 'Unlimited',
  },
  {
    label: 'Crawl frequency',
    free: 'Weekly',
    pro: 'Daily',
    business: 'Daily',
  },
  {
    label: 'Issues Engine',
    free: 'Full',
    pro: 'Full',
    business: 'Full',
  },
  {
    label: 'Product Workspace',
    free: 'Full',
    pro: 'Full',
    business: 'Full',
  },
  {
    label: 'Content Workspace',
    free: 'View-only',
    pro: 'Full',
    business: 'Full',
  },
  {
    label: 'Automation suggestions/day',
    free: '5',
    pro: '25',
    business: 'Unlimited',
  },
  {
    label: 'Monthly AI runs',
    free: 'Limited',
    pro: 'Higher quota',
    business: 'Unlimited',
  },
  {
    label: 'Shopify SEO sync',
    free: '—',
    pro: 'Included',
    business: 'Included',
  },
  {
    label: 'Insights dashboard',
    free: 'Included',
    pro: 'Included',
    business: 'Included',
  },
  {
    label: 'Support',
    free: 'Standard',
    pro: 'Priority',
    business: 'Priority',
  },
];

export function PricingTable() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Plan cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-muted p-6 ${
                plan.popular
                  ? 'border-primary shadow-sm shadow-primary/10'
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="mb-3 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                  Most Popular
                </div>
              )}
              <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-foreground">
                  {plan.price}
                </span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>

              <Link
                href={plan.ctaHref}
                className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {plan.ctaLabel}
              </Link>

              <ul className="mt-6 flex-1 space-y-1.5 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Feature comparison table */}
        <div className="mt-12 overflow-x-auto rounded-2xl border border-border bg-muted">
          <table className="min-w-full text-left text-xs text-muted-foreground">
            <thead>
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Features
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Free
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Pro
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Business
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <td className="px-4 py-2 text-xs font-medium text-foreground">
                    {row.label}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{row.free}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{row.pro}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {row.business}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
