import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Suspense } from 'react';
import './globals.css';
import { UnsavedChangesProvider } from '@/components/unsaved-changes/UnsavedChangesProvider';
import { FeedbackProvider } from '@/components/feedback/FeedbackProvider';
import { ShopifyEmbeddedShell } from '@/components/shopify/ShopifyEmbeddedShell';

// Shopify API key for App Bridge (exposed to browser for embedded context)
const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          [DARK-MODE-SYSTEM-1] Theme initialization script - runs before paint to prevent FOUC.
          Reads localStorage preference (light|dark|system), applies dark class if needed.
          Theme init does not access window.top (no cross-origin concerns).

          [SHOPIFY-EMBEDDED-CONTRAST-PASS-1] Also sets data-shopify-embedded="1" when embedded.
          [REVIEW-3] Stored host only counts when in iframe.
          [REVIEW-4] Embedded detection uses guarded window.top access (try/catch).
          Embedded detection: embedded=1 OR host param OR (isInIframe AND stored host exists).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('engineo_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var shouldBeDark = theme === 'dark' || ((!theme || theme === 'system') && prefersDark);
                  if (shouldBeDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}

                // [SHOPIFY-EMBEDDED-CONTRAST-PASS-1] Embedded detection
                // [REVIEW-3] Stored host only counts when actually in iframe (prevents leakage to standalone)
                try {
                  var params = new URLSearchParams(window.location.search);
                  var hasEmbeddedParam = params.get('embedded') === '1';
                  var hasHostParam = params.has('host');

                  // [REVIEW-4] Guarded window.top access; if it throws (cross-origin), treat as iframe
                  var isInIframe = false;
                  try { isInIframe = window.self !== window.top; } catch (e) { isInIframe = true; }

                  var hasStoredHost = false;
                  try { hasStoredHost = !!sessionStorage.getItem('shopify_host'); } catch (e) {}

                  // Stored host only enables embedded mode when actually in iframe
                  var isEmbedded = hasEmbeddedParam || hasHostParam || (isInIframe && hasStoredHost);
                  if (isEmbedded) {
                    document.documentElement.dataset.shopifyEmbedded = '1';
                  } else {
                    delete document.documentElement.dataset.shopifyEmbedded;
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* [SHOPIFY-EMBEDDED-SHELL-1] App Bridge v4 CDN script + meta tag */}
        {SHOPIFY_API_KEY && (
          <>
            <meta name="shopify-api-key" content={SHOPIFY_API_KEY} />
            <Script
              src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
              strategy="beforeInteractive"
            />
          </>
        )}
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
          <FeedbackProvider>
            {/* [SHOPIFY-EMBEDDED-SHELL-1] Wrap in ShopifyEmbeddedShell for embedded context detection */}
            {/* [REVIEW-2] Never-blank Suspense fallback with visible loading indicator */}
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <svg
                      className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <p className="text-gray-600">Loading EngineO.ai…</p>
                  </div>
                </div>
              }
            >
              <ShopifyEmbeddedShell>{children}</ShopifyEmbeddedShell>
            </Suspense>
          </FeedbackProvider>
        </UnsavedChangesProvider>
      </body>
    </html>
  );
}
