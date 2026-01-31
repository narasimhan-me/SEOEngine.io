/**
 * [EA-30: AI-ASSIST-ENTRY-POINTS-1] Trust Loop State Tracking
 *
 * Tracks whether a user has completed at least one full trust loop cycle.
 * A trust loop cycle is defined as:
 * - Viewing an issue → Understanding its impact → Taking action (generate/save/apply)
 *
 * This state gates the appearance of AI assistant entry points.
 * AI assistance only appears after trust has been established.
 */

/**
 * Trust loop completion signals.
 * All signals are persisted in localStorage per project.
 */
export interface TrustLoopSignals {
  /** User has viewed at least one issue detail */
  hasViewedIssue: boolean;
  /** User has generated at least one draft/fix preview */
  hasGeneratedDraft: boolean;
  /** User has saved at least one draft */
  hasSavedDraft: boolean;
  /** User has applied at least one fix */
  hasAppliedFix: boolean;
  /** Timestamp of first completed trust loop */
  completedAt?: string;
}

/**
 * Trust loop state for a project.
 */
export interface TrustLoopState {
  /** Whether the trust loop has been completed */
  isComplete: boolean;
  /** Individual signals contributing to trust loop completion */
  signals: TrustLoopSignals;
}

const TRUST_LOOP_STORAGE_KEY_PREFIX = 'engineo:trust_loop:';

/**
 * Get the storage key for a project's trust loop state.
 */
function getStorageKey(projectId: string): string {
  return `${TRUST_LOOP_STORAGE_KEY_PREFIX}${projectId}`;
}

/**
 * Default trust loop signals (no trust established).
 */
function getDefaultSignals(): TrustLoopSignals {
  return {
    hasViewedIssue: false,
    hasGeneratedDraft: false,
    hasSavedDraft: false,
    hasAppliedFix: false,
  };
}

/**
 * Load trust loop state from localStorage.
 * Returns default state if not found or on error.
 */
export function loadTrustLoopState(projectId: string): TrustLoopState {
  if (typeof window === 'undefined') {
    return { isComplete: false, signals: getDefaultSignals() };
  }

  try {
    const stored = localStorage.getItem(getStorageKey(projectId));
    if (stored) {
      const signals = JSON.parse(stored) as TrustLoopSignals;
      const isComplete = deriveTrustLoopComplete(signals);
      return { isComplete, signals };
    }
  } catch {
    // Ignore parse errors, return default
  }

  return { isComplete: false, signals: getDefaultSignals() };
}

/**
 * Save trust loop signals to localStorage.
 */
export function saveTrustLoopSignals(
  projectId: string,
  signals: TrustLoopSignals
): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(signals));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Record a trust loop signal for a project.
 * Returns the updated state.
 *
 * [KAN-54: EA-34] Also marks first-time onboarding as complete when user
 * generates their first draft (achieving first meaningful action).
 */
export function recordTrustLoopSignal(
  projectId: string,
  signal: keyof Omit<TrustLoopSignals, 'completedAt'>
): TrustLoopState {
  const currentState = loadTrustLoopState(projectId);
  const newSignals = { ...currentState.signals, [signal]: true };

  // Check if trust loop just became complete
  const wasComplete = currentState.isComplete;
  const isNowComplete = deriveTrustLoopComplete(newSignals);

  if (isNowComplete && !wasComplete) {
    newSignals.completedAt = new Date().toISOString();
  }

  saveTrustLoopSignals(projectId, newSignals);

  // [KAN-54: EA-34] Mark first-time user onboarding as complete when user
  // generates their first draft (this is the "first meaningful action")
  if (signal === 'hasGeneratedDraft' || signal === 'hasSavedDraft') {
    try {
      // Dynamic import to avoid circular dependencies
      import('@/lib/onboarding/firstTimeUserState').then(({ completeFirstAction }) => {
        completeFirstAction();
      });
    } catch {
      // Ignore errors - onboarding completion is non-critical
    }
  }

  return { isComplete: isNowComplete, signals: newSignals };
}

/**
 * Derive whether the trust loop is complete from signals.
 *
 * Trust loop is complete when user has:
 * 1. Viewed at least one issue (understanding)
 * 2. Either generated a draft OR applied a fix (action)
 *
 * This represents completing one meaningful cycle through the platform.
 */
export function deriveTrustLoopComplete(signals: TrustLoopSignals): boolean {
  const hasUnderstanding = signals.hasViewedIssue;
  const hasAction =
    signals.hasGeneratedDraft ||
    signals.hasSavedDraft ||
    signals.hasAppliedFix;

  return hasUnderstanding && hasAction;
}

/**
 * Check if AI assistant entry points should be shown.
 * Only shown after trust loop is complete.
 */
export function shouldShowAiAssistant(projectId: string): boolean {
  const state = loadTrustLoopState(projectId);
  return state.isComplete;
}

/**
 * Reset trust loop state for a project (for testing/admin purposes).
 */
export function resetTrustLoopState(projectId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(getStorageKey(projectId));
  } catch {
    // Ignore storage errors
  }
}
