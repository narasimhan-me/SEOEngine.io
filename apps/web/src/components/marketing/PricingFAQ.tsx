interface FaqItemProps {
  q: string;
  a: string;
}

function FaqItem({ q, a }: FaqItemProps) {
  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <h3 className="text-sm font-semibold text-foreground">{q}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{a}</p>
    </div>
  );
}

/**
 * [BILLING-GTM-1] Pricing FAQ with trust-safe AI governance messaging.
 * - "AI suggestions" → "AI runs"
 * - Added reuse education and APPLY trust invariant
 * - Removed annual/coupon references (out of scope for v1)
 */
export function PricingFAQ() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Frequently asked questions
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Have more questions about plans, billing, or usage? Here are answers to the most common
          ones.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <FaqItem
            q="How does the free plan work?"
            a="You can connect one project, crawl up to 50 pages, and use a limited number of AI runs for previews and suggestions. Upgrade to Pro or Business when you need more projects, pages, or AI capacity."
          />
          <FaqItem
            q="Will this affect my Shopify theme or site code?"
            a="EngineO.ai focuses on metadata, structured data, entities, and other search- and AI-facing fields. It does not rewrite your theme or site code without your approval."
          />
          <FaqItem
            q="Do I need a developer to use this?"
            a="No. EngineO.ai is built for marketers, founders, and growth teams. Developers can help with advanced workflows and integrations, but they are not required to get value."
          />
          <FaqItem
            q="What is an AI run?"
            a="An AI run is a preview or draft generation request. Reuse saves AI runs — when similar content is detected, cached results are used instead of making new AI calls. Apply operations never use AI."
          />
          <FaqItem
            q="Does Apply use my AI quota?"
            a="No. Apply never uses AI — applying fixes is always quota-free. Only preview and draft generation consume AI runs. This is a core trust invariant."
          />
          <FaqItem
            q="Can I cancel or change plans anytime?"
            a="Yes. You can downgrade or cancel your subscription at any time from within the app via Stripe. Your account will remain active until the end of your current billing period."
          />
        </div>
      </div>
    </section>
  );
}
