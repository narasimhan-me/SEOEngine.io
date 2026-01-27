'use client';

import type { RowChipLabel } from '@/lib/list-actions-clarity';
// [ICONS-LOCAL-LIBRARY-1] Import Icon component for status icons
import { Icon, type IconManifestKey } from '@/components/icons';

/**
 * [LIST-ACTIONS-CLARITY-1] Shared row status chip component
 *
 * Renders a compact, calm chip with consistent styling across
 * Products, Pages, and Collections lists.
 *
 * LOCKED CHIP LABELS:
 * - ✅ Optimized (green) → check_circle icon
 * - ⚠ Needs attention (yellow) → warning icon
 * - 🟡 Draft saved (not applied) (blue) → history icon
 * - ⛔ Blocked (red) → block icon
 *
 * [ICONS-LOCAL-LIBRARY-1] Now uses Icon component with semantic keys.
 * Emoji prefixes are stripped from display, replaced by decorative icons.
 */

export interface RowStatusChipProps {
  chipLabel: RowChipLabel;
  /**
   * [ERROR-&-BLOCKED-STATE-UX-1] Human-readable explanation of WHY blocked.
   * Displayed as inline text when chip is Blocked, with tooltip for truncation.
   */
  blockedReason?: string;
  /**
   * [ERROR-&-BLOCKED-STATE-UX-1] Clear next step the user can take.
   * Included in accessible description for screen readers.
   */
  nextStep?: string;
  /**
   * [ERROR-&-BLOCKED-STATE-UX-1] Blocker category for visual cues.
   */
  blockerCategory?: 'approval_required' | 'permission' | 'system';
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

// [ICONS-LOCAL-LIBRARY-1] Map chip labels to semantic icon keys
const chipIcons: Record<RowChipLabel, IconManifestKey> = {
  '✅ Optimized': 'status.healthy',
  '⚠ Needs attention': 'status.warning',
  '🟡 Draft saved (not applied)': 'workflow.history',
  '⛔ Blocked': 'status.blocked',
};

// [ICONS-LOCAL-LIBRARY-1] Strip emoji prefix from chip label for display
function getCleanLabel(chipLabel: RowChipLabel): string {
  // Remove leading emoji + space (pattern: emoji followed by space)
  return chipLabel.replace(/^[✅⚠🟡⛔]\s*/u, '');
}

export function RowStatusChip({
  chipLabel,
  blockedReason,
  nextStep,
  blockerCategory,
}: RowStatusChipProps) {
  // [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only fallback
  const styles =
    chipStyles[chipLabel] || 'border-border bg-muted text-muted-foreground';
  // [ICONS-LOCAL-LIBRARY-1] Get icon key and clean label
  const iconKey = chipIcons[chipLabel];
  const cleanLabel = getCleanLabel(chipLabel);

  // [ERROR-&-BLOCKED-STATE-UX-1] Build accessible description for blocked states
  const isBlocked = chipLabel === '⛔ Blocked';
  const accessibleDescription =
    isBlocked && blockedReason
      ? `${blockedReason}${nextStep ? ` ${nextStep}` : ''}`
      : undefined;

  // [ERROR-&-BLOCKED-STATE-UX-1] Blocker category icon suffix for visual distinction
  const blockerCategoryIcon =
    isBlocked && blockerCategory === 'approval_required'
      ? ' (awaiting approval)'
      : isBlocked && blockerCategory === 'permission'
        ? ' (contact owner)'
        : '';

  return (
    <span
      data-testid="row-status-chip"
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles}`}
      // [ERROR-&-BLOCKED-STATE-UX-1] Accessibility: title for mouse users, aria-label for screen readers
      title={isBlocked && blockedReason ? `${blockedReason}${nextStep ? ` ${nextStep}` : ''}` : undefined}
      aria-label={accessibleDescription ? `${cleanLabel}: ${accessibleDescription}` : undefined}
      role={isBlocked ? 'status' : undefined}
    >
      {/* [ICONS-LOCAL-LIBRARY-1] Decorative icon (no aria-label, aria-hidden) */}
      {iconKey && <Icon name={iconKey} size={16} />}
      {cleanLabel}
      {blockerCategoryIcon && (
        <span className="sr-only">{blockerCategoryIcon}</span>
      )}
    </span>
  );
}
