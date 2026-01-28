/**
 * [APPLY-ACTION-GOVERNANCE-1] Apply Governance Types and State Derivation
 *
 * Provides explicit governance for Apply actions with three states:
 * - CAN_APPLY: User can apply changes now
 * - CANNOT_APPLY: User cannot apply (with specific reason)
 * - IN_PROGRESS: Apply is currently executing
 *
 * Trust Contract: Users always understand Apply state and what to do next.
 */

import type { RoleCapabilities } from '@/lib/api';
import type { DraftLifecycleState } from '@/lib/issues/draftLifecycleState';

/**
 * Explicit Apply governance states.
 */
export type ApplyGovernanceState = 'CAN_APPLY' | 'CANNOT_APPLY' | 'IN_PROGRESS';

/**
 * Categories for why Apply is blocked.
 * Maps to BlockedStateExplanation category for visual styling.
 */
export type ApplyBlockerCategory = 'permission' | 'draft' | 'approval_required' | 'system';

/**
 * Detailed Apply governance result with explanation.
 */
export interface ApplyGovernanceResult {
  /** Current governance state */
  state: ApplyGovernanceState;
  /** Why Apply is blocked (only when state === 'CANNOT_APPLY') */
  blockerCategory?: ApplyBlockerCategory;
  /** Human-readable reason for blocked state */
  reason?: string;
  /** Clear next step the user can take */
  nextStep?: string;
  /** Optional action for resolution */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

/**
 * Signals used to derive Apply governance state.
 */
export interface ApplyGovernanceSignals {
  /** Current draft lifecycle state */
  draftState: DraftLifecycleState | 'unsaved' | 'saved' | 'applied';
  /** User's role capabilities */
  roleCapabilities: RoleCapabilities;
  /** Whether approval is required by governance policy */
  requireApprovalForApply?: boolean;
  /** Whether an approved approval exists */
  hasApproval?: boolean;
  /** Whether Apply is currently in progress */
  isApplying?: boolean;
  /** Project ID for action links */
  projectId?: string;
}

/**
 * [APPLY-ACTION-GOVERNANCE-1] Derives Apply governance state from signals.
 *
 * Priority order for CANNOT_APPLY:
 * 1. IN_PROGRESS - Apply is executing
 * 2. Permission - User doesn't have canApply capability
 * 3. Approval - Approval required but not granted
 * 4. Draft - No saved draft exists
 *
 * Returns CAN_APPLY only when all conditions are met.
 */
export function deriveApplyGovernance(
  signals: ApplyGovernanceSignals
): ApplyGovernanceResult {
  const {
    draftState,
    roleCapabilities,
    requireApprovalForApply = false,
    hasApproval = false,
    isApplying = false,
    projectId,
  } = signals;

  // Priority 1: In progress
  if (isApplying) {
    return {
      state: 'IN_PROGRESS',
    };
  }

  // Priority 2: Permission check (EDITOR/VIEWER cannot apply)
  if (!roleCapabilities.canApply) {
    // Distinguish VIEWER vs EDITOR for better guidance
    if (!roleCapabilities.canRequestApproval) {
      // VIEWER - no actions available
      return {
        state: 'CANNOT_APPLY',
        blockerCategory: 'permission',
        reason: "You don't have permission to apply changes",
        nextStep: 'Contact a project owner to request access or apply changes on your behalf.',
      };
    }
    // EDITOR - can request approval
    return {
      state: 'CANNOT_APPLY',
      blockerCategory: 'approval_required',
      reason: 'Editor role requires owner approval to apply',
      nextStep: 'Request approval from a project owner to apply these changes.',
      action: projectId
        ? {
            label: 'Request approval',
            href: `/projects/${projectId}/settings?tab=team`,
          }
        : undefined,
    };
  }

  // Priority 3: Approval required by policy
  if (requireApprovalForApply && !hasApproval) {
    return {
      state: 'CANNOT_APPLY',
      blockerCategory: 'approval_required',
      reason: 'Approval required before applying',
      nextStep: 'An approval request must be approved before changes can be applied.',
      action: projectId
        ? {
            label: 'View pending approvals',
            href: `/projects/${projectId}/settings?tab=governance`,
          }
        : undefined,
    };
  }

  // Priority 4: Draft state check
  // Normalize legacy draft states
  const normalizedDraftState =
    draftState === 'saved'
      ? 'SAVED_NOT_APPLIED'
      : draftState === 'unsaved'
        ? 'GENERATED_UNSAVED'
        : draftState === 'applied'
          ? 'APPLIED'
          : draftState;

  if (normalizedDraftState === 'NO_DRAFT') {
    return {
      state: 'CANNOT_APPLY',
      blockerCategory: 'draft',
      reason: 'No draft exists to apply',
      nextStep: 'Generate or edit a draft first, then save it before applying.',
    };
  }

  if (normalizedDraftState === 'GENERATED_UNSAVED') {
    return {
      state: 'CANNOT_APPLY',
      blockerCategory: 'draft',
      reason: 'Draft has unsaved changes',
      nextStep: 'Save your draft before applying to Shopify.',
      action: {
        label: 'Save draft',
      },
    };
  }

  if (normalizedDraftState === 'APPLIED') {
    return {
      state: 'CANNOT_APPLY',
      blockerCategory: 'system',
      reason: 'Draft already applied',
      nextStep: 'Make new changes and save a draft to apply again.',
    };
  }

  // SAVED_NOT_APPLIED with all permissions = CAN_APPLY
  return {
    state: 'CAN_APPLY',
  };
}

/**
 * RCP metadata keys for Apply governance.
 */
export const APPLY_GOVERNANCE_METADATA_KEYS = {
  state: 'applyState',
  reason: 'applyBlockReason',
  nextStep: 'applyNextStep',
  category: 'applyBlockCategory',
} as const;

/**
 * Converts ApplyGovernanceResult to RCP metadata format.
 */
export function applyGovernanceToMetadata(
  result: ApplyGovernanceResult
): Record<string, string> {
  const metadata: Record<string, string> = {
    [APPLY_GOVERNANCE_METADATA_KEYS.state]: result.state,
  };

  if (result.reason) {
    metadata[APPLY_GOVERNANCE_METADATA_KEYS.reason] = result.reason;
  }

  if (result.nextStep) {
    metadata[APPLY_GOVERNANCE_METADATA_KEYS.nextStep] = result.nextStep;
  }

  if (result.blockerCategory) {
    metadata[APPLY_GOVERNANCE_METADATA_KEYS.category] = result.blockerCategory;
  }

  return metadata;
}

/**
 * User-friendly labels for Apply governance states.
 */
export const APPLY_STATE_LABELS: Record<ApplyGovernanceState, string> = {
  CAN_APPLY: 'Ready to apply',
  CANNOT_APPLY: 'Cannot apply',
  IN_PROGRESS: 'Applying...',
};

/**
 * Short labels for compact display (e.g., header indicators).
 */
export const APPLY_STATE_SHORT_LABELS: Record<ApplyGovernanceState, string> = {
  CAN_APPLY: 'Ready',
  CANNOT_APPLY: 'Blocked',
  IN_PROGRESS: 'Applying',
};
