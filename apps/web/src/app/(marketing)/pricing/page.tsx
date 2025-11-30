import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing — SEOEngine.io',
  description:
    'Simple, transparent pricing for stores and agencies. Start free and upgrade as you grow.',
};

const plans = [
  {
    name: 'Starter',
    price: '$19',
    period: 'per month',
    tagline: 'For new stores and side hustlers.',
    popular: false,
    cta: 'Start free',
    href: '/signup',
    features: [
      'Up to 3 projects',
      '500 synced products',
      '200k AI tokens / month',
      'SEO audit & health score',
      'AI metadata suggestions',
      'Basic automations',
      'Shopify integration',
    ],
  },
  {
    name: 'Pro',
    price: '$59',
    period: 'per month',
    tagline: 'For growing eCommerce brands.',
    popular: true,
    cta: 'Upgrade to Pro',
    href: '/signup',
    features: [
      'Everything in Starter',
      'Up to 10 projects',
      '5,000 products',
      '2M AI tokens / month',
      'Smart schema markup',
      'AI content generator',
      'Competitor insights',
      'Redirect manager',
    ],
  },
  {
    name: 'Agency',
    price: '$199',
    period: 'per month',
    tagline: 'For agencies and large stores.',
    popular: false,
    cta: 'Talk to sales',
    href: '/contact',
    features: [
      'Unlimited projects',
      'Unlimited products',
      '10M AI tokens / month',
      'Team accounts',
      'Advanced automation',
      'Weekly client reports',
      'Priority support',
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{q}</h3>
      <p className="mt-2 text-sm text-slate-600">{a}</p>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Simple, transparent pricing for every type of business.
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Start free, connect your store, and upgrade only when you&apos;re
            ready. No contracts, cancel anytime.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              Coming soon
            </span>
            <span>Annual billing with 2 months free.</span>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-2xl border bg-slate-50 p-6 ${
                  plan.popular
                    ? 'border-blue-500 shadow-sm shadow-blue-100'
                    : 'border-slate-200'
                }`}
              >
                {plan.popular && (
                  <div className="mb-3 inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                    Most popular
                  </div>
                )}
                <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-500">{plan.period}</span>
                </div>

                <Link
                  href={plan.href}
                  className={`mt-5 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-900 text-slate-50 hover:bg-slate-800'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="mt-6 flex-1 space-y-1.5 text-sm text-slate-600">
                  {plan.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <FaqItem
              q="How does the free trial work?"
              a="You can connect your store, run audits, and test AI features on a limited number of products. Upgrade when you're ready for higher limits."
            />
            <FaqItem
              q="Will this affect my Shopify theme?"
              a="SEOEngine.io focuses on metadata, structured data, and search-facing fields. It does not rewrite your theme code without your approval."
            />
            <FaqItem
              q="Do I need a developer to use this?"
              a="No. SEOEngine.io is built for marketers, founders, and growth teams. Developers can help with advanced workflows, but they're not required."
            />
            <FaqItem
              q="What is an AI token?"
              a="AI tokens represent how much AI processing you can use across metadata, content generation, and analysis. Higher plans include more monthly tokens."
            />
            <FaqItem
              q="Can I cancel anytime?"
              a="Yes. You can downgrade or cancel your subscription at any time from within the app. Your account will remain active until the end of your billing period."
            />
            <FaqItem
              q="Do you offer discounts for agencies or annual plans?"
              a="Yes. Agencies and annual plans receive preferred pricing. Contact us to discuss your use case and volume."
            />
          </div>
        </div>
      </section>
    </div>
  );
}
