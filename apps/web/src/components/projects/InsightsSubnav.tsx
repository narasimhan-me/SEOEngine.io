'use client';

import Link from 'next/link';

interface InsightsSubnavProps {
  projectId: string;
  activeTab: 'overview' | 'deo-progress' | 'ai-efficiency' | 'issue-resolution' | 'opportunity-signals' | 'geo-insights';
}

/**
 * [INSIGHTS-1] Insights Subnav Component
 *
 * Secondary navigation for the insights dashboard pages.
 */
export function InsightsSubnav({ projectId, activeTab }: InsightsSubnavProps) {
  const tabs = [
    { id: 'overview', label: 'Summary', href: `/projects/${projectId}/insights` },
    { id: 'deo-progress', label: 'DEO Progress', href: `/projects/${projectId}/insights/deo-progress` },
    { id: 'ai-efficiency', label: 'AI Efficiency', href: `/projects/${projectId}/insights/ai-efficiency` },
    { id: 'issue-resolution', label: 'Issue Resolution', href: `/projects/${projectId}/insights/issue-resolution` },
    { id: 'opportunity-signals', label: 'Opportunities', href: `/projects/${projectId}/insights/opportunity-signals` },
    { id: 'geo-insights', label: 'GEO Insights', href: `/projects/${projectId}/insights/geo-insights` },
  ] as const;

  return (
    <nav className="border-b border-gray-200">
      <div className="-mb-px flex space-x-6">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
