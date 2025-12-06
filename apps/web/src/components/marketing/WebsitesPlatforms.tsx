export function WebsitesPlatforms() {
  return (
    <section className="border-b border-slate-100 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Works with every platform
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">
          EngineO.ai supports the CMS platforms, headless frameworks, and custom stacks your team
          already uses.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Website &amp; blog CMS</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
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
            <h3 className="text-sm font-semibold text-slate-900">Modern headless frameworks</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
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
            <h3 className="text-sm font-semibold text-slate-900">Custom sites</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Static sites</li>
              <li>Server-rendered apps</li>
              <li>Hybrid architectures</li>
            </ul>
          </div>
        </div>

        <p className="mt-8 text-sm text-slate-600">
          If your website is crawlable, EngineO.ai can analyze it and surface DEO insights.
        </p>
      </div>
    </section>
  );
}
