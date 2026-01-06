export function ProductTourProductWorkspace() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Product Optimization Workspace
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">For ecommerce stores:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Product overview</li>
              <li>AI metadata suggestions</li>
              <li>SEO + DEO insights</li>
              <li>Shopify sync</li>
              <li>Variant-aware crawling</li>
              <li>Issue badges</li>
              <li>Optimization history (future)</li>
            </ul>
          </div>

          <div className="flex items-center justify-center">
            <div className="h-52 w-full max-w-md rounded-2xl border border-dashed border-border bg-background p-6 text-center text-xs text-muted-foreground">
              <p className="font-semibold text-muted-foreground">Product Optimization Workspace</p>
              <p className="mt-2">
                Screenshot placeholder for the per-product optimization view with DEO Score, AI
                suggestions, and issues.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
