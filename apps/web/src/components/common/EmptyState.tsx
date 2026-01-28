'use client';

/**
 * EA-25: EPIC 19 — EMPTY-STATE-CONTRACT-1
 *
 * Standardized EmptyState component with token-based styling.
 * Every empty state communicates three things:
 * 1. Why the state is empty
 * 2. That this is expected behavior
 * 3. What action the user can take next
 *
 * Features:
 * - 6 empty state categories (initial, filtered, not_analyzed, no_results, cleared, success)
 * - Token-based styling compatible with dark mode and Shopify iframe embedding
 * - Compact mode for inline/nested empty states
 * - Proper accessibility with semantic heading structure
 */

import { Icon, type IconManifestKey } from '@/components/icons';
import type { EmptyStateConfig, EmptyStateIcon } from '@/lib/empty-state-contract';

// Map empty state icons to semantic icon keys from manifest
const iconMapping: Record<EmptyStateIcon, IconManifestKey> = {
  'search': 'utility.search',
  'document': 'playbook.content',
  'folder': 'nav.projects',
  'check-circle': 'status.healthy',
  'inbox': 'nav.orders',
  'database': 'utility.schema',
  'package': 'nav.brand',
  'users': 'nav.admin',
  'settings': 'nav.settings',
  'chart': 'nav.analytics',
  'clock': 'workflow.history',
  'filter': 'utility.search',
  'sparkles': 'workflow.ai'
};

export interface EmptyStateProps extends EmptyStateConfig {
  className?: string;
}

export function EmptyState({
  category,
  icon,
  title,
  message,
  actionText,
  actionHref,
  onAction,
  compact = false,
  className = '',
}: EmptyStateProps) {
  const materialIcon = iconMapping[icon];

  // Compact mode for inline/nested empty states (e.g., within IssuesList pillar sections)
  if (compact) {
    return (
      <div
        className={`flex items-start gap-2 py-2 text-sm ${className}`}
        role="status"
        aria-live="polite"
        data-empty-state-category={category}
      >
        <Icon
          name={materialIcon}
          size={16}
          className="flex-shrink-0 text-muted-foreground mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-muted-foreground mt-0.5">{message}</p>
          {actionText && (actionHref || onAction) && (
            <div className="mt-1">
              {actionHref ? (
                <a
                  href={actionHref}
                  className="text-[hsl(var(--primary))] hover:underline font-medium"
                >
                  {actionText}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onAction}
                  className="text-[hsl(var(--primary))] hover:underline font-medium"
                >
                  {actionText}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full block version for prominent empty state display
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
      role="status"
      aria-live="polite"
      data-empty-state-category={category}
    >
      {/* Icon */}
      <div
        className="mb-4 rounded-full bg-[hsl(var(--muted))] p-4 text-muted-foreground"
        aria-hidden="true"
      >
        <Icon name={materialIcon} size={24} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>

      {/* Message */}
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        {message}
      </p>

      {/* Action */}
      {actionText && (actionHref || onAction) && (
        <div className="mt-2">
          {actionHref ? (
            <a
              href={actionHref}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--primary))] rounded-md hover:bg-[hsl(var(--primary)/0.9)] transition-colors"
            >
              {actionText}
            </a>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--primary))] rounded-md hover:bg-[hsl(var(--primary)/0.9)] transition-colors"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
