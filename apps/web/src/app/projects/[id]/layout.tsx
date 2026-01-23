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
    <>
      {/* [CENTER-PANE-NAV-REMODEL-1] Removed max-width container + extra padding wrappers
          to align center pane with shell. Same functional behavior preserved. */}

      {/* [CENTER-PANE-NAV-REMODEL-1] Mobile trigger: low-emphasis, no extra mini header */}
      <div className="mb-2 flex items-center justify-end md:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <svg
            className="h-3.5 w-3.5"
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
          Sections
        </button>
      </div>

      {/* Desktop/tablet layout - hidden on mobile */}
      <div className="hidden gap-6 md:flex">
        <ProjectSideNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile content area - visible only on small screens */}
      <div className="md:hidden">
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* [CENTER-PANE-NAV-REMODEL-1] Mobile drawer: low-emphasis styling preserved */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 top-0 w-56 bg-[hsl(var(--surface-raised))] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header: demoted styling */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Sections
              </span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <svg
                  className="h-4 w-4"
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
            <div className="p-3">
              <ProjectSideNav onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
