'use client';

import { useState } from 'react';
import ProjectSideNav from '@/components/layout/ProjectSideNav';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Mobile top bar - visible only on small screens */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <span className="text-sm font-medium text-foreground">Project navigation</span>
        <button
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
        >
          <svg
            className="mr-1.5 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          Menu
        </button>
      </div>

      {/* Desktop/tablet layout - hidden on mobile */}
      <div className="hidden gap-8 md:flex">
        <ProjectSideNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile content area - visible only on small screens */}
      <div className="md:hidden">
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile drawer overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 top-0 w-64 bg-background border-r border-border/10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-border/10 px-4 py-3">
              <span className="text-sm font-semibold text-foreground">Navigation</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {/* Drawer content */}
            <div className="p-4">
              <ProjectSideNav onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
