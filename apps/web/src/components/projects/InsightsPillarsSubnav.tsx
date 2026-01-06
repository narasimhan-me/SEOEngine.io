'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

/**
 * [NAV-IA-CONSISTENCY-1] Pillar sub-navigation for Insights section.
 *
 * Displays tabs for each pillar under Insights:
 * - DEO
 * - Search & Intent
 * - Competitors
 * - Off-site Signals
 * - Local Discovery
 * - Technical
 */

interface PillarTab {
  label: string;
  path: string;
}

const pillarTabs: PillarTab[] = [
  { label: 'DEO', path: 'deo' },
  { label: 'Search & Intent', path: 'keywords' },
  { label: 'Competitors', path: 'competitors' },
  { label: 'Off-site Signals', path: 'backlinks' },
  { label: 'Local Discovery', path: 'local' },
  { label: 'Technical', path: 'performance' },
];

export default function InsightsPillarsSubnav() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;

  const isActive = (path: string) => {
    const fullPath = `/projects/${projectId}/${path}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  return (
    <nav className="border-b border-border mb-6" data-testid="insights-pillars-subnav">
      <div className="flex space-x-1 overflow-x-auto">
        {pillarTabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <Link
              key={tab.path}
              href={`/projects/${projectId}/${tab.path}`}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
