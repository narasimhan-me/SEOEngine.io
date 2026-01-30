/**
 * [EA-46: PRIORITY-SIGNALS-3] Priority Badge Component
 *
 * Displays priority level with confidence indicator.
 * Provides at-a-glance understanding of item prioritization.
 *
 * Trust Contract:
 * - Badge clearly shows both priority and confidence
 * - Visual indicators match semantic meaning
 * - No hidden information—what you see is what influences priority
 */

import React from 'react';
import {
  type PrioritySignal,
  type PriorityConfidence,
  PRIORITY_LEVEL_LABELS,
  CONFIDENCE_LABELS,
} from '@/lib/priority-signals';

interface PriorityBadgeProps {
  signal: PrioritySignal;
  /** Show compact version without confidence text */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Color mappings for priority levels.
 */
const PRIORITY_COLORS: Record<PrioritySignal['level'], string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

/**
 * Confidence indicator styles.
 */
const CONFIDENCE_STYLES: Record<PriorityConfidence, { dots: number; label: string }> = {
  high: { dots: 3, label: 'High confidence' },
  medium: { dots: 2, label: 'Moderate confidence' },
  low: { dots: 1, label: 'Limited data' },
};

/**
 * Renders confidence dots indicator.
 */
function ConfidenceDots({ confidence }: { confidence: PriorityConfidence }) {
  const { dots, label } = CONFIDENCE_STYLES[confidence];

  return (
    <span
      className="inline-flex items-center gap-0.5 ml-1.5"
      title={CONFIDENCE_LABELS[confidence]}
      aria-label={label}
    >
      {[1, 2, 3].map((dot) => (
        <span
          key={dot}
          className={`w-1.5 h-1.5 rounded-full ${
            dot <= dots ? 'bg-current opacity-80' : 'bg-current opacity-20'
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Priority badge with level and confidence indicator.
 * Shows priority at a glance with honest confidence framing.
 */
export function PriorityBadge({ signal, compact = false, className = '' }: PriorityBadgeProps) {
  const colorClasses = PRIORITY_COLORS[signal.level];
  const levelLabel = PRIORITY_LEVEL_LABELS[signal.level];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colorClasses} ${className}`}
      role="status"
      aria-label={`${levelLabel}, ${CONFIDENCE_LABELS[signal.confidence]}`}
    >
      <span>{compact ? signal.level.charAt(0).toUpperCase() : levelLabel}</span>
      <ConfidenceDots confidence={signal.confidence} />
    </span>
  );
}

export default PriorityBadge;
