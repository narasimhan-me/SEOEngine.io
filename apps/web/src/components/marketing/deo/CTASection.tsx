import Link from 'next/link';

export function CTASection() {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl">
            Ready to see your DEO Score?
          </h2>
          <p className="text-sm text-primary-foreground/80">
            Get your visibility analysis and AI-powered fixes in seconds.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-background px-6 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
