import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'EngineO.ai for Shopify — DEO for your store',
  description:
    'Optimize your Shopify products, collections, pages, and blogs for search and AI with EngineO.ai — the Discovery Engine Optimization (DEO) platform.',
};

export default function ShopifyLandingPage() {
  return (
    <div className="bg-background">
      {/* SECTION 1 — Shopify Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              EngineO.ai for Shopify
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Optimize your products, collections, pages &amp; blogs for search
              and AI — automatically.
            </h1>

            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              EngineO.ai connects to your Shopify store, crawls every product
              and content page, identifies DEO issues, and gives you AI-powered
              fixes across your entire store.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Boost organic visibility. Improve product discovery. Increase
              conversions.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Start Free
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Connect Your Store &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Why Shopify Stores Need DEO (not SEO) */}
      <section className="border-b border-border bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Why Shopify stores need DEO, not just SEO
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Your customers aren&rsquo;t just searching Google anymore.
          </p>

          <div className="mt-6 grid gap-4 text-sm text-foreground sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="font-semibold text-foreground">
                They&rsquo;re searching:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• Google</li>
                <li>• TikTok</li>
                <li>• YouTube</li>
                <li>• ChatGPT</li>
                <li>• Shopping AI</li>
                <li>• Retail AI engines</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="font-semibold text-foreground">
                EngineO.ai gives Shopify brands AI-era visibility by optimizing:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• Content</li>
                <li>• Entities</li>
                <li>• Technical health</li>
                <li>• Visibility signals</li>
                <li>• Answer-surface readiness</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm text-foreground">
                This goes far beyond traditional SEO tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Deep Crawl of Your Shopify Store */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Deep crawl of your entire Shopify store
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            EngineO.ai automatically crawls your storefront so you see how
            discoverable your entire catalog really is.
          </p>

          <div className="mt-8 grid gap-4 text-sm text-foreground sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="font-semibold text-foreground">
                EngineO.ai automatically crawls:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• Product pages</li>
                <li>• Collection pages</li>
                <li>• Home page</li>
                <li>• Blog posts</li>
                <li>• About, Contact, Policies</li>
                <li>• All SEO liquid-generated pages</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-muted p-4 lg:col-span-2">
              <p className="text-xs text-muted-foreground">
                You get real DEO signals across your entire storefront — not
                just products.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Product Optimization Workspace (Shopify Edition) */}
      <section className="border-b border-border bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Product Optimization Workspace — built for Shopify
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Built specifically for Shopify merchants:
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• Product-level DEO score</li>
                <li>• AI-generated titles &amp; descriptions</li>
                <li>• Alt text + metadata analysis</li>
                <li>• Thin content detection</li>
                <li>• Missing metadata fixes</li>
                <li>• Shopify SEO sync (apply changes instantly)</li>
                <li>• Per-product issues</li>
                <li>• Collection-aware insights (later phase)</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Showcase your strongest features:
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li>✔ AI Metadata Generator</li>
                <li>✔ DEO-driven insights</li>
                <li>✔ Shopify sync</li>
                <li>✔ Variant-aware crawling</li>
                <li>✔ Mobile &amp; desktop UX</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Collection & Blog Optimization (New Content Workspace) */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Collection &amp; blog optimization with the Content Workspace
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            EngineO.ai now supports a Content Pages Workspace, enabling:
          </p>

          <ul className="mt-6 space-y-1.5 text-sm text-foreground">
            <li>• Collection page optimization</li>
            <li>• Blog post metadata optimization</li>
            <li>• Home page insights</li>
            <li>• Landing page DEO</li>
          </ul>

          <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
            This is where EngineO.ai outperforms tools like Plug in SEO and
            TinySEO — by treating products, collections, and content pages as a
            single discovery surface.
          </p>
        </div>
      </section>

      {/* SECTION 6 — Issues Engine for Shopify */}
      <section className="border-b border-border bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Issues Engine for Shopify
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Real issues. Real fixes.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• Missing product metadata</li>
                <li>• Thin or duplicate descriptions</li>
                <li>• Weak entity structure</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• Broken links</li>
                <li>• Crawl failures</li>
                <li>• Low visibility readiness</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• Weak navigation signals</li>
                <li>• Answer-surface potential gaps</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Each issue links directly to the affected product or page →
                workspace → fix.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — Auto-Crawl + Auto-Recompute (Shopify Edition) */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Auto-crawl &amp; auto-recompute — Shopify edition
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Your store updates often — EngineO.ai keeps up:
          </p>

          <ul className="mt-6 space-y-1.5 text-sm text-foreground">
            <li>• Nightly store crawl</li>
            <li>• Automatic DEO scoring</li>
            <li>• Automatic issue updates</li>
            <li>• Shopify metadata drift detection</li>
            <li>• Trendlines (coming soon)</li>
          </ul>

          <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
            You never need to &ldquo;rescan&rdquo; manually.
          </p>
        </div>
      </section>

      {/* SECTION 8 — Supported Shopify Themes, Apps, & Stacks */}
      <section className="border-b border-border bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Works with your Shopify theme, apps, and stack
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            EngineO.ai works with:
          </p>

          <ul className="mt-6 space-y-1.5 text-sm text-foreground">
            <li>• Any Shopify theme</li>
            <li>• Shopify Online Store 2.0</li>
            <li>• Hydrogen storefronts</li>
            <li>• Headless Shopify</li>
            <li>• Custom Liquid templates</li>
            <li>• Shopify Markets</li>
            <li>• Shopify Flow (for automation in future phases)</li>
          </ul>

          <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
            This is important for merchant confidence.
          </p>
        </div>
      </section>

      {/* SECTION 9 — Shopify-Specific FAQ */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Shopify-specific FAQ
          </h2>
          <div className="mt-8 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Does EngineO.ai modify my theme?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                No. All updates go through Shopify&rsquo;s SEO fields only.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Does it affect my store speed?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                No. Crawling is external and optimized.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Do I need theme access?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                No. Just store API permissions.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Can it optimize my blogs and collections?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Yes — via the Content Workspace.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                How is this better than SEO apps in the Shopify App Store?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                DEO ≠ SEO. EngineO.ai optimizes for both search engines and AI
                engines (ChatGPT, Gemini, Perplexity, retail AIs).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10 — Final CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl">
              Ready to optimize your entire Shopify store?
            </h2>
            <p className="text-sm text-primary-foreground/80">
              Connect your store and get:
            </p>
            <ul className="space-y-1.5 text-sm text-primary-foreground/80">
              <li>• DEO Score</li>
              <li>• Issues list</li>
              <li>• AI-powered product fixes</li>
              <li>• Collection &amp; page metadata</li>
              <li>• Automated daily updates</li>
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-md bg-background px-6 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Start Free
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground"
              >
                Connect Your Store &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
