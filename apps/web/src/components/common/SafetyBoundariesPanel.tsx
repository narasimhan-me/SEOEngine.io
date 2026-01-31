'use client';

/**
 * [KAN-90: EA-52] Safety Boundaries Panel
 *
 * Displays EngineO.ai's safety boundaries in a clear, calm, and discoverable way.
 * Can be embedded in Help pages, settings, or shown inline on key surfaces.
 *
 * Trust Contract:
 * - Explains what the system will never do automatically
 * - Uses calm, confident tone (not legal, not defensive)
 * - Consistent across all surfaces where it appears
 */

import {
  SAFETY_BOUNDARIES,
  getSafetyGuarantees,
} from '@/lib/governance-narrative';

interface SafetyBoundariesPanelProps {
  /** Display mode: 'full' shows all details, 'compact' shows summary only */
  mode?: 'full' | 'compact';
  /** Optional custom className */
  className?: string;
  /** Whether to show the header */
  showHeader?: boolean;
}

/**
 * Icon for safety guarantee items.
 */
function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

export function SafetyBoundariesPanel({
  mode = 'full',
  className = '',
  showHeader = true,
}: SafetyBoundariesPanelProps) {
  const guarantees = getSafetyGuarantees();

  if (mode === 'compact') {
    return (
      <div
        className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}
        data-testid="safety-boundaries-compact"
      >
        <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-green-600" />
        <span>{SAFETY_BOUNDARIES.SUMMARY}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-border bg-card overflow-hidden ${className}`}
      data-testid="safety-boundaries-panel"
    >
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-semibold text-foreground">
              {SAFETY_BOUNDARIES.TITLE}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {SAFETY_BOUNDARIES.SUBTITLE}
          </p>
        </div>
      )}

      {/* Core guarantees */}
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          {guarantees.map((guarantee) => (
            <div
              key={guarantee.label}
              className="flex items-start gap-3 p-3 rounded-md bg-green-50/50 border border-green-100"
            >
              <span className="text-green-600 flex-shrink-0 mt-0.5 text-sm">✓</span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {guarantee.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {guarantee.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* What requires approval */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Always requires your approval
          </h4>
          <ul className="space-y-1.5">
            {SAFETY_BOUNDARIES.ALWAYS_REQUIRES_APPROVAL.map((item) => (
              <li
                key={item}
                className="text-xs text-muted-foreground flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* What AI can and cannot do */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            AI boundaries
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2 rounded bg-muted/30">
              <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">
                AI can
              </p>
              <p className="text-xs text-foreground">
                {SAFETY_BOUNDARIES.AI_BOUNDARIES.AI_CAN}
              </p>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">
                AI cannot
              </p>
              <p className="text-xs text-foreground">
                {SAFETY_BOUNDARIES.AI_BOUNDARIES.AI_CANNOT}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-center text-muted-foreground font-medium">
            {SAFETY_BOUNDARIES.SUMMARY}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline safety note for embedding in other components.
 * Shows a single-line summary with link to full explanation.
 */
export function SafetyBoundariesInlineNote({
  className = '',
  linkHref = '/settings/help#safety-boundaries',
}: {
  className?: string;
  linkHref?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 text-xs text-muted-foreground ${className}`}
      data-testid="safety-boundaries-inline"
    >
      <div className="flex items-center gap-1.5">
        <ShieldCheckIcon className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
        <span>{SAFETY_BOUNDARIES.SUMMARY}</span>
      </div>
      <a
        href={linkHref}
        className="text-primary hover:underline flex-shrink-0"
      >
        {SAFETY_BOUNDARIES.LEARN_MORE}
      </a>
    </div>
  );
}

export default SafetyBoundariesPanel;
