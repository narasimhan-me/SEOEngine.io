export function WebsitesPlatforms() {
  return (
    <section className="border-b border-border bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Works with every platform
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          EngineO.ai supports the CMS platforms, headless frameworks, and custom
          stacks your team already uses.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Website &amp; blog CMS
            </h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>WordPress</li>
              <li>Webflow</li>
              <li>Wix</li>
              <li>Squarespace</li>
              <li>Ghost</li>
              <li>HubSpot CMS</li>
              <li>Drupal</li>
              <li>Blogger</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Modern headless frameworks
            </h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Next.js</li>
              <li>Remix</li>
              <li>Astro</li>
              <li>Gatsby</li>
              <li>Nuxt</li>
              <li>SvelteKit</li>
              <li>Custom frameworks</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Custom sites
            </h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Static sites</li>
              <li>Server-rendered apps</li>
              <li>Hybrid architectures</li>
            </ul>
          </div>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          If your website is crawlable, EngineO.ai can analyze it and surface
          DEO insights.
        </p>
      </div>
    </section>
  );
}
