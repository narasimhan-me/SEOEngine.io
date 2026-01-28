import type { DeoIssue } from '@/lib/deo-issues';

interface IssuesSummaryCardProps {
  issues: DeoIssue[];
  loading?: boolean;
  error?: string | null;
  onViewAll: () => void;
  /** [DRAFT-LIFECYCLE-VISIBILITY-1] Count of issues with saved drafts pending application */
  pendingDraftsCount?: number;
  /** [ISSUE-FIX-ROUTE-INTEGRITY-1] Count of issues that are blocked (not actionable) */
  blockedCount?: number;
}

export function IssuesSummaryCard({
  issues,
  loading,
  error,
  onViewAll,
  pendingDraftsCount = 0,
  blockedCount = 0,
}: IssuesSummaryCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Issues Summary</h3>
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <div className="flex-1">
            <div className="mb-1 h-3 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;
  const total = issues.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Issues Summary</h3>
          <p className="mt-1 text-xs text-gray-500">
            Based on the latest crawl and DEO analysis.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          data-testid="issues-summary-view-all-button"
          className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          View All Issues
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600">
          Failed to load issues. Some data may be missing.
        </p>
      )}

      {total === 0 && !error ? (
        <div className="mt-3 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
          <span className="font-medium">No issues detected 🎉</span>
          <span className="ml-1">
            Your DEO looks healthy based on the latest crawl.
          </span>
        </div>
      ) : null}

      {total > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SummaryPill
            label="Critical"
            count={criticalCount}
            colorClasses="bg-red-50 text-red-700 border-red-200"
          />
          <SummaryPill
            label="Warning"
            count={warningCount}
            colorClasses="bg-orange-50 text-orange-700 border-orange-200"
          />
          <SummaryPill
            label="Info"
            count={infoCount}
            colorClasses="bg-blue-50 text-blue-700 border-blue-200"
          />
        </div>
      )}

      {total > 0 && (
        <p className="mt-3 text-[11px] text-gray-500">
          {total} issue categor{total === 1 ? 'y' : 'ies'} identified across
          pages and products.
        </p>
      )}

      {/* [ISSUE-FIX-ROUTE-INTEGRITY-1] Blocked issues indicator */}
      {blockedCount > 0 && (
        <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 border border-gray-200">
          <span className="font-medium">
            {blockedCount} issue{blockedCount === 1 ? '' : 's'} blocked
          </span>
          <span className="ml-1">
            — no fix available in current context
          </span>
        </div>
      )}

      {/* [DRAFT-LIFECYCLE-VISIBILITY-1] Pending drafts indicator */}
      {pendingDraftsCount > 0 && (
        <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 border border-blue-200">
          <span className="font-medium">
            {pendingDraftsCount} draft{pendingDraftsCount === 1 ? '' : 's'} saved
          </span>
          <span className="ml-1">
            — ready to apply to Shopify
          </span>
        </div>
      )}
    </div>
  );
}

interface SummaryPillProps {
  label: string;
  count: number;
  colorClasses: string;
}

function SummaryPill({ label, count, colorClasses }: SummaryPillProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${colorClasses}`}
    >
      <span className="font-medium">{label}</span>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
        {count}
      </span>
    </div>
  );
}
