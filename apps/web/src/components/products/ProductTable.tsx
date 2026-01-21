import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import type { DeoIssue } from '@/lib/deo-issues';
import type { DeoPillarId } from '@/lib/deo-pillars';
import { getDeoPillarById } from '@/lib/deo-pillars';
import type { Product } from '@/lib/products';
import { type PillarIssueSummary } from './ProductRow';
import { ProductDetailPanel } from './ProductDetailPanel';
import {
  resolveRowNextAction,
  buildProductWorkspaceHref,
  buildProductDraftsTabHref,
  type ResolvedRowNextAction,
  type NavigationContext,
} from '@/lib/list-actions-clarity';
import { buildIssueFixHref, getIssueFixConfig } from '@/lib/issue-to-fix-path';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { RowStatusChip } from '@/components/common/RowStatusChip';
import { useRightContextPanel } from '@/components/right-context-panel/RightContextPanelProvider';
import type { ContextDescriptor } from '@/components/right-context-panel/RightContextPanelProvider';

/** Health states for the new decision-first UI */
export type HealthState = 'Healthy' | 'Needs Attention' | 'Critical';

/** Health filter options */
type HealthFilter = 'All' | HealthState;

/** Sort options - Impact is the authoritative default */
type SortOption = 'Impact' | 'Title';

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

/** Issue types that indicate missing required metadata */
const MISSING_REQUIRED_METADATA_TYPES = [
  'missing_seo_title',
  'missing_seo_description',
];

/**
 * Category counts for impact-based sorting
 */
interface ImpactCategoryCounts {
  missingRequiredMetadataCount: number;
  technicalBlockingCount: number;
  metadataIssueCount: number;
  searchIntentIssueCount: number;
  contentIssueCount: number;
  combinedMetaAndIntentCount: number;
  totalIssueCount: number;
}

/**
 * Compute impact category counts from issues for a product
 */
function computeImpactCounts(issues: DeoIssue[]): ImpactCategoryCounts {
  let missingRequiredMetadataCount = 0;
  let technicalBlockingCount = 0;
  let metadataIssueCount = 0;
  let searchIntentIssueCount = 0;
  let contentIssueCount = 0;

  for (const issue of issues) {
    // Missing required metadata (by issue type)
    if (issue.type && MISSING_REQUIRED_METADATA_TYPES.includes(issue.type)) {
      missingRequiredMetadataCount++;
    }

    // Technical blocking (pillar + critical severity)
    if (
      issue.pillarId === 'technical_indexability' &&
      issue.severity === 'critical'
    ) {
      technicalBlockingCount++;
    }

    // Pillar-based counts
    if (issue.pillarId === 'metadata_snippet_quality') {
      metadataIssueCount++;
    }
    if (issue.pillarId === 'search_intent_fit') {
      searchIntentIssueCount++;
    }
    if (issue.pillarId === 'content_commerce_signals') {
      contentIssueCount++;
    }
  }

  return {
    missingRequiredMetadataCount,
    technicalBlockingCount,
    metadataIssueCount,
    searchIntentIssueCount,
    contentIssueCount,
    combinedMetaAndIntentCount: metadataIssueCount + searchIntentIssueCount,
    totalIssueCount: issues.length,
  };
}

/**
 * Get the impact category for Critical products (Group 1)
 * Returns: 0 = missing metadata, 1 = blocking technical, 2 = combined meta+intent, 3 = other
 */
function getCriticalCategory(counts: ImpactCategoryCounts): number {
  if (counts.missingRequiredMetadataCount > 0) return 0;
  if (counts.technicalBlockingCount > 0) return 1;
  if (counts.metadataIssueCount > 0 && counts.searchIntentIssueCount > 0)
    return 2;
  return 3;
}

/**
 * Get the primary count for the Critical category (for secondary sort)
 */
function getCriticalPrimaryCount(
  counts: ImpactCategoryCounts,
  category: number
): number {
  switch (category) {
    case 0:
      return counts.missingRequiredMetadataCount;
    case 1:
      return counts.technicalBlockingCount;
    case 2:
      return counts.combinedMetaAndIntentCount;
    default:
      return counts.totalIssueCount;
  }
}

/**
 * Get the impact category for Needs Attention products (Group 2)
 * Returns: 0 = search intent, 1 = content, 2 = metadata, 3 = other
 */
function getNeedsAttentionCategory(counts: ImpactCategoryCounts): number {
  if (counts.searchIntentIssueCount > 0) return 0;
  if (counts.contentIssueCount > 0) return 1;
  if (counts.metadataIssueCount > 0) return 2;
  return 3;
}

/**
 * Get the primary count for the Needs Attention category (for secondary sort)
 */
function getNeedsAttentionPrimaryCount(
  counts: ImpactCategoryCounts,
  category: number
): number {
  switch (category) {
    case 0:
      return counts.searchIntentIssueCount;
    case 1:
      return counts.contentIssueCount;
    case 2:
      return counts.metadataIssueCount;
    default:
      return counts.totalIssueCount;
  }
}

interface ProductTableProps {
  products: Product[];
  projectId: string;
  onScanProduct: (productId: string) => void;
  onSyncProducts: () => void;
  syncing: boolean;
  scanningId: string | null;
  productIssues?: DeoIssue[];
  isDeoDataStale?: boolean;
  /** [LIST-ACTIONS-CLARITY-1 FIXUP-1] Viewer can apply (OWNER-only) */
  canApply?: boolean;
  /** [LIST-ACTIONS-CLARITY-1 FIXUP-1] Viewer can request approval (OWNER/EDITOR) */
  canRequestApproval?: boolean;
  /** [LIST-ACTIONS-CLARITY-1 FIXUP-1] Current page path with query for returnTo */
  currentListPathWithQuery?: string;
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
  canApply = true,
  canRequestApproval = false,
  currentListPathWithQuery,
}: ProductTableProps) {
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('All');
  const [sortOption, setSortOption] = useState<SortOption>('Impact');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null
  );

  // Build enriched issue map with healthState, recommendedAction, and impact counts per product
  const issuesByProductId = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        maxSeverity: 'critical' | 'warning' | 'info' | null;
        healthState: HealthState;
        recommendedAction: string;
        byPillar: PillarIssueSummary[];
        issues: DeoIssue[];
        impactCounts: ImpactCategoryCounts;
      }
    >();

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

    // Second pass: compute health state, recommended action, pillar breakdown, and impact counts
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
        }
        if (issue.severity === 'warning' && maxSeverity !== 'warning') {
          maxSeverity = 'warning';
        } else if (issue.severity === 'info' && maxSeverity === null) {
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

      // Compute impact category counts
      const impactCounts = computeImpactCounts(issues);

      map.set(productId, {
        count: issues.length,
        maxSeverity,
        healthState,
        recommendedAction,
        byPillar,
        issues,
        impactCounts,
      });
    }

    return map;
  }, [productIssues]);

  // Compute health counts for filter badges
  const healthCounts = useMemo(() => {
    const counts = {
      All: products.length,
      Healthy: 0,
      'Needs Attention': 0,
      Critical: 0,
    };
    for (const product of products) {
      const data = issuesByProductId.get(product.id);
      const health = data?.healthState ?? 'Healthy';
      counts[health] += 1;
    }
    return counts;
  }, [products, issuesByProductId]);

  // Count products needing attention for Command Bar
  const needsAttentionCount =
    healthCounts['Needs Attention'] + healthCounts['Critical'];

  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Compute resolved row actions for each product
  // Uses buildIssueFixHref for deterministic issue→fix routing
  const resolvedActionsById = useMemo(() => {
    const map = new Map<string, ResolvedRowNextAction>();

    // [ROUTE-INTEGRITY-1] Build navigation context for returnTo propagation with from=asset_list
    const navContext: NavigationContext = {
      returnTo: currentListPathWithQuery || `/projects/${projectId}/products`,
      returnLabel: 'Products',
      from: 'asset_list',
    };

    for (const product of products) {
      const issueData = issuesByProductId.get(product.id);
      const issues = issueData?.issues ?? [];
      const hasDraftPendingApply = product.hasDraftPendingApply ?? false;

      // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Count only issues where:
      // 1. buildIssueFixHref returns non-null (has actionable fix destination)
      // Sort to get deterministic "next issue" (severity critical > warning > info, then pillar priority)
      const severityOrder: Record<string, number> = {
        critical: 0,
        warning: 1,
        info: 2,
      };
      const actionableIssues = issues
        .filter((issue) => {
          // [ROUTE-INTEGRITY-1] Use from=asset_list for consistent back navigation
          const fixHref = buildIssueFixHref({
            projectId,
            issue,
            primaryProductId: product.id,
            from: 'asset_list',
            returnTo: navContext.returnTo,
            returnLabel: navContext.returnLabel,
          });
          return fixHref !== null;
        })
        .sort((a, b) => {
          // Severity first (critical > warning > info)
          const sevA = severityOrder[a.severity] ?? 3;
          const sevB = severityOrder[b.severity] ?? 3;
          if (sevA !== sevB) return sevA - sevB;

          // Pillar priority second
          const pillarA = PILLAR_PRIORITY.indexOf(a.pillarId as DeoPillarId);
          const pillarB = PILLAR_PRIORITY.indexOf(b.pillarId as DeoPillarId);
          const priorityA = pillarA === -1 ? 999 : pillarA;
          const priorityB = pillarB === -1 ? 999 : pillarB;
          if (priorityA !== priorityB) return priorityA - priorityB;

          // Stable fallback: issue ID
          return a.id.localeCompare(b.id);
        });

      // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Use server-derived count as fallback when issues aren't available
      const actionableNowCount =
        actionableIssues.length > 0
          ? actionableIssues.length
          : (product.actionableNowCount ?? 0);

      // Deterministic "Fix next" links to the top actionable issue's fix destination
      let fixNextHref: string | null = null;
      // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-2] Track if next issue is DIAGNOSTIC for "Review" CTA
      let fixNextIsDiagnostic = false;
      if (actionableIssues.length > 0) {
        const nextIssue = actionableIssues[0];
        // [ROUTE-INTEGRITY-1] Use from=asset_list for consistent back navigation
        fixNextHref = buildIssueFixHref({
          projectId,
          issue: nextIssue,
          primaryProductId: product.id,
          from: 'asset_list',
          returnTo: navContext.returnTo,
          returnLabel: navContext.returnLabel,
        });
        // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-2] Check if next issue is DIAGNOSTIC
        const issueKey = (nextIssue.type as string | undefined) || nextIssue.id;
        const fixConfig = getIssueFixConfig(issueKey);
        fixNextIsDiagnostic = fixConfig?.fixKind === 'DIAGNOSTIC';
      }

      // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Pass server-derived blockedByApproval directly
      // [DRAFT-ENTRYPOINT-UNIFICATION-1] Products "Review drafts" routes to Product detail Drafts tab
      // LOCKED: "Product detail is the canonical draft review entrypoint."
      const resolved = resolveRowNextAction({
        assetType: 'products',
        hasDraftPendingApply,
        actionableNowCount,
        blockedByApproval: product.blockedByApproval,
        canApply, // fallback for backwards compat if blockedByApproval undefined
        canRequestApproval,
        fixNextHref,
        // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-2] Pass DIAGNOSTIC flag for "Review" CTA
        fixNextIsDiagnostic,
        openHref: buildProductWorkspaceHref(projectId, product.id, navContext),
        reviewDraftsHref: buildProductDraftsTabHref(
          projectId,
          product.id,
          navContext
        ),
      });

      map.set(product.id, resolved);
    }

    return map;
  }, [
    products,
    issuesByProductId,
    projectId,
    canApply,
    canRequestApproval,
    currentListPathWithQuery,
  ]);

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
        // Sort by title, then stable fallback
        const titleCmp = a.title.localeCompare(b.title);
        if (titleCmp !== 0) return titleCmp;
        return a.id.localeCompare(b.id);
      }

      // Sort by impact (authoritative ladder)
      const dataA = issuesByProductId.get(a.id);
      const dataB = issuesByProductId.get(b.id);
      const healthA = dataA?.healthState ?? 'Healthy';
      const healthB = dataB?.healthState ?? 'Healthy';

      // Primary: Health group (Critical=0, Needs Attention=1, Healthy=2)
      const healthOrder: Record<HealthState, number> = {
        Critical: 0,
        'Needs Attention': 1,
        Healthy: 2,
      };
      const healthDiff = healthOrder[healthA] - healthOrder[healthB];
      if (healthDiff !== 0) return healthDiff;

      // Default impact counts for products with no issues
      const defaultCounts: ImpactCategoryCounts = {
        missingRequiredMetadataCount: 0,
        technicalBlockingCount: 0,
        metadataIssueCount: 0,
        searchIntentIssueCount: 0,
        contentIssueCount: 0,
        combinedMetaAndIntentCount: 0,
        totalIssueCount: 0,
      };
      const countsA = dataA?.impactCounts ?? defaultCounts;
      const countsB = dataB?.impactCounts ?? defaultCounts;

      // Within-group ordering based on health state
      if (healthA === 'Critical') {
        // Critical ordering: missing metadata > blocking technical > combined meta+intent > other
        const catA = getCriticalCategory(countsA);
        const catB = getCriticalCategory(countsB);
        if (catA !== catB) return catA - catB;

        // Secondary: higher category count first (descending)
        const primaryCountA = getCriticalPrimaryCount(countsA, catA);
        const primaryCountB = getCriticalPrimaryCount(countsB, catB);
        if (primaryCountA !== primaryCountB)
          return primaryCountB - primaryCountA;
      } else if (healthA === 'Needs Attention') {
        // Needs Attention ordering: search intent > content > metadata > other
        const catA = getNeedsAttentionCategory(countsA);
        const catB = getNeedsAttentionCategory(countsB);
        if (catA !== catB) return catA - catB;

        // Secondary: higher category count first (descending)
        const primaryCountA = getNeedsAttentionPrimaryCount(countsA, catA);
        const primaryCountB = getNeedsAttentionPrimaryCount(countsB, catB);
        if (primaryCountA !== primaryCountB)
          return primaryCountB - primaryCountA;
      }
      // Healthy: no category ordering, fall through to stable sort

      // Stable fallback: recommended action (ascending), then title, then id
      const actionA = dataA?.recommendedAction ?? 'No action needed';
      const actionB = dataB?.recommendedAction ?? 'No action needed';
      const actionCmp = actionA.localeCompare(actionB);
      if (actionCmp !== 0) return actionCmp;

      const titleCmp = a.title.localeCompare(b.title);
      if (titleCmp !== 0) return titleCmp;

      return a.id.localeCompare(b.id);
    });

    return sorted;
  }, [products, healthFilter, sortOption, issuesByProductId]);

  const handleToggleExpand = useCallback((productId: string) => {
    setExpandedProductId((current) =>
      current === productId ? null : productId
    );
  }, []);

  const healthFilters: { id: HealthFilter; label: string }[] = [
    { id: 'All', label: 'All' },
    { id: 'Critical', label: 'Critical' },
    { id: 'Needs Attention', label: 'Needs Attention' },
    { id: 'Healthy', label: 'Healthy' },
  ];

  // Right Context Panel integration
  const { openPanel } = useRightContextPanel();

  // Get ContextDescriptor for a product row (for RCP integration)
  const getRowDescriptor = useCallback(
    (product: Product): ContextDescriptor => {
      const productIssueData = issuesByProductId.get(product.id);
      return {
        kind: 'product',
        id: product.id,
        title: product.title,
        subtitle: productIssueData?.healthState ?? 'Healthy',
        metadata: {
          handle: product.handle ?? product.externalId ?? 'N/A',
          lastSynced: product.lastSyncedAt
            ? new Date(product.lastSyncedAt).toLocaleString()
            : 'Not available',
          metaTitle: product.seoTitle?.trim() || 'Not set',
          metaDescription: product.seoDescription?.trim() || 'Not set',
          recommendedAction:
            productIssueData?.recommendedAction ?? 'No action needed',
        },
      };
    },
    [issuesByProductId]
  );

  // Handle row click for expansion (progressive disclosure)
  const handleRowClick = useCallback(
    (product: Product) => {
      handleToggleExpand(product.id);
    },
    [handleToggleExpand]
  );

  // Check if a row is expanded
  const isRowExpanded = useCallback(
    (product: Product) => expandedProductId === product.id,
    [expandedProductId]
  );

  // Render expanded content for a product
  const renderExpandedContent = useCallback(
    (product: Product) => {
      const productIssueData = issuesByProductId.get(product.id);
      return (
        <ProductDetailPanel
          product={product}
          projectId={projectId}
          issuesByPillar={productIssueData?.byPillar}
        />
      );
    },
    [issuesByProductId, projectId]
  );

  // Define DataTable columns for products
  const columns = useMemo<DataTableColumn<Product>[]>(() => {
    return [
      {
        key: 'product',
        header: 'Product',
        width: 'w-1/3',
        truncate: false,
        cell: (product) => {
          const productIssueData = issuesByProductId.get(product.id);
          const recommendedAction =
            productIssueData?.recommendedAction ?? 'No action needed';

          return (
            <div className="flex items-start gap-3">
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
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
                  <svg
                    className="h-5 w-5 text-muted-foreground"
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
                <div className="line-clamp-1 font-medium text-foreground">
                  {product.title}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {recommendedAction}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        width: 'w-32',
        truncate: false,
        cell: (product) => {
          const resolvedActions = resolvedActionsById.get(product.id);
          const productIssueData = issuesByProductId.get(product.id);
          const healthState = productIssueData?.healthState ?? 'Healthy';

          // Health pill styling (fallback)
          const healthPillClasses = {
            Healthy:
              'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-950 dark:text-green-400 dark:ring-green-800',
            'Needs Attention':
              'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:ring-yellow-800',
            Critical:
              'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-800',
          };

          return resolvedActions?.chipLabel ? (
            <RowStatusChip chipLabel={resolvedActions.chipLabel} />
          ) : (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${healthPillClasses[healthState]}`}
            >
              {healthState}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        width: 'w-64',
        truncate: false,
        cell: (product) => {
          const resolvedActions = resolvedActionsById.get(product.id);
          const isScanning = scanningId === product.id;
          const workspacePath = `/projects/${projectId}/products/${product.id}`;

          return (
            <div
              className="flex items-center justify-end gap-2"
              data-no-row-click
            >
              {/* Rescan button - only shown when stale */}
              {isDeoDataStale && (
                <button
                  onClick={() => onScanProduct(product.id)}
                  disabled={isScanning}
                  className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  data-no-row-click
                >
                  {isScanning ? (
                    <>
                      <svg
                        className="mr-1.5 h-3.5 w-3.5 animate-spin text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Rescanning...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Rescan
                    </>
                  )}
                </button>
              )}

              {/* Primary action button */}
              {resolvedActions?.primaryAction ? (
                <Link
                  href={resolvedActions.primaryAction.href}
                  className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  data-no-row-click
                  data-testid="row-primary-action"
                >
                  {resolvedActions.primaryAction.label}
                </Link>
              ) : resolvedActions?.helpText ? (
                <span
                  className="text-xs text-muted-foreground"
                  data-testid="row-help-text"
                >
                  {resolvedActions.helpText}
                </span>
              ) : null}

              {/* Secondary action (Open) */}
              {resolvedActions?.secondaryAction && (
                <Link
                  href={resolvedActions.secondaryAction.href}
                  className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  data-no-row-click
                  data-testid="row-secondary-action"
                >
                  {resolvedActions.secondaryAction.label}
                </Link>
              )}

              {/* Fallback View details if no resolved actions */}
              {!resolvedActions?.primaryAction &&
                !resolvedActions?.secondaryAction &&
                !resolvedActions?.helpText && (
                  <Link
                    href={workspacePath}
                    className="inline-flex items-center rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
                    data-no-row-click
                  >
                    View details
                  </Link>
                )}

              {/* Expand indicator */}
              <div className="flex h-8 w-8 items-center justify-center text-muted-foreground">
                <svg
                  className={`h-5 w-5 transition-transform ${expandedProductId === product.id ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          );
        },
      },
    ];
  }, [
    issuesByProductId,
    resolvedActionsById,
    scanningId,
    projectId,
    isDeoDataStale,
    onScanProduct,
    expandedProductId,
  ]);

  return (
    <div data-testid="products-list">
      {/* Command Bar - token-based styling */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[hsl(var(--surface-raised))] px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          {needsAttentionCount > 0 ? (
            <>
              <span className="font-medium text-foreground">
                {needsAttentionCount} product
                {needsAttentionCount !== 1 ? 's' : ''} need attention
              </span>
              {/* [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Navigate to canonical playbooks list */}
              <Link
                href={`/projects/${projectId}/playbooks?source=products_list`}
                className="inline-flex items-center rounded-md bg-muted-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-muted-foreground/90"
              >
                View playbooks
              </Link>
            </>
          ) : (
            <span className="font-medium text-green-600 dark:text-green-400">
              All products are healthy
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Health Filter - token-based styling */}
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
                      ? 'bg-foreground text-background'
                      : 'bg-background text-foreground border border-border hover:bg-muted'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`ml-1.5 ${isActive ? 'text-muted' : 'text-muted-foreground'}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown - token-based styling */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="Impact">Sort by impact</option>
            <option value="Title">Sort by title</option>
          </select>
        </div>
      </div>

      {displayProducts.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          No products match this filter.
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={displayProducts}
          onOpenContext={openPanel}
          getRowDescriptor={getRowDescriptor}
          density="comfortable"
          onRowClick={handleRowClick}
          isRowExpanded={isRowExpanded}
          renderExpandedContent={renderExpandedContent}
          rowEnterKeyBehavior="rowClick"
        />
      )}
    </div>
  );
}
