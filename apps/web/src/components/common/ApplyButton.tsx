'use client';

/**
 * [APPLY-ACTION-GOVERNANCE-1] Apply Button with Governance States
 *
 * Renders an Apply action with one of three explicit states:
 * - CAN_APPLY: Enabled, ready to apply
 * - CANNOT_APPLY: Disabled with inline explanation
 * - IN_PROGRESS: Loading state with spinner
 *
 * Trust Contract: Users always see why Apply is blocked and what to do next.
 */

import { useMemo } from 'react';
import {
  deriveApplyGovernance,
  type ApplyGovernanceSignals,
  type ApplyGovernanceResult,
} from '@/lib/apply-governance';
import {
  BlockedStateExplanation,
  type BlockerCategory,
} from '@/components/common/BlockedStateExplanation';
import { SAFETY_BOUNDARIES } from '@/lib/governance-narrative';

interface ApplyButtonProps {
  /** Governance signals for state derivation */
  signals: ApplyGovernanceSignals;
  /** Click handler when Apply is enabled */
  onApply: () => void;
  /** Optional: Save draft handler for unsaved draft CTA */
  onSaveDraft?: () => void;
  /** Button label (default: "Apply to Shopify") */
  label?: string;
  /** Apply target for accessibility (default: "Shopify") */
  target?: string;
  /** Test ID for E2E testing */
  testId?: string;
  /** Whether to show inline explanation (default: true) */
  showInlineExplanation?: boolean;
  /** Compact mode for inline explanation */
  compactExplanation?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Spinner icon for in-progress state.
 */
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

/**
 * Upload/Apply icon.
 */
function ApplyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

/**
 * Maps ApplyBlockerCategory to BlockedStateExplanation category.
 */
function mapToBlockerCategory(
  category: string | undefined
): BlockerCategory {
  switch (category) {
    case 'permission':
      return 'permission';
    case 'approval_required':
      return 'approval_required';
    case 'draft':
    case 'system':
    default:
      return 'system';
  }
}

export function ApplyButton({
  signals,
  onApply,
  onSaveDraft,
  label = 'Apply to Shopify',
  target = 'Shopify',
  testId = 'apply-button',
  showInlineExplanation = true,
  compactExplanation = false,
  className = '',
}: ApplyButtonProps) {
  // Derive governance state
  const governance: ApplyGovernanceResult = useMemo(
    () => deriveApplyGovernance(signals),
    [signals]
  );

  const isDisabled =
    governance.state === 'CANNOT_APPLY' || governance.state === 'IN_PROGRESS';
  const isInProgress = governance.state === 'IN_PROGRESS';

  // Build action for blocked state explanation
  const blockedAction = useMemo(() => {
    if (!governance.action) return undefined;

    // If action is "Save draft" and we have onSaveDraft, wire it up
    if (governance.action.label === 'Save draft' && onSaveDraft) {
      return {
        label: governance.action.label,
        onClick: onSaveDraft,
      };
    }

    return governance.action;
  }, [governance.action, onSaveDraft]);

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid={`${testId}-container`}
    >
      {/* Inline explanation for blocked state - shown ABOVE button for visibility */}
      {showInlineExplanation &&
        governance.state === 'CANNOT_APPLY' &&
        governance.reason &&
        governance.nextStep && (
          <BlockedStateExplanation
            reason={governance.reason}
            nextStep={governance.nextStep}
            category={mapToBlockerCategory(governance.blockerCategory)}
            action={blockedAction}
            compact={compactExplanation}
          />
        )}

      {/* Apply button */}
      <button
        type="button"
        data-testid={testId}
        data-apply-state={governance.state}
        onClick={onApply}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isInProgress}
        aria-label={
          isInProgress
            ? `Applying to ${target}...`
            : isDisabled
              ? `Cannot apply to ${target}: ${governance.reason || 'action not available'}`
              : `Apply to ${target}`
        }
        title={
          governance.state === 'CAN_APPLY'
            ? `Apply saved draft to ${target}. Does not auto-save or use AI.`
            : governance.reason || undefined
        }
        className={`inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          governance.state === 'CAN_APPLY'
            ? 'bg-[hsl(var(--success))] text-[hsl(var(--primary-foreground))] hover:opacity-90 focus-visible:ring-[hsl(var(--success))]'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        }`}
      >
        {isInProgress ? (
          <>
            <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
            Applying...
          </>
        ) : (
          <>
            <ApplyIcon className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </button>

      {/* [KAN-90: EA-52] Safety boundary reminder */}
      {governance.state === 'CAN_APPLY' && (
        <p className="text-[10px] text-muted-foreground/60 text-center">
          {SAFETY_BOUNDARIES.GUARANTEES.NO_AUTO_APPLY.description.split('.')[0]}.
        </p>
      )}
    </div>
  );
}

/**
 * Hook to get Apply governance state for external use (e.g., RCP integration).
 */
export function useApplyGovernance(
  signals: ApplyGovernanceSignals
): ApplyGovernanceResult {
  return useMemo(() => deriveApplyGovernance(signals), [signals]);
}
