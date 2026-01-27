import type { DeoIssue } from '@/lib/deo-issues';
import type { ContentPage, ContentStatus } from '@/lib/content';
import { getPageTypeLabel } from '@/lib/content';
// [ISSUE-TO-FIX-PATH-1 FIXUP-1] Import from lib module
import { ISSUE_UI_CONFIG } from '@/lib/issue-ui-config';
// [ISSUE-TO-FIX-PATH-1 FIXUP-2] Import safe title/description helpers to prevent internal ID leakage
import {
  getSafeIssueTitle,
  getSafeIssueDescription,
} from '@/lib/issue-to-fix-path';

interface ContentDeoInsightsPanelProps {
  page: ContentPage;
  status: ContentStatus;
  pageIssues?: DeoIssue[];
}

export function ContentDeoInsightsPanel({
  page,
  status,
  pageIssues,
}: ContentDeoInsightsPanelProps) {
  // Calculate word count info
  const wordCount = page.wordCount ?? 0;

  const getContentDepthLabel = () => {
    if (wordCount < 100) return { label: 'Very short', color: 'text-red-600' };
    if (wordCount < 300) return { label: 'Short', color: 'text-orange-600' };
    if (wordCount < 600) return { label: 'Average', color: 'text-yellow-600' };
    if (wordCount < 1000) return { label: 'Good', color: 'text-green-600' };
    return { label: 'Comprehensive', color: 'text-green-700' };
  };

  const contentDepth = getContentDepthLabel();

  // Get status info
  const statusInfo = (() => {
    switch (status) {
      case 'healthy':
        return { label: 'Healthy', color: 'text-green-600' };
      case 'missing-metadata':
        return { label: 'Missing Metadata', color: 'text-yellow-600' };
      case 'thin-content':
        return { label: 'Thin Content', color: 'text-orange-600' };
      case 'error':
        return { label: 'Error', color: 'text-red-600' };
      default:
        return { label: 'Unknown', color: 'text-gray-600' };
    }
  })();

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">DEO Insights</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Content health and SEO signals
        </p>
      </div>

      <div className="space-y-4 p-4">
        {/* Basic metadata checks */}
        <div>
          <div className="mb-2 text-xs font-medium uppercase text-gray-500">
            Metadata
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Title Tag</span>
              <span
                className={
                  page.title?.trim()
                    ? 'font-medium text-green-600'
                    : 'font-medium text-red-600'
                }
              >
                {page.title?.trim() ? 'Present' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Meta Description</span>
              <span
                className={
                  page.metaDescription?.trim()
                    ? 'font-medium text-green-600'
                    : 'font-medium text-red-600'
                }
              >
                {page.metaDescription?.trim() ? 'Present' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">H1 Tag</span>
              <span
                className={
                  page.h1?.trim()
                    ? 'font-medium text-green-600'
                    : 'font-medium text-yellow-600'
                }
              >
                {page.h1?.trim() ? 'Present' : 'Missing'}
              </span>
            </div>
          </div>
        </div>

        {/* Content depth */}
        <div className="border-t border-gray-100 pt-4">
          <div className="mb-2 text-xs font-medium uppercase text-gray-500">
            Content Depth
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Word Count</span>
              <span className="font-medium text-gray-900">
                {wordCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Content Rating</span>
              <span className={`font-medium ${contentDepth.color}`}>
                {contentDepth.label}
              </span>
            </div>
          </div>
        </div>

        {/* Crawl health */}
        <div className="border-t border-gray-100 pt-4">
          <div className="mb-2 text-xs font-medium uppercase text-gray-500">
            Crawl Health
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">HTTP Status</span>
              <span
                className={`font-medium ${
                  page.statusCode >= 200 && page.statusCode < 400
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {page.statusCode}
              </span>
            </div>
            {page.loadTimeMs !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Load Time</span>
                <span
                  className={`font-medium ${
                    page.loadTimeMs < 1000
                      ? 'text-green-600'
                      : page.loadTimeMs < 3000
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {page.loadTimeMs}ms
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Page Type</span>
              <span className="font-medium text-gray-900">
                {getPageTypeLabel(page.pageType)}
              </span>
            </div>
          </div>
        </div>

        {/* Overall status */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-gray-500">
              Overall Status
            </span>
            <span className={`text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* DEO Issues for this page */}
        {pageIssues && pageIssues.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <div className="mb-2 text-xs font-medium uppercase text-gray-500">
              DEO Issues
            </div>
            <div className="space-y-2">
              {pageIssues.map((issue) => {
                // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Use human-readable label, never show internal ID
                // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Use safe helpers to prevent internal ID leakage in fallback
                const config = ISSUE_UI_CONFIG[issue.id] ?? {
                  label: getSafeIssueTitle(issue),
                  description: getSafeIssueDescription(issue),
                };
                const severityColors = {
                  critical: 'border-red-200 bg-red-50 text-red-700',
                  warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
                  info: 'border-blue-200 bg-blue-50 text-blue-700',
                };
                return (
                  <div
                    key={issue.id}
                    className={`rounded-md border px-3 py-2 ${severityColors[issue.severity]}`}
                  >
                    <div className="text-xs font-medium">{config.label}</div>
                    {config.description && (
                      <div className="mt-0.5 text-[10px] opacity-80">
                        {config.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* [ISSUE-FIX-ROUTE-INTEGRITY-1] Planned Features - explicit labeling */}
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium text-gray-600">Planned Features</p>
          <p className="mb-2 text-[10px] text-gray-400">These features are on our roadmap but not yet available.</p>
          <ul className="space-y-0.5 text-xs text-gray-500">
            <li>- Entity structure analysis</li>
            <li>- Indexability status</li>
            <li>- SERP features eligibility</li>
            <li>- Core Web Vitals</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
