import type { Metadata } from 'next';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact — EngineO.ai DEO Platform',
  description:
    'Get in touch with the EngineO.ai team for support, partnerships, or enterprise plans related to Discovery Engine Optimization (DEO: SEO + AEO + PEO + VEO).',
};

export default function ContactPage() {
  return (
    <div className="bg-background">
      <section className="border-b border-border bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            We&apos;re here to help.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            For support, partnerships, or enterprise plans, drop us a message.
            We read every request and usually respond in under 24 hours.
          </p>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            {/* Form */}
            <ContactForm />

            {/* Right column info */}
            <div className="space-y-4 rounded-2xl border border-border bg-muted p-6 text-sm text-muted-foreground">
              <h2 className="text-sm font-semibold text-foreground">Contact details</h2>
              <p>
                <span className="font-medium text-foreground">Support</span>
                <br />
                <a
                  href="mailto:support@engineo.ai"
                  className="text-blue-700 hover:text-blue-800"
                >
                  support@engineo.ai
                </a>
                <br />
                Typical response: under 24 hours.
              </p>

              <p>
                <span className="font-medium text-foreground">Partnerships</span>
                <br />
                For agencies, platforms, and integration partners, use the form
                or reach out via email and mention your use case.
              </p>

              <p>
                <span className="font-medium text-foreground">Roadmap</span>
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
