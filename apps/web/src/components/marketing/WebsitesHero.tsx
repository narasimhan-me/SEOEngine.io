import Link from 'next/link';

export function WebsitesHero() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          EngineO.ai for WordPress, Webflow, and Every Website.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Optimize all your pages, blogs, documentation, and landing pages for search &amp; AI
          &mdash; automatically.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          EngineO.ai crawls your entire site, detects visibility issues, and generates AI-powered
          fixes for titles, descriptions, metadata, content depth, entity structure, and more.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Works with any CMS. No plugins required.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Start Free
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Try Demo &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
