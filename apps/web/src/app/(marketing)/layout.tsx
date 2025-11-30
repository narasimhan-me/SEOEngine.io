import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'SEOEngine.io — AI-Powered SEO for Shopify & eCommerce',
    template: '%s | SEOEngine.io',
  },
  description:
    'SEOEngine.io scans your store, fixes technical issues, writes metadata, optimizes products, and tracks performance — so you can focus on growth, not spreadsheets.',
  openGraph: {
    title: 'SEOEngine.io — AI-Powered SEO for Shopify & eCommerce',
    description:
      'SEOEngine.io scans your store, fixes technical issues, writes metadata, optimizes products, and tracks performance — so you can focus on growth, not spreadsheets.',
    url: '/',
    siteName: 'SEOEngine.io',
    type: 'website',
    images: [
      {
        url: '/logo/A_digital_vector_graphic_displays_the_logo_for_SEO.png',
        width: 1200,
        height: 630,
        alt: 'SEOEngine.io — AI SEO for Shopify',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEOEngine.io — AI-Powered SEO for Shopify & eCommerce',
    description:
      'SEOEngine.io scans your store, fixes technical issues, writes metadata, optimizes products, and tracks performance — so you can focus on growth, not spreadsheets.',
    images: ['/logo/A_digital_vector_graphic_displays_the_logo_for_SEO.png'],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SEOEngine.io',
  url: 'https://seoengine.io',
  logo: 'https://seoengine.io/logo/SEOEngine_logo.png',
  sameAs: [],
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
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
