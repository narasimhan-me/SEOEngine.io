import Link from 'next/link';

/**
 * [BILLING-GTM-1] Pricing hero with DEO + trust-safe AI governance framing.
 * - Removed "Contact Sales" CTA (enterprise out of scope for v1)
 * - Avoids ranking/revenue guarantees
 */
export function PricingHero() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          DEO plans that grow with your business
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Optimize your site for search and AI discovery. Reuse saves AI runs.
          Apply is always free.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Start Free
          </Link>
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            See how it works &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
