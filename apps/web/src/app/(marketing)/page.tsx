'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function MarketingHomePage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/projects');
    }
  }, [router]);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-blue-50/40 to-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:py-24 lg:px-8">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Discovery Engine Optimization (DEO) for modern brands
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              EngineO.ai — The Discovery Engine Optimization (DEO) Platform
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Optimize your brand for search engines and AI assistants using DEO — a unified framework combining SEO, AEO, PEO, and VEO. Track your DEO Score, manage entities, build answer-ready content, and improve multi-engine visibility.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Start free — no credit card
              </Link>
              <Link
                href="/features"
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                Learn how EngineO.ai works &rarr;
              </Link>
            </div>

            <dl className="mt-6 grid gap-4 text-xs text-slate-600 sm:grid-cols-2 sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-600">
                  🔍
                </span>
                <div>
                  <dt className="font-semibold text-slate-800">Instant discovery audit</dt>
                  <dd>Scan pages, products, and entities in a few clicks.</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-600">
                  🤖
                </span>
                <div>
                  <dt className="font-semibold text-slate-800">AI metadata &amp; answer content</dt>
                  <dd>Titles, descriptions, alt text, FAQs, and answer blocks generated for you.</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-600">
                  🛒
                </span>
                <div>
                  <dt className="font-semibold text-slate-800">Store &amp; product discovery</dt>
                  <dd>Sync, optimize, and push changes back to Shopify and your site.</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-600">
                  🚀
                </span>
                <div>
                  <dt className="font-semibold text-slate-800">Automated DEO improvements</dt>
                  <dd>Ongoing automations keep your discovery footprint improving.</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Right column: dashboard mock */}
          <div className="flex-1">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:max-w-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">DEO overview</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Live preview
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-[11px] font-medium text-blue-700">SEO health</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">82</p>
                  <p className="mt-1 text-[11px] text-blue-800">+17 in last 30 days</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-700">Products optimized</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">134</p>
                  <p className="mt-1 text-[11px] text-slate-500">of 500 total</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-700">Issues fixed</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">312</p>
                  <p className="mt-1 text-[11px] text-slate-500">titles, metas &amp; links</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Run full store audit</p>
                    <p className="text-[11px] text-slate-500">Scan products, pages &amp; blog posts.</p>
                  </div>
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Scan now
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Apply AI metadata</p>
                    <p className="text-[11px] text-slate-500">Approve &amp; publish AI titles in bulk.</p>
                  </div>
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                    Review
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-slate-500">
                Mock data shown. Real dashboards appear after connecting your store.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Built for modern eCommerce teams &amp; Shopify merchants
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-6">
            {['Shop brands', 'Agencies', 'DTC founders'].map((label) => (
              <div
                key={label}
                className="flex h-10 w-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-400"
              >
                {label}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Real customer logos &amp; stories coming soon — join as an early adopter.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            How EngineO.ai works
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            From connection to ongoing Discovery Engine Optimization in four simple steps.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              {
                title: 'Connect your site & store',
                desc: 'Connect Shopify and your main site in a few clicks. No theme edits required.',
                step: 'Step 1',
              },
              {
                title: 'Run a DEO discovery scan',
                desc: 'Pages, products, entities, and metadata are analyzed for search and AI visibility.',
                step: 'Step 2',
              },
              {
                title: 'Apply AI-powered fixes',
                desc: 'Generate and approve metadata, FAQs, schema, and answer-ready content in bulk.',
                step: 'Step 3',
              },
              {
                title: 'Monitor visibility & improve',
                desc: 'Track your DEO score and keep your discovery footprint improving over time.',
                step: 'Step 4',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-xs text-slate-600">{item.desc}</p>
                <span className="absolute right-4 top-4 text-xs font-semibold text-slate-300">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Who it&apos;s for
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Built for teams who need to stay discoverable across search engines and AI assistants, without the overhead.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-lg">
                🛍️
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Shopify Store Owners</h3>
              <p className="mt-2 text-xs text-slate-600">
                Running a DTC brand with 50–5,000 products? You know organic discovery matters across Google, marketplaces, and AI assistants — but you don&apos;t have time to master every channel. EngineO.ai handles the technical work so you can focus on growing your business.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-lg">
                🏢
              </div>
              <h3 className="text-sm font-semibold text-slate-900">SEO Agencies</h3>
              <p className="mt-2 text-xs text-slate-600">
                Managing organic growth for multiple clients? Scale your workflows with bulk DEO audits, AI metadata, and reporting. Spend less time on repetitive implementation and more on strategy and communication.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-lg">
                📈
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Growth Marketers</h3>
              <p className="mt-2 text-xs text-slate-600">
                Need to move fast without hiring a full SEO team? Get agency-level results with AI-powered Discovery Engine Optimization. No spreadsheets, no guesswork — just visibility you can measure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built for Shopify */}
      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Native Integration
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Built for Shopify and modern eCommerce
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                EngineO.ai connects directly to your Shopify store via OAuth — no theme edits, no code changes. Pull in your entire product catalog, generate optimized metadata and answer-ready content at scale, and push changes back with a single click.
              </p>

              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600">✓</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">One-click OAuth connection</p>
                    <p className="text-xs text-slate-600">No API keys, no manual setup. Connect in seconds.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600">✓</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Full product &amp; collection sync</p>
                    <p className="text-xs text-slate-600">Import products, variants, images, and collections automatically.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600">✓</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Push SEO changes to Shopify</p>
                    <p className="text-xs text-slate-600">Approve AI suggestions and apply them to your store instantly.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Shopify sync</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Connected
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📦</span>
                    <span className="text-xs font-medium text-slate-800">Products</span>
                  </div>
                  <span className="text-xs text-slate-600">1,247 synced</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📁</span>
                    <span className="text-xs font-medium text-slate-800">Collections</span>
                  </div>
                  <span className="text-xs text-slate-600">34 synced</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🖼️</span>
                    <span className="text-xs font-medium text-slate-800">Images</span>
                  </div>
                  <span className="text-xs text-slate-600">4,892 analyzed</span>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-slate-500">
                Mock data shown. Real sync stats appear after connecting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core features overview */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Everything you need to automate discovery — without a full team.
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                AI automation for technical SEO, product and content optimization, and DEO monitoring in one workspace.
              </p>
            </div>
            <Link
              href="/features"
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              View all features &rarr;
            </Link>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">AI DEO &amp; SEO Automation</h3>
              <p className="mt-2 text-xs text-slate-600">
                Detect issues, generate metadata and answer content, and apply fixes in bulk.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li>• Fix missing titles, meta descriptions &amp; H1s</li>
                <li>• Auto-generate alt tags &amp; optimize images</li>
                <li>• Detect broken links &amp; structure schema</li>
                <li>• Internal linking suggestions for key pages</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Shopify Product Optimization</h3>
              <p className="mt-2 text-xs text-slate-600">
                Sync products, optimize metadata, and push changes back to Shopify.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li>• Product &amp; variant sync</li>
                <li>• AI-written product titles &amp; descriptions</li>
                <li>• Collection page &amp; schema automation</li>
                <li>• Auto-apply approved SEO updates</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Content Intelligence + AI Writer</h3>
              <p className="mt-2 text-xs text-slate-600">
                Plan, write, and optimize content for search with your brand voice.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li>• Keyword research &amp; clustering</li>
                <li>• AI blog &amp; landing page generation</li>
                <li>• Product description enhancer</li>
                <li>• Brand tone &amp; style learning</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Performance &amp; Monitoring</h3>
              <p className="mt-2 text-xs text-slate-600">
                Track rankings, traffic, and SEO health in one place.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li>• SEO health score &amp; issue trends</li>
                <li>• Rank tracking &amp; Search Console integration</li>
                <li>• Crawl health &amp; speed insights</li>
                <li>• Weekly email reports &amp; summaries</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by / Social proof */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Trusted by modern eCommerce brands
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Join the brands and agencies using EngineO.ai to stay visible across search engines and AI assistants.
          </p>

          {/* Placeholder logos */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {['Brand A', 'Brand B', 'Brand C', 'Brand D', 'Your brand here'].map((label) => (
              <div
                key={label}
                className="flex h-12 w-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-xs font-medium text-slate-400"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Testimonial cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <figure className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5">
              <blockquote className="text-sm text-slate-700">
                &ldquo;EngineO.ai saves us hours every week on product and content optimization. The AI suggestions are spot-on and the Shopify sync just works.&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Name Placeholder</p>
                  <p className="text-[11px] text-slate-500">Founder, DTC Brand</p>
                </div>
              </figcaption>
            </figure>

            <figure className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5">
              <blockquote className="text-sm text-slate-700">
                &ldquo;We manage 15 stores and EngineO.ai lets us handle discovery and metadata at scale. It&apos;s a game changer for our agency.&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Name Placeholder</p>
                  <p className="text-[11px] text-slate-500">SEO Lead, Agency</p>
                </div>
              </figcaption>
            </figure>

            <figure className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5">
              <blockquote className="text-sm text-slate-700">
                &ldquo;Finally, a DEO platform that understands eCommerce. The automated audits catch issues we&apos;d never find manually.&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Name Placeholder</p>
                  <p className="text-[11px] text-slate-500">Growth Marketer, SaaS</p>
                </div>
              </figcaption>
            </figure>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-500">
            Real testimonials coming soon — join as an early adopter and share your story.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-500">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center text-white sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to put your discovery on autopilot?
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Connect your site and store, run your first DEO audit, and generate AI metadata and answer content in minutes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
            >
              Start free today
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-blue-100 hover:text-white"
            >
              View pricing &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
