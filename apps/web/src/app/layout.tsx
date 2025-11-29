import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import TopNav from '@/components/layout/TopNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SEOEngine.io - SEO on Autopilot',
  description: 'Automated SEO optimization for websites and Shopify stores',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <TopNav />
          <main className="flex-1 bg-gray-50">{children}</main>
        </div>
      </body>
    </html>
  );
}
