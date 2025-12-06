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
      '100 crawled pages',
      'Weekly crawl',
      'DEO Score (v1)',
      'Critical issues only',
      'Product Workspace (1 product)',
      'Content Workspace (view-only)',
      '5 AI suggestions per month',
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
      '5,000 crawled pages',
      'Daily crawl',
      'Full Issues Engine',
      'Full Product Workspace',
      'Full Content Workspace',
      'Unlimited AI suggestions',
      'Shopify SEO sync',
      'DEO Trends (coming soon)',
      'Priority support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '$99',
    period: '/mo',
    tagline: 'For larger teams and multi-site setups.',
    ctaLabel: 'Contact Sales',
    ctaHref: '/contact',
    features: [
      '20 projects',
      '25,000 crawled pages',
      'Hourly crawl scheduling (coming soon)',
      'Team roles',
      'API access',
      'Audit exports',
      'Dedicated account manager',
    ],
  },
];

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
    business: '20',
  },
  {
    label: 'Crawled pages',
    free: '100',
    pro: '5,000',
    business: '25,000',
  },
  {
    label: 'Crawl frequency',
    free: 'Weekly',
    pro: 'Daily',
    business: 'Hourly (coming soon)',
  },
  {
    label: 'Issues Engine',
    free: 'Critical issues only',
    pro: 'Full',
    business: 'Full',
  },
  {
    label: 'Product Workspace',
    free: '1 product',
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
    label: 'AI suggestions',
    free: '5 / month',
    pro: 'Unlimited',
    business: 'Unlimited',
  },
  {
    label: 'Shopify SEO sync',
    free: '—',
    pro: 'Included',
    business: 'Included',
  },
  {
    label: 'DEO Trends',
    free: '—',
    pro: 'Coming soon',
    business: 'Coming soon',
  },
  {
    label: 'Support',
    free: 'Standard',
    pro: 'Priority',
    business: 'Priority + account manager',
  },
];

export function PricingTable() {
  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Plan cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-slate-50 p-6 ${
                plan.popular
                  ? 'border-blue-500 shadow-sm shadow-blue-100'
                  : 'border-slate-200'
              }`}
            >
              {plan.popular && (
                <div className="mb-3 inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                  Most Popular
                </div>
              )}
              <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-slate-900">
                  {plan.price}
                </span>
                <span className="text-xs text-slate-500">{plan.period}</span>
              </div>

              <Link
                href={plan.ctaHref}
                className={`mt-5 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-900 text-slate-50 hover:bg-slate-800'
                }`}
              >
                {plan.ctaLabel}
              </Link>

              <ul className="mt-6 flex-1 space-y-1.5 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Optional Enterprise row */}
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">Need more?</p>
              <p className="text-sm text-slate-600">
                Enterprise and high-volume plans are available with custom pricing.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-800"
            >
              Book Demo
            </Link>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="mt-12 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50">
          <table className="min-w-full text-left text-xs text-slate-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                  Features
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                  Free
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                  Pro
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                  Business
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row) => (
                <tr key={row.label} className="border-t border-slate-200">
                  <td className="px-4 py-2 text-xs font-medium text-slate-900">
                    {row.label}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-700">{row.free}</td>
                  <td className="px-4 py-2 text-xs text-slate-700">{row.pro}</td>
                  <td className="px-4 py-2 text-xs text-slate-700">
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
