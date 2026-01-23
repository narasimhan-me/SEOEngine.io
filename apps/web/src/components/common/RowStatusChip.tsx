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

// [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only chip styles
const chipStyles: Record<RowChipLabel, string> = {
  '✅ Optimized':
    'border-border bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]',
  '⚠ Needs attention':
    'border-border bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]',
  '🟡 Draft saved (not applied)':
    'border-border bg-[hsl(var(--info-background))] text-[hsl(var(--info-foreground))]',
  '⛔ Blocked':
    'border-border bg-[hsl(var(--danger-background))] text-[hsl(var(--danger-foreground))]',
};

export function RowStatusChip({ chipLabel }: RowStatusChipProps) {
  // [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only fallback
  const styles =
    chipStyles[chipLabel] || 'border-border bg-muted text-muted-foreground';

  return (
    <span
      data-testid="row-status-chip"
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles}`}
    >
      {chipLabel}
    </span>
  );
}
