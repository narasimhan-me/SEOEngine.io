import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — SEOEngine.io',
  description:
    'Get in touch with the SEOEngine.io team for support, partnerships, or enterprise plans.',
};

export default function ContactPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            We&apos;re here to help.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-slate-600">
            For support, partnerships, or enterprise plans, drop us a message.
            We read every request and usually respond in under 24 hours.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            {/* Form */}
            <form className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-medium uppercase tracking-wide text-slate-700"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium uppercase tracking-wide text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="block text-xs font-medium uppercase tracking-wide text-slate-700"
                >
                  Company
                </label>
                <input
                  id="company"
                  name="company"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Store or agency name"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-xs font-medium uppercase tracking-wide text-slate-700"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Tell us about your store, your goals, or how we can help."
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Send message
              </button>

              <p className="text-xs text-slate-500">
                This form is not wired up yet in production. You can integrate
                it with an API route, email service, or help desk when ready.
              </p>
            </form>

            {/* Right column info */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
              <h2 className="text-sm font-semibold text-slate-900">Contact details</h2>
              <p>
                <span className="font-medium text-slate-900">Support</span>
                <br />
                <a
                  href="mailto:support@seoengine.io"
                  className="text-blue-700 hover:text-blue-800"
                >
                  support@seoengine.io
                </a>
                <br />
                Typical response: under 24 hours.
              </p>

              <p>
                <span className="font-medium text-slate-900">Partnerships</span>
                <br />
                For agencies, platforms, and integration partners, use the form
                or reach out via email and mention your use case.
              </p>

              <p>
                <span className="font-medium text-slate-900">Roadmap</span>
                <br />
                Early adopters get direct input into our roadmap across Shopify,
                content, automation, and reporting features.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
