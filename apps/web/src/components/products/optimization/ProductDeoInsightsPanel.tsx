import { useState } from 'react';
import type { DeoIssue } from '@/lib/deo-issues';
import type { Product } from '@/lib/products';
import { getProductStatus } from '@/lib/products';
import { ISSUE_UI_CONFIG } from '@/components/issues/IssuesList';

interface ProductDeoInsightsPanelProps {
  product: Product;
  productIssues?: DeoIssue[];
}

export function ProductDeoInsightsPanel({ product, productIssues }: ProductDeoInsightsPanelProps) {
  // Calculate word count from description
  const wordCount = product.description
    ? product.description.trim().split(/\s+/).filter(Boolean).length
    : 0;

  // Content depth label
  const getContentDepthLabel = () => {
    if (wordCount < 50) return { label: 'Very short', color: 'text-red-600' };
    if (wordCount < 150) return { label: 'Short', color: 'text-yellow-600' };
    if (wordCount < 400) return { label: 'Moderate', color: 'text-blue-600' };
    return { label: 'Rich', color: 'text-green-600' };
  };

  const contentDepth = getContentDepthLabel();

  // Metadata completeness
  const hasTitlePresent = !!product.seoTitle?.trim();
  const hasDescriptionPresent = !!product.seoDescription?.trim();

  // Thin content flag
  const isThinContent =
    wordCount < 100 && (!product.seoDescription?.trim() || product.seoDescription.length < 50);

  // Overall status
  const status = getProductStatus(product);
  const statusInfoMap: Record<string, { label: string; color: string }> = {
    'missing-metadata': { label: 'Missing key metadata', color: 'text-red-600' },
    'needs-optimization': { label: 'Needs optimization', color: 'text-yellow-600' },
    optimized: { label: 'Looks good', color: 'text-green-600' },
  };
  const statusInfo = statusInfoMap[status] ?? { label: 'Unknown', color: 'text-gray-600' };

  const [expanded, setExpanded] = useState(false);

  const contentDepthSummary = `${wordCount} words — ${contentDepth.label}`;

  const metadataSummary = `SEO Title: ${
    hasTitlePresent ? 'Present' : 'Missing'
  }, SEO Description: ${hasDescriptionPresent ? 'Present' : 'Missing'}`;

  return (
    <div
      id="deo-issues-section"
      className="rounded-lg border border-gray-200 bg-white p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900">DEO / SEO Insights</h3>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {expanded ? 'Collapse issues & recommendations' : 'Expand issues & recommendations'}
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-md bg-gray-50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Metadata & Content Status</span>
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            {contentDepthSummary}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {metadataSummary}
          </div>
          {/* Note about overall status not being global DEO verdict */}
          {productIssues && productIssues.length > 0 && status === 'optimized' && (
            <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 px-2 py-1 text-[10px] text-yellow-800">
              DEO issues present — see below. Metadata may look good, but other DEO signals need attention.
            </div>
          )}
        </div>

        {expanded && (
          <div className="space-y-4">
            {/* Content Depth */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-gray-500">
                  Content Depth
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-700">{wordCount} words</span>
                <span className={`text-sm font-medium ${contentDepth.color}`}>
                  {contentDepth.label}
                </span>
              </div>
            </div>

            {/* Metadata Completeness */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase text-gray-500">
                Metadata Completeness
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">SEO Title</span>
                  <span className="flex items-center gap-1">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        hasTitlePresent ? 'bg-green-500' : 'bg-red-400'
                      }`}
                    />
                    <span className="text-xs text-gray-500">
                      {hasTitlePresent ? 'Present' : 'Missing'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">SEO Description</span>
                  <span className="flex items-center gap-1">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        hasDescriptionPresent ? 'bg-green-500' : 'bg-red-400'
                      }`}
                    />
                    <span className="text-xs text-gray-500">
                      {hasDescriptionPresent ? 'Present' : 'Missing'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Thin Content Warning */}
            {isThinContent && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-xs font-medium text-yellow-800">
                    Potential thin content
                  </span>
                </div>
              </div>
            )}

            {/* Overall Status */}
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

            {/* DEO Issues for this product */}
            {productIssues && productIssues.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="mb-2 text-xs font-medium uppercase text-gray-500">
                  DEO Issues
                </div>
                <div className="space-y-2">
                  {productIssues.map((issue) => {
                    // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Use human-readable label, never show internal ID
                    const config = ISSUE_UI_CONFIG[issue.id] ?? {
                      label: issue.title ?? 'Issue detected',
                      description: issue.description ?? '',
                    };
                    const severityColors = {
                      critical: 'border-red-200 bg-red-50 text-red-700',
                      warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
                      info: 'border-blue-200 bg-blue-50 text-blue-700',
                    };
                    return (
                      <div
                        key={issue.id}
                        className={`rounded-md border px-3 py-2 ${
                          severityColors[issue.severity]
                        }`}
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

            {/* Coming Soon / Roadmap */}
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
              <p className="mb-1 text-xs font-medium text-gray-600">Coming Soon</p>
              <ul className="space-y-0.5 text-xs text-gray-500">
                <li>- Crawl health signals</li>
                <li>- Indexability analysis</li>
                <li>- Entity coverage metrics</li>
                <li>- SERP visibility insights</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
