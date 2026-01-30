'use client';

/**
 * [KAN-54: EA-34] First-Time User Guidance Component
 *
 * Guides first-time users to their first meaningful success.
 * Success = Review your store's issues + Draft one fix
 *
 * Trust Contract:
 * - Never blocks exploration (always dismissible)
 * - No forced walkthroughs or modal takeovers
 * - Achievable within 10 minutes
 * - Subtle, non-intrusive guidance
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  loadOnboardingState,
  dismissOnboardingGuidance,
  shouldShowOnboardingGuidance,
  type FirstTimeOnboardingState,
} from '@/lib/onboarding/firstTimeUserState';

interface FirstTimeUserGuidanceProps {
  /** User's name for personalized greeting */
  userName?: string;
  /** URL to navigate to first project (if exists) */
  firstProjectHref?: string;
  /** URL to create a new project */
  createProjectHref?: string;
  /** Whether user has any projects */
  hasProjects: boolean;
}

export function FirstTimeUserGuidance({
  userName,
  firstProjectHref,
  createProjectHref = '/projects',
  hasProjects,
}: FirstTimeUserGuidanceProps) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<FirstTimeOnboardingState | null>(null);

  useEffect(() => {
    // Check if guidance should be shown (client-side only)
    if (shouldShowOnboardingGuidance()) {
      setVisible(true);
      setState(loadOnboardingState());
    }
  }, []);

  const handleDismiss = () => {
    const updated = dismissOnboardingGuidance();
    setState(updated);
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      data-testid="first-time-user-guidance"
      className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4"
      role="region"
      aria-label="Getting started guide"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg" aria-hidden="true">👋</span>
            <h3 className="text-sm font-semibold text-foreground">
              {userName ? `Welcome, ${userName}!` : 'Welcome to EngineO!'}
            </h3>
          </div>

          {/* Success definition */}
          <p className="text-sm text-muted-foreground mb-3">
            Get your first win: <span className="font-medium text-foreground">review your store&apos;s SEO issues</span> and <span className="font-medium text-foreground">draft one fix</span>. You can do this in about 10 minutes.
          </p>

          {/* Quick steps */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                1
              </span>
              <span className="text-muted-foreground">
                {hasProjects
                  ? 'Open your project and review the DEO Score'
                  : 'Create a project and connect your Shopify store'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                2
              </span>
              <span className="text-muted-foreground">
                Pick one issue and generate a fix suggestion
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                3
              </span>
              <span className="text-muted-foreground">
                Review the draft — you decide when to apply it
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            {hasProjects && firstProjectHref ? (
              <Link
                href={firstProjectHref}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
              >
                Go to project →
              </Link>
            ) : (
              <Link
                href={createProjectHref}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
              >
                Create your first project →
              </Link>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss getting started guide"
          data-testid="dismiss-onboarding-guidance"
          className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <svg
            className="h-4 w-4"
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

      {/* Help text */}
      <p className="mt-3 text-xs text-muted-foreground border-t border-primary/10 pt-3">
        You can always explore freely — this guide is just a suggestion to help you get started quickly.
      </p>
    </div>
  );
}
