import type { DeoIssue } from '@engineo/shared';
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
  const statusInfo = {
    'missing-metadata': { label: 'Missing key metadata', color: 'text-red-600' },
    'needs-optimization': { label: 'Needs optimization', color: 'text-yellow-600' },
    optimized: { label: 'Looks good', color: 'text-green-600' },
  }[status];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">DEO / SEO Insights</h3>

      <div className="space-y-4">
        {/* Content Depth */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-gray-500">Content Depth</span>
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
                  className={`h-2 w-2 rounded-full ${hasTitlePresent ? 'bg-green-500' : 'bg-red-400'}`}
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
                  className={`h-2 w-2 rounded-full ${hasDescriptionPresent ? 'bg-green-500' : 'bg-red-400'}`}
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
            <span className="text-xs font-medium uppercase text-gray-500">Overall Status</span>
            <span className={`text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* DEO Issues for this product */}
        {productIssues && productIssues.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <div className="mb-2 text-xs font-medium uppercase text-gray-500">DEO Issues</div>
            <div className="space-y-2">
              {productIssues.map((issue) => {
                const config = ISSUE_UI_CONFIG[issue.id] ?? {
                  label: issue.id,
                  description: '',
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
                      <div className="mt-0.5 text-[10px] opacity-80">{config.description}</div>
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
    </div>
  );
}
