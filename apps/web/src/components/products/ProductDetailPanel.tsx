import type { Product } from '@/lib/products';

interface ProductDetailPanelProps {
  product: Product;
}

export function ProductDetailPanel({ product }: ProductDetailPanelProps) {
  const metaTitle = product.seoTitle?.trim() || null;
  const metaDescription = product.seoDescription?.trim() || null;

  const formattedLastSynced = product.lastSyncedAt
    ? new Date(product.lastSyncedAt).toLocaleString()
    : 'Not available';

  return (
    <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <div className="grid gap-4 md:grid-cols-2">
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

        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Alt text coverage
          </div>
          <div className="mt-1 text-gray-900">
            <span className="text-gray-400 italic">
              Not tracked yet for products
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Issues
          </div>
          <div className="mt-1 text-gray-900">
            <span className="text-gray-400 italic">
              No issue data attached to products yet
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Last synced
          </div>
          <div className="mt-1 text-gray-900">{formattedLastSynced}</div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Last optimized
          </div>
          <div className="mt-1 text-gray-900">
            <span className="text-gray-400 italic">Not available</span>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-semibold uppercase text-gray-500">
            URL
          </div>
          <div className="mt-1 text-gray-900">
            <span className="text-gray-400 italic">
              URL not stored on product records yet
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

