'use client';

import type { RowChipLabel } from '@/lib/list-actions-clarity';

/**
 * [LIST-ACTIONS-CLARITY-1] Shared row status chip component
 *
 * Renders a compact, calm chip with consistent styling across
 * Products, Pages, and Collections lists.
 *
 * LOCKED CHIP LABELS:
 * - ✅ Optimized (green)
 * - ⚠ Needs attention (yellow)
 * - 🟡 Draft saved (not applied) (blue)
 * - ⛔ Blocked (red)
 */

export interface RowStatusChipProps {
  chipLabel: RowChipLabel;
}

const chipStyles: Record<RowChipLabel, string> = {
  '✅ Optimized': 'bg-green-50 text-green-700 border-green-200',
  '⚠ Needs attention': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  '🟡 Draft saved (not applied)': 'bg-blue-50 text-blue-700 border-blue-200',
  '⛔ Blocked': 'bg-red-50 text-red-700 border-red-200',
};

export function RowStatusChip({ chipLabel }: RowStatusChipProps) {
  const styles =
    chipStyles[chipLabel] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <span
      data-testid="row-status-chip"
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles}`}
    >
      {chipLabel}
    </span>
  );
}
