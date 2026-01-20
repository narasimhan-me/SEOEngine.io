export function DeoPillarsSection() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            What DEO actually measures
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            DEO consists of four core pillars:
          </p>
        </div>
        <dl className="mt-6 grid gap-6 text-sm text-muted-foreground sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-foreground">
              1. Content Quality
            </dt>
            <dd className="mt-1">
              Depth, clarity, completeness, and usefulness.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-foreground">
              2. Entities &amp; Semantic Structure
            </dt>
            <dd className="mt-1">
              How well your site signals topics, entities, and relationships.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-foreground">
              3. Technical Health
            </dt>
            <dd className="mt-1">
              Crawlability, status codes, indexability, metadata presence.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-foreground">
              4. Visibility Strength
            </dt>
            <dd className="mt-1">
              Whether your content can appear in AI answers, summaries,
              previews, or topical clusters.
            </dd>
          </div>
        </dl>
        <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
          The DEO Score combines all these into one unified visibility metric.
        </p>
      </div>
    </section>
  );
}
