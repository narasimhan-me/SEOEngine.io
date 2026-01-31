/**
 * [EA-49: AI-ADVISORY-ONLY-1] AI Advisory Contract
 *
 * Type definitions and runtime guards that enforce the AI advisory-only contract.
 * This module ensures AI never initiates execution or makes autonomous decisions.
 *
 * Trust Contract:
 * - AI provides explanations and guidance ONLY
 * - AI NEVER initiates execution
 * - AI NEVER makes autonomous decisions
 * - All AI outputs must be advisory-framed
 * - User retains full control at all times
 */

/**
 * Valid AI interaction types - strictly advisory.
 */
export type AIInteractionType =
  | 'explanation'      // AI explains what something does
  | 'guidance'         // AI provides guidance on options
  | 'suitability'      // AI helps user assess fit
  | 'clarification';   // AI clarifies terminology or concepts

/**
 * Prohibited AI actions - these must NEVER occur.
 */
export type ProhibitedAIAction =
  | 'execute_playbook'
  | 'apply_changes'
  | 'make_decision'
  | 'auto_select'
  | 'trigger_workflow'
  | 'modify_data';

/**
 * AI advisory request structure.
 * All AI interactions must use this format.
 */
export interface AIAdvisoryRequest {
  /** Type of advisory interaction */
  type: AIInteractionType;
  /** Context for the request (e.g., playbook ID, issue type) */
  context: string;
  /** User explicitly requested this guidance */
  userInitiated: true;
  /** Request timestamp */
  requestedAt: string;
}

/**
 * AI advisory response structure.
 * All AI outputs must conform to this format.
 */
export interface AIAdvisoryOutput {
  /** The advisory content */
  content: string;
  /** Type of advisory response */
  type: AIInteractionType;
  /** Confirms this is advisory only */
  isAdvisory: true;
  /** Confirms no execution is triggered */
  triggersExecution: false;
  /** Confirms no decision is made */
  makesDecision: false;
  /** Response timestamp */
  generatedAt: string;
}

/**
 * Runtime guard to ensure an action is NOT a prohibited AI action.
 * Throws if attempting a prohibited action.
 */
export function assertNotProhibitedAction(
  action: string,
  source: string
): asserts action is string {
  const prohibited: ProhibitedAIAction[] = [
    'execute_playbook',
    'apply_changes',
    'make_decision',
    'auto_select',
    'trigger_workflow',
    'modify_data',
  ];

  if (prohibited.includes(action as ProhibitedAIAction)) {
    throw new Error(
      `[EA-49 VIOLATION] AI attempted prohibited action "${action}" from ${source}. ` +
      `AI must NEVER execute, decide, or modify - only explain and guide.`
    );
  }
}

/**
 * Creates a valid AI advisory request.
 * Ensures the request follows the advisory-only contract.
 */
export function createAdvisoryRequest(
  type: AIInteractionType,
  context: string
): AIAdvisoryRequest {
  return {
    type,
    context,
    userInitiated: true,
    requestedAt: new Date().toISOString(),
  };
}

/**
 * Creates a valid AI advisory output.
 * Ensures the output follows the advisory-only contract.
 */
export function createAdvisoryOutput(
  content: string,
  type: AIInteractionType
): AIAdvisoryOutput {
  return {
    content,
    type,
    isAdvisory: true,
    triggersExecution: false,
    makesDecision: false,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validates that an AI output conforms to the advisory contract.
 * Returns true if valid, throws if invalid.
 */
export function validateAdvisoryOutput(
  output: unknown
): output is AIAdvisoryOutput {
  if (!output || typeof output !== 'object') {
    throw new Error('[EA-49 VIOLATION] AI output must be an object');
  }

  const obj = output as Record<string, unknown>;

  if (obj.isAdvisory !== true) {
    throw new Error('[EA-49 VIOLATION] AI output must have isAdvisory: true');
  }

  if (obj.triggersExecution !== false) {
    throw new Error('[EA-49 VIOLATION] AI output must have triggersExecution: false');
  }

  if (obj.makesDecision !== false) {
    throw new Error('[EA-49 VIOLATION] AI output must have makesDecision: false');
  }

  return true;
}

/**
 * Type guard for checking if a request is user-initiated.
 * AI should only respond to user-initiated requests.
 */
export function isUserInitiated(
  request: unknown
): request is AIAdvisoryRequest {
  return (
    typeof request === 'object' &&
    request !== null &&
    (request as AIAdvisoryRequest).userInitiated === true
  );
}
