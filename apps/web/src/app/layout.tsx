import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { UnsavedChangesProvider } from '@/components/unsaved-changes/UnsavedChangesProvider';
import { FeedbackProvider } from '@/components/feedback/FeedbackProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EngineO.ai – Discovery Engine Optimization (DEO) Platform',
  description:
    'EngineO.ai is the Discovery Engine Optimization (DEO) platform that unifies SEO, AEO, PEO, and VEO to optimize your brand for search engines and AI assistants.',
  icons: {
    icon: '/branding/engineo/logo-light.png',
    apple: '/branding/engineo/logo-light.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-TZ2ZEJ4YRH"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-TZ2ZEJ4YRH');
          `}
        </Script>
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <UnsavedChangesProvider>
          <FeedbackProvider>{children}</FeedbackProvider>
        </UnsavedChangesProvider>
      </body>
    </html>
  );
}
