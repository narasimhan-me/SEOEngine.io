export function ProductTourContentWorkspace() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Content Optimization Workspace
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              For all non-product pages:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Title + description editing</li>
              <li>AI suggestions</li>
              <li>Thin content detector</li>
              <li>Entity structure insights</li>
              <li>Crawl health</li>
              <li>Page-level issue list</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">Support for:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>WordPress</li>
              <li>Webflow</li>
              <li>Wix</li>
              <li>Squarespace</li>
              <li>Ghost</li>
              <li>Custom sites</li>
            </ul>
          </div>

          <div className="flex items-center justify-center">
            <div className="h-52 w-full max-w-md rounded-2xl border border-dashed border-border bg-background p-6 text-center text-xs text-muted-foreground">
              <p className="font-semibold text-muted-foreground">
                Content Optimization Workspace
              </p>
              <p className="mt-2">
                Screenshot placeholder showing metadata, AI suggestions, content
                depth, entities, and issues for a page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
