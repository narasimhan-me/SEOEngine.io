/**
 * [EA-44: AUTOMATION-SAFETY-RAILS-1] Frontend Safety Rail Types
 *
 * Types and utilities for handling safety rail errors in the frontend.
 * Provides clear error messaging when automation is blocked.
 *
 * Design System: v1.5
 * EIC Version: 1.5
 */

/**
 * Safety rail block reason codes (must match backend).
 */
export type SafetyRailBlockReason =
  | 'ENTITLEMENT_BLOCKED'
  | 'SCOPE_EXCEEDED'
  | 'INTENT_NOT_CONFIRMED'
  | 'GUARD_CONDITION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ROLE_PERMISSION_DENIED';

/**
 * Safety rail check result from the backend.
 */
export interface SafetyRailCheckResult {
  checkType: string;
  passed: boolean;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Safety rail blocked error payload from the backend.
 */
export interface SafetyRailBlockedError {
  code: 'AUTOMATION_SAFETY_BLOCKED';
  reason: SafetyRailBlockReason;
  message: string;
  failedChecks: SafetyRailCheckResult[];
  evaluatedAt: string;
}

/**
 * Check if an error is a safety rail blocked error.
 */
export function isSafetyRailBlockedError(
  error: unknown
): error is SafetyRailBlockedError {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, unknown>;
  return err.code === 'AUTOMATION_SAFETY_BLOCKED';
}

/**
 * Get user-friendly title for a safety rail block reason.
 */
export function getSafetyRailBlockTitle(reason: SafetyRailBlockReason): string {
  switch (reason) {
    case 'ENTITLEMENT_BLOCKED':
      return 'Plan Upgrade Required';
    case 'SCOPE_EXCEEDED':
      return 'Scope Changed';
    case 'INTENT_NOT_CONFIRMED':
      return 'Confirmation Required';
    case 'GUARD_CONDITION_FAILED':
      return 'Prerequisites Not Met';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Daily Limit Reached';
    case 'ROLE_PERMISSION_DENIED':
      return 'Permission Required';
    default:
      return 'Automation Blocked';
  }
}

/**
 * Get suggested action for a safety rail block reason.
 */
export function getSafetyRailBlockAction(reason: SafetyRailBlockReason): string {
  switch (reason) {
    case 'ENTITLEMENT_BLOCKED':
      return 'Upgrade your plan to unlock automation features.';
    case 'SCOPE_EXCEEDED':
      return 'Regenerate the preview to update the scope.';
    case 'INTENT_NOT_CONFIRMED':
      return 'Complete the confirmation dialog to proceed.';
    case 'GUARD_CONDITION_FAILED':
      return 'Review the requirements and try again.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Wait until tomorrow or upgrade your plan.';
    case 'ROLE_PERMISSION_DENIED':
      return 'Request access from the project owner.';
    default:
      return 'Please try again or contact support.';
  }
}
