/**
 * [EA-39] Maturity Signals Panel
 *
 * Read-only visibility into governance concepts and stability signals.
 * Reassures advanced users without intimidating SMB users.
 *
 * Trust Contract:
 * - Strictly read-only — no configuration, no editing
 * - Signals are informational only, no actions required
 * - SMB-friendly presentation with progressive disclosure
 */

import { Icon } from '@/components/icons';

export interface MaturitySignal {
  id: string;
  label: string;
  status: 'active' | 'available' | 'coming_soon';
  description: string;
  category: 'governance' | 'stability' | 'reliability';
}

export interface MaturitySignalsPanelProps {
  signals: MaturitySignal[];
  className?: string;
  /** Optional: show expanded details for advanced users */
  showDetails?: boolean;
}

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    iconName: 'status.healthy' as const,
    className: 'text-green-600 bg-green-50 border-green-200',
    iconClassName: 'text-green-600',
  },
  available: {
    label: 'Available',
    iconName: 'nav.brand' as const,
    className: 'text-blue-600 bg-blue-50 border-blue-200',
    iconClassName: 'text-blue-600',
  },
  coming_soon: {
    label: 'Coming Soon',
    iconName: 'workflow.history' as const,
    className: 'text-gray-500 bg-gray-50 border-gray-200',
    iconClassName: 'text-gray-400',
  },
} as const;

const CATEGORY_CONFIG = {
  governance: {
    label: 'Governance',
    iconName: 'nav.brand' as const,
    description: 'Access control and approval workflows',
  },
  stability: {
    label: 'Stability',
    iconName: 'nav.analytics' as const,
    description: 'Platform reliability indicators',
  },
  reliability: {
    label: 'Reliability',
    iconName: 'status.healthy' as const,
    description: 'Data integrity and consistency',
  },
} as const;

function SignalBadge({ status }: { status: MaturitySignal['status'] }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${config.className}`}
    >
      <Icon name={config.iconName} size={16} className={config.iconClassName} />
      {config.label}
    </span>
  );
}

function SignalCard({
  signal,
  showDetails,
}: {
  signal: MaturitySignal;
  showDetails?: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between p-3 bg-white border border-gray-200 rounded-lg"
      data-testid={`maturity-signal-${signal.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">
            {signal.label}
          </span>
          <SignalBadge status={signal.status} />
        </div>
        {showDetails && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
            {signal.description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Read-only panel displaying platform maturity and governance signals.
 * Designed to be non-intimidating for SMB users while providing
 * reassurance to enterprise-leaning users.
 */
export function MaturitySignalsPanel({
  signals,
  className = '',
  showDetails = false,
}: MaturitySignalsPanelProps) {
  // Group signals by category
  const groupedSignals = signals.reduce(
    (acc, signal) => {
      if (!acc[signal.category]) {
        acc[signal.category] = [];
      }
      acc[signal.category].push(signal);
      return acc;
    },
    {} as Record<MaturitySignal['category'], MaturitySignal[]>
  );

  const categories = Object.keys(groupedSignals) as MaturitySignal['category'][];

  if (signals.length === 0) {
    return null;
  }

  return (
    <div
      className={`space-y-4 ${className}`}
      data-testid="maturity-signals-panel"
    >
      {/* Header with info tooltip */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Platform Capabilities
        </h3>
        <div className="group relative">
          <span className="text-gray-400 cursor-help" title="Platform capabilities info">ℹ️</span>
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
            These signals indicate platform maturity and available governance
            features. All information is read-only.
          </div>
        </div>
      </div>

      {/* Signal groups by category */}
      <div className="space-y-4">
        {categories.map((category) => {
          const config = CATEGORY_CONFIG[category];
          const categorySignals = groupedSignals[category];

          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Icon name={config.iconName} size={16} />
                <span className="font-medium">{config.label}</span>
              </div>
              <div className="space-y-2">
                {categorySignals.map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    showDetails={showDetails}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Non-intimidating footer for SMB users */}
      <p className="text-xs text-gray-400 italic">
        These capabilities work automatically — no setup required.
      </p>
    </div>
  );
}

/**
 * Default maturity signals for EngineO.ai platform.
 * These represent current platform capabilities.
 */
export const DEFAULT_MATURITY_SIGNALS: MaturitySignal[] = [
  {
    id: 'role-based-access',
    label: 'Role-Based Access',
    status: 'active',
    category: 'governance',
    description: 'Owner, Editor, and Viewer roles with defined permissions',
  },
  {
    id: 'approval-workflows',
    label: 'Approval Workflows',
    status: 'active',
    category: 'governance',
    description: 'Request and approve changes before applying to Shopify',
  },
  {
    id: 'audit-logging',
    label: 'Audit Logging',
    status: 'active',
    category: 'governance',
    description: 'Track approvals, applies, and share link activity',
  },
  {
    id: 'draft-versioning',
    label: 'Draft Versioning',
    status: 'active',
    category: 'reliability',
    description: 'All changes saved as drafts before applying',
  },
  {
    id: 'secure-share-links',
    label: 'Secure Share Links',
    status: 'active',
    category: 'governance',
    description: 'Time-limited, passcode-protected external sharing',
  },
  {
    id: 'platform-uptime',
    label: '99.9% Uptime Target',
    status: 'active',
    category: 'stability',
    description: 'Designed for high availability and reliability',
  },
];
