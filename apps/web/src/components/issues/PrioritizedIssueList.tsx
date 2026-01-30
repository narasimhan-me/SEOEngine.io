/**
 * [EA-46: PRIORITY-SIGNALS-9] Prioritized Issue List
 *
 * Displays issues in priority order with transparent ranking explanations.
 * Users can understand relative priority between any two items.
 *
 * Trust Contract:
 * - List order matches visible priority signals
 * - Users can compare any two items and understand ranking
 * - No hidden sorting logic
 */

import React from 'react';
import { IssueCard } from './IssueCard';
import { PriorityComparisonTooltip } from '@/components/priority';
import { getPrioritizedIssueSignals } from '@/lib/issue-priority-mapping';
import { PRIORITY_LEVEL_LABELS, CONFIDENCE_LABELS } from '@/lib/priority-signals';

export interface IssueItem {
  /** Issue type key */
  issueKey: string;
  /** Display title */
  title: string;
  /** Affected count */
  affectedCount: number;
  /** Asset type */
  assetType?: string;
}

interface PrioritizedIssueListProps {
  /** Issues to display (will be sorted by priority) */
  issues: IssueItem[];
  /** Handler when an issue is clicked */
  onIssueClick?: (issueKey: string) => void;
  /** Show comparison tooltips between adjacent items */
  showComparisons?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Prioritized issue list with transparent ranking.
 */
export function PrioritizedIssueList({
  issues,
  onIssueClick,
  showComparisons = true,
  className = '',
}: PrioritizedIssueListProps) {
  // Get prioritized signals for all issues
  const prioritizedSignals = getPrioritizedIssueSignals(issues.map(i => i.issueKey));

  // Create lookup for issue data
  const issueDataMap = new Map(issues.map(i => [i.issueKey, i]));

  // Build sorted list with signals
  const sortedIssues = prioritizedSignals.map(({ issueKey, signal }) => ({
    ...issueDataMap.get(issueKey)!,
    signal,
  }));

  if (sortedIssues.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        No issues to display
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Priority legend */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Priority Ranking
        </div>
        <p className="text-sm text-gray-600">
          Issues are ranked by impact factors visible on each card.
          Click the info icon on any issue to see why it has its priority.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          {(['critical', 'high', 'medium', 'low'] as const).map(level => (
            <span key={level} className="text-xs text-gray-500">
              {PRIORITY_LEVEL_LABELS[level]}
            </span>
          ))}
        </div>
      </div>

      {/* Issue list */}
      <div className="space-y-3">
        {sortedIssues.map((issue, index) => {
          const prevIssue = index > 0 ? sortedIssues[index - 1] : null;
          const card = (
            <IssueCard
              key={issue.issueKey}
              issueKey={issue.issueKey}
              title={issue.title}
              affectedCount={issue.affectedCount}
              assetType={issue.assetType}
              onClick={() => onIssueClick?.(issue.issueKey)}
            />
          );

          // Wrap with comparison tooltip if there's a previous item and comparisons enabled
          if (showComparisons && prevIssue && prevIssue.signal.level !== issue.signal.level) {
            return (
              <div key={issue.issueKey} className="relative">
                {/* Comparison indicator */}
                <PriorityComparisonTooltip
                  higherSignal={prevIssue.signal}
                  lowerSignal={issue.signal}
                  higherLabel={prevIssue.title}
                  lowerLabel={issue.title}
                >
                  <div className="absolute -top-1.5 left-4 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full cursor-help">
                    ↑ ranked higher because...
                  </div>
                </PriorityComparisonTooltip>
                {card}
              </div>
            );
          }

          return card;
        })}
      </div>

      {/* Transparency note */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        All priority factors are visible. No hidden weighting logic is applied.
      </div>
    </div>
  );
}

export default PrioritizedIssueList;
