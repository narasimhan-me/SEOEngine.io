'use client';

/**
 * [ERROR-&-BLOCKED-STATE-UX-1] Blocked State Explanation Component
 *
 * Renders inline explanation of WHY an action is blocked with clear next step guidance.
 * Designed to be placed below or beside blocked controls, not hidden in tooltips.
 *
 * Accessibility:
 * - Uses role="alert" for important messages
 * - Includes aria-live="polite" for dynamic updates
 * - Clear visual distinction from error states
 *
 * Design System: v1.5
 * Trust Contract: Users always understand why something is blocked and what to do next.
 */

import { Icon, type IconManifestKey } from '@/components/icons';

export type BlockerCategory = 'approval_required' | 'permission' | 'system';

export interface BlockedStateExplanationProps {
  /** Human-readable explanation of WHY blocked (required) */
  reason: string;
  /** Clear next step the user can take (required) */
  nextStep: string;
  /** Category for visual styling and screen reader context */
  category?: BlockerCategory;
  /** Optional action link/button */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Compact mode for inline use within list rows */
  compact?: boolean;
}

// Category-specific styling and icons
const categoryConfig: Record<
  BlockerCategory,
  { icon: IconManifestKey; bgClass: string; borderClass: string; textClass: string }
> = {
  approval_required: {
    icon: 'workflow.pending',
    bgClass: 'bg-[hsl(var(--warning-background))]',
    borderClass: 'border-[hsl(var(--warning-foreground)/0.2)]',
    textClass: 'text-[hsl(var(--warning-foreground))]',
  },
  permission: {
    icon: 'status.blocked',
    bgClass: 'bg-[hsl(var(--danger-background))]',
    borderClass: 'border-[hsl(var(--danger-foreground)/0.2)]',
    textClass: 'text-[hsl(var(--danger-foreground))]',
  },
  system: {
    icon: 'status.info',
    bgClass: 'bg-[hsl(var(--info-background))]',
    borderClass: 'border-[hsl(var(--info-foreground)/0.2)]',
    textClass: 'text-[hsl(var(--info-foreground))]',
  },
};

export function BlockedStateExplanation({
  reason,
  nextStep,
  category = 'permission',
  action,
  compact = false,
}: BlockedStateExplanationProps) {
  const config = categoryConfig[category];

  if (compact) {
    // Compact inline version for list rows
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs ${config.textClass}`}
        role="status"
        aria-live="polite"
      >
        <Icon name={config.icon} size={14} aria-hidden="true" />
        <span>{reason}</span>
        {action && (
          <>
            <span className="text-muted-foreground">·</span>
            {action.href ? (
              <a
                href={action.href}
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                {action.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                {action.label}
              </button>
            )}
          </>
        )}
      </span>
    );
  }

  // Full block version for prominent display
  return (
    <div
      className={`rounded-lg border ${config.borderClass} ${config.bgClass} p-3`}
      role="alert"
      aria-live="polite"
      data-testid="blocked-state-explanation"
    >
      <div className="flex items-start gap-3">
        <Icon
          name={config.icon}
          size={20}
          className={`flex-shrink-0 ${config.textClass}`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          {/* Why blocked */}
          <p className={`text-sm font-medium ${config.textClass}`}>{reason}</p>
          {/* Next step */}
          <p className="mt-1 text-sm text-muted-foreground">{nextStep}</p>
          {/* Action */}
          {action && (
            <div className="mt-2">
              {action.href ? (
                <a
                  href={action.href}
                  className={`inline-flex items-center text-sm font-medium ${config.textClass} hover:underline`}
                >
                  {action.label}
                  <Icon name="nav.external" size={14} className="ml-1" aria-hidden="true" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={action.onClick}
                  className={`inline-flex items-center text-sm font-medium ${config.textClass} hover:underline`}
                >
                  {action.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
