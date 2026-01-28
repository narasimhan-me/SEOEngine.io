'use client';

/**
 * [APPLY-ACTION-GOVERNANCE-1] Context Panel Product Details
 *
 * Renders product details in the Right Context Panel with Apply governance state.
 * Echoes the current Apply governance state accurately for transparency.
 */

import { useMemo } from 'react';
import type { ContextDescriptor } from '@/components/right-context-panel/RightContextPanelProvider';
import { Icon } from '@/components/icons';
import {
  APPLY_GOVERNANCE_METADATA_KEYS,
  APPLY_STATE_LABELS,
  type ApplyGovernanceState,
} from '@/lib/apply-governance';

interface ContextPanelProductDetailsProps {
  descriptor: ContextDescriptor;
}

/**
 * Get styling for Apply governance state badge.
 */
function getApplyStateBadgeStyles(state: ApplyGovernanceState): string {
  switch (state) {
    case 'CAN_APPLY':
      return 'bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))] border-[hsl(var(--success-foreground)/0.2)]';
    case 'CANNOT_APPLY':
      return 'bg-[hsl(var(--danger-background))] text-[hsl(var(--danger-foreground))] border-[hsl(var(--danger-foreground)/0.2)]';
    case 'IN_PROGRESS':
      return 'bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))] border-[hsl(var(--warning-foreground)/0.2)]';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function ContextPanelProductDetails({
  descriptor,
}: ContextPanelProductDetailsProps) {
  const metadata = descriptor.metadata || {};

  // Extract Apply governance state from metadata
  const applyState = metadata[
    APPLY_GOVERNANCE_METADATA_KEYS.state
  ] as ApplyGovernanceState | undefined;
  const applyReason = metadata[APPLY_GOVERNANCE_METADATA_KEYS.reason];
  const applyNextStep = metadata[APPLY_GOVERNANCE_METADATA_KEYS.nextStep];
  const applyCategory = metadata[APPLY_GOVERNANCE_METADATA_KEYS.category];

  // Build display sections
  const displaySections = useMemo(() => {
    const sections: Array<{ label: string; value: string; emphasis?: boolean }> = [];

    // Draft state
    if (metadata.draftState) {
      sections.push({
        label: 'Draft Status',
        value: metadata.draftState,
      });
    }

    // Last applied
    if (metadata.lastAppliedAt) {
      sections.push({
        label: 'Last Applied',
        value: new Date(metadata.lastAppliedAt).toLocaleString(),
      });
    }

    // Product status
    if (metadata.status) {
      sections.push({
        label: 'Status',
        value: metadata.status,
      });
    }

    // Issue count
    if (metadata.issueCount) {
      sections.push({
        label: 'DEO Issues',
        value: metadata.issueCount,
        emphasis: parseInt(metadata.issueCount, 10) > 0,
      });
    }

    return sections;
  }, [metadata]);

  return (
    <div className="space-y-4" data-testid="context-panel-product-details">
      {/* Apply Governance State Section */}
      {applyState && (
        <div
          className="rounded-lg border border-border p-3"
          data-testid="rcp-apply-governance"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Apply Status
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getApplyStateBadgeStyles(applyState)}`}
              data-testid="rcp-apply-state-badge"
              data-apply-state={applyState}
            >
              {applyState === 'IN_PROGRESS' && (
                <svg
                  className="mr-1 h-3 w-3 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {APPLY_STATE_LABELS[applyState]}
            </span>
          </div>

          {/* Blocked reason and next step */}
          {applyState === 'CANNOT_APPLY' && applyReason && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-[hsl(var(--danger-foreground))]">
                <Icon
                  name={
                    applyCategory === 'permission'
                      ? 'status.blocked'
                      : applyCategory === 'approval_required'
                        ? 'status.warning'
                        : 'utility.visibility'
                  }
                  size={12}
                  className="mr-1 inline-block"
                  aria-hidden="true"
                />
                {applyReason}
              </p>
              {applyNextStep && (
                <p className="text-xs text-muted-foreground">{applyNextStep}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* General metadata sections */}
      {displaySections.length > 0 && (
        <div className="space-y-2">
          {displaySections.map((section, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="text-muted-foreground">{section.label}</span>
              <span
                className={
                  section.emphasis
                    ? 'font-medium text-[hsl(var(--danger-foreground))]'
                    : 'text-foreground'
                }
              >
                {section.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Link to full page */}
      {descriptor.openHref && (
        <a
          href={descriptor.openHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {descriptor.openHrefLabel || 'Open full page'}
          <Icon name="navigation.chevronRight" size={12} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
