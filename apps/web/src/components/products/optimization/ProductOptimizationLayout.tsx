import type { ReactNode } from 'react';

interface ProductOptimizationLayoutProps {
  overview: ReactNode;
  center: ReactNode;
  insights: ReactNode;
}

export function ProductOptimizationLayout({
  overview,
  center,
  insights,
}: ProductOptimizationLayoutProps) {
  return (
    <div className="py-4">
      {/* Mobile: vertical stack */}
      {/* Desktop: 3-panel grid layout */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,260px)] lg:gap-6">
        {/* Left panel - Overview */}
        <div className="min-w-0 overflow-hidden lg:sticky lg:top-4 lg:self-start">
          {overview}
        </div>

        {/* Center panel - Main content (scrolls) */}
        <div className="min-w-0 overflow-hidden">{center}</div>

        {/* Right panel - Insights */}
        <div className="min-w-0 overflow-hidden lg:sticky lg:top-4 lg:self-start">
          {insights}
        </div>
      </div>
    </div>
  );
}
