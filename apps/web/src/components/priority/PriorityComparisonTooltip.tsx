/**
 * [EA-46: PRIORITY-SIGNALS-5] Priority Comparison Tooltip
 *
 * Explains why one item is ranked higher than another.
 * Provides clear, transparent comparison context.
 *
 * Trust Contract:
 * - Comparisons are based on visible factors only
 * - No hidden ranking logic
 * - Users can verify rankings match stated factors
 */

import React from 'react';
import {
  type PrioritySignal,
  PRIORITY_LEVEL_LABELS,
  CONFIDENCE_LABELS,
} from '@/lib/priority-signals';

interface PriorityComparisonTooltipProps {
  /** The higher priority item's signal */
  higherSignal: PrioritySignal;
  /** The lower priority item's signal */
  lowerSignal: PrioritySignal;
  /** Labels for the items being compared */
  higherLabel: string;
  lowerLabel: string;
  /** Children to wrap with tooltip trigger */
  children: React.ReactNode;
}

/**
 * Generate comparison explanation text.
 */
function generateComparisonText(
  higherSignal: PrioritySignal,
  lowerSignal: PrioritySignal,
  higherLabel: string,
  lowerLabel: string
): string {
  const higherFactorCount = higherSignal.factors.filter(f => f.weight === 'high').length;
  const lowerFactorCount = lowerSignal.factors.filter(f => f.weight === 'high').length;

  const reasons: string[] = [];

  // Compare priority levels
  if (higherSignal.level !== lowerSignal.level) {
    reasons.push(
      `"${higherLabel}" is ${PRIORITY_LEVEL_LABELS[higherSignal.level].toLowerCase()}, ` +
      `while "${lowerLabel}" is ${PRIORITY_LEVEL_LABELS[lowerSignal.level].toLowerCase()}`
    );
  }

  // Compare high-impact factors
  if (higherFactorCount > lowerFactorCount) {
    reasons.push(
      `"${higherLabel}" has ${higherFactorCount} high-impact factor${higherFactorCount > 1 ? 's' : ''}, ` +
      `compared to ${lowerFactorCount} for "${lowerLabel}"`
    );
  }

  // Include comparison context if available
  if (higherSignal.comparisonContext) {
    reasons.push(higherSignal.comparisonContext);
  }

  if (reasons.length === 0) {
    return `Both items have similar priority factors. "${higherLabel}" is listed first based on its specific impact context.`;
  }

  return reasons.join('. ') + '.';
}

/**
 * Tooltip showing why one item ranks higher than another.
 */
export function PriorityComparisonTooltip({
  higherSignal,
  lowerSignal,
  higherLabel,
  lowerLabel,
  children,
}: PriorityComparisonTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  const comparisonText = generateComparisonText(
    higherSignal,
    lowerSignal,
    higherLabel,
    lowerLabel
  );

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>

      {isVisible && (
        <div
          role="tooltip"
          className="absolute z-50 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg -top-2 left-full ml-2"
        >
          <div className="font-medium mb-1">Why this ranking?</div>
          <p className="text-gray-300 text-xs leading-relaxed">{comparisonText}</p>

          {/* Confidence disclaimer */}
          <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
            Ranking confidence: {CONFIDENCE_LABELS[higherSignal.confidence]}
          </div>

          {/* Arrow */}
          <div className="absolute top-3 -left-1 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  );
}

export default PriorityComparisonTooltip;
