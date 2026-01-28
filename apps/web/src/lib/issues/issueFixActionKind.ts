/**
 * ISSUE-FIX-KIND-CLARITY-1 FIXUP-3: Fix Action Kind Derivation
 * [EA-19 EPIC 13] ISSUE-FIX-ROUTE-INTEGRITY-1 Implementation
 *
 * Derives canonical "fix action kind" for Issues Engine CTAs.
 * Uses existing destination map and issue config as sources of truth.
 *
 * NO GUESSWORK: Only uses signals that are already computed and deterministic.
 *
 * ROUTE INTEGRITY CONTRACT:
 * - AI_PREVIEW_FIX: Valid preview workflow available
 * - DIRECT_FIX: Valid navigation to workspace
 * - GUIDANCE_ONLY: Informational review (no automatic fix)
 * - BLOCKED: No action reachable (explicit blocked state with reason)
 */

import type { DeoIssueFixType } from '../deo-issues';
import { getIssueFixConfig } from '../issue-to-fix-path';
import {
  getIssueActionDestinations,
  type GetIssueActionDestinationsParams,
} from './issueActionDestinations';
// [FIXUP-4] Import inline preview support helper for single source of truth
import { isInlineAiPreviewSupportedIssueType } from './inlineAiPreviewSupport';

/**
 * Canonical fix action kinds for Issues Engine CTAs.
 *
 * - AI_PREVIEW_FIX: AI fix with inline preview (user reviews before saving)
 * - DIRECT_FIX: Direct navigation to workspace (manual changes required)
 * - GUIDANCE_ONLY: Diagnostic/review only (no automatic fix available)
 * - BLOCKED: No action reachable in current UI
 */
export type IssueFixActionKind =
  | 'AI_PREVIEW_FIX'
  | 'DIRECT_FIX'
  | 'GUIDANCE_ONLY'
  | 'BLOCKED';

/**
 * Fix action kind metadata for UI rendering.
 */
export interface IssueFixActionKindInfo {
  kind: IssueFixActionKind;
  /** Primary CTA label */
  label: string;
  /** Secondary hint/sublabel */
  sublabel: string;
  /** Semantic icon key */
  iconKey:
    | 'workflow.ai'
    | 'nav.projects'
    | 'playbook.content'
    | 'status.blocked';
  /**
   * [ERROR-&-BLOCKED-STATE-UX-1] Human-readable explanation for blocked state.
   * Only populated when kind === 'BLOCKED'.
   */
  blockedReason?: string;
  /**
   * [ERROR-&-BLOCKED-STATE-UX-1] Clear next step for blocked state.
   * Only populated when kind === 'BLOCKED'.
   */
  nextStep?: string;
}

/**
 * Derives the canonical fix action kind for an issue.
 *
 * Priority logic:
 * 1. If no fix destination → check viewAffected/open → GUIDANCE_ONLY or BLOCKED
 * 2. If fix destination exists and fixType=aiFix + supportsInlineFix → AI_PREVIEW_FIX
 * 3. If fix destination exists and fixKind=DIAGNOSTIC → GUIDANCE_ONLY
 * 4. If fix destination exists otherwise → DIRECT_FIX
 *
 * [FIXUP-4] AI_PREVIEW_FIX now also requires issueType to be in the inline preview allowlist.
 *
 * @param params - Same params as getIssueActionDestinations
 * @returns IssueFixActionKind
 */
export function deriveIssueFixActionKind(
  params: GetIssueActionDestinationsParams
): IssueFixActionKind {
  const { issue } = params;
  const destinations = getIssueActionDestinations(params);

  // Get issue config for fixKind classification
  const issueType = (issue.type as string | undefined) || issue.id;
  const fixConfig = getIssueFixConfig(issueType);
  const configFixKind = fixConfig?.fixKind || 'EDIT';

  // Case 1: Fix destination available
  if (destinations.fix.kind !== 'none' && destinations.fix.href) {
    const fixType = issue.fixType as DeoIssueFixType | undefined;
    const fixReady = issue.fixReady ?? false;

    // [FIXUP-4] AI fix with inline preview support
    // Conditions: fixType === 'aiFix' AND fixReady === true AND has primaryProductId
    // AND issueType is in the inline preview allowlist
    const supportsInlinePreview =
      fixType === 'aiFix' &&
      fixReady === true &&
      !!issue.primaryProductId &&
      isInlineAiPreviewSupportedIssueType(issueType);

    if (supportsInlinePreview) {
      return 'AI_PREVIEW_FIX';
    }

    // DIAGNOSTIC issues are guidance-only (even if they have a fix route)
    if (configFixKind === 'DIAGNOSTIC') {
      return 'GUIDANCE_ONLY';
    }

    // All other fix destinations are direct fix
    return 'DIRECT_FIX';
  }

  // Case 2: No fix destination - check if viewAffected or open is available
  const hasAlternativeAction =
    (destinations.viewAffected.kind !== 'none' &&
      destinations.viewAffected.href) ||
    (destinations.open.kind !== 'none' && destinations.open.href);

  if (hasAlternativeAction) {
    return 'GUIDANCE_ONLY';
  }

  // Case 3: No actions reachable
  return 'BLOCKED';
}

/**
 * Gets full fix action kind info including label, sublabel, and icon.
 *
 * [FIXUP-4] GUIDANCE_ONLY now distinguishes between:
 *   - DIAGNOSTIC issues → "Review guidance" (playbook.content icon)
 *   - viewAffected exploration → "View affected" (nav.projects icon)
 *
 * @param params - Same params as getIssueActionDestinations
 * @param blockedReasonOverride - [EA-16] Optional canonical blocked reason ID to override default
 * @returns IssueFixActionKindInfo with all UI metadata
 */
export function getIssueFixActionKindInfo(
  params: GetIssueActionDestinationsParams,
  blockedReasonOverride?: string
): IssueFixActionKindInfo {
  const kind = deriveIssueFixActionKind(params);

  switch (kind) {
    case 'AI_PREVIEW_FIX':
      return {
        kind,
        label: 'Review AI fix',
        sublabel: 'Preview changes before saving',
        iconKey: 'workflow.ai',
      };
    case 'DIRECT_FIX':
      return {
        kind,
        label: 'Fix in workspace',
        sublabel: 'Manual changes required',
        iconKey: 'nav.projects',
      };
    case 'GUIDANCE_ONLY': {
      // [FIXUP-4] Distinguish between DIAGNOSTIC guidance and viewAffected exploration
      const destinations = getIssueActionDestinations(params);
      const hasViewAffected =
        destinations.viewAffected.kind !== 'none' && destinations.viewAffected.href;

      // If viewAffected is available and no fix destination, this is exploration
      if (hasViewAffected && destinations.fix.kind === 'none') {
        return {
          kind,
          label: 'View affected',
          sublabel: 'See affected items',
          iconKey: 'nav.projects',
        };
      }

      // Otherwise it's DIAGNOSTIC guidance (fix destination exists but fixKind=DIAGNOSTIC)
      return {
        kind,
        label: 'Review guidance',
        sublabel: 'No automatic fix available',
        iconKey: 'playbook.content',
      };
    case 'BLOCKED': {
      // [EA-16: ERROR-&-BLOCKED-STATE-UX-1] Use canonical blocked reason when provided
      const defaultReason = 'No fix destination is mapped for this issue type in the current context.';
      const defaultNextStep = 'Review affected items in the Issues Engine or wait for the fix surface to become available.';

      // Map canonical reason IDs to user-friendly copy
      const canonicalReasonCopy: Record<string, { reason: string; nextStep: string }> = {
        PERMISSIONS_MISSING: {
          reason: 'This action requires additional permissions you do not currently have.',
          nextStep: 'Contact a project owner to request the necessary permissions.',
        },
        SHOPIFY_SCOPE_MISSING: {
          reason: 'This action requires Shopify OAuth scopes that have not been granted.',
          nextStep: 'Re-connect your Shopify store and grant the requested permissions.',
        },
        DRAFT_REQUIRED: {
          reason: 'This action requires saving a draft first.',
          nextStep: 'Review and save your draft changes before applying.',
        },
        DESTINATION_UNAVAILABLE: {
          reason: 'No valid action route exists for this issue in the current context.',
          nextStep: 'Review the issue details in the Issues Engine for guidance.',
        },
        SYNC_PENDING: {
          reason: 'Data is not yet available because a sync is currently in progress.',
          nextStep: 'Wait for the sync to complete, then try again.',
        },
        SYSTEM_ERROR: {
          reason: 'An unexpected system error prevented this action.',
          nextStep: 'Try again later or contact support if the problem persists.',
        },
      };

      const reasonCopy = blockedReasonOverride && canonicalReasonCopy[blockedReasonOverride]
        ? canonicalReasonCopy[blockedReasonOverride]
        : { reason: defaultReason, nextStep: defaultNextStep };

      return {
        kind,
        label: 'Blocked',
        sublabel: 'No action available',
        iconKey: 'status.blocked',
        // [EA-16: ERROR-&-BLOCKED-STATE-UX-1] Canonical blocked reason support
        blockedReason: reasonCopy.reason,
        nextStep: reasonCopy.nextStep,
      };
    }
  }
}

/**
 * Gets RCP actionability sentence based on fix action kind.
 * Used in ContextPanelIssueDetails actionability section.
 *
 * @param kind - The derived fix action kind
 * @returns Human-readable sentence for RCP
 */
export function getRcpActionabilitySentence(kind: IssueFixActionKind): string {
  switch (kind) {
    case 'AI_PREVIEW_FIX':
      return 'This issue offers an AI-generated preview. Nothing is applied automatically.';
    case 'DIRECT_FIX':
      return 'This fix requires manual changes in the workspace.';
    case 'GUIDANCE_ONLY':
      return 'This issue is guidance-only. No automatic fix is available.';
    case 'BLOCKED':
      return 'No fix action is reachable in the current UI.';
  }
}
