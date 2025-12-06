interface WebsitesFaqItemProps {
  q: string;
  a: string;
}

function WebsitesFaqItem({ q, a }: WebsitesFaqItemProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{q}</h3>
      <p className="mt-2 text-sm text-slate-600">{a}</p>
    </div>
  );
}

export function WebsitesFAQ() {
  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Frequently asked questions
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Common questions about how EngineO.ai works with WordPress, Webflow, and other website
          platforms.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <WebsitesFaqItem
            q="Do I need a plugin for WordPress or Webflow?"
            a="No — EngineO.ai crawls your public site directly. You do not need to install plugins or scripts to get DEO insights."
          />
          <WebsitesFaqItem
            q="Can it optimize blog metadata?"
            a="Yes — blog posts are first-class in the Content Workspace. EngineO.ai analyzes titles, descriptions, headings, and more."
          />
          <WebsitesFaqItem
            q="Does it rewrite my actual page content?"
            a="No — it generates recommendations. You stay in control and decide what to publish."
          />
          <WebsitesFaqItem
            q="How often does it crawl my site?"
            a="Depending on your plan, EngineO.ai can crawl your site daily, weekly, or on a custom schedule."
          />
        </div>
      </div>
    </section>
  );
}
