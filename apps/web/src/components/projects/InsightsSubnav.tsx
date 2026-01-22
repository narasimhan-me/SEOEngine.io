'use client';

import Link from 'next/link';

interface InsightsSubnavProps {
  projectId: string;
  activeTab:
    | 'overview'
    | 'deo-progress'
    | 'ai-efficiency'
    | 'issue-resolution'
    | 'opportunity-signals'
    | 'geo-insights';
}

/**
 * [INSIGHTS-1] Insights Subnav Component
 * [NAV-HIERARCHY-POLISH-1] Token-only styling - entity tabs as view switchers
 *
 * Secondary navigation for the insights dashboard pages.
 */
export function InsightsSubnav({ projectId, activeTab }: InsightsSubnavProps) {
  const tabs = [
    {
      id: 'overview',
      label: 'Summary',
      href: `/projects/${projectId}/insights`,
    },
    {
      id: 'deo-progress',
      label: 'DEO Progress',
      href: `/projects/${projectId}/insights/deo-progress`,
    },
    {
      id: 'ai-efficiency',
      label: 'AI Efficiency',
      href: `/projects/${projectId}/insights/ai-efficiency`,
    },
    {
      id: 'issue-resolution',
      label: 'Issue Resolution',
      href: `/projects/${projectId}/insights/issue-resolution`,
    },
    {
      id: 'opportunity-signals',
      label: 'Opportunities',
      href: `/projects/${projectId}/insights/opportunity-signals`,
    },
    {
      id: 'geo-insights',
      label: 'GEO Insights',
      href: `/projects/${projectId}/insights/geo-insights`,
    },
  ] as const;

  return (
    <nav className="border-b border-border" data-testid="insights-subnav">
      <div className="-mb-px flex space-x-6">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
