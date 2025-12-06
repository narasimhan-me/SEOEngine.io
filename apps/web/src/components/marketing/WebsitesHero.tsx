import Link from 'next/link';

export function WebsitesHero() {
  return (
    <section className="border-b border-slate-100 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          EngineO.ai for WordPress, Webflow, and Every Website.
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Optimize all your pages, blogs, documentation, and landing pages for search &amp; AI
          &mdash; automatically.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          EngineO.ai crawls your entire site, detects visibility issues, and generates AI-powered
          fixes for titles, descriptions, metadata, content depth, entity structure, and more.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Works with any CMS. No plugins required.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Start Free
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Try Demo &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
