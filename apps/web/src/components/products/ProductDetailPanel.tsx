import Link from 'next/link';

import type { Product } from '@/lib/products';
import type { PillarIssueSummary } from './ProductRow';

interface ProductDetailPanelProps {
  product: Product;
  projectId: string;
  issuesByPillar?: PillarIssueSummary[];
}

export function ProductDetailPanel({
  product,
  projectId,
  issuesByPillar,
}: ProductDetailPanelProps) {
  const metaTitle = product.seoTitle?.trim() || null;
  const metaDescription = product.seoDescription?.trim() || null;

  const formattedLastSynced = product.lastSyncedAt
    ? new Date(product.lastSyncedAt).toLocaleString()
    : 'Not available';

  const workspacePath = `/projects/${projectId}/products/${product.id}`;

  return (
    <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-700">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Product Identifiers */}
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Handle / ID
          </div>
          <div className="mt-1 text-gray-900 break-words">
            {product.handle ?? product.externalId ?? 'Not available'}
          </div>
        </div>

        {/* Last synced */}
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Last synced
          </div>
          <div className="mt-1 text-gray-900">{formattedLastSynced}</div>
        </div>

        {/* Meta title */}
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Meta title
          </div>
          <div className="mt-1 text-gray-900 break-words">
            {metaTitle ? (
              metaTitle
            ) : (
              <span className="text-gray-400 italic">Not set</span>
            )}
          </div>
        </div>

        {/* Meta description */}
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Meta description
          </div>
          <div className="mt-1 text-gray-900 break-words">
            {metaDescription ? (
              metaDescription
            ) : (
              <span className="text-gray-400 italic">Not set</span>
            )}
          </div>
        </div>

        {/* Issues by pillar with deep links */}
        <div className="md:col-span-2">
          <div className="text-xs font-semibold uppercase text-gray-500">
            Issues by category
          </div>
          <div className="mt-2">
            {issuesByPillar && issuesByPillar.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {issuesByPillar.map((pillar) => (
                  <Link
                    key={pillar.pillarId}
                    href={`${workspacePath}?tab=issues&pillar=${pillar.pillarId}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                  >
                    <span>{pillar.label}</span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                      {pillar.count}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 italic text-xs">
                No issues detected
              </span>
            )}
          </div>
        </div>

        {/* Alt text coverage */}
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Alt text coverage
          </div>
          <div className="mt-1 text-gray-900">
            <span className="text-gray-400 italic">
              View in product workspace
            </span>
          </div>
        </div>

        {/* Last optimized */}
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Last optimized
          </div>
          <div className="mt-1 text-gray-900">
            <span className="text-gray-400 italic">Not available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
