'use client';

/**
 * [EA-44: AUTOMATION-SAFETY-RAILS-1] Safety Rail Blocked Panel
 *
 * Displays clear, actionable error messages when automation is blocked
 * by safety rails. Ensures users understand why automation was blocked
 * and what action to take.
 *
 * Trust Contract:
 * - Errors MUST explain why automation was blocked (no silent failures).
 *
 * Design System: v1.5
 * EIC Version: 1.5
 */

import { Icon } from '@/components/icons';
import type {
  SafetyRailBlockedError,
  SafetyRailBlockReason,
} from '@/lib/automation-safety-rails';
import {
  getSafetyRailBlockTitle,
  getSafetyRailBlockAction,
} from '@/lib/automation-safety-rails';

export interface SafetyRailBlockedPanelProps {
  /** The safety rail blocked error from the backend */
  error: SafetyRailBlockedError;
  /** Optional callback when user dismisses the panel */
  onDismiss?: () => void;
  /** Optional callback for the primary action (e.g., regenerate preview) */
  onAction?: () => void;
  /** Label for the primary action button */
  actionLabel?: string;
}

/**
 * Get the appropriate icon for a safety rail block reason.
 */
function getBlockIcon(reason: SafetyRailBlockReason): string {
  switch (reason) {
    case 'ENTITLEMENT_BLOCKED':
      return 'status.locked';
    case 'SCOPE_EXCEEDED':
      return 'status.warning';
    case 'INTENT_NOT_CONFIRMED':
      return 'status.info';
    case 'GUARD_CONDITION_FAILED':
      return 'status.warning';
    case 'RATE_LIMIT_EXCEEDED':
      return 'status.clock';
    case 'ROLE_PERMISSION_DENIED':
      return 'status.locked';
    default:
      return 'status.error';
  }
}

export function SafetyRailBlockedPanel({
  error,
  onDismiss,
  onAction,
  actionLabel,
}: SafetyRailBlockedPanelProps) {
  const title = getSafetyRailBlockTitle(error.reason);
  const suggestedAction = getSafetyRailBlockAction(error.reason);
  const iconName = getBlockIcon(error.reason);

  return (
    <div
      className="rounded-lg border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.05)] p-4"
      role="alert"
      aria-live="polite"
      data-testid="safety-rail-blocked-panel"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--destructive)/0.1)]">
          <Icon
            name={iconName as any}
            size={16}
            className="text-[hsl(var(--destructive))]"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="text-sm font-semibold text-foreground"
              data-testid="safety-rail-blocked-title"
            >
              {title}
            </h3>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss error"
                data-testid="safety-rail-blocked-dismiss"
              >
                <Icon name="nav.close" size={16} />
              </button>
            )}
          </div>

          <p
            className="mt-1 text-sm text-foreground"
            data-testid="safety-rail-blocked-message"
          >
            {error.message}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            {suggestedAction}
          </p>

          {/* Show failed checks for debugging */}
          {error.failedChecks.length > 1 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Show details ({error.failedChecks.length} checks failed)
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {error.failedChecks.map((check, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[hsl(var(--destructive))]">×</span>
                    <span>{check.message}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {onAction && actionLabel && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                data-testid="safety-rail-blocked-action"
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
