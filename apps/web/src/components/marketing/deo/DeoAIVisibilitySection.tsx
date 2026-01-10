export function DeoAIVisibilitySection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            How AI models &ldquo;see&rdquo; your website
          </h2>
          <p className="text-sm text-muted-foreground">
            LLMs don&apos;t &ldquo;rank&rdquo; websites like Google. They consume, interpret, and
            summarize content.
          </p>
          <p className="text-sm text-muted-foreground">They rely heavily on:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Clean metadata</li>
            <li>Strong headings</li>
            <li>Entity-rich descriptions</li>
            <li>Well-structured content</li>
            <li>Clear relationships between sections</li>
            <li>Crawl-accessible pages</li>
          </ul>
          <p className="pt-2 text-sm text-muted-foreground">
            DEO ensures your content is structured for both search engines and AI models.
          </p>
        </div>
      </div>
    </section>
  );
}
