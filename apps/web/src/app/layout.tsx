import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SEOEngine.io - SEO on Autopilot',
  description: 'Automated SEO optimization for websites and Shopify stores',
  icons: {
    icon: '/logo/A_digital_vector_graphic_displays_the_logo_for_SEO.png',
    apple: '/logo/A_digital_vector_graphic_displays_the_logo_for_SEO.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
