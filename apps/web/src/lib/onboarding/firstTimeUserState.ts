/**
 * [KAN-54: EA-34] First-Time User Onboarding State
 *
 * Tracks first-time user onboarding completion and dismissal.
 * Uses localStorage for client-side persistence (no backend changes required).
 *
 * Trust Contract:
 * - Onboarding never blocks exploration
 * - Users can always dismiss or bypass guidance
 * - First success achievable within 10 minutes
 */

const ONBOARDING_STORAGE_KEY = 'engineo:first_time_onboarding';

export interface FirstTimeOnboardingState {
  /** User explicitly dismissed the onboarding guidance */
  dismissed: boolean;
  /** Timestamp when guidance was dismissed */
  dismissedAt?: string;
  /** User completed their first meaningful action */
  completedFirstAction: boolean;
  /** Timestamp when first action was completed */
  completedAt?: string;
}

/**
 * Default onboarding state for new users.
 */
function getDefaultState(): FirstTimeOnboardingState {
  return {
    dismissed: false,
    completedFirstAction: false,
  };
}

/**
 * Load onboarding state from localStorage.
 */
export function loadOnboardingState(): FirstTimeOnboardingState {
  if (typeof window === 'undefined') {
    return getDefaultState();
  }

  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as FirstTimeOnboardingState;
    }
  } catch {
    // Ignore parse errors
  }

  return getDefaultState();
}

/**
 * Save onboarding state to localStorage.
 */
function saveOnboardingState(state: FirstTimeOnboardingState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Dismiss the first-time user guidance.
 * Returns updated state.
 */
export function dismissOnboardingGuidance(): FirstTimeOnboardingState {
  const state = loadOnboardingState();
  const updated: FirstTimeOnboardingState = {
    ...state,
    dismissed: true,
    dismissedAt: new Date().toISOString(),
  };
  saveOnboardingState(updated);
  return updated;
}

/**
 * Mark first meaningful action as completed.
 * Returns updated state.
 */
export function completeFirstAction(): FirstTimeOnboardingState {
  const state = loadOnboardingState();
  if (state.completedFirstAction) {
    return state; // Already completed
  }
  const updated: FirstTimeOnboardingState = {
    ...state,
    completedFirstAction: true,
    completedAt: new Date().toISOString(),
  };
  saveOnboardingState(updated);
  return updated;
}

/**
 * Check if onboarding guidance should be shown.
 * Shows guidance only if not dismissed and first action not completed.
 */
export function shouldShowOnboardingGuidance(): boolean {
  const state = loadOnboardingState();
  return !state.dismissed && !state.completedFirstAction;
}

/**
 * Reset onboarding state (for testing/admin).
 */
export function resetOnboardingState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
