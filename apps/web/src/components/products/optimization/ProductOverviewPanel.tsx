import Image from 'next/image';

import type { Product, ProductStatus } from '@/lib/products';

interface ProductOverviewPanelProps {
  product: Product;
  status: ProductStatus;
}

export function ProductOverviewPanel({
  product,
  status,
}: ProductOverviewPanelProps) {
  const statusLabel =
    status === 'optimized'
      ? 'Optimized'
      : status === 'needs-optimization'
        ? 'Needs optimization'
        : 'Missing metadata';

  const statusClasses =
    status === 'optimized'
      ? 'bg-green-50 text-green-800 ring-1 ring-green-100'
      : status === 'needs-optimization'
        ? 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-100'
        : 'bg-red-50 text-red-800 ring-1 ring-red-100';

  const formatPrice = (
    price: number | null | undefined,
    currency: string | null | undefined
  ) => {
    if (price == null) return 'Not available';
    const currencyCode = currency || 'USD';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(price);
    } catch {
      return `${price} ${currencyCode}`;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not tracked yet';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">
        Product Overview
      </h3>

      {/* Thumbnail and title */}
      <div className="mb-4 flex items-start gap-3">
        {product.imageUrls && product.imageUrls.length > 0 ? (
          <Image
            src={product.imageUrls[0]}
            alt={product.title}
            width={40}
            height={40}
            className="h-10 w-10 flex-shrink-0 rounded object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-sm font-medium text-gray-900"
            title={product.title}
          >
            {product.title}
          </div>
          <div className="mt-0.5 truncate text-xs text-gray-500">
            {product.handle ?? product.externalId}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Price</span>
          <span className="font-medium text-gray-900">
            {formatPrice(product.price, product.currency)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Shopify Status</span>
          <span className="font-medium text-gray-900">
            {product.shopifyStatus || 'Not available'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Last Synced</span>
          <span className="text-xs text-gray-700">
            {formatDate(product.lastSyncedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Last Optimized</span>
          <span className="text-xs text-gray-700">
            {formatDate(product.lastOptimizedAt)}
          </span>
        </div>
      </div>

      {/* Status chip */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Status</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
