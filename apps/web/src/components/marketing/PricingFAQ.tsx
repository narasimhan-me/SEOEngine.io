interface FaqItemProps {
  q: string;
  a: string;
}

function FaqItem({ q, a }: FaqItemProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{q}</h3>
      <p className="mt-2 text-sm text-slate-600">{a}</p>
    </div>
  );
}

export function PricingFAQ() {
  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Frequently asked questions
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Have more questions about plans, billing, or usage? Here are answers to the most common
          ones.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <FaqItem
            q="How does the free plan work?"
            a="You can connect one project, crawl up to 100 pages, and use a limited number of AI suggestions. Upgrade to Pro or Business when you need more projects, pages, or automation."
          />
          <FaqItem
            q="Will this affect my Shopify theme or site code?"
            a="EngineO.ai focuses on metadata, structured data, entities, and other search- and AI-facing fields. It does not rewrite your theme or site code without your approval."
          />
          <FaqItem
            q="Do I need a developer to use this?"
            a="No. EngineO.ai is built for marketers, founders, and growth teams. Developers can help with advanced workflows and integrations, but they are not required to get value."
          />
          <FaqItem
            q="What is an AI suggestion or AI usage?"
            a="AI suggestions cover titles, descriptions, FAQs, and other metadata or content recommendations. Higher plans include more usage so you can optimize more of your catalog and content."
          />
          <FaqItem
            q="Can I cancel or change plans anytime?"
            a="Yes. You can downgrade or cancel your subscription at any time from within the app. Your account will remain active until the end of your current billing period."
          />
          <FaqItem
            q="Do you offer discounts for agencies or annual billing?"
            a="Yes. Agencies and annual plans receive preferred pricing. Contact us to discuss your use case, client volume, and the best fit between Pro, Business, and custom plans."
          />
        </div>
      </div>
    </section>
  );
}
