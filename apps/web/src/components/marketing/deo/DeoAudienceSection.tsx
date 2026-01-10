export function DeoAudienceSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Who DEO is for
          </h2>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>SaaS companies</li>
            <li>Ecommerce brands</li>
            <li>Publishers &amp; bloggers</li>
            <li>Agencies</li>
            <li>Local businesses</li>
            <li>Documentation-heavy sites</li>
            <li>Any website with more than ~10 pages</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            DEO is the visibility foundation for the AI era.
          </p>
        </div>
      </div>
    </section>
  );
}
