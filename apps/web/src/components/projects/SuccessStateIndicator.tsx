'use client';

/**
 * [KAN-86: EA-51] Success State Indicator Component
 *
 * Displays calm, factual success state without interrupting user flow.
 * Visible but unobtrusive - reinforces confidence without pressure.
 *
 * Trust Contract:
 * - Factual, reassuring language only
 * - No gamification (points, scores, badges, streaks)
 * - Does not interrupt or block user actions
 * - Display-only: no system behavior changes
 */

import { useMemo } from 'react';
import {
  deriveSuccessState,
  type SuccessStateSignals,
  type SuccessStateResult,
} from '@/lib/success-state';

interface SuccessStateIndicatorProps {
  /** Signals for deriving success state */
  signals: SuccessStateSignals;
  /** Optional: compact mode for inline display */
  compact?: boolean;
  /** Optional: hide when in healthy state (only show transitions) */
  hideWhenHealthy?: boolean;
  /** Test ID for E2E testing */
  testId?: string;
}

export function SuccessStateIndicator({
  signals,
  compact = false,
  hideWhenHealthy = false,
  testId = 'success-state-indicator',
}: SuccessStateIndicatorProps) {
  const state: SuccessStateResult = useMemo(
    () => deriveSuccessState(signals),
    [signals]
  );

  // Optionally hide when in healthy/complete state
  if (hideWhenHealthy && state.healthyUsageState === 'HEALTHY') {
    return null;
  }

  // Compact inline indicator
  if (compact) {
    return (
      <div
        data-testid={testId}
        data-success-state={state.firstLoopState}
        data-healthy-state={state.healthyUsageState}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          state.showSuccessIndicator
            ? 'bg-green-50 text-green-700 border border-green-100'
            : 'bg-gray-50 text-gray-600 border border-gray-100'
        }`}
      >
        {state.showSuccessIndicator && (
          <svg
            className="h-3 w-3 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span>{state.headline}</span>
      </div>
    );
  }

  // Full card indicator
  return (
    <div
      data-testid={testId}
      data-success-state={state.firstLoopState}
      data-healthy-state={state.healthyUsageState}
      className={`rounded-lg border p-4 ${
        state.showSuccessIndicator
          ? 'border-green-100 bg-green-50'
          : 'border-gray-100 bg-gray-50'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {state.showSuccessIndicator ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-4 w-4 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-4 w-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              state.showSuccessIndicator ? 'text-green-900' : 'text-gray-900'
            }`}
          >
            {state.headline}
          </p>
          <p
            className={`mt-1 text-xs ${
              state.showSuccessIndicator ? 'text-green-700' : 'text-gray-600'
            }`}
          >
            {state.message}
          </p>
        </div>
      </div>
    </div>
  );
}

export default SuccessStateIndicator;
