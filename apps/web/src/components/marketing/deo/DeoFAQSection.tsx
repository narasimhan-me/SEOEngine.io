interface DeoFaqItemProps {
  q: string;
  a: string;
}

function DeoFaqItem({ q, a }: DeoFaqItemProps) {
  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <h3 className="text-sm font-semibold text-foreground">{q}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{a}</p>
    </div>
  );
}

export function DeoFAQSection() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">DEO FAQs</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Common questions about DEO (Discovery Engine Optimization) and how it relates to SEO and
          AI visibility.
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <DeoFaqItem
            q="Is DEO meant to replace SEO?"
            a="No — it expands SEO to include AI and non-SERP discovery systems."
          />
          <DeoFaqItem
            q="Does DEO help with AI visibility?"
            a="Yes — DEO measures and improves answer-surface potential so AI assistants can understand and surface your content."
          />
          <DeoFaqItem
            q="Do I need technical skills?"
            a="No — EngineO.ai automates almost all DEO evaluation so non-technical teams can act on insights."
          />
          <DeoFaqItem
            q="Is DEO only for big websites?"
            a="No — DEO benefits any website with content meant to be found, even if you are just getting started."
          />
        </div>
      </div>
    </section>
  );
}
