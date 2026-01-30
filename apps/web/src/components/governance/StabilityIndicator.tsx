/**
 * [EA-39] Stability Indicator Component
 *
 * Read-only visual indicator for platform stability and reliability.
 * Provides at-a-glance system health without requiring user action.
 *
 * Trust Contract:
 * - Strictly informational — no configuration or actions
 * - Simple visual that doesn't intimidate SMB users
 * - Honest representation of platform status
 */

import { cn } from '@/lib/utils';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';

export type StabilityStatus = 'operational' | 'degraded' | 'maintenance';

export interface StabilityIndicatorProps {
  status: StabilityStatus;
  className?: string;
  /** Show label text next to indicator */
  showLabel?: boolean;
  /** Compact mode for inline use */
  compact?: boolean;
}

const STATUS_CONFIG = {
  operational: {
    label: 'All Systems Operational',
    shortLabel: 'Operational',
    icon: CheckCircle2,
    dotClassName: 'bg-green-500',
    textClassName: 'text-green-700',
    bgClassName: 'bg-green-50',
    borderClassName: 'border-green-200',
  },
  degraded: {
    label: 'Some Systems Degraded',
    shortLabel: 'Degraded',
    icon: AlertCircle,
    dotClassName: 'bg-yellow-500',
    textClassName: 'text-yellow-700',
    bgClassName: 'bg-yellow-50',
    borderClassName: 'border-yellow-200',
  },
  maintenance: {
    label: 'Scheduled Maintenance',
    shortLabel: 'Maintenance',
    icon: Activity,
    dotClassName: 'bg-blue-500',
    textClassName: 'text-blue-700',
    bgClassName: 'bg-blue-50',
    borderClassName: 'border-blue-200',
  },
} as const;

/**
 * Animated pulse dot for operational status
 */
function PulseDot({ className }: { className: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={cn(
          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
          className
        )}
      />
      <span
        className={cn(
          'relative inline-flex rounded-full h-2.5 w-2.5',
          className
        )}
      />
    </span>
  );
}

/**
 * Read-only stability indicator showing platform health status.
 */
export function StabilityIndicator({
  status,
  className,
  showLabel = true,
  compact = false,
}: StabilityIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={cn('inline-flex items-center gap-1.5', className)}
        data-testid="stability-indicator"
        data-status={status}
        title={config.label}
      >
        <PulseDot className={config.dotClassName} />
        {showLabel && (
          <span className={cn('text-xs font-medium', config.textClassName)}>
            {config.shortLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border',
        config.bgClassName,
        config.borderClassName,
        className
      )}
      data-testid="stability-indicator"
      data-status={status}
    >
      <PulseDot className={config.dotClassName} />
      {showLabel && (
        <span className={cn('text-sm font-medium', config.textClassName)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

/**
 * Hook to get current stability status.
 * In production, this would fetch from a status endpoint.
 * For now, returns operational as the default.
 */
export function useStabilityStatus(): StabilityStatus {
  // Future: fetch from /api/status or similar endpoint
  // For now, always return operational
  return 'operational';
}
