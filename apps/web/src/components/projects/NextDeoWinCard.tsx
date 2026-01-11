'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi } from '@/lib/api';
// [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5] Use centralized routing helpers
import {
  navigateToPlaybookRun,
  buildPlaybooksListHref,
} from '@/lib/playbooks-routing';

interface PlaybookEstimate {
  totalAffectedProducts: number;
  eligible: boolean;
}

interface NextDeoWinCardProps {
  projectId: string;
  /** Current plan ID (e.g., 'free', 'pro', 'business') */
  planId?: string | null;
}

export function NextDeoWinCard({ projectId, planId }: NextDeoWinCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [missingTitles, setMissingTitles] = useState<number | null>(null);
  const [missingDescriptions, setMissingDescriptions] = useState<number | null>(null);
  const [estimateError, setEstimateError] = useState(false);

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true);
      setEstimateError(false);

      const [titleEstimate, descEstimate] = await Promise.all([
        projectsApi
          .automationPlaybookEstimate(projectId, 'missing_seo_title')
          .catch(() => null),
        projectsApi
          .automationPlaybookEstimate(projectId, 'missing_seo_description')
          .catch(() => null),
      ]);

      if (titleEstimate) {
        setMissingTitles(
          (titleEstimate as PlaybookEstimate).totalAffectedProducts ?? null,
        );
      }
      if (descEstimate) {
        setMissingDescriptions(
          (descEstimate as PlaybookEstimate).totalAffectedProducts ?? null,
        );
      }

      if (!titleEstimate && !descEstimate) {
        setEstimateError(true);
      }
    } catch {
      setEstimateError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  const handleOpenPlaybooks = () => {
    // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5] Use centralized routing helpers
    // Prefer direct run route for best UX since we already have counts
    if ((missingDescriptions ?? 0) > 0) {
      navigateToPlaybookRun(router, {
        projectId,
        playbookId: 'missing_seo_description',
        step: 'preview',
        source: 'next_deo_win',
      });
    } else if ((missingTitles ?? 0) > 0) {
      navigateToPlaybookRun(router, {
        projectId,
        playbookId: 'missing_seo_title',
        step: 'preview',
        source: 'next_deo_win',
      });
    } else {
      router.push(buildPlaybooksListHref({ projectId, source: 'next_deo_win' }));
    }
  };

  const isFree = planId === 'free' || !planId;

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 shadow-sm mb-6">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
            <svg
              className="h-5 w-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-purple-900">
            Next DEO win: Fix missing SEO metadata
          </h3>
          <p className="mt-1 text-xs text-purple-800">
            Use Playbooks to fix missing SEO titles and descriptions in bulk,
            with preview and token-aware estimates before you apply changes.
          </p>

          {/* Affected products snippet */}
          <div className="mt-2 text-xs text-purple-700">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-3 w-3 animate-spin text-purple-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Checking products for missing SEO...
              </span>
            ) : estimateError ? (
              <span className="text-purple-600 italic">
                We&apos;ll scan for missing SEO metadata when you open Playbooks.
              </span>
            ) : (
              <span>
                {missingTitles !== null && (
                  <>Missing SEO titles: {missingTitles} products</>
                )}
                {missingTitles !== null && missingDescriptions !== null && ' • '}
                {missingDescriptions !== null && (
                  <>Missing descriptions: {missingDescriptions} products</>
                )}
              </span>
            )}
          </div>

          {/* Highlights */}
          <ul className="mt-3 space-y-1 text-xs text-purple-700">
            <li className="flex items-start gap-1.5">
              <svg
                className="h-3.5 w-3.5 flex-shrink-0 text-purple-500 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Preview AI suggestions for a sample of products
            </li>
            <li className="flex items-start gap-1.5">
              <svg
                className="h-3.5 w-3.5 flex-shrink-0 text-purple-500 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              See estimated token usage and plan eligibility
            </li>
            <li className="flex items-start gap-1.5">
              <svg
                className="h-3.5 w-3.5 flex-shrink-0 text-purple-500 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Apply fixes in safe batches when you&apos;re ready
            </li>
          </ul>

          {/* Plan-aware messaging */}
          <p className="mt-3 text-[11px] text-purple-600">
            {isFree
              ? 'Available on Pro and Business plans. You can still preview suggestions before upgrading.'
              : 'Your plan supports bulk automations with token-aware safeguards.'}
          </p>

          {/* CTA */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleOpenPlaybooks}
              className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Open Playbooks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
