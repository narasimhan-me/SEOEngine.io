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
          Have more questions about plans, billing, or usage? Here are answers
          to the most common ones.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <FaqItem
            q="Which plan is right for me?"
            a="Free is for trying DEO on one site. Pro is for merchants who need daily monitoring, full content editing, and Shopify sync across up to 5 sites. Business is for agencies or teams with many sites and no usage limits."
          />
          <FaqItem
            q="When should I upgrade?"
            a="Upgrade when you hit a limit that slows you down—more sites, more pages, or more AI suggestions. We show your usage clearly in Settings so there are no surprises."
          />
          <FaqItem
            q="What counts against my AI quota?"
            a="Only generating new AI suggestions or previews uses quota. Applying fixes is always free. Reusing cached suggestions doesn't count. You can see exactly what's used in your AI Usage dashboard."
          />
          <FaqItem
            q="Are there any hidden limits or fees?"
            a="No. All limits are shown on this page and in your Settings. You can check usage anytime. Overage charges do not exist—you simply hit the limit until next month or upgrade."
          />
          <FaqItem
            q="Will this change my site without my approval?"
            a="No. EngineO.ai only edits metadata, structured data, and SEO fields—and only when you click Apply. We never touch your theme code or publish changes automatically."
          />
          <FaqItem
            q="Can I cancel or downgrade anytime?"
            a="Yes. Change or cancel your plan anytime in Settings. You keep access until your current billing period ends. No cancellation fees."
          />
        </div>
      </div>
    </section>
  );
}
