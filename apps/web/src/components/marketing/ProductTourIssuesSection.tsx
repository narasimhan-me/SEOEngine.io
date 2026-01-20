import Link from 'next/link';

export function ProductTourIssuesSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Issues Engine
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              EngineO.ai detects everything holding your site back:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Missing metadata</li>
              <li>Thin content</li>
              <li>Weak structure</li>
              <li>Answer-surface gaps</li>
              <li>Low entity coverage</li>
              <li>Crawl failures</li>
              <li>Navigation gaps</li>
              <li>Shallow product content</li>
              <li>Broken links</li>
            </ul>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              Each issue clearly explains:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>What it is</li>
              <li>Why it matters</li>
              <li>How to fix it</li>
              <li>Which pages/products are affected</li>
            </ul>
            <Link
              href="/signup"
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              View all issues &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
