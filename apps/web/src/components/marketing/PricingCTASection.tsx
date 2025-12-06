import Link from 'next/link';

export function PricingCTASection() {
  return (
    <section className="bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Ready to improve your visibility across search &amp; AI?
          </h2>
          <p className="text-sm text-slate-200">
            Start Free Today and see where your discovery footprint stands across content, entities,
            technical health, and visibility.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Start Free Today
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-slate-100 hover:text-white"
            >
              Talk to Sales &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
