import { useMemo, useState } from 'react';

import type { Product } from '@/lib/products';
import { ProductRow, type ProductStatus } from './ProductRow';

type ProductFilter = 'all' | ProductStatus;

interface ProductTableProps {
  products: Product[];
  onScanProduct: (productId: string) => void;
  onSuggestMetadata: (productId: string) => void;
  onSyncProducts: () => void;
  syncing: boolean;
  scanningId: string | null;
  suggestingId: string | null;
  loadingSuggestion: boolean;
}

export function ProductTable({
  products,
  onScanProduct,
  onSuggestMetadata,
  onSyncProducts,
  syncing,
  scanningId,
  suggestingId,
  loadingSuggestion,
}: ProductTableProps) {
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const statusCounts = useMemo(
    () =>
      products.reduce(
        (acc, product) => {
          const status = getProductStatus(product);
          acc[status] += 1;
          acc.all += 1;
          return acc;
        },
        {
          all: 0,
          optimized: 0,
          'needs-optimization': 0,
          'missing-metadata': 0,
        } as Record<ProductFilter, number>,
      ),
    [products],
  );

  const filteredProducts = useMemo(() => {
    if (filter === 'all') {
      return products;
    }
    return products.filter((product) => getProductStatus(product) === filter);
  }, [products, filter]);

  const handleToggleExpand = (productId: string) => {
    setExpandedProductId((current) => (current === productId ? null : productId));
  };

  const filters: { id: ProductFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'needs-optimization', label: 'Needs Optimization' },
    { id: 'optimized', label: 'Optimized' },
    { id: 'missing-metadata', label: 'Missing Metadata' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {filters.map(({ id, label }) => {
            const isActive = filter === id;
            const count = statusCounts[id] ?? 0;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{label}</span>
                <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-gray-500">
          Showing {filteredProducts.length} of {statusCounts.all} products
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="px-4 py-6 text-sm text-gray-500">
          No products match this filter.
        </div>
      ) : (
        <div className="space-y-3 px-4 py-3">
          {filteredProducts.map((product) => {
            const status = getProductStatus(product);
            const isExpanded = expandedProductId === product.id;

            return (
              <ProductRow
                key={product.id}
                product={product}
                status={status}
                isExpanded={isExpanded}
                onToggle={() => handleToggleExpand(product.id)}
                onScan={() => onScanProduct(product.id)}
                onOptimize={() => onSuggestMetadata(product.id)}
                onSyncProject={onSyncProducts}
                isSyncing={syncing}
                isScanning={scanningId === product.id}
                isOptimizing={loadingSuggestion && suggestingId === product.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function getProductStatus(product: Product): ProductStatus {
  const hasTitle = !!product.seoTitle?.trim();
  const hasDescription = !!product.seoDescription?.trim();

  if (!hasTitle && !hasDescription) {
    return 'missing-metadata';
  }

  const titleLength = product.seoTitle?.length ?? 0;
  const descriptionLength = product.seoDescription?.length ?? 0;

  const titleNeedsWork = titleLength > 0 && (titleLength < 30 || titleLength > 60);
  const descriptionNeedsWork =
    descriptionLength > 0 && (descriptionLength < 70 || descriptionLength > 155);

  if (!hasTitle || !hasDescription || titleNeedsWork || descriptionNeedsWork) {
    return 'needs-optimization';
  }

  return 'optimized';
}
