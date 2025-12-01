import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features — EngineO.ai DEO Platform',
  description:
    'See everything EngineO.ai does for your brand: DEO (Discovery Engine Optimization) that unifies SEO, AEO, PEO, and VEO across product, content, and technical optimization.',
};

function FeatureBlock({
  label,
  description,
  whyItMatters,
  bullets,
}: {
  label: string;
  description: string;
  whyItMatters?: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {whyItMatters && (
        <p className="mt-3 max-w-3xl text-sm text-slate-700 border-l-2 border-blue-200 pl-3 italic">
          {whyItMatters}
        </p>
      )}
      <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
        {bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Everything you need to automate discovery — without hiring a full team.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            EngineO.ai combines technical SEO, product and content optimization, entity intelligence, monitoring, and automation into one platform built for modern brands and eCommerce.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            DEO (Discovery Engine Optimization) unifies SEO, AEO, PEO, and VEO to help your brand rank, appear, and be cited across search engines and AI systems.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 space-y-10 sm:px-6 lg:px-8">
          <FeatureBlock
            label="AI DEO & SEO Automation"
            description="Let AI handle the repetitive SEO work while you focus on strategy and growth."
            whyItMatters="Most stores have hundreds of missing meta descriptions, broken links, and unoptimized images. Fixing them manually takes weeks. AI automation handles the busywork so you can focus on strategy that actually moves the needle."
            bullets={[
              'Auto-fix missing titles, meta descriptions & H1 tags',
              'Generate optimized alt text for product & collection images',
              'Detect and help resolve broken links',
              'Compress and optimize large images to improve performance',
              'Generate structured schema for key pages',
            ]}
          />

          <FeatureBlock
            label="Content Intelligence"
            description="Understand what to write, how to outrank competitors, and how each piece of content performs."
            whyItMatters="Great content drives organic traffic, but most teams don't know what to write or how to optimize it. Content intelligence shows you exactly which topics to target and how to outrank competitors — no guesswork required."
            bullets={[
              'Keyword explorer with intent-focused suggestions',
              'Keyword clustering for topic-level planning',
              'Content scoring based on readability & SEO impact',
              'Competitor content gap analysis',
              'AI blog and article generator',
            ]}
          />

          <FeatureBlock
            label="eCommerce discovery & SEO"
            description="Purpose-built for Shopify and product-heavy catalogs that need to stay visible across search and AI assistants."
            whyItMatters="Product pages are your biggest discovery opportunity — and your biggest bottleneck. Writing unique, optimized metadata and answer-ready content for thousands of SKUs is nearly impossible without automation. EngineO.ai syncs with your store and optimizes at scale."
            bullets={[
              'Shopify product & variant sync',
              'AI-optimized product titles and descriptions',
              'SEO automation for collection pages',
              'Product & collection schema markup',
              'Automated insights about high-impact products',
            ]}
          />

          <FeatureBlock
            label="DEO & SEO Performance Monitoring"
            description="Track rankings, clicks, impressions, and site health in one place."
            whyItMatters="You can't improve what you don't measure. Performance monitoring connects your SEO efforts to real results — so you know what's working, what's not, and where to focus next."
            bullets={[
              'Rank tracking for key pages & keywords',
              'Google Search Console integration',
              'Analytics integration for traffic & conversions',
              'Site speed performance snapshots',
              'Crawl health and index coverage trends',
            ]}
          />

          <FeatureBlock
            label="Local Discovery & SEO"
            description="Help your local or multi-location business appear in the right searches."
            whyItMatters="If you have a physical location or serve specific regions, local SEO determines whether customers find you or your competitors. Optimizing for local search drives foot traffic and nearby buyers directly to your store."
            bullets={[
              'Google Business Profile insights',
              'Local keyword generation',
              'Templates for local landing pages',
              'Suggestions to improve review & rating visibility',
            ]}
          />

          <FeatureBlock
            label="Automations, Workflows & Social"
            description="Tie everything together with scheduled jobs, reporting, and social posting (planned)."
            whyItMatters="SEO isn't a one-time fix — it requires ongoing attention. Automations keep your SEO moving forward without constant manual effort, while reports keep stakeholders informed and aligned."
            bullets={[
              'Scheduled SEO scans and reports',
              'Weekly email summaries tailored to each project',
              'Task list for teams and agencies',
              'Planned: social auto-posting for new products to Facebook & Instagram',
              'Planned: AI DEO assistant chatbot for strategy questions',
            ]}
          />
        </div>
      </section>
    </div>
  );
}
