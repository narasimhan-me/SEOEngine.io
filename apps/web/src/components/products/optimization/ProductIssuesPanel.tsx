'use client';

import Link from 'next/link';

import type { DeoIssue, CanonicalCountTriplet } from '@/lib/deo-issues';
import type { DeoPillarId } from '@/lib/deo-pillars';
import { DEO_PILLARS } from '@/lib/deo-pillars';
import {
  buildIssueFixHref,
  getSafeIssueTitle,
  getSafeIssueDescription,
  getActionableIssuesForProduct,
} from '@/lib/issue-to-fix-path';

// [COUNT-INTEGRITY-1.1 PATCH 6] Add summary prop for triplet display
interface ProductIssuesPanelProps {
  productId: string;
  projectId: string;
  issues: DeoIssue[];
  summary?: {
    detected: CanonicalCountTriplet;
    actionable: CanonicalCountTriplet;
  } | null;
}

interface IssuesByPillar {
  pillarId: DeoPillarId;
  label: string;
  issues: DeoIssue[];
}

/**
 * [DEO-UX-REFRESH-1] Product Issues Panel
 * [ISSUE-TO-FIX-PATH-1] Updated to filter to actionable issues only
 *
 * Displays DEO issues grouped by pillar with "Fix next" guidance.
 * Shows the highest-severity issue as the recommended next fix.
 * ONLY shows issues that are actionable in the product workspace.
 */
export function ProductIssuesPanel({
  productId,
  projectId,
  issues,
  summary,
}: ProductIssuesPanelProps) {
  // [ISSUE-TO-FIX-PATH-1] Filter to actionable issues only
  const actionableIssues = getActionableIssuesForProduct(issues);

  // [COUNT-INTEGRITY-1.1 PATCH 6] Derive zero-actionable state
  const hasZeroActionable = summary
    ? summary.actionable.actionableNowCount === 0
    : actionableIssues.length === 0;

  // Group issues by pillar
  const issuesByPillar: IssuesByPillar[] = [];
  const pillarMap = new Map<DeoPillarId, DeoIssue[]>();

  for (const issue of actionableIssues) {
    const pillarId = issue.pillarId as DeoPillarId | undefined;
    if (pillarId) {
      const existing = pillarMap.get(pillarId) || [];
      existing.push(issue);
      pillarMap.set(pillarId, existing);
    }
  }

  // Convert to sorted array based on DEO_PILLARS order
  for (const pillar of DEO_PILLARS) {
    const pillarIssues = pillarMap.get(pillar.id);
    if (pillarIssues && pillarIssues.length > 0) {
      issuesByPillar.push({
        pillarId: pillar.id,
        label: pillar.shortName,
        issues: pillarIssues,
      });
    }
  }

  // Find highest severity actionable issue for "Fix next" guidance
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sortedIssues = [...actionableIssues].sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );
  const fixNextIssue = sortedIssues[0] ?? null;

  // [COUNT-INTEGRITY-1.1 FIX-UP] Removed early return - triplet must always render when summary provided
  // Zero-actionable state is handled below with the neutral message

  return (
    <div className="space-y-6">
      {/* [COUNT-INTEGRITY-1.1 FIX-UP] Canonical triplet summary display - always visible when summary provided */}
      {/* [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only triplet container */}
      {summary && (
        <div
          className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4"
          data-testid="product-issues-triplet"
        >
          <div
            className="text-center"
            data-testid="product-triplet-issue-types"
          >
            <div
              className="text-xl font-semibold text-foreground"
              data-testid="product-triplet-issue-types-value"
            >
              {/* Use detected counts to show asset-scoped detected issues even when zero actionable */}
              {summary.detected.issueTypesCount}
            </div>
            <div className="text-xs text-muted-foreground">Issue types</div>
          </div>
          <div
            className="text-center"
            data-testid="product-triplet-items-affected"
          >
            <div
              className="text-xl font-semibold text-foreground"
              data-testid="product-triplet-items-affected-value"
            >
              {summary.detected.affectedItemsCount}
            </div>
            <div className="text-xs text-muted-foreground">Items affected</div>
          </div>
          <div
            className="text-center"
            data-testid="product-triplet-actionable-now"
          >
            <div
              className="text-xl font-semibold text-foreground"
              data-testid="product-triplet-actionable-now-value"
            >
              {summary.actionable.actionableNowCount}
            </div>
            <div className="text-xs text-muted-foreground">Actionable now</div>
          </div>
        </div>
      )}

      {/* [COUNT-INTEGRITY-1.1 PATCH 6] Zero-actionable suppression message */}
      {/* [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only warning styling */}
      {/* [ISSUE-FIX-ROUTE-INTEGRITY-1] Clear explanation when no actions available */}
      {hasZeroActionable && (
        <div
          className="rounded-lg border border-border bg-[hsl(var(--warning-background))] p-4 text-center"
          data-testid="product-no-eligible-items-message"
        >
          <p className="text-sm text-[hsl(var(--warning-foreground))]">
            No items currently eligible for action.
          </p>
        </div>
      )}

      {/* [COUNT-INTEGRITY-1.1 FIX-UP] Only show actionable issue list when there are actionable issues */}
      {actionableIssues.length > 0 && (
        <>
          {/* Summary header */}
          <div className="flex items-center justify-between">
            <div>
              {/* [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only text styling */}
              <h3
                className="text-sm font-semibold text-foreground"
                data-testid="product-issues-actionable-count"
              >
                {actionableIssues.length} actionable{' '}
                {actionableIssues.length === 1 ? 'issue' : 'issues'}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Grouped by pillar for easier prioritization
              </p>
            </div>
            {/* [COUNT-INTEGRITY-1.1 PATCH 6] Suppress Fix next badge when zero actionable */}
            {fixNextIssue && !hasZeroActionable && (
              <FixNextBadge
                issue={fixNextIssue}
                projectId={projectId}
                productId={productId}
              />
            )}
          </div>

          {/* Issues by pillar */}
          <div className="space-y-4">
            {/* [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only pillar group styling */}
            {issuesByPillar.map((group) => (
              <div
                key={group.pillarId}
                className="rounded-lg border border-border bg-[hsl(var(--surface-card))]"
              >
                <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">
                    {group.label}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {group.issues.length}{' '}
                    {group.issues.length === 1 ? 'issue' : 'issues'}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {group.issues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      projectId={projectId}
                      productId={productId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FixNextBadge({
  issue,
  projectId,
  productId,
}: {
  issue: DeoIssue;
  projectId: string;
  productId: string;
}) {
  // [ISSUE-TO-FIX-PATH-1] Use buildIssueFixHref for deterministic routing
  const href = buildIssueFixHref({
    projectId,
    issue,
    primaryProductId: productId,
  });
  const safeTitle = getSafeIssueTitle(issue);

  // If no fix href (shouldn't happen for actionable issues), don't render
  if (!href) return null;

  // [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only primary CTA styling
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <svg
        className="h-3.5 w-3.5"
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
      Fix next: {safeTitle.slice(0, 30)}
      {safeTitle.length > 30 ? '...' : ''}
    </Link>
  );
}

function IssueRow({
  issue,
  projectId,
  productId,
}: {
  issue: DeoIssue;
  projectId: string;
  productId: string;
}) {
  // [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only severity colors
  const severityColors = {
    critical:
      'border-border bg-[hsl(var(--danger-background))] text-[hsl(var(--danger-foreground))]',
    warning:
      'border-border bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]',
    info: 'border-border bg-[hsl(var(--info-background))] text-[hsl(var(--info-foreground))]',
  };

  // [ISSUE-TO-FIX-PATH-1] Use buildIssueFixHref for deterministic routing
  const href = buildIssueFixHref({
    projectId,
    issue,
    primaryProductId: productId,
  });
  const safeTitle = getSafeIssueTitle(issue);
  const safeDescription = getSafeIssueDescription(issue);

  // [ISSUE-FIX-ROUTE-INTEGRITY-1] Handle gracefully with explicit blocked state explanation
  // [ISSUE-FIX-ROUTE-INTEGRITY-1] Non-actionable rows render as static (no dead clicks)
  if (!href) {
    return (
      <div className="px-4 py-3 flex items-start gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
            severityColors[issue.severity] ?? severityColors.info
          }`}
        >
          {issue.severity}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{safeTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {safeDescription}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/70 italic">
            Fix not available in this workspace. Review in Issues Engine for guidance.
          </p>
        </div>
      </div>
    );
  }

  // [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only row hover and text styling
  return (
    <Link
      href={href}
      data-testid="product-issue-row-actionable"
      className="px-4 py-3 flex items-start gap-3 hover:bg-[hsl(var(--surface-raised))] transition-colors cursor-pointer"
    >
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
          severityColors[issue.severity] ?? severityColors.info
        }`}
      >
        {issue.severity}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{safeTitle}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {issue.whyItMatters || safeDescription}
        </p>
        {issue.recommendedFix && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Recommended fix:</span>{' '}
            {issue.recommendedFix}
          </p>
        )}
        {/* [COUNT-INTEGRITY-1.1 Step 2B] Store-wide impact display */}
        {issue.assetTypeCounts && (
          <div className="mt-2 flex gap-2 text-[11px] text-muted-foreground border-t border-border pt-2">
            <span title="Total products affected across store">
              <strong>{issue.assetTypeCounts.products}</strong> product
              {issue.assetTypeCounts.products !== 1 ? 's' : ''}
            </span>
            {issue.assetTypeCounts.pages > 0 && (
              <>
                <span>•</span>
                <span title="Total pages affected across store">
                  <strong>{issue.assetTypeCounts.pages}</strong> page
                  {issue.assetTypeCounts.pages !== 1 ? 's' : ''}
                </span>
              </>
            )}
            {issue.assetTypeCounts.collections > 0 && (
              <>
                <span>•</span>
                <span title="Total collections affected across store">
                  <strong>{issue.assetTypeCounts.collections}</strong>{' '}
                  collection{issue.assetTypeCounts.collections !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      {/* [UI-POLISH-&-CLARITY-1 FIXUP-1] AI fixable badge - de-emphasized neutral token styling */}
      {issue.aiFixable && (
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          AI fixable
        </span>
      )}
    </Link>
  );
}
