/**
 * [EA-30: AI-ASSIST-ENTRY-POINTS-1] AI Assistant User Preferences
 *
 * Manages user preferences for AI assistant visibility and behavior.
 * Users can dismiss or minimize assistant presence without losing
 * access to core platform functionality.
 */

/**
 * AI assistant visibility preference.
 */
export type AiAssistantVisibility = 'visible' | 'minimized' | 'hidden';

/**
 * AI assistant preferences for a project.
 */
export interface AiAssistantPreferences {
  /** Overall visibility preference */
  visibility: AiAssistantVisibility;
  /** Session-based dismissals (not persisted across sessions) */
  sessionDismissals: Set<string>;
  /** Timestamp of last preference update */
  updatedAt?: string;
}

const AI_ASSISTANT_PREFS_KEY_PREFIX = 'engineo:ai_assistant_prefs:';

/**
 * Get the storage key for a project's AI assistant preferences.
 */
function getStorageKey(projectId: string): string {
  return `${AI_ASSISTANT_PREFS_KEY_PREFIX}${projectId}`;
}

/**
 * Default AI assistant preferences.
 */
function getDefaultPreferences(): AiAssistantPreferences {
  return {
    visibility: 'visible',
    sessionDismissals: new Set(),
  };
}

/**
 * Load AI assistant preferences from localStorage.
 */
export function loadAiAssistantPreferences(
  projectId: string
): AiAssistantPreferences {
  if (typeof window === 'undefined') {
    return getDefaultPreferences();
  }

  try {
    const stored = localStorage.getItem(getStorageKey(projectId));
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        visibility: parsed.visibility || 'visible',
        sessionDismissals: new Set(), // Session dismissals are not persisted
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    // Ignore parse errors
  }

  return getDefaultPreferences();
}

/**
 * Save AI assistant preferences to localStorage.
 */
export function saveAiAssistantPreferences(
  projectId: string,
  prefs: Pick<AiAssistantPreferences, 'visibility'>
): void {
  if (typeof window === 'undefined') return;

  try {
    const toStore = {
      visibility: prefs.visibility,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(toStore));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Set AI assistant visibility preference.
 */
export function setAiAssistantVisibility(
  projectId: string,
  visibility: AiAssistantVisibility
): void {
  saveAiAssistantPreferences(projectId, { visibility });
}

/**
 * Check if AI assistant should be shown based on preferences.
 */
export function isAiAssistantVisible(projectId: string): boolean {
  const prefs = loadAiAssistantPreferences(projectId);
  return prefs.visibility === 'visible';
}

/**
 * Check if AI assistant is minimized.
 */
export function isAiAssistantMinimized(projectId: string): boolean {
  const prefs = loadAiAssistantPreferences(projectId);
  return prefs.visibility === 'minimized';
}

/**
 * Dismiss AI assistant for this session only (does not persist).
 * Used for contextual dismissals that should reset on page reload.
 */
const sessionDismissals = new Map<string, Set<string>>();

export function dismissAiAssistantForSession(
  projectId: string,
  contextId: string
): void {
  if (!sessionDismissals.has(projectId)) {
    sessionDismissals.set(projectId, new Set());
  }
  sessionDismissals.get(projectId)!.add(contextId);
}

/**
 * Check if AI assistant is dismissed for a specific context this session.
 */
export function isAiAssistantDismissedForContext(
  projectId: string,
  contextId: string
): boolean {
  return sessionDismissals.get(projectId)?.has(contextId) ?? false;
}

/**
 * Clear session dismissals for a project.
 */
export function clearSessionDismissals(projectId: string): void {
  sessionDismissals.delete(projectId);
}
