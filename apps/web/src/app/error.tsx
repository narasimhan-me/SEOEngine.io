'use client';

import { Inter } from 'next/font/google';
import FriendlyError from '@/components/ui/FriendlyError';

const inter = Inter({ subsets: ['latin'] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Global error:', error);

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <FriendlyError
            title="Something went wrong"
            message="Please try again. If the problem persists, contact support."
            onRetry={reset}
          />
        </div>
      </body>
    </html>
  );
}
