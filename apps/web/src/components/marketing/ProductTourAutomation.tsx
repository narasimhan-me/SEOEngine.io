export function ProductTourAutomation() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          DEO automation
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your website changes. Your visibility shouldn&apos;t break.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">EngineO.ai automates:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Scheduled crawls</li>
          <li>DEO recompute</li>
          <li>Issue re-evaluation</li>
          <li>Drift detection (Shopify metadata changes)</li>
          <li>Trend snapshots (coming soon)</li>
        </ul>
      </div>
    </section>
  );
}
