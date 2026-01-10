import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'EngineO.ai — Discovery Engine Optimization (DEO)',
    template: '%s | EngineO.ai',
  },
  description:
    'EngineO.ai helps you optimize your presence across search engines and AI assistants using DEO: SEO + AEO + PEO + VEO.',
  openGraph: {
    title: 'EngineO.ai — Discovery Engine Optimization (DEO)',
    description:
      'EngineO.ai helps you optimize your presence across search engines and AI assistants using DEO: SEO + AEO + PEO + VEO.',
    url: '/',
    siteName: 'EngineO.ai',
    type: 'website',
    images: [
      {
        url: '/branding/engineo/logo-light.png',
        width: 1200,
        height: 630,
        alt: 'EngineO.ai — Discovery Engine Optimization (DEO)',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EngineO.ai — Discovery Engine Optimization (DEO)',
    description:
      'EngineO.ai helps you optimize your presence across search engines and AI assistants using DEO: SEO + AEO + PEO + VEO.',
    images: ['/branding/engineo/logo-light.png'],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'EngineO.ai',
  url: 'https://engineo.ai',
  logo: 'https://engineo.ai/branding/engineo/logo-light.png',
  sameAs: [],
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
