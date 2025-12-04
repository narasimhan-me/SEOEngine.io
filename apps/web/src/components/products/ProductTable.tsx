import { useMemo, useState } from 'react';

import type { DeoIssue } from '@engineo/shared';
import type { Product, ProductStatus } from '@/lib/products';
import { getProductStatus } from '@/lib/products';
import { ProductRow } from './ProductRow';

type ProductFilter = 'all' | ProductStatus;

interface ProductTableProps {
  products: Product[];
  projectId: string;
  onScanProduct: (productId: string) => void;
  onSuggestMetadata: (productId: string) => void;
  onSyncProducts: () => void;
  syncing: boolean;
  scanningId: string | null;
  suggestingId: string | null;
  loadingSuggestion: boolean;
  productIssues?: DeoIssue[];
}

export function ProductTable({
  products,
  projectId,
  onScanProduct,
  onSuggestMetadata,
  onSyncProducts,
  syncing,
  scanningId,
  suggestingId,
  loadingSuggestion,
  productIssues,
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

  // Build a map of issues by product ID for quick lookup
  const issuesByProductId = useMemo(() => {
    const map = new Map<string, { count: number; maxSeverity: 'critical' | 'warning' | 'info' | null }>();
    if (!productIssues) return map;

    for (const issue of productIssues) {
      for (const affectedProductId of issue.affectedProducts ?? []) {
        const existing = map.get(affectedProductId);
        const currentMax = existing?.maxSeverity ?? null;
        let newMax: 'critical' | 'warning' | 'info' | null = currentMax;

        // Determine highest severity (critical > warning > info)
        if (issue.severity === 'critical') {
          newMax = 'critical';
        } else if (issue.severity === 'warning' && currentMax !== 'critical') {
          newMax = 'warning';
        } else if (issue.severity === 'info' && !currentMax) {
          newMax = 'info';
        }

        map.set(affectedProductId, {
          count: (existing?.count ?? 0) + 1,
          maxSeverity: newMax,
        });
      }
    }

    return map;
  }, [productIssues]);

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
            const productIssueData = issuesByProductId.get(product.id);

            return (
              <ProductRow
                key={product.id}
                product={product}
                projectId={projectId}
                status={status}
                isExpanded={isExpanded}
                onToggle={() => handleToggleExpand(product.id)}
                onScan={() => onScanProduct(product.id)}
                onOptimize={() => onSuggestMetadata(product.id)}
                onSyncProject={onSyncProducts}
                isSyncing={syncing}
                isScanning={scanningId === product.id}
                isOptimizing={loadingSuggestion && suggestingId === product.id}
                issueCount={productIssueData?.count}
                maxIssueSeverity={productIssueData?.maxSeverity}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
