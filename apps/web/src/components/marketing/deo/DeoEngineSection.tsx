export function DeoEngineSection() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            How EngineO.ai implements DEO
          </h2>
          <p className="text-sm text-muted-foreground">
            EngineO.ai is the first platform built around DEO:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">
                Automated full-site crawl
              </span>{' '}
              &mdash; finds every URL and extracts signals.
            </li>
            <li>
              <span className="font-semibold text-foreground">DEO Score</span>{' '}
              &mdash; your universal visibility metric.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Issues Engine
              </span>{' '}
              &mdash; clear, actionable problem detection.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                AI Optimization Workspaces
              </span>{' '}
              &mdash; one for products, one for all content pages.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Automation layer
              </span>{' '}
              &mdash; daily crawling, recompute, issue updates.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                CMS-agnostic
              </span>{' '}
              &mdash; works with Shopify, WordPress, Webflow, SaaS sites, blogs
              &mdash; everything.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
