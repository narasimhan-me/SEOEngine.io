export function ProductTourCrawlSection() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Full-site crawling engine
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              A dedicated crawling system that finds:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Product pages</li>
              <li>Collection/category pages</li>
              <li>Blog posts</li>
              <li>Landing pages</li>
              <li>Home page</li>
              <li>Documentation</li>
              <li>Custom routes</li>
              <li>Hub pages</li>
              <li>Navigation pages</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              We crawl your entire website automatically.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              No setup. No plugins. No code.
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="h-48 w-full max-w-md rounded-2xl border border-dashed border-border bg-background p-6 text-center text-xs text-muted-foreground">
              <p className="font-semibold text-muted-foreground">Crawl graph</p>
              <p className="mt-2">
                Placeholder visualization showing EngineO.ai discovering
                products, collections, blogs, landing pages, and more across
                your site.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
