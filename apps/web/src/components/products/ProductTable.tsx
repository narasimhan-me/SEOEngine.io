import { useMemo, useState } from 'react';
import Link from 'next/link';

import type { DeoIssue } from '@/lib/deo-issues';
import type { DeoPillarId } from '@/lib/deo-pillars';
import { getDeoPillarById } from '@/lib/deo-pillars';
import type { Product } from '@/lib/products';
import { ProductRow, type PillarIssueSummary } from './ProductRow';

/** Health states for the new decision-first UI */
export type HealthState = 'Healthy' | 'Needs Attention' | 'Critical';

/** Health filter options */
type HealthFilter = 'All' | HealthState;

/** Sort options */
type SortOption = 'Priority' | 'Title';

/** Pillar priority order for tie-breaking recommended action */
const PILLAR_PRIORITY: DeoPillarId[] = [
  'metadata_snippet_quality',
  'search_intent_fit',
  'content_commerce_signals',
  'technical_indexability',
  'media_accessibility',
  'competitive_positioning',
  'offsite_signals',
  'local_discovery',
];

/** Map pillar ID to human-readable action text (no taxonomy words) */
const PILLAR_TO_ACTION: Record<DeoPillarId, string> = {
  metadata_snippet_quality: 'Fix missing metadata',
  search_intent_fit: 'Improve search intent',
  content_commerce_signals: 'Content optimization needed',
  technical_indexability: 'Fix technical issues',
  media_accessibility: 'Improve images and accessibility',
  competitive_positioning: 'Improve competitive positioning',
  offsite_signals: 'Build trust signals',
  local_discovery: 'Improve local discovery',
};

interface ProductTableProps {
  products: Product[];
  projectId: string;
  onScanProduct: (productId: string) => void;
  onSyncProducts: () => void;
  syncing: boolean;
  scanningId: string | null;
  productIssues?: DeoIssue[];
  isDeoDataStale?: boolean;
}

export function ProductTable({
  products,
  projectId,
  onScanProduct,
  onSyncProducts,
  syncing,
  scanningId,
  productIssues,
  isDeoDataStale = false,
}: ProductTableProps) {
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('All');
  const [sortOption, setSortOption] = useState<SortOption>('Priority');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Build enriched issue map with healthState and recommendedAction per product
  const issuesByProductId = useMemo(() => {
    const map = new Map<string, {
      count: number;
      maxSeverity: 'critical' | 'warning' | 'info' | null;
      healthState: HealthState;
      recommendedAction: string;
      byPillar: PillarIssueSummary[];
      issues: DeoIssue[];
    }>();

    if (!productIssues) return map;

    // First pass: group issues by product
    const issuesByProduct = new Map<string, DeoIssue[]>();
    for (const issue of productIssues) {
      for (const affectedProductId of issue.affectedProducts ?? []) {
        const existing = issuesByProduct.get(affectedProductId) ?? [];
        existing.push(issue);
        issuesByProduct.set(affectedProductId, existing);
      }
    }

    // Second pass: compute health state, recommended action, and pillar breakdown
    for (const [productId, issues] of issuesByProduct) {
      // Determine health state
      const hasCritical = issues.some((i) => i.severity === 'critical');
      const hasAnyIssue = issues.length > 0;
      const healthState: HealthState = hasCritical
        ? 'Critical'
        : hasAnyIssue
          ? 'Needs Attention'
          : 'Healthy';

      // Determine max severity
      let maxSeverity: 'critical' | 'warning' | 'info' | null = null;
      for (const issue of issues) {
        if (issue.severity === 'critical') {
          maxSeverity = 'critical';
          break;
        } else if (issue.severity === 'warning' && maxSeverity !== 'critical') {
          maxSeverity = 'warning';
        } else if (issue.severity === 'info' && !maxSeverity) {
          maxSeverity = 'info';
        }
      }

      // Compute recommended action (exactly one, deterministic)
      let recommendedAction = 'No action needed';
      if (issues.length > 0) {
        // Sort issues by: severity (critical > warning > info), then pillar priority, then id
        const sortedIssues = [...issues].sort((a, b) => {
          const severityOrder = { critical: 0, warning: 1, info: 2 };
          const sevA = severityOrder[a.severity] ?? 3;
          const sevB = severityOrder[b.severity] ?? 3;
          if (sevA !== sevB) return sevA - sevB;

          const pillarA = PILLAR_PRIORITY.indexOf(a.pillarId as DeoPillarId);
          const pillarB = PILLAR_PRIORITY.indexOf(b.pillarId as DeoPillarId);
          const priorityA = pillarA === -1 ? 999 : pillarA;
          const priorityB = pillarB === -1 ? 999 : pillarB;
          if (priorityA !== priorityB) return priorityA - priorityB;

          return a.id.localeCompare(b.id);
        });

        const topIssue = sortedIssues[0];
        const pillarId = topIssue.pillarId as DeoPillarId;
        recommendedAction = PILLAR_TO_ACTION[pillarId] ?? 'Review issues';
      }

      // Build pillar breakdown
      const byPillar: PillarIssueSummary[] = [];
      const pillarCounts = new Map<DeoPillarId, number>();
      for (const issue of issues) {
        const pillarId = issue.pillarId as DeoPillarId | undefined;
        if (pillarId) {
          pillarCounts.set(pillarId, (pillarCounts.get(pillarId) ?? 0) + 1);
        }
      }
      for (const [pillarId, count] of pillarCounts) {
        const pillar = getDeoPillarById(pillarId);
        byPillar.push({
          pillarId,
          label: pillar?.shortName ?? pillarId,
          count,
        });
      }

      map.set(productId, {
        count: issues.length,
        maxSeverity,
        healthState,
        recommendedAction,
        byPillar,
        issues,
      });
    }

    return map;
  }, [productIssues]);

  // Compute health counts for filter badges
  const healthCounts = useMemo(() => {
    const counts = { All: products.length, Healthy: 0, 'Needs Attention': 0, Critical: 0 };
    for (const product of products) {
      const data = issuesByProductId.get(product.id);
      const health = data?.healthState ?? 'Healthy';
      counts[health] += 1;
    }
    return counts;
  }, [products, issuesByProductId]);

  // Count products needing attention for Command Bar
  const needsAttentionCount = healthCounts['Needs Attention'] + healthCounts['Critical'];

  // Filter and sort products
  const displayProducts = useMemo(() => {
    let filtered = products;

    // Apply health filter
    if (healthFilter !== 'All') {
      filtered = products.filter((product) => {
        const data = issuesByProductId.get(product.id);
        return (data?.healthState ?? 'Healthy') === healthFilter;
      });
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortOption === 'Title') {
        return a.title.localeCompare(b.title);
      }
      // Priority: Critical first, then Needs Attention, then Healthy
      const healthOrder: Record<HealthState, number> = { Critical: 0, 'Needs Attention': 1, Healthy: 2 };
      const healthA = issuesByProductId.get(a.id)?.healthState ?? 'Healthy';
      const healthB = issuesByProductId.get(b.id)?.healthState ?? 'Healthy';
      const orderDiff = healthOrder[healthA] - healthOrder[healthB];
      if (orderDiff !== 0) return orderDiff;
      // Secondary sort by issue count (descending)
      const countA = issuesByProductId.get(a.id)?.count ?? 0;
      const countB = issuesByProductId.get(b.id)?.count ?? 0;
      return countB - countA;
    });

    return sorted;
  }, [products, healthFilter, sortOption, issuesByProductId]);

  const handleToggleExpand = (productId: string) => {
    setExpandedProductId((current) => (current === productId ? null : productId));
  };

  const healthFilters: { id: HealthFilter; label: string }[] = [
    { id: 'All', label: 'All' },
    { id: 'Critical', label: 'Critical' },
    { id: 'Needs Attention', label: 'Needs Attention' },
    { id: 'Healthy', label: 'Healthy' },
  ];

  return (
    <div>
      {/* Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          {needsAttentionCount > 0 ? (
            <>
              <span className="font-medium text-gray-900">
                {needsAttentionCount} product{needsAttentionCount !== 1 ? 's' : ''} need attention
              </span>
              <Link
                href={`/projects/${projectId}/automation/playbooks`}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Fix in bulk
              </Link>
            </>
          ) : (
            <span className="font-medium text-green-700">All products are healthy</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Health Filter */}
          <div className="flex flex-wrap gap-1.5">
            {healthFilters.map(({ id, label }) => {
              const isActive = healthFilter === id;
              const count = healthCounts[id];

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setHealthFilter(id)}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`ml-1.5 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Priority">Sort: Priority</option>
            <option value="Title">Sort: Title</option>
          </select>
        </div>
      </div>

      {displayProducts.length === 0 ? (
        <div className="px-4 py-6 text-sm text-gray-500">
          No products match this filter.
        </div>
      ) : (
        <div className="space-y-3 px-4 py-4">
          {displayProducts.map((product) => {
            const isExpanded = expandedProductId === product.id;
            const productIssueData = issuesByProductId.get(product.id);

            return (
              <ProductRow
                key={product.id}
                product={product}
                projectId={projectId}
                healthState={productIssueData?.healthState ?? 'Healthy'}
                recommendedAction={productIssueData?.recommendedAction ?? 'No action needed'}
                issuesByPillar={productIssueData?.byPillar}
                showRescan={isDeoDataStale}
                isExpanded={isExpanded}
                onToggle={() => handleToggleExpand(product.id)}
                onScan={() => onScanProduct(product.id)}
                onSyncProject={onSyncProducts}
                isSyncing={syncing}
                isScanning={scanningId === product.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
