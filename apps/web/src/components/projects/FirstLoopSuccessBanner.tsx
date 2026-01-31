'use client';

/**
 * [KAN-86: EA-51] First Loop Success Banner
 *
 * Displays when a new user completes their first review → draft → apply loop.
 * Calm, factual celebration without gamification.
 *
 * Trust Contract:
 * - Factual, reassuring language only
 * - No urgency, pressure, or implied automation
 * - Dismissible and does not block exploration
 * - Display-only: no system behavior changes
 */

import { useState, useEffect } from 'react';
import { completeFirstAction, loadOnboardingState } from '@/lib/onboarding/firstTimeUserState';

interface FirstLoopSuccessBannerProps {
  /** Whether the first loop has been completed */
  isFirstLoopComplete: boolean;
  /** Optional: Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Test ID for E2E testing */
  testId?: string;
}

const STORAGE_KEY = 'engineo:first_loop_banner_dismissed';

export function FirstLoopSuccessBanner({
  isFirstLoopComplete,
  onDismiss,
  testId = 'first-loop-success-banner',
}: FirstLoopSuccessBannerProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Only show if first loop is complete
    if (!isFirstLoopComplete) {
      return;
    }

    // Check if already dismissed
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        return;
      }

      // Check if user already completed onboarding (don't show twice)
      const onboardingState = loadOnboardingState();
      if (onboardingState.completedFirstAction) {
        return;
      }

      // Mark first action complete and show banner
      completeFirstAction();
      setVisible(true);
      setAnimating(true);
    }
  }, [isFirstLoopComplete]);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      data-testid={testId}
      className={`mb-6 rounded-lg border border-green-100 bg-green-50 p-4 shadow-sm transition-all duration-300 ${
        animating ? 'animate-in fade-in slide-in-from-top-2' : ''
      }`}
      role="status"
      aria-live="polite"
      aria-label="First loop success notification"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Success checkmark */}
          <div className="flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-5 w-5 text-green-600"
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
          </div>

          {/* Content */}
          <div className="min-w-0">
            <p className="text-sm font-medium text-green-900">
              First loop complete
            </p>
            <p className="mt-1 text-sm text-green-800">
              You reviewed an issue, created a draft, and applied it to your store. That&apos;s the core workflow.
            </p>
            <p className="mt-2 text-xs text-green-700">
              Keep going at your own pace — every improvement helps your store&apos;s discoverability.
            </p>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss success notification"
          data-testid={`${testId}-dismiss`}
          className="flex-shrink-0 rounded-md p-1 text-green-600 hover:bg-green-100 hover:text-green-800 transition-colors"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default FirstLoopSuccessBanner;
