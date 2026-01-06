import Link from 'next/link';

export function ProductTourHero() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          A complete visibility engine for your entire website.
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-sm text-muted-foreground">
          EngineO.ai crawls your site, analyzes signals, detects issues, computes a DEO Score, and
          gives you AI-powered workflows to fix anything blocking your visibility.
        </p>
        <p className="mt-2 max-w-2xl mx-auto text-sm text-muted-foreground">
          One platform. Every page. All your discovery signals.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Start Free
          </Link>
          <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Try Demo &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
