/**
 * [EA-39] Governance Readiness Card
 *
 * Read-only card component that surfaces governance maturity signals
 * in a non-intimidating way. Designed for settings pages or dashboards.
 *
 * Trust Contract:
 * - Strictly read-only — no configuration options
 * - Reassures advanced users about platform capabilities
 * - Simple enough for SMB users to understand at a glance
 */

import { Icon } from '@/components/icons';
import {
  MaturitySignalsPanel,
  DEFAULT_MATURITY_SIGNALS,
  type MaturitySignal,
} from './MaturitySignalsPanel';
import {
  StabilityIndicator,
  useStabilityStatus,
} from './StabilityIndicator';

export interface GovernanceReadinessCardProps {
  className?: string;
  /** Signals to display (defaults to platform signals) */
  signals?: MaturitySignal[];
  /** Show expanded details */
  expanded?: boolean;
  /** Optional link to governance page */
  governancePageHref?: string;
}

/**
 * Summary stats for quick readiness overview
 */
function ReadinessSummary({ signals }: { signals: MaturitySignal[] }) {
  const activeCount = signals.filter((s) => s.status === 'active').length;
  const totalCount = signals.length;

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
          <Icon name="nav.brand" size={20} className="text-green-600" />
        </div>
        <div>
          <div className="font-semibold text-gray-900">
            {activeCount} of {totalCount}
          </div>
          <div className="text-xs text-gray-500">capabilities active</div>
        </div>
      </div>
      <div className="h-8 w-px bg-gray-200" />
      <StabilityIndicator status={useStabilityStatus()} compact showLabel />
    </div>
  );
}

/**
 * Read-only card displaying governance readiness and platform maturity.
 * Suitable for embedding in settings pages or dashboards.
 */
export function GovernanceReadinessCard({
  className = '',
  signals = DEFAULT_MATURITY_SIGNALS,
  expanded = false,
  governancePageHref,
}: GovernanceReadinessCardProps) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}
      data-testid="governance-readiness-card"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="nav.brand" size={16} className="text-gray-500" />
            Governance & Reliability
          </h3>
          {governancePageHref && (
            <a
              href={governancePageHref}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View details →
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Quick summary */}
        <ReadinessSummary signals={signals} />

        {/* Detailed signals (when expanded) */}
        {expanded && (
          <div className="pt-4 border-t border-gray-100">
            <MaturitySignalsPanel signals={signals} showDetails />
          </div>
        )}

        {/* Collapsed hint */}
        {!expanded && (
          <p className="text-xs text-gray-500">
            Your project benefits from enterprise-grade governance features
            with zero configuration required.
          </p>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          Read-only overview — no action required
        </p>
      </div>
    </div>
  );
}
