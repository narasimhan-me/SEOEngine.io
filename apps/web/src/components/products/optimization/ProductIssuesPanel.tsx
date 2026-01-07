'use client';

import Link from 'next/link';

import type { DeoIssue } from '@/lib/deo-issues';
import type { DeoPillarId } from '@/lib/deo-pillars';
import { DEO_PILLARS } from '@/lib/deo-pillars';

interface ProductIssuesPanelProps {
  productId: string;
  projectId: string;
  issues: DeoIssue[];
}

interface IssuesByPillar {
  pillarId: DeoPillarId;
  label: string;
  issues: DeoIssue[];
}

/**
 * [DEO-UX-REFRESH-1] Product Issues Panel
 *
 * Displays DEO issues grouped by pillar with "Fix next" guidance.
 * Shows the highest-severity issue as the recommended next fix.
 */
export function ProductIssuesPanel({
  productId,
  projectId,
  issues,
}: ProductIssuesPanelProps) {
  // Group issues by pillar
  const issuesByPillar: IssuesByPillar[] = [];
  const pillarMap = new Map<DeoPillarId, DeoIssue[]>();

  for (const issue of issues) {
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

  // Find highest severity issue across all for "Fix next" guidance
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sortedIssues = [...issues].sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );
  const fixNextIssue = sortedIssues[0] ?? null;

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900">No issues found</h3>
        <p className="mt-1 text-xs text-gray-500">
          This product has no detected DEO issues. Great work!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {issues.length} DEO {issues.length === 1 ? 'issue' : 'issues'}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Grouped by pillar for easier prioritization
          </p>
        </div>
        {fixNextIssue && (
          <FixNextBadge issue={fixNextIssue} projectId={projectId} productId={productId} />
        )}
      </div>

      {/* Issues by pillar */}
      <div className="space-y-4">
        {issuesByPillar.map((group) => (
          <div
            key={group.pillarId}
            className="rounded-lg border border-gray-200 bg-white"
          >
            <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">
                {group.label}
              </h4>
              <span className="text-xs text-gray-500">
                {group.issues.length} {group.issues.length === 1 ? 'issue' : 'issues'}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {group.issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} projectId={projectId} productId={productId} />
              ))}
            </div>
          </div>
        ))}
      </div>
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
  // Determine which tab to navigate to for fixing
  const tabForPillar: Record<string, string> = {
    metadata_snippet_quality: 'metadata',
    content_commerce_signals: 'metadata',
    media_accessibility: 'metadata',
    search_intent_fit: 'search-intent',
    competitive_positioning: 'competitors',
    offsite_signals: 'metadata',
    local_discovery: 'metadata',
    technical_indexability: 'metadata',
  };

  const pillarId = issue.pillarId ?? 'metadata_snippet_quality';
  const targetTab = tabForPillar[pillarId] ?? 'metadata';
  const href = `/projects/${projectId}/products/${productId}?tab=${targetTab}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
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
      Fix next: {issue.title.slice(0, 30)}{issue.title.length > 30 ? '...' : ''}
    </Link>
  );
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-2] Pillar to tab mapping for deterministic routing
const PILLAR_TO_TAB_MAP: Record<DeoPillarId, string> = {
  metadata_snippet_quality: 'metadata',
  content_commerce_signals: 'answers',
  search_intent_fit: 'search-intent',
  competitive_positioning: 'competitors',
  offsite_signals: 'metadata',
  media_accessibility: 'metadata',
  local_discovery: 'metadata',
  technical_indexability: 'metadata',
};

function IssueRow({
  issue,
  projectId,
  productId,
}: {
  issue: DeoIssue;
  projectId: string;
  productId: string;
}) {
  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-orange-100 text-orange-800 border-orange-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-2] Deep-link to the fix tab
  const pillarId = issue.pillarId as DeoPillarId | undefined;
  const targetTab = pillarId ? PILLAR_TO_TAB_MAP[pillarId] ?? 'metadata' : 'metadata';
  const href = `/projects/${projectId}/products/${productId}?tab=${targetTab}&from=product_issues&issueId=${issue.id}`;

  return (
    <Link
      href={href}
      className="px-4 py-3 flex items-start gap-3 hover:bg-blue-50/50 transition-colors cursor-pointer"
    >
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
          severityColors[issue.severity] ?? severityColors.info
        }`}
      >
        {issue.severity}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{issue.title}</p>
        <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
          {issue.whyItMatters || issue.description}
        </p>
        {issue.recommendedFix && (
          <p className="mt-1 text-xs text-gray-500">
            <span className="font-medium">Recommended fix:</span>{' '}
            {issue.recommendedFix}
          </p>
        )}
      </div>
      {issue.aiFixable && (
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
          AI fixable
        </span>
      )}
    </Link>
  );
}
