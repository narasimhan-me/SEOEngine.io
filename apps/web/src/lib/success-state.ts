/**
 * [KAN-86: EA-51] Success State Definition and Derivation
 *
 * Defines what success looks like in EngineO.ai for first-time users
 * and early repeat sessions.
 *
 * Trust Contract:
 * - Success framing is factual and reassuring, never urgent or pressuring
 * - No gamification elements (points, scores, streaks, badges)
 * - Success messaging does not interrupt user flow
 * - Display-only: no logic changes, no backend changes
 */

/**
 * Success state for first-time users completing their first loop.
 */
export type FirstLoopSuccessState =
  | 'NOT_STARTED'
  | 'REVIEWED'
  | 'DRAFTED'
  | 'APPLIED'
  | 'COMPLETE';

/**
 * Healthy usage state for repeat sessions.
 */
export type HealthyUsageState =
  | 'HEALTHY'
  | 'DRAFTS_PENDING'
  | 'ISSUES_AVAILABLE'
  | 'NEEDS_ATTENTION';

/**
 * Success state signals for deriving current user state.
 */
export interface SuccessStateSignals {
  /** User has reviewed at least one issue */
  hasReviewedIssue: boolean;
  /** User has generated/saved at least one draft */
  hasSavedDraft: boolean;
  /** User has applied at least one change to Shopify */
  hasAppliedChange: boolean;
  /** Count of pending drafts awaiting apply */
  pendingDraftsCount: number;
  /** Count of issues awaiting review */
  openIssuesCount: number;
  /** Products with applied SEO */
  productsOptimizedCount: number;
}

/**
 * Result of success state derivation with messaging.
 */
export interface SuccessStateResult {
  /** Current first-loop state */
  firstLoopState: FirstLoopSuccessState;
  /** Current healthy usage state */
  healthyUsageState: HealthyUsageState;
  /** Calm, factual headline (no urgency) */
  headline: string;
  /** Supporting message */
  message: string;
  /** Whether to show the success indicator */
  showSuccessIndicator: boolean;
}

/**
 * [KAN-86] Derives success state from user signals.
 *
 * Returns factual, reassuring messaging based on current state.
 * Never pressures or implies urgency.
 */
export function deriveSuccessState(
  signals: SuccessStateSignals
): SuccessStateResult {
  const {
    hasReviewedIssue,
    hasSavedDraft,
    hasAppliedChange,
    pendingDraftsCount,
    openIssuesCount,
    productsOptimizedCount,
  } = signals;

  // Determine first-loop state
  let firstLoopState: FirstLoopSuccessState = 'NOT_STARTED';
  if (hasAppliedChange) {
    firstLoopState = 'COMPLETE';
  } else if (hasSavedDraft) {
    firstLoopState = 'DRAFTED';
  } else if (hasReviewedIssue) {
    firstLoopState = 'REVIEWED';
  }

  // Determine healthy usage state
  let healthyUsageState: HealthyUsageState = 'HEALTHY';
  if (pendingDraftsCount > 0) {
    healthyUsageState = 'DRAFTS_PENDING';
  } else if (openIssuesCount > 0 && productsOptimizedCount === 0) {
    healthyUsageState = 'NEEDS_ATTENTION';
  } else if (openIssuesCount > 0) {
    healthyUsageState = 'ISSUES_AVAILABLE';
  }

  // Generate messaging based on state
  const { headline, message, showSuccessIndicator } = getSuccessMessaging(
    firstLoopState,
    healthyUsageState,
    signals
  );

  return {
    firstLoopState,
    healthyUsageState,
    headline,
    message,
    showSuccessIndicator,
  };
}

/**
 * Generates calm, factual success messaging.
 * No urgency, no pressure, no gamification.
 */
function getSuccessMessaging(
  firstLoopState: FirstLoopSuccessState,
  healthyUsageState: HealthyUsageState,
  signals: SuccessStateSignals
): { headline: string; message: string; showSuccessIndicator: boolean } {
  // First-time user completing their first loop
  if (firstLoopState === 'COMPLETE') {
    return {
      headline: 'First loop complete',
      message:
        'You reviewed an issue, created a draft, and applied it. Your store is better for it.',
      showSuccessIndicator: true,
    };
  }

  // Healthy state - nothing blocking
  if (healthyUsageState === 'HEALTHY') {
    return {
      headline: 'Your store looks good',
      message:
        'No pending drafts or urgent issues. Check back after your next crawl.',
      showSuccessIndicator: true,
    };
  }

  // Drafts pending - calm reminder, no urgency
  if (healthyUsageState === 'DRAFTS_PENDING') {
    const plural = signals.pendingDraftsCount === 1 ? 'draft' : 'drafts';
    return {
      headline: `${signals.pendingDraftsCount} ${plural} ready to review`,
      message: 'You can review and apply these when you\'re ready.',
      showSuccessIndicator: false,
    };
  }

  // Issues available - informational only
  if (healthyUsageState === 'ISSUES_AVAILABLE') {
    return {
      headline: 'Opportunities available',
      message:
        'There are issues you can address when you have time. No rush.',
      showSuccessIndicator: false,
    };
  }

  // Needs attention - still no urgency
  return {
    headline: 'Getting started',
    message:
      'Review your store\'s issues and draft a fix to see improvements.',
    showSuccessIndicator: false,
  };
}

/**
 * [KAN-86] Check if user has completed their first successful loop.
 * First loop = reviewed issue → saved draft → applied to Shopify.
 */
export function hasCompletedFirstLoop(signals: SuccessStateSignals): boolean {
  return (
    signals.hasReviewedIssue &&
    signals.hasSavedDraft &&
    signals.hasAppliedChange
  );
}
