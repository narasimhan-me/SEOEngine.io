import Link from 'next/link';

export function ProductTourPlatforms() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Supported platforms
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              EngineO.ai works across ecommerce and content platforms so you can optimize everything
              from stores to blogs to documentation.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>WordPress</li>
              <li>Webflow</li>
              <li>Wix</li>
              <li>Squarespace</li>
              <li>Shopify</li>
              <li>Ghost</li>
              <li>Custom</li>
              <li>Static headless sites</li>
            </ul>
          </div>
          <div>
            <Link
              href="/websites"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              View supported platforms &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
