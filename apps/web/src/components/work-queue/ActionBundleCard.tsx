'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { WorkQueueActionBundle, WorkQueueViewer } from '@/lib/work-queue';
import {
  getReturnToFromCurrentUrl,
  withRouteContext,
} from '@/lib/route-context';
// [DRAFT-AI-ENTRYPOINT-CLARITY-1] AI boundary note for generation entrypoints
import { DraftAiBoundaryNote } from '@/components/common/DraftAiBoundaryNote';
// [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] Use centralized routing helper
import {
  buildPlaybookRunHref,
  isValidPlaybookId,
  type PlaybookId,
} from '@/lib/playbooks-routing';
// [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-3] RCP integration
import {
  useRightContextPanel,
  type ContextDescriptor,
} from '@/components/right-context-panel/RightContextPanelProvider';

/**
 * Eye icon for View details button.
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-3]
 */
function ViewDetailsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

// Bundle type labels (module-scoped for reuse in getBundleDescriptor)
const BUNDLE_TYPE_LABELS: Record<string, string> = {
  ASSET_OPTIMIZATION: 'Issue',
  AUTOMATION_RUN: 'Automation',
  GEO_EXPORT: 'Export',
};

// State labels (module-scoped for reuse in getBundleDescriptor)
const STATE_LABELS: Record<string, string> = {
  NEW: 'New',
  PREVIEWED: 'Previewed',
  DRAFTS_READY: 'Drafts Ready',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  APPLIED: 'Applied',
  FAILED: 'Failed',
  BLOCKED: 'Blocked',
};

/**
 * Format state for display.
 */
function formatState(state: string): string {
  return STATE_LABELS[state] || state;
}

interface ActionBundleCardProps {
  bundle: WorkQueueActionBundle;
  projectId: string;
  viewer?: WorkQueueViewer;
  isHighlighted?: boolean;
  onRefresh?: () => void;
}

/**
 * [WORK-QUEUE-1] Action Bundle Card
 *
 * Fixed layout order:
 * 1. Health pill + bundle type tag
 * 2. Title = recommendedActionLabel
 * 3. Scope line: "Applies to N ..." + preview list (+N more)
 * 4. Badges row: Approval badge (if required) + AI usage badge
 * 5. Footer: Primary CTA + Secondary CTA (max 2 visible)
 */
export function ActionBundleCard({
  bundle,
  projectId,
  viewer,
  isHighlighted,
  onRefresh: _onRefresh,
}: ActionBundleCardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-3] RCP integration
  const { openPanel } = useRightContextPanel();

  // Build ContextDescriptor for work_item (bundle)
  // [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Fixed metadata keys
  const getBundleDescriptor = useCallback((): ContextDescriptor => {
    // Build metadata object with required fields
    const metadata: Record<string, string> = {
      bundleType: BUNDLE_TYPE_LABELS[bundle.bundleType] || bundle.bundleType,
      health: bundle.health,
      state: formatState(bundle.state),
      scopeType: bundle.scopeType,
      // [FIXUP-4] Add scopeActionable for renderer
      scopeActionable: String(bundle.scopeCount),
      aiUsage: bundle.aiUsage,
      approvalStatus: bundle.approval?.approvalStatus || 'Not required',
    };

    // [FIXUP-4] Add scopeDetected if available
    if (
      bundle.scopeDetectedCount !== undefined &&
      bundle.scopeDetectedCount !== null
    ) {
      metadata.scopeDetected = String(bundle.scopeDetectedCount);
    }

    // [FIXUP-4] Add aiDisclosureText (truth-preserving)
    if (bundle.aiDisclosureText) {
      metadata.aiDisclosureText = bundle.aiDisclosureText;
    }

    return {
      kind: 'work_item',
      id: bundle.bundleId,
      title: bundle.recommendedActionLabel,
      subtitle: `${bundle.health} - ${formatState(bundle.state)}`,
      scopeProjectId: projectId,
      metadata,
    };
  }, [bundle, projectId]);

  // [ROUTE-INTEGRITY-1] Compute returnTo from current URL
  const returnTo = useMemo(() => {
    return getReturnToFromCurrentUrl(pathname, searchParams);
  }, [pathname, searchParams]);

  // Health pill styling
  const healthStyles: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    NEEDS_ATTENTION: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    HEALTHY: 'bg-green-100 text-green-700 border-green-200',
  };

  // State badge styling
  const stateStyles: Record<string, string> = {
    NEW: 'bg-gray-100 text-gray-700',
    PREVIEWED: 'bg-blue-100 text-blue-700',
    DRAFTS_READY: 'bg-green-100 text-green-700',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    APPLIED: 'bg-gray-100 text-gray-600',
    FAILED: 'bg-red-100 text-red-700',
    BLOCKED: 'bg-orange-100 text-orange-700',
  };

  // Derive CTAs based on state and bundle type
  const { primaryCta, secondaryCta, disabledReason } = deriveCtas(
    bundle,
    viewer
  );

  // Build CTA route
  const ctaRoute = getCTARoute(bundle, projectId);

  // [ROUTE-INTEGRITY-1] Wrap ctaRoute with from=work_queue + returnTo
  const ctaRouteWithContext = useMemo(() => {
    return withRouteContext(ctaRoute, { from: 'work_queue', returnTo });
  }, [ctaRoute, returnTo]);

  return (
    <div
      data-testid="action-bundle-card"
      data-bundle-id={bundle.bundleId}
      className={`rounded-lg border bg-white p-4 shadow-sm transition-all ${
        isHighlighted
          ? 'border-blue-400 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Row 1: Health pill + bundle type tag + Details button */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
            healthStyles[bundle.health]
          }`}
        >
          {bundle.health === 'CRITICAL' && (
            <svg
              className="mr-1 h-3 w-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {bundle.health}
        </span>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {BUNDLE_TYPE_LABELS[bundle.bundleType] || bundle.bundleType}
        </span>
        {/* [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-based icon button */}
        <button
          type="button"
          onClick={() => openPanel(getBundleDescriptor())}
          title="View details in panel"
          aria-label={`View details for ${bundle.recommendedActionLabel}`}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ViewDetailsIcon className="h-3.5 w-3.5" />
        </button>
        <span
          className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            stateStyles[bundle.state]
          }`}
        >
          {formatState(bundle.state)}
        </span>
      </div>

      {/* Row 2: Title */}
      <h3 className="mt-3 text-lg font-semibold text-gray-900">
        {bundle.recommendedActionLabel}
      </h3>

      {/* Row 3: Scope line */}
      {/* [ASSETS-PAGES-1] Updated to show correct scope type label */}
      {/* [COUNT-INTEGRITY-1.1 PATCH 8] Add "Actionable now" display with test hooks */}
      <p
        className="mt-1 text-sm text-gray-600"
        data-testid="action-bundle-scope"
      >
        {bundle.bundleType === 'ASSET_OPTIMIZATION' ? (
          <>
            {bundle.scopeCount > 0 ? (
              <>
                <span
                  className="font-medium"
                  data-testid="action-bundle-actionable-now"
                >
                  {bundle.scopeCount} actionable now
                </span>{' '}
                affecting{' '}
                {getScopeTypeLabel(bundle.scopeType, bundle.scopeCount)}
                {bundle.scopeDetectedCount != null &&
                  bundle.scopeDetectedCount !== bundle.scopeCount && (
                    <span className="text-gray-500">
                      {' '}
                      ({bundle.scopeDetectedCount} detected)
                    </span>
                  )}
              </>
            ) : (
              // [COUNT-INTEGRITY-1.1 FIX-UP] Strict zero-actionable suppression
              <span data-testid="action-bundle-zero-actionable">
                <span className="font-medium text-amber-700">
                  No items currently eligible for action.
                </span>
                {bundle.scopeDetectedCount != null &&
                  bundle.scopeDetectedCount > 0 && (
                    <>
                      {' '}
                      <span className="text-gray-500">
                        ({bundle.scopeDetectedCount} detected issue
                        {bundle.scopeDetectedCount !== 1
                          ? 's'
                          : ''} affecting{' '}
                        {getScopeTypeLabel(
                          bundle.scopeType,
                          bundle.scopeDetectedCount
                        )}
                        )
                      </span>
                    </>
                  )}
              </span>
            )}
            {bundle.scopePreviewList.length > 0 && (
              <>
                :{' '}
                <span className="text-gray-500">
                  {bundle.scopePreviewList.slice(0, 5).join(', ')}
                  {bundle.scopePreviewList.length > 5 &&
                    ` ${bundle.scopePreviewList[bundle.scopePreviewList.length - 1]}`}
                </span>
              </>
            )}
          </>
        ) : (
          <>
            {bundle.scopeCount === 0 ? (
              // [COUNT-INTEGRITY-1.1 FIX-UP] Strict zero-actionable suppression (consistent copy)
              <span
                className="font-medium text-amber-700"
                data-testid="action-bundle-zero-actionable"
              >
                No items currently eligible for action.
              </span>
            ) : (
              <>
                Applies to{' '}
                <span className="font-medium">
                  {bundle.scopeCount}{' '}
                  {getScopeTypeLabel(bundle.scopeType, bundle.scopeCount)}
                </span>
                {bundle.scopePreviewList.length > 0 && (
                  <>
                    :{' '}
                    <span className="text-gray-500">
                      {bundle.scopePreviewList.slice(0, 5).join(', ')}
                      {bundle.scopePreviewList.length > 5 &&
                        ` ${bundle.scopePreviewList[bundle.scopePreviewList.length - 1]}`}
                    </span>
                  </>
                )}
              </>
            )}
          </>
        )}
      </p>

      {/* Row 4: Badges row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Approval badge */}
        {bundle.approval?.approvalRequired && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              bundle.approval.approvalStatus === 'APPROVED'
                ? 'bg-green-100 text-green-700'
                : bundle.approval.approvalStatus === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-700'
                  : bundle.approval.approvalStatus === 'REJECTED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
            }`}
          >
            {bundle.approval.approvalStatus === 'APPROVED' && (
              <svg
                className="mr-1 h-3 w-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {bundle.approval.approvalStatus === 'PENDING'
              ? 'Pending Approval'
              : ''}
            {bundle.approval.approvalStatus === 'APPROVED' ? 'Approved' : ''}
            {bundle.approval.approvalStatus === 'REJECTED' ? 'Rejected' : ''}
            {bundle.approval.approvalStatus === 'NOT_REQUESTED'
              ? 'Approval Required'
              : ''}
          </span>
        )}

        {/* AI usage badge */}
        {/* [COUNT-INTEGRITY-1.1 PATCH 8] Trust-building AI badge copy */}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            bundle.aiUsage === 'NONE'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-purple-100 text-purple-700'
          }`}
          title={bundle.aiDisclosureText}
          data-testid={`action-bundle-ai-badge-${bundle.aiUsage.toLowerCase()}`}
        >
          {bundle.aiUsage === 'NONE' ? (
            'Does not use AI'
          ) : (
            <>
              <svg
                className="mr-1 h-3 w-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
                <path d="M10 5a1 1 0 011 1v4.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 019 11V6a1 1 0 011-1z" />
              </svg>
              AI used for drafts only
            </>
          )}
        </span>

        {/* Draft coverage badge */}
        {bundle.draft && bundle.draft.draftStatus !== 'NONE' && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {bundle.draft.draftCount} drafts ({bundle.draft.draftCoverage}%
            coverage)
          </span>
        )}

        {/* GEO share link status */}
        {bundle.geoExport && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            Share links: {bundle.geoExport.shareLinkStatus}
          </span>
        )}
      </div>

      {/* Row 5: Footer CTAs */}
      {/* [ROUTE-INTEGRITY-1] Use ctaRouteWithContext for deterministic from+returnTo */}
      <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
        {/* [ERROR-&-BLOCKED-STATE-UX-1] Disabled reason shown ABOVE button for visibility */}
        {disabledReason && (
          <div
            className="flex items-center gap-2 rounded-md bg-[hsl(var(--warning-background))] px-3 py-2 text-sm"
            role="status"
            aria-live="polite"
            data-testid="action-bundle-blocked-reason"
          >
            <svg
              className="h-4 w-4 flex-shrink-0 text-[hsl(var(--warning-foreground))]"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-[hsl(var(--warning-foreground))]">
              {disabledReason}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {primaryCta && (
            <Link
              href={disabledReason ? '#' : ctaRouteWithContext}
              className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                disabledReason
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              onClick={(e) => {
                if (disabledReason) {
                  e.preventDefault();
                }
              }}
              // [ERROR-&-BLOCKED-STATE-UX-1] Accessibility: aria-disabled and aria-describedby
              aria-disabled={!!disabledReason}
              aria-describedby={disabledReason ? 'action-bundle-blocked-reason' : undefined}
              tabIndex={disabledReason ? -1 : undefined}
            >
              {primaryCta}
            </Link>
          )}
          {secondaryCta && (
            <Link
              href={ctaRouteWithContext}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {secondaryCta}
            </Link>
          )}
        </div>
        {/* [DRAFT-AI-ENTRYPOINT-CLARITY-1] Show AI boundary note for generation CTAs */}
        {(primaryCta === 'Generate Drafts' ||
          primaryCta === 'Generate Full Drafts') && (
          <DraftAiBoundaryNote mode="generate" />
        )}
      </div>
    </div>
  );
}

/**
 * [ASSETS-PAGES-1] Get scope type label for display.
 */
function getScopeTypeLabel(scopeType: string, count: number): string {
  const singular: Record<string, string> = {
    PRODUCTS: 'product',
    PAGES: 'page',
    COLLECTIONS: 'collection',
    STORE_WIDE: 'store-wide',
  };
  const plural: Record<string, string> = {
    PRODUCTS: 'products',
    PAGES: 'pages',
    COLLECTIONS: 'collections',
    STORE_WIDE: 'store-wide',
  };

  if (scopeType === 'STORE_WIDE') {
    return 'store-wide';
  }

  return count === 1
    ? singular[scopeType] || scopeType
    : plural[scopeType] || scopeType;
}

/**
 * Derive CTAs based on bundle state and viewer capabilities.
 * [ASSETS-PAGES-1.1-UI-HARDEN] Now handles missing scope for PAGES/COLLECTIONS.
 */
function deriveCtas(
  bundle: WorkQueueActionBundle,
  viewer?: WorkQueueViewer
): {
  primaryCta: string | null;
  secondaryCta: string | null;
  disabledReason: string | null;
} {
  const { state, bundleType, approval } = bundle;
  const canApply = viewer?.capabilities.canApply ?? false;
  const canApprove = viewer?.capabilities.canApprove ?? false;
  const canGenerateDrafts = viewer?.capabilities.canGenerateDrafts ?? false;
  const canRequestApproval = viewer?.capabilities.canRequestApproval ?? false;

  // [ASSETS-PAGES-1.1-UI-HARDEN] Block actions for PAGES/COLLECTIONS without deterministic scope
  if (hasMissingScope(bundle)) {
    return {
      primaryCta: 'View Details',
      secondaryCta: null,
      disabledReason:
        'Missing scope for pages/collections. Return to Work Queue.',
    };
  }

  // GEO Export special case
  if (bundleType === 'GEO_EXPORT') {
    return {
      primaryCta: 'View Export Options',
      secondaryCta: null,
      disabledReason: null,
    };
  }

  // [COUNT-INTEGRITY-1.1 FIX-UP] Strict zero-actionable suppression for ALL bundle types
  // 0 eligible = no action surfaces (except APPLIED history). GEO_EXPORT already handled above.
  if (bundle.scopeCount === 0 && state !== 'APPLIED') {
    return {
      primaryCta: null,
      secondaryCta: null,
      disabledReason: 'No items currently eligible for action.',
    };
  }
  // State-driven CTAs
  switch (state) {
    case 'NEW':
      if (bundleType === 'AUTOMATION_RUN') {
        return {
          primaryCta: canGenerateDrafts ? 'Generate Drafts' : 'View Details',
          secondaryCta: null,
          disabledReason: canGenerateDrafts
            ? null
            : 'Viewer role cannot generate drafts',
        };
      }
      return {
        primaryCta: 'View Issues',
        secondaryCta: null,
        disabledReason: null,
      };

    case 'PREVIEWED':
      return {
        primaryCta: canGenerateDrafts ? 'Generate Full Drafts' : 'View Preview',
        secondaryCta: 'View Preview',
        disabledReason: canGenerateDrafts
          ? null
          : 'Viewer role cannot generate drafts',
      };

    case 'DRAFTS_READY':
      if (
        approval?.approvalRequired &&
        approval.approvalStatus !== 'APPROVED'
      ) {
        return {
          primaryCta: canRequestApproval ? 'Request Approval' : 'View Drafts',
          secondaryCta: 'View Drafts',
          disabledReason: 'Approval required before apply',
        };
      }
      return {
        primaryCta: canApply ? 'Apply Changes' : 'View Drafts',
        secondaryCta: 'View Drafts',
        disabledReason: canApply ? null : 'Only owners can apply changes',
      };

    case 'PENDING_APPROVAL':
      return {
        primaryCta: canApprove ? 'Approve & Apply' : 'View Drafts',
        secondaryCta: canApprove ? 'Reject' : null,
        disabledReason: canApprove ? null : 'Awaiting owner approval',
      };

    case 'APPROVED':
      return {
        primaryCta: canApply ? 'Apply Changes' : 'View Drafts',
        secondaryCta: 'View Drafts',
        disabledReason: canApply ? null : 'Only owners can apply changes',
      };

    case 'APPLIED':
      return {
        primaryCta: 'View Results',
        secondaryCta: null,
        disabledReason: null,
      };

    case 'FAILED':
      return {
        primaryCta: canGenerateDrafts ? 'Retry' : 'View Details',
        secondaryCta: 'View Error',
        disabledReason: null,
      };

    case 'BLOCKED':
      return {
        primaryCta: 'View Details',
        secondaryCta: null,
        disabledReason: 'Action blocked - drafts may be expired',
      };

    default:
      return {
        primaryCta: 'View Details',
        secondaryCta: null,
        disabledReason: null,
      };
  }
}

/**
 * [ASSETS-PAGES-1.1-UI-HARDEN] Extract handle-only scope refs from bundle for deep linking.
 * Returns an array of refs like ['page_handle:about-us', 'page_handle:contact'] or null if not available.
 *
 * For PAGES/COLLECTIONS bundles, we need deterministic handle-based refs.
 * These come from scopeQueryRef (if it contains handle refs) or are derived from the bundle ID.
 */
function extractScopeAssetRefs(bundle: WorkQueueActionBundle): string[] | null {
  const { scopeType, scopeQueryRef, bundleId } = bundle;

  // Only relevant for PAGES/COLLECTIONS
  if (scopeType !== 'PAGES' && scopeType !== 'COLLECTIONS') {
    return null;
  }

  // Check if scopeQueryRef contains handle-based refs (comma-separated)
  if (scopeQueryRef) {
    const prefix =
      scopeType === 'PAGES' ? 'page_handle:' : 'collection_handle:';
    if (scopeQueryRef.includes(prefix)) {
      // scopeQueryRef might be a comma-separated list of refs
      return scopeQueryRef
        .split(',')
        .map((ref) => ref.trim())
        .filter((ref) => ref.length > 0);
    }
  }

  // Try to extract from bundleId if it contains handle refs
  // Bundle ID format: AUTOMATION_RUN:FIX_MISSING_METADATA:{playbookId}:{assetType}:{projectId}:{scopeRef}
  const bundleIdParts = bundleId.split(':');
  if (bundleIdParts.length >= 6) {
    // The last part might contain scope refs
    const potentialRefs = bundleIdParts.slice(5).join(':');
    if (potentialRefs.includes('_handle:')) {
      return potentialRefs
        .split(',')
        .map((ref) => ref.trim())
        .filter((ref) => ref.length > 0);
    }
  }

  // No deterministic refs available
  return null;
}

/**
 * [ASSETS-PAGES-1.1-UI-HARDEN] Check if bundle has missing scope for PAGES/COLLECTIONS.
 * Returns true if the bundle requires scope but doesn't have it.
 */
function hasMissingScope(bundle: WorkQueueActionBundle): boolean {
  const { bundleType, scopeType } = bundle;

  // Only AUTOMATION_RUN bundles for PAGES/COLLECTIONS require scope
  if (bundleType !== 'AUTOMATION_RUN') {
    return false;
  }

  if (scopeType !== 'PAGES' && scopeType !== 'COLLECTIONS') {
    return false;
  }

  // Check if we have deterministic scope refs
  const refs = extractScopeAssetRefs(bundle);
  return refs === null || refs.length === 0;
}

/**
 * Get CTA route based on bundle type, scopeType, and action.
 * [ASSETS-PAGES-1] Routes PAGES/COLLECTIONS bundles to their respective asset lists.
 * [ASSETS-PAGES-1.1] AUTOMATION_RUN bundles now deep-link to playbooks with assetType param.
 * [ASSETS-PAGES-1.1-UI-HARDEN] Include scopeAssetRefs for PAGES/COLLECTIONS when available.
 */
function getCTARoute(bundle: WorkQueueActionBundle, projectId: string): string {
  const { bundleType, recommendedActionKey, scopeType } = bundle;

  // [TRUST-ROUTING-1] Fixed: route to /insights/geo-insights instead of ?tab=geo
  if (bundleType === 'GEO_EXPORT') {
    return `/projects/${projectId}/insights/geo-insights`;
  }

  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] Route AUTOMATION_RUN bundles via buildPlaybookRunHref
  if (bundleType === 'AUTOMATION_RUN') {
    // Extract playbookId from bundleId
    // Bundle ID format: AUTOMATION_RUN:FIX_MISSING_METADATA:{playbookId}:{assetType}:{projectId}
    const bundleIdParts = bundle.bundleId.split(':');
    const parsedPlaybookId =
      bundleIdParts.length >= 3 ? bundleIdParts[2] : null;
    const assetType = (
      bundleIdParts.length >= 4 ? bundleIdParts[3] : 'PRODUCTS'
    ) as 'PRODUCTS' | 'PAGES' | 'COLLECTIONS';

    // [FIXUP-1] Validate playbookId - default to missing_seo_title if invalid
    const playbookId: PlaybookId = isValidPlaybookId(parsedPlaybookId)
      ? parsedPlaybookId
      : 'missing_seo_title';

    // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Extract scopeAssetRefs for all asset types
    const scopeAssetRefs = extractScopeAssetRefs(bundle) ?? undefined;
    const hasScope = !!scopeAssetRefs && scopeAssetRefs.length > 0;

    return buildPlaybookRunHref({
      projectId,
      playbookId,
      step: 'preview',
      source: 'work_queue',
      assetType: hasScope ? assetType : undefined,
      scopeAssetRefs: hasScope ? scopeAssetRefs : undefined,
    });
  }

  // [COUNT-INTEGRITY-1 PATCH 5.2] All ASSET_OPTIMIZATION bundles route to Issues with click-integrity filters
  if (bundleType === 'ASSET_OPTIMIZATION') {
    const params = new URLSearchParams();

    // Always include actionKey and scopeType for filtering
    if (recommendedActionKey) {
      params.set('actionKey', recommendedActionKey);
    }
    params.set('scopeType', scopeType);

    // Set mode based on whether bundle has actionable issues
    params.set('mode', bundle.scopeCount > 0 ? 'actionable' : 'detected');

    // Include pillar fallback for stable behavior (same mapping as before)
    switch (recommendedActionKey) {
      case 'FIX_MISSING_METADATA':
        params.set('pillar', 'metadata_snippet_quality');
        break;
      case 'RESOLVE_TECHNICAL_ISSUES':
        params.set('pillar', 'technical_indexability');
        break;
      case 'IMPROVE_SEARCH_INTENT':
        params.set('pillar', 'search_intent_fit');
        break;
      case 'OPTIMIZE_CONTENT':
        params.set('pillar', 'content_commerce_signals');
        break;
    }

    return `/projects/${projectId}/issues?${params.toString()}`;
  }

  // [TRUST-ROUTING-1] Fallback - route to Issues Engine with pillar filter
  switch (recommendedActionKey) {
    case 'FIX_MISSING_METADATA':
      return `/projects/${projectId}/issues?pillar=metadata_snippet_quality`;
    case 'RESOLVE_TECHNICAL_ISSUES':
      return `/projects/${projectId}/issues?pillar=technical_indexability`;
    case 'IMPROVE_SEARCH_INTENT':
      return `/projects/${projectId}/issues?pillar=search_intent_fit`;
    case 'OPTIMIZE_CONTENT':
      return `/projects/${projectId}/issues?pillar=content_commerce_signals`;
    default:
      return `/projects/${projectId}/issues`;
  }
}
