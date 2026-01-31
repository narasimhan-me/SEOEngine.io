/**
 * [EA-46: PRIORITY-SIGNALS-11] Dashboard Priority Section
 *
 * Dashboard widget showing top priority items with transparent impact framing.
 * Integrates with existing dashboard signals to add priority context.
 *
 * Trust Contract:
 * - Shows why items are prioritized at dashboard level
 * - Confidence levels are honestly represented
 * - Users can drill into full priority explanations
 */

import React from 'react';
import { PriorityBadge, PriorityExplanation } from '@/components/priority';
import { getIssuePrioritySignal } from '@/lib/issue-priority-mapping';
import { CONFIDENCE_DESCRIPTIONS } from '@/lib/priority-signals';

interface DashboardIssue {
  issueKey: string;
  title: string;
  affectedCount: number;
  assetType?: string;
}

interface DashboardPrioritySectionProps {
  /** Top issues to display */
  issues: DashboardIssue[];
  /** Maximum items to show */
  maxItems?: number;
  /** Handler for "View All" click */
  onViewAll?: () => void;
  /** Handler for individual issue click */
  onIssueClick?: (issueKey: string) => void;
}

/**
 * Dashboard section showing prioritized items with impact context.
 */
export function DashboardPrioritySection({
  issues,
  maxItems = 5,
  onViewAll,
  onIssueClick,
}: DashboardPrioritySectionProps) {
  const [expandedIssue, setExpandedIssue] = React.useState<string | null>(null);

  // Get priority signals and sort
  const prioritizedIssues = issues
    .map(issue => ({
      ...issue,
      signal: getIssuePrioritySignal(issue.issueKey),
    }))
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.signal.level] - order[b.signal.level];
    })
    .slice(0, maxItems);

  if (prioritizedIssues.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Priority Issues</h2>
        <p className="text-gray-500">No priority issues detected. Great job!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Priority Issues</h2>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all →
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Ranked by impact factors. Click any issue to see why it&apos;s prioritized.
        </p>
      </div>

      {/* Priority items */}
      <div className="divide-y divide-gray-100">
        {prioritizedIssues.map((issue, index) => (
          <div key={issue.issueKey} className="p-4">
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => onIssueClick?.(issue.issueKey)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onIssueClick?.(issue.issueKey)}
            >
              {/* Rank indicator */}
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{issue.title}</span>
                  <PriorityBadge signal={issue.signal} compact />
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>{issue.affectedCount} {issue.assetType ?? 'items'}</span>
                  <span>•</span>
                  <span>{CONFIDENCE_DESCRIPTIONS[issue.signal.confidence]}</span>
                </div>
              </div>

              {/* Expand button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedIssue(expandedIssue === issue.issueKey ? null : issue.issueKey);
                }}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Show priority details"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={expandedIssue === issue.issueKey
                      ? "M5 15l7-7 7 7"
                      : "M19 9l-7 7-7-7"
                    }
                  />
                </svg>
              </button>
            </div>

            {/* Expanded priority explanation */}
            {expandedIssue === issue.issueKey && (
              <div className="mt-3 ml-9">
                <PriorityExplanation signal={issue.signal} expanded />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-4 py-3 bg-gray-50 rounded-b-xl text-xs text-gray-500 text-center">
        Priority rankings are based on visible impact factors. No hidden logic is applied.
      </div>
    </div>
  );
}

export default DashboardPrioritySection;
