export function DeoWhySection() {
  return (
    <section id="what-is-deo" className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Why traditional SEO is no longer enough
          </h2>
          <p className="text-sm text-muted-foreground">
            Search has evolved beyond keywords and SERP rankings.
          </p>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Websites today must be discoverable by:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Google</li>
              <li>ChatGPT</li>
              <li>Gemini</li>
              <li>Perplexity</li>
              <li>AI assistants and agents</li>
              <li>Vertical search systems</li>
              <li>Retail knowledge engines</li>
              <li>Internal company search</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Search engines are now discovery engines &mdash; and they evaluate:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Metadata completeness</li>
              <li>Entity relevance &amp; structure</li>
              <li>Page depth</li>
              <li>Semantic clarity</li>
              <li>Crawlability</li>
              <li>Answer-surface readiness</li>
            </ul>
          </div>
          <div className="space-y-1 text-sm font-semibold text-foreground">
            <p>SEO &ne; enough.</p>
            <p>DEO = visibility everywhere.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
