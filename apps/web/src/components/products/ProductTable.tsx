import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { DeoIssue } from '@/lib/deo-issues';
import type { DeoPillarId } from '@/lib/deo-pillars';
import { getDeoPillarById } from '@/lib/deo-pillars';
import type { Product } from '@/lib/products';
import { ProductRow, type PillarIssueSummary } from './ProductRow';
import {
  projectsApi,
  type AutomationPlaybookId,
  type AutomationPlaybookEstimate,
  type AutomationPlaybookApplyResult,
} from '@/lib/api';
import {
  resolveRowNextAction,
  buildProductWorkspaceHref,
  buildReviewDraftsHref,
  type ResolvedRowNextAction,
  type NavigationContext,
} from '@/lib/list-actions-clarity';
import { buildIssueFixHref } from '@/lib/issue-to-fix-path';

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
const MISSING_REQUIRED_METADATA_TYPES = ['missing_seo_title', 'missing_seo_description'];

/** Bulk action types - v1 only supports metadata fixes */
type BulkActionType = 'Fix missing metadata';

/** Bulk action state for the 3-step flow */
interface BulkActionSelection {
  actionType: BulkActionType;
  productIds: string[];
  productNames: string[];
  missingTitleCount: number;
  missingDescriptionCount: number;
}

/** Draft generation result tracking */
interface DraftGenerationResult {
  playbookId: AutomationPlaybookId;
  scopeId: string;
  rulesHash: string;
  draftsGenerated: number;
  needsAttention: number;
  affectedTotal: number;
}

/** Bulk modal step state */
type BulkModalStep = 'preview' | 'generating' | 'ready' | 'applying' | 'complete' | 'error';

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
    if (issue.pillarId === 'technical_indexability' && issue.severity === 'critical') {
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
  if (counts.metadataIssueCount > 0 && counts.searchIntentIssueCount > 0) return 2;
  return 3;
}

/**
 * Get the primary count for the Critical category (for secondary sort)
 */
function getCriticalPrimaryCount(counts: ImpactCategoryCounts, category: number): number {
  switch (category) {
    case 0: return counts.missingRequiredMetadataCount;
    case 1: return counts.technicalBlockingCount;
    case 2: return counts.combinedMetaAndIntentCount;
    default: return counts.totalIssueCount;
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
function getNeedsAttentionPrimaryCount(counts: ImpactCategoryCounts, category: number): number {
  switch (category) {
    case 0: return counts.searchIntentIssueCount;
    case 1: return counts.contentIssueCount;
    case 2: return counts.metadataIssueCount;
    default: return counts.totalIssueCount;
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
  const router = useRouter();
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('All');
  const [sortOption, setSortOption] = useState<SortOption>('Impact');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Bulk action state (3-step flow)
  const [bulkSelection, setBulkSelection] = useState<BulkActionSelection | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalStep, setBulkModalStep] = useState<BulkModalStep>('preview');
  const [bulkEstimates, setBulkEstimates] = useState<{
    title?: AutomationPlaybookEstimate;
    description?: AutomationPlaybookEstimate;
  }>({});
  const [draftResults, setDraftResults] = useState<DraftGenerationResult[]>([]);
  const [applyResults, setApplyResults] = useState<AutomationPlaybookApplyResult[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Build enriched issue map with healthState, recommendedAction, and impact counts per product
  const issuesByProductId = useMemo(() => {
    const map = new Map<string, {
      count: number;
      maxSeverity: 'critical' | 'warning' | 'info' | null;
      healthState: HealthState;
      recommendedAction: string;
      byPillar: PillarIssueSummary[];
      issues: DeoIssue[];
      impactCounts: ImpactCategoryCounts;
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

  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Compute resolved row actions for each product
  // Uses buildIssueFixHref for deterministic issue→fix routing
  const resolvedActionsById = useMemo(() => {
    const map = new Map<string, ResolvedRowNextAction>();

    // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Build navigation context for returnTo propagation
    const navContext: NavigationContext = {
      returnTo: currentListPathWithQuery || `/projects/${projectId}/products`,
      returnLabel: 'Products',
    };

    for (const product of products) {
      const issueData = issuesByProductId.get(product.id);
      const issues = issueData?.issues ?? [];
      const hasDraftPendingApply = product.hasDraftPendingApply ?? false;

      // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Count only issues where:
      // 1. buildIssueFixHref returns non-null (has actionable fix destination)
      // Sort to get deterministic "next issue" (severity critical > warning > info, then pillar priority)
      const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      const actionableIssues = issues
        .filter((issue) => {
          const fixHref = buildIssueFixHref({
            projectId,
            issue,
            primaryProductId: product.id,
            from: 'products',
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

      const actionableNowCount = actionableIssues.length;

      // Deterministic "Fix next" links to the top actionable issue's fix destination
      let fixNextHref: string | null = null;
      if (actionableIssues.length > 0) {
        const nextIssue = actionableIssues[0];
        fixNextHref = buildIssueFixHref({
          projectId,
          issue: nextIssue,
          primaryProductId: product.id,
          from: 'products',
          returnTo: navContext.returnTo,
          returnLabel: navContext.returnLabel,
        });
      }

      const resolved = resolveRowNextAction({
        assetType: 'products',
        hasDraftPendingApply,
        actionableNowCount,
        canApply,
        canRequestApproval,
        fixNextHref,
        openHref: buildProductWorkspaceHref(projectId, product.id, navContext),
        reviewDraftsHref: buildReviewDraftsHref(projectId, 'products', navContext),
      });

      map.set(product.id, resolved);
    }

    return map;
  }, [products, issuesByProductId, projectId, canApply, canRequestApproval, currentListPathWithQuery]);

  // Compute bulk action eligibility: products with "Fix missing metadata" action
  const bulkMetadataEligible = useMemo(() => {
    const eligible: {
      productId: string;
      productName: string;
      missingTitle: boolean;
      missingDescription: boolean;
    }[] = [];

    for (const product of products) {
      const data = issuesByProductId.get(product.id);
      if (!data || data.healthState === 'Healthy') continue;

      // Check if this product has missing metadata issues
      const hasMissingTitle = data.issues.some((i) => i.type === 'missing_seo_title');
      const hasMissingDescription = data.issues.some((i) => i.type === 'missing_seo_description');

      if (hasMissingTitle || hasMissingDescription) {
        eligible.push({
          productId: product.id,
          productName: product.title,
          missingTitle: hasMissingTitle,
          missingDescription: hasMissingDescription,
        });
      }
    }

    return eligible;
  }, [products, issuesByProductId]);

  // Bulk action visibility: only when needsAttentionCount > 0 AND sort is Impact
  const showBulkActions = needsAttentionCount > 0 && sortOption === 'Impact';
  const bulkMetadataCount = bulkMetadataEligible.length;

  const handleOpenAutomationEntryFromBulk = useCallback(() => {
    const key = `automationEntryContext:${projectId}`;
    const scopeKey = `automationEntryScope:${projectId}`;
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          createdAt: new Date().toISOString(),
          source: 'products_bulk',
          intent: 'missing_metadata',
          selectedProductIds: bulkMetadataEligible.map((p) => p.productId),
        }),
      );
      sessionStorage.setItem(
        scopeKey,
        JSON.stringify({ productIds: bulkMetadataEligible.map((p) => p.productId) }),
      );
    } catch {
      // ignore
    }
    router.push(
      `/projects/${projectId}/automation/playbooks/entry?source=products_bulk&intent=missing_metadata`,
    );
  }, [projectId, bulkMetadataEligible, router]);

  // Clear bulk action selection
  const handleClearBulkSelection = useCallback(() => {
    setBulkSelection(null);
    setBulkModalOpen(false);
    setBulkModalStep('preview');
    setBulkEstimates({});
    setDraftResults([]);
    setApplyResults([]);
    setBulkError(null);
  }, []);

  // Open bulk modal and fetch estimates (Step 2)
  const handleOpenBulkModal = useCallback(async () => {
    if (!bulkSelection) return;

    setBulkModalOpen(true);
    setBulkModalStep('preview');
    setBulkError(null);

    try {
      // Fetch estimates for applicable playbooks (no AI call)
      const estimates: typeof bulkEstimates = {};

      if (bulkSelection.missingTitleCount > 0) {
        estimates.title = await projectsApi.automationPlaybookEstimate(projectId, 'missing_seo_title');
      }
      if (bulkSelection.missingDescriptionCount > 0) {
        estimates.description = await projectsApi.automationPlaybookEstimate(projectId, 'missing_seo_description');
      }

      setBulkEstimates(estimates);

      // Check if drafts already exist (resumable state)
      const existingDrafts: DraftGenerationResult[] = [];
      if (estimates.title?.scopeId) {
        const draft = await projectsApi.getLatestAutomationPlaybookDraft(projectId, 'missing_seo_title');
        if (draft && draft.status === 'READY' && draft.scopeId === estimates.title.scopeId) {
          existingDrafts.push({
            playbookId: 'missing_seo_title',
            scopeId: draft.scopeId,
            rulesHash: draft.rulesHash,
            draftsGenerated: draft.counts.draftGenerated,
            needsAttention: draft.counts.noSuggestionCount,
            affectedTotal: draft.counts.affectedTotal,
          });
        }
      }
      if (estimates.description?.scopeId) {
        const draft = await projectsApi.getLatestAutomationPlaybookDraft(projectId, 'missing_seo_description');
        if (draft && draft.status === 'READY' && draft.scopeId === estimates.description.scopeId) {
          existingDrafts.push({
            playbookId: 'missing_seo_description',
            scopeId: draft.scopeId,
            rulesHash: draft.rulesHash,
            draftsGenerated: draft.counts.draftGenerated,
            needsAttention: draft.counts.noSuggestionCount,
            affectedTotal: draft.counts.affectedTotal,
          });
        }
      }

      if (existingDrafts.length > 0) {
        setDraftResults(existingDrafts);
        setBulkModalStep('ready');
      }
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to load scope information');
      setBulkModalStep('error');
    }
  }, [bulkSelection, projectId]);

  // Generate drafts (Step 3a - uses AI)
  const handleGenerateDrafts = useCallback(async () => {
    if (!bulkSelection || !bulkEstimates) return;

    setBulkModalStep('generating');
    setBulkError(null);

    try {
      const results: DraftGenerationResult[] = [];

      // Generate title drafts if applicable
      if (bulkEstimates.title?.scopeId) {
        const result = await projectsApi.generateAutomationPlaybookDraft(
          projectId,
          'missing_seo_title',
          bulkEstimates.title.scopeId,
          bulkEstimates.title.scopeId, // rulesHash - using scopeId as placeholder
        );
        results.push({
          playbookId: 'missing_seo_title',
          scopeId: result.scopeId,
          rulesHash: result.rulesHash,
          draftsGenerated: result.counts.draftGenerated,
          needsAttention: result.counts.noSuggestionCount,
          affectedTotal: result.counts.affectedTotal,
        });
      }

      // Generate description drafts if applicable
      if (bulkEstimates.description?.scopeId) {
        const result = await projectsApi.generateAutomationPlaybookDraft(
          projectId,
          'missing_seo_description',
          bulkEstimates.description.scopeId,
          bulkEstimates.description.scopeId, // rulesHash - using scopeId as placeholder
        );
        results.push({
          playbookId: 'missing_seo_description',
          scopeId: result.scopeId,
          rulesHash: result.rulesHash,
          draftsGenerated: result.counts.draftGenerated,
          needsAttention: result.counts.noSuggestionCount,
          affectedTotal: result.counts.affectedTotal,
        });
      }

      setDraftResults(results);
      setBulkModalStep('ready');
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to generate drafts');
      setBulkModalStep('error');
    }
  }, [bulkSelection, bulkEstimates, projectId]);

  // Apply drafts (Step 3b - no AI)
  const handleApplyDrafts = useCallback(async () => {
    if (draftResults.length === 0) return;

    setBulkModalStep('applying');
    setBulkError(null);

    try {
      const results: AutomationPlaybookApplyResult[] = [];

      for (const draft of draftResults) {
        const result = await projectsApi.applyAutomationPlaybook(
          projectId,
          draft.playbookId,
          draft.scopeId,
          draft.rulesHash,
        );
        results.push(result);
      }

      setApplyResults(results);
      setBulkModalStep('complete');
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to apply updates');
      setBulkModalStep('error');
    }
  }, [draftResults, projectId]);

  // Retry failed drafts
  const handleRetryDrafts = useCallback(() => {
    setBulkError(null);
    handleGenerateDrafts();
  }, [handleGenerateDrafts]);

  // Compute totals for display
  const totalDraftsGenerated = draftResults.reduce((sum, r) => sum + r.draftsGenerated, 0);
  const totalNeedsAttention = draftResults.reduce((sum, r) => sum + r.needsAttention, 0);
  const totalApplied = applyResults.reduce((sum, r) => sum + r.updatedCount, 0);

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
      const healthOrder: Record<HealthState, number> = { Critical: 0, 'Needs Attention': 1, Healthy: 2 };
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
        if (primaryCountA !== primaryCountB) return primaryCountB - primaryCountA;
      } else if (healthA === 'Needs Attention') {
        // Needs Attention ordering: search intent > content > metadata > other
        const catA = getNeedsAttentionCategory(countsA);
        const catB = getNeedsAttentionCategory(countsB);
        if (catA !== catB) return catA - catB;

        // Secondary: higher category count first (descending)
        const primaryCountA = getNeedsAttentionPrimaryCount(countsA, catA);
        const primaryCountB = getNeedsAttentionPrimaryCount(countsB, catB);
        if (primaryCountA !== primaryCountB) return primaryCountB - primaryCountA;
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
              {/* Bulk action buttons - only show when sort is Impact */}
              {showBulkActions && bulkMetadataCount > 0 && !bulkSelection && (
                <button
                  type="button"
                  onClick={handleOpenAutomationEntryFromBulk}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Fix missing metadata ({bulkMetadataCount} product{bulkMetadataCount !== 1 ? 's' : ''})
                </button>
              )}
              {/* Fallback link when bulk actions not available */}
              {(!showBulkActions || bulkMetadataCount === 0) && !bulkSelection && (
                <Link
                  href={`/projects/${projectId}/automation/playbooks`}
                  className="inline-flex items-center rounded-md bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
                >
                  View playbooks
                </Link>
              )}
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
            <option value="Impact">Sort by impact</option>
            <option value="Title">Sort by title</option>
          </select>
        </div>
      </div>

      {/* Bulk Selection Context Strip (Step 1 selected) */}
      {bulkSelection && !bulkModalOpen && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-blue-900">
              {bulkSelection.actionType} ({bulkSelection.productIds.length} product{bulkSelection.productIds.length !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenBulkModal}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Review scope
            </button>
            <button
              type="button"
              onClick={handleClearBulkSelection}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Bulk Confirmation Modal (Step 2 & 3) */}
      {bulkModalOpen && bulkSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
            {/* Modal Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {bulkModalStep === 'complete' ? 'Updates applied' : 'Review bulk action'}
                </h2>
                <button
                  type="button"
                  onClick={handleClearBulkSelection}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4">
              {/* Action Summary */}
              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  {bulkModalStep === 'complete'
                    ? `Applied updates to ${totalApplied} product${totalApplied !== 1 ? 's' : ''}`
                    : `You're about to generate draft metadata for ${bulkSelection.productIds.length} product${bulkSelection.productIds.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Scope Disclosure */}
              {bulkModalStep !== 'complete' && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-900">Products affected</h3>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
                    <ul className="space-y-1 text-xs text-gray-700">
                      {bulkSelection.productNames.map((name, idx) => (
                        <li key={bulkSelection.productIds[idx]} className="truncate">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Fields breakdown */}
              {bulkModalStep !== 'complete' && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-900">Fields that will be touched</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">Title</span>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">Description</span>
                  </div>
                  {(bulkSelection.missingTitleCount > 0 || bulkSelection.missingDescriptionCount > 0) && (
                    <div className="mt-2 text-xs text-gray-600">
                      {bulkSelection.missingTitleCount > 0 && (
                        <span>Missing title: {bulkSelection.missingTitleCount} product{bulkSelection.missingTitleCount !== 1 ? 's' : ''}</span>
                      )}
                      {bulkSelection.missingTitleCount > 0 && bulkSelection.missingDescriptionCount > 0 && ' / '}
                      {bulkSelection.missingDescriptionCount > 0 && (
                        <span>Missing description: {bulkSelection.missingDescriptionCount} product{bulkSelection.missingDescriptionCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* AI Usage Disclosure */}
              {bulkModalStep === 'preview' && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-800">
                    <span className="mr-1">⚡</span>
                    This step uses AI to generate drafts. Nothing will be applied automatically.
                  </p>
                </div>
              )}

              {/* Generating state */}
              {bulkModalStep === 'generating' && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating drafts...
                </div>
              )}

              {/* Applying state */}
              {bulkModalStep === 'applying' && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Applying updates...
                </div>
              )}

              {/* Draft results */}
              {bulkModalStep === 'ready' && draftResults.length > 0 && (
                <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-800">
                    {totalDraftsGenerated} draft{totalDraftsGenerated !== 1 ? 's' : ''} created
                    {totalNeedsAttention > 0 && (
                      <span className="ml-1 text-amber-700">, {totalNeedsAttention} need attention</span>
                    )}
                  </p>
                  {draftResults.length > 1 && (
                    <div className="mt-2 text-xs text-green-700">
                      {draftResults.map((r) => (
                        <div key={r.playbookId}>
                          {r.playbookId === 'missing_seo_title' ? 'Titles' : 'Descriptions'}: {r.draftsGenerated} generated
                          {r.needsAttention > 0 && <span className="text-amber-600"> ({r.needsAttention} need attention)</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Apply confirmation note */}
              {bulkModalStep === 'ready' && (
                <div className="mb-4 text-xs text-gray-600">
                  <span className="mr-1">✓</span>
                  Apply updates does not use AI.
                </div>
              )}

              {/* Error state */}
              {bulkModalStep === 'error' && bulkError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800">{bulkError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left side - Review link when ready */}
                {bulkModalStep === 'ready' && (
                  <Link
                    href={`/projects/${projectId}/automation/playbooks?playbookId=missing_seo_title`}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Review changes
                  </Link>
                )}
                {bulkModalStep !== 'ready' && <div />}

                {/* Right side - Action buttons */}
                <div className="flex items-center gap-2">
                  {/* Cancel button */}
                  <button
                    type="button"
                    onClick={handleClearBulkSelection}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {bulkModalStep === 'complete' ? 'Close' : 'Cancel'}
                  </button>

                  {/* Generate drafts button (Step 2 -> Step 3a) */}
                  {bulkModalStep === 'preview' && (
                    <button
                      type="button"
                      onClick={handleGenerateDrafts}
                      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Generate drafts
                    </button>
                  )}

                  {/* Retry button on error */}
                  {bulkModalStep === 'error' && (
                    <button
                      type="button"
                      onClick={handleRetryDrafts}
                      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  )}

                  {/* Apply updates button (Step 3b) */}
                  {bulkModalStep === 'ready' && (
                    <button
                      type="button"
                      onClick={handleApplyDrafts}
                      disabled={draftResults.length === 0}
                      className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      Apply updates
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {displayProducts.length === 0 ? (
        <div className="px-4 py-6 text-sm text-gray-500">
          No products match this filter.
        </div>
      ) : (
        <div className="space-y-3 px-4 py-4">
          {displayProducts.map((product) => {
            const isExpanded = expandedProductId === product.id;
            const productIssueData = issuesByProductId.get(product.id);
            const resolvedActions = resolvedActionsById.get(product.id);

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
                // [LIST-ACTIONS-CLARITY-1] Pass resolved chip/actions
                chipLabel={resolvedActions?.chipLabel}
                primaryAction={resolvedActions?.primaryAction}
                secondaryAction={resolvedActions?.secondaryAction}
                helpText={resolvedActions?.helpText}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
