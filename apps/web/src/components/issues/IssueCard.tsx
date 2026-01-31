/**
 * [EA-46: PRIORITY-SIGNALS-8] Issue Card with Priority Signals
 *
 * Displays an issue with transparent priority information.
 * Users can see at a glance why something is prioritized.
 *
 * Trust Contract:
 * - Priority badge always visible on issue cards
 * - Expanding shows full factor breakdown
 * - No hidden information influencing display order
 */

import React from 'react';
import { PriorityBadge, PriorityExplanation } from '@/components/priority';
import { getIssuePrioritySignal } from '@/lib/issue-priority-mapping';
import { CONTEXTUAL_EDUCATION } from '@/lib/education/contextualEducation';
import type { PriorityFactor } from '@/lib/priority-signals';

export interface IssueCardProps {
  /** Issue type key (e.g., 'missing_seo_title') */
  issueKey: string;
  /** Display title for the issue */
  title: string;
  /** Number of affected items */
  affectedCount: number;
  /** Asset type context (e.g., 'products', 'pages') */
  assetType?: string;
  /** Optional additional priority factors based on context */
  additionalFactors?: PriorityFactor[];
  /** Click handler for the card */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Issue card component with integrated priority signals.
 */
export function IssueCard({
  issueKey,
  title,
  affectedCount,
  assetType,
  additionalFactors,
  onClick,
  className = '',
}: IssueCardProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  // Get priority signal with any additional context factors
  const prioritySignal = getIssuePrioritySignal(issueKey, additionalFactors);

  // Get educational content if available
  const education = CONTEXTUAL_EDUCATION[issueKey];

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ${className}`}
    >
      {/* Main card content - clickable */}
      <div
        className="p-4 cursor-pointer"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <PriorityBadge signal={prioritySignal} />
              <span className="text-xs text-gray-500">
                {affectedCount} {assetType ?? 'items'} affected
              </span>
            </div>
            <h3 className="font-medium text-gray-900 truncate">{title}</h3>
            {education && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {education.whyItMatters}
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label={showDetails ? 'Hide priority details' : 'Show priority details'}
            aria-expanded={showDetails}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable priority explanation */}
      {showDetails && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Why This Priority?
          </div>
          <PriorityExplanation signal={prioritySignal} expanded />
        </div>
      )}
    </div>
  );
}

export default IssueCard;
