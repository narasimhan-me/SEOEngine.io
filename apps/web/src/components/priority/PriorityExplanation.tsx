/**
 * [EA-46: PRIORITY-SIGNALS-4] Priority Explanation Component
 *
 * Displays transparent breakdown of factors contributing to priority.
 * Users can see exactly why something is prioritized without inspecting code.
 *
 * Trust Contract:
 * - All factors are visible and explained
 * - No hidden weighting logic
 * - Honest about confidence limitations
 */

import React from 'react';
import {
  type PrioritySignal,
  type PriorityFactor,
  IMPACT_CATEGORY_LABELS,
  CONFIDENCE_DESCRIPTIONS,
  getPriorityExplanation,
} from '@/lib/priority-signals';
import { PriorityBadge } from './PriorityBadge';

interface PriorityExplanationProps {
  signal: PrioritySignal;
  /** Show in expanded view with all details */
  expanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Weight indicator pill.
 */
function WeightPill({ weight }: { weight: PriorityFactor['weight'] }) {
  const styles: Record<PriorityFactor['weight'], string> = {
    high: 'bg-red-50 text-red-700',
    medium: 'bg-yellow-50 text-yellow-700',
    low: 'bg-gray-50 text-gray-600',
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${styles[weight]}`}>
      {weight} impact
    </span>
  );
}

/**
 * Single factor display with full transparency.
 */
function FactorItem({ factor }: { factor: PriorityFactor }) {
  return (
    <li className="py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">{factor.label}</span>
            <WeightPill weight={factor.weight} />
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{factor.explanation}</p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {IMPACT_CATEGORY_LABELS[factor.category]}
        </span>
      </div>
    </li>
  );
}

/**
 * Full priority explanation with transparent factor breakdown.
 * Shows users exactly why something is prioritized.
 */
export function PriorityExplanation({
  signal,
  expanded = false,
  className = ''
}: PriorityExplanationProps) {
  const [isExpanded, setIsExpanded] = React.useState(expanded);

  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      {/* Summary header */}
      <div className="p-3 flex items-start gap-3">
        <PriorityBadge signal={signal} />
        <div className="flex-1">
          <p className="text-sm text-gray-700">{signal.impactSummary}</p>
          <p className="text-xs text-gray-500 mt-1">
            {CONFIDENCE_DESCRIPTIONS[signal.confidence]}
          </p>
        </div>
      </div>

      {/* Expandable factors section */}
      {signal.factors.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50 border-t border-gray-100 flex items-center justify-between"
            aria-expanded={isExpanded}
          >
            <span>
              {isExpanded ? 'Hide' : 'Show'} contributing factors ({signal.factors.length})
            </span>
            <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
          </button>

          {isExpanded && (
            <div className="px-3 pb-3">
              <ul className="divide-y divide-gray-100">
                {signal.factors.map((factor, index) => (
                  <FactorItem key={`${factor.label}-${index}`} factor={factor} />
                ))}
              </ul>

              {/* Comparison context if available */}
              {signal.comparisonContext && (
                <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <strong>Why this ranking:</strong> {signal.comparisonContext}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PriorityExplanation;
