'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  useParams,
  useRouter,
  useSearchParams,
  usePathname,
} from 'next/navigation';

import type {
  DeoIssue,
  DeoIssueFixType,
  CanonicalIssueCountsSummary,
} from '@/lib/deo-issues';
import { TripletDisplay } from '@/components/issues/TripletDisplay';
import { ScopeBanner } from '@/components/common/ScopeBanner';
import { DEO_PILLARS, type DeoPillarId } from '@/lib/deo-pillars';
import { isAuthenticated, getToken } from '@/lib/auth';
import { ApiError, aiApi, projectsApi, shopifyApi } from '@/lib/api';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { useUnsavedChanges } from '@/components/unsaved-changes/UnsavedChangesProvider';
import { GuardedLink } from '@/components/navigation/GuardedLink';
// [ISSUE-TO-FIX-PATH-1 FIXUP-2] Removed isIssueActionable - using href-based actionability instead
import {
  buildIssueFixHref,
  getSafeIssueTitle,
  getIssueFixConfig,
} from '@/lib/issue-to-fix-path';
// [ISSUE-FIX-NAV-AND-ANCHORS-1] Navigation utilities available in @/lib/issue-fix-navigation if needed
// [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Extended with getReturnToFromCurrentUrl and withRouteContext
import {
  getSafeReturnTo,
  getReturnToFromCurrentUrl,
  withRouteContext,
} from '@/lib/route-context';
// [SCOPE-CLARITY-1] Import scope normalization utilities
import {
  normalizeScopeParams,
  buildClearFiltersHref,
} from '@/lib/scope-normalization';
// [ISSUES-ENGINE-REMOUNT-1] DataTable + RCP integration
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow as DataTableRowType,
} from '@/components/tables/DataTable';
import {
  useRightContextPanel,
  type ContextDescriptor,
} from '@/components/right-context-panel/RightContextPanelProvider';

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';
type PillarFilter = 'all' | DeoPillarId;

// [DRAFT-CLARITY-AND-ACTION-TRUST-1] Draft state for issue fix preview
type IssueDraftState = 'unsaved' | 'saved' | 'applied';

interface IssueDraft {
  issueId: string;
  productId: string;
  fieldLabel: 'SEO title' | 'SEO description';
  value: string;
  savedAt?: string;
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Store current values for field preservation on Apply
  currentTitle?: string;
  currentDescription?: string;
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] SessionStorage key for issue drafts
function getIssueDraftKey(
  projectId: string,
  issueId: string,
  productId: string,
  fieldLabel: string
): string {
  return `issue_draft:${projectId}:${issueId}:${productId}:${fieldLabel}`;
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Load saved draft from sessionStorage
function loadIssueDraft(
  projectId: string,
  issueId: string,
  productId: string,
  fieldLabel: string
): IssueDraft | null {
  try {
    const key = getIssueDraftKey(projectId, issueId, productId, fieldLabel);
    const stored = sessionStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as IssueDraft;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Save draft to sessionStorage
function saveIssueDraftToStorage(projectId: string, draft: IssueDraft): void {
  try {
    const key = getIssueDraftKey(
      projectId,
      draft.issueId,
      draft.productId,
      draft.fieldLabel
    );
    sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Ignore storage errors
  }
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Delete draft from sessionStorage
function deleteIssueDraftFromStorage(
  projectId: string,
  issueId: string,
  productId: string,
  fieldLabel: string
): void {
  try {
    const key = getIssueDraftKey(projectId, issueId, productId, fieldLabel);
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

// [ISSUES-ENGINE-REMOUNT-1] Extend DeoIssue with DataTableRow for type safety
interface IssueRow extends DeoIssue, DataTableRowType {}

export default function IssuesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  // [ISSUES-ENGINE-REMOUNT-1] RCP integration
  const { openPanel } = useRightContextPanel();

  // Read pillar filter from URL query param (?pillar=metadata_snippet_quality)
  const pillarParam = searchParams.get('pillar') as DeoPillarId | null;

  // [COUNT-INTEGRITY-1 PATCH 6] Read click-integrity filter params from Work Queue routing
  const modeParam = searchParams.get('mode') as
    | 'actionable'
    | 'detected'
    | null;
  const actionKeyParam = searchParams.get('actionKey');
  // [COUNT-INTEGRITY-1.1 UI HARDEN] Support actionKeys for multi-action filtering (OR across keys)
  // Accepts repeated params (?actionKeys=KEY1&actionKeys=KEY2) or comma-separated (?actionKeys=KEY1,KEY2)
  const actionKeysParam = useMemo(() => {
    const repeatedParams = searchParams.getAll('actionKeys');
    if (repeatedParams.length > 0) {
      // Handle repeated params - flatten any comma-separated values
      return repeatedParams
        .flatMap((p) => p.split(',').map((k) => k.trim()))
        .filter(Boolean);
    }
    return null;
  }, [searchParams]);
  const scopeTypeParam = searchParams.get('scopeType') as
    | 'PRODUCTS'
    | 'PAGES'
    | 'COLLECTIONS'
    | 'STORE_WIDE'
    | null;

  // [LIST-ACTIONS-CLARITY-1] Read asset filter params for asset-specific issue views
  const assetTypeParam = searchParams.get('assetType') as
    | 'products'
    | 'pages'
    | 'collections'
    | null;
  const assetIdParam = searchParams.get('assetId');

  // [ROUTE-INTEGRITY-1] Read from context from URL
  const fromParam = searchParams.get('from');

  // [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Get pathname for building returnTo
  const pathname = usePathname();

  // [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Build current issues URL (sans context params) for View affected returnTo
  const currentIssuesPathWithQuery = useMemo(() => {
    return getReturnToFromCurrentUrl(pathname, searchParams);
  }, [pathname, searchParams]);

  // [ROUTE-INTEGRITY-1] Get validated returnTo for ScopeBanner
  const validatedReturnTo = useMemo(() => {
    return getSafeReturnTo(searchParams, projectId);
  }, [searchParams, projectId]);

  // [SCOPE-CLARITY-1] Normalize scope params using canonical normalization
  const normalizedScopeResult = useMemo(() => {
    return normalizeScopeParams(searchParams);
  }, [searchParams]);

  // [ROUTE-INTEGRITY-1] Derive showingText for ScopeBanner (fallback when chips not rendered)
  const scopeBannerShowingText = useMemo(() => {
    const parts: string[] = [];
    if (assetTypeParam) {
      parts.push(`Filtered by Asset: ${assetTypeParam}`);
    }
    if (pillarParam) {
      const pillar = DEO_PILLARS.find((p) => p.id === pillarParam);
      parts.push(`Pillar: ${pillar?.label || pillarParam}`);
    }
    if (modeParam === 'actionable') {
      parts.push('Actionable issues');
    } else if (modeParam === 'detected') {
      parts.push('Detected issues');
    }
    return parts.length > 0 ? parts.join(' · ') : 'All issues';
  }, [assetTypeParam, pillarParam, modeParam]);

  // [COUNT-INTEGRITY-1 PATCH 6 FIXUP-2] effectiveMode will be computed after countsSummary state is available

  // [ISSUE-FIX-NAV-AND-ANCHORS-1] Navigation context handled by validatedReturnTo (line 118) and ScopeBanner

  const [issues, setIssues] = useState<DeoIssue[]>([]);
  // [COUNT-INTEGRITY-1.1 Step 2A] Migrated to canonical triplet counts
  const [countsSummary, setCountsSummary] =
    useState<CanonicalIssueCountsSummary | null>(null);
  // [COUNT-INTEGRITY-1 PATCH ERR-001] Graceful degradation for counts-summary API failures
  const [countsSummaryWarning, setCountsSummaryWarning] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  // [COUNT-INTEGRITY-1 PATCH 6 FIXUP] Don't auto-apply pillar param when click-integrity filters present
  // [COUNT-INTEGRITY-1.1 UI HARDEN] Include actionKeys in filter detection
  // [LIST-ACTIONS-CLARITY-1] Include assetType/assetId in filter detection
  const hasClickIntegrityFilters = !!(
    actionKeyParam ||
    (actionKeysParam && actionKeysParam.length > 0) ||
    scopeTypeParam ||
    assetTypeParam ||
    assetIdParam
  );
  // [SCOPE-CLARITY-1 FIXUP-1] Use normalized pillar (prevents hidden stacking when issueType overrides pillar)
  // normalizedScopeResult.normalized.pillar will be undefined if issueType or asset scope took priority
  const normalizedPillar = normalizedScopeResult.normalized.pillar;
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>(
    hasClickIntegrityFilters ? 'all' : (normalizedPillar ?? 'all')
  );

  // [COUNT-INTEGRITY-1.1 Step 2A] Updated to use canonical triplet counts
  // [COUNT-INTEGRITY-1 PATCH ERR-001.1] Fallback to issues list when countsSummary unavailable
  // [COUNT-INTEGRITY-1.1 AUDIT FIX] Pillar-aware actionable/detected checks
  // When pillarFilter !== 'all', source from countsSummary.byPillar[pillarFilter]
  const hasActionableIssues = useMemo(() => {
    if (!countsSummary) {
      return issues.some((i) => i.isActionableNow === true);
    }
    if (pillarFilter !== 'all' && countsSummary.byPillar?.[pillarFilter]) {
      return (
        (countsSummary.byPillar[pillarFilter].actionable?.issueTypesCount ??
          0) > 0
      );
    }
    return (countsSummary.actionable.issueTypesCount ?? 0) > 0;
  }, [countsSummary, pillarFilter, issues]);

  const hasDetectedIssues = useMemo(() => {
    if (!countsSummary) {
      return issues.length > 0;
    }
    if (pillarFilter !== 'all' && countsSummary.byPillar?.[pillarFilter]) {
      return (
        (countsSummary.byPillar[pillarFilter].detected?.issueTypesCount ?? 0) >
        0
      );
    }
    return (countsSummary.detected.issueTypesCount ?? 0) > 0;
  }, [countsSummary, pillarFilter, issues]);

  const effectiveMode: 'actionable' | 'detected' =
    modeParam === 'detected'
      ? 'detected'
      : !hasActionableIssues && hasDetectedIssues
        ? 'detected' // Force detected when no actionable but detected exist
        : 'actionable';
  const [rescanning, setRescanning] = useState(false);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);

  const [previewIssueId, setPreviewIssueId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewProductName, setPreviewProductName] = useState<string | null>(
    null
  );
  const [previewFieldLabel, setPreviewFieldLabel] = useState<
    'SEO title' | 'SEO description' | null
  >(null);
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Store both current title and description for field preservation
  const [previewCurrentTitle, setPreviewCurrentTitle] = useState<string | null>(
    null
  );
  const [previewCurrentDescription, setPreviewCurrentDescription] = useState<
    string | null
  >(null);
  const [previewValue, setPreviewValue] = useState<string | null>(null);
  const previewPanelRef = useRef<HTMLDivElement | null>(null);

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Draft lifecycle state
  const [savedDraft, setSavedDraft] = useState<IssueDraft | null>(null);
  const [appliedAt, setAppliedAt] = useState<string | null>(null);
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);

  // Compute draft state based on preview and saved draft
  const getDraftState = useCallback((): IssueDraftState => {
    // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Check applied state first
    // If we have appliedAt and no savedDraft, we're in applied state (even if previewValue still exists)
    if (appliedAt && !savedDraft) {
      return 'applied';
    }
    if (
      savedDraft &&
      previewIssueId === savedDraft.issueId &&
      previewValue === savedDraft.value
    ) {
      return 'saved';
    }
    if (previewValue) {
      return 'unsaved';
    }
    return 'applied';
  }, [appliedAt, savedDraft, previewIssueId, previewValue]);

  const feedback = useFeedback();
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Wire into global unsaved changes provider
  const { setHasUnsavedChanges } = useUnsavedChanges();

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Sync unsaved draft state with global provider
  useEffect(() => {
    const draftState = getDraftState();
    setHasUnsavedChanges(draftState === 'unsaved');
  }, [getDraftState, setHasUnsavedChanges]);

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-4] Clear global unsaved state on unmount to prevent stale state
  useEffect(() => {
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [setHasUnsavedChanges]);

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setCountsSummaryWarning(null);
      // [COUNT-INTEGRITY-1.1 PATCH 5] Fetch canonical summary with same filters as rendered list
      // [COUNT-INTEGRITY-1.1 UI HARDEN] Build filters object with actionKey OR actionKeys + severity
      const summaryFilters: {
        actionKey?: string;
        actionKeys?: string[];
        scopeType?: 'products' | 'pages' | 'collections';
        pillar?: string;
        severity?: 'critical' | 'warning' | 'info';
      } = {};
      // [COUNT-INTEGRITY-1.1 UI HARDEN] actionKeys takes precedence over actionKey (multi-action OR)
      if (actionKeysParam && actionKeysParam.length > 0) {
        summaryFilters.actionKeys = actionKeysParam;
      } else if (actionKeyParam) {
        summaryFilters.actionKey = actionKeyParam;
      }
      if (scopeTypeParam) {
        // Normalize scopeType to lowercase for API
        const normalizedScopeType = scopeTypeParam.toLowerCase() as
          | 'products'
          | 'pages'
          | 'collections';
        if (
          ['products', 'pages', 'collections'].includes(normalizedScopeType)
        ) {
          summaryFilters.scopeType = normalizedScopeType;
        }
      }
      // [COUNT-INTEGRITY-1.1 AUDIT FIX] Pass severity filter when not 'all' for filter-aligned summary
      if (severityFilter !== 'all') {
        summaryFilters.severity = severityFilter;
      }

      // [LIST-ACTIONS-CLARITY-1 FIXUP-1] True per-asset filtering using assetIssues API
      // When assetType + assetId are provided, use the dedicated endpoint for precise filtering
      if (assetTypeParam && assetIdParam) {
        const assetIssuesResult = await projectsApi.assetIssues(
          projectId,
          assetTypeParam,
          assetIdParam,
          severityFilter !== 'all' ? { severity: severityFilter } : undefined
        );
        // assetIssues returns { issues: DeoIssue[], summary?: CanonicalIssueCountsSummary }
        setIssues(assetIssuesResult.issues ?? []);
        if (assetIssuesResult.summary) {
          setCountsSummary(assetIssuesResult.summary);
        } else {
          setCountsSummary(null);
        }
      } else {
        // Standard fetch: all project issues with optional summary filters
        // [COUNT-INTEGRITY-1 PATCH ERR-001] Graceful degradation: always load issues even if counts-summary fails
        const results = await Promise.allSettled([
          projectsApi.deoIssuesReadOnly(projectId),
          projectsApi.canonicalIssueCountsSummary(
            projectId,
            Object.keys(summaryFilters).length > 0 ? summaryFilters : undefined
          ),
        ]);

        // Handle issues response
        if (results[0].status === 'fulfilled') {
          setIssues(results[0].value.issues ?? []);
        } else {
          console.error('Error fetching issues:', results[0].reason);
          setError(
            results[0].reason instanceof Error
              ? results[0].reason.message
              : 'Failed to load issues'
          );
        }

        // Handle counts-summary response (non-blocking)
        if (results[1].status === 'fulfilled') {
          setCountsSummary(results[1].value);
        } else {
          console.warn('Counts summary unavailable:', results[1].reason);
          setCountsSummary(null);
          setCountsSummaryWarning(
            'Issue counts unavailable. Displaying issues list without summary statistics.'
          );
        }
      }
    } catch (err: unknown) {
      console.error('Unexpected error fetching issues:', err);
      setError(err instanceof Error ? err.message : 'Failed to load issues');
    } finally {
      setLoading(false);
    }
    // [COUNT-INTEGRITY-1.1 AUDIT FIX] Include severityFilter to refresh summary when severity changes
    // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Include assetTypeParam/assetIdParam for per-asset fetching
  }, [
    projectId,
    actionKeyParam,
    actionKeysParam,
    scopeTypeParam,
    severityFilter,
    assetTypeParam,
    assetIdParam,
  ]);

  const fetchProjectInfo = useCallback(async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = getToken();
      const response = await fetch(
        `${API_URL}/projects/${projectId}/integration-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setProjectName(data.projectName ?? null);
      }
    } catch (err) {
      console.error('Error fetching project info:', err);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchIssues();
    fetchProjectInfo();
  }, [projectId, router, fetchIssues, fetchProjectInfo]);

  // [COUNT-INTEGRITY-1 PATCH 6 FIXUP-2] [SCOPE-CLARITY-1 FIXUP-1] Sync pillarFilter state when URL param changes
  // Use normalizedPillar (not raw pillarParam) to respect priority rules (issueType > pillar)
  useEffect(() => {
    if (hasClickIntegrityFilters) {
      // When click-integrity filters present, force pillar to 'all' (don't sync from URL)
      setPillarFilter('all');
    } else {
      // [SCOPE-CLARITY-1 FIXUP-1] Use normalized pillar - if issueType took priority, pillar will be undefined
      setPillarFilter(normalizedPillar ?? 'all');
    }
  }, [normalizedPillar, hasClickIntegrityFilters]);

  // [COUNT-INTEGRITY-1 PATCH 6 FIXUP-2] URL normalization: force mode=detected when no actionable issues
  useEffect(() => {
    if (
      modeParam === 'actionable' &&
      !hasActionableIssues &&
      hasDetectedIssues
    ) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('mode', 'detected');
      const newUrl = `?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [modeParam, hasActionableIssues, hasDetectedIssues, searchParams, router]);

  useEffect(() => {
    if (previewIssueId && previewPanelRef.current) {
      previewPanelRef.current.focus();
    }
  }, [previewIssueId]);

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await fetchIssues();
      feedback.showSuccess('Issues refreshed successfully');
    } catch {
      feedback.showError('Failed to refresh issues');
    } finally {
      setRescanning(false);
    }
  };

  // [COUNT-INTEGRITY-1.1 UI HARDEN] Compute "current triplet" based on pillar filter
  // When pillarFilter !== 'all', select triplet from countsSummary.byPillar[pillarFilter]
  // Otherwise use the root triplet
  const currentTriplet = useMemo(() => {
    if (!countsSummary) return null;
    if (pillarFilter !== 'all' && countsSummary.byPillar?.[pillarFilter]) {
      const pillarData = countsSummary.byPillar[pillarFilter];
      return effectiveMode === 'actionable'
        ? pillarData.actionable
        : pillarData.detected;
    }
    return effectiveMode === 'actionable'
      ? countsSummary.actionable
      : countsSummary.detected;
  }, [countsSummary, pillarFilter, effectiveMode]);

  // [COUNT-INTEGRITY-1.1 Step 2A] Use canonical triplet counts for severity badges
  // [COUNT-INTEGRITY-1 PATCH ERR-001] When countsSummary is null (API failure), counts are unavailable (not 0)
  const criticalCount = countsSummary
    ? effectiveMode === 'actionable'
      ? (countsSummary.bySeverity?.critical?.actionable?.issueTypesCount ?? 0)
      : (countsSummary.bySeverity?.critical?.detected?.issueTypesCount ?? 0)
    : null;
  const warningCount = countsSummary
    ? effectiveMode === 'actionable'
      ? (countsSummary.bySeverity?.warning?.actionable?.issueTypesCount ?? 0)
      : (countsSummary.bySeverity?.warning?.detected?.issueTypesCount ?? 0)
    : null;
  const infoCount = countsSummary
    ? effectiveMode === 'actionable'
      ? (countsSummary.bySeverity?.info?.actionable?.issueTypesCount ?? 0)
      : (countsSummary.bySeverity?.info?.detected?.issueTypesCount ?? 0)
    : null;

  // [COUNT-INTEGRITY-1.1 UI HARDEN] Helper to check if issue matches a single action key
  const issueMatchesActionKey = (issue: DeoIssue, key: string): boolean => {
    if (key === 'FIX_MISSING_METADATA') {
      return (
        issue.pillarId === 'metadata_snippet_quality' ||
        (issue.type?.includes('metadata') ?? false)
      );
    } else if (key === 'RESOLVE_TECHNICAL_ISSUES') {
      return (
        issue.pillarId === 'technical_indexability' ||
        issue.category === 'technical'
      );
    } else if (key === 'IMPROVE_SEARCH_INTENT') {
      return (
        issue.pillarId === 'search_intent_fit' || Boolean(issue.intentType)
      );
    } else if (key === 'OPTIMIZE_CONTENT') {
      return (
        issue.pillarId === 'content_commerce_signals' ||
        issue.category === 'content_entity'
      );
    }
    return false;
  };

  // [COUNT-INTEGRITY-1 PATCH 6] Filter issues: mode → actionKey/actionKeys → scopeType → UI filters
  const filteredIssues = issues.filter((issue) => {
    // 1. Mode filter (actionable vs detected) - use effectiveMode for correct default
    if (effectiveMode === 'actionable' && !issue.isActionableNow) {
      return false;
    }
    // Note: mode=detected shows all issues (no filter needed)

    // 2. Action key filter (from Work Queue routing)
    // [COUNT-INTEGRITY-1.1 UI HARDEN] Support actionKeys (OR across keys) with actionKey as fallback
    if (actionKeysParam && actionKeysParam.length > 0) {
      // OR across multiple action keys
      const matchesAnyKey = actionKeysParam.some((key) =>
        issueMatchesActionKey(issue, key)
      );
      if (!matchesAnyKey) {
        return false;
      }
    } else if (actionKeyParam) {
      // Single action key (original behavior)
      if (!issueMatchesActionKey(issue, actionKeyParam)) {
        return false;
      }
    }

    // 3. Scope type filter (PRODUCTS/PAGES/COLLECTIONS/STORE_WIDE)
    if (scopeTypeParam && scopeTypeParam !== 'STORE_WIDE') {
      const assetTypeKey = scopeTypeParam.toLowerCase() as
        | 'products'
        | 'pages'
        | 'collections';
      if (!issue.assetTypeCounts || issue.assetTypeCounts[assetTypeKey] === 0) {
        return false;
      }
    }
    // Note: STORE_WIDE shows all issues (no filter needed)

    // 3b. [LIST-ACTIONS-CLARITY-1 FIXUP-1] Asset-specific filter (assetType + assetId)
    // NOTE: When assetTypeParam + assetIdParam are present, issues are already filtered server-side
    // via projectsApi.assetIssues(). This client-side filter is kept as a fallback guard.
    // It will only match issues that were already fetched for this specific asset.
    // No additional client-side filtering needed - issues array is already asset-specific.

    // 4. Severity filter (existing UI filter)
    if (severityFilter !== 'all' && issue.severity !== severityFilter) {
      return false;
    }

    // 5. Pillar filter (existing UI filter)
    if (pillarFilter !== 'all' && issue.pillarId !== pillarFilter) {
      return false;
    }

    return true;
  });

  // Handler to update pillar filter and URL
  // [SCOPE-CLARITY-1 FIXUP-1] When user explicitly picks a pillar, clear conflicting higher-priority scope params
  const handlePillarFilterChange = (newFilter: PillarFilter) => {
    setPillarFilter(newFilter);
    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString());
    if (newFilter === 'all') {
      params.delete('pillar');
    } else {
      params.set('pillar', newFilter);
      // [SCOPE-CLARITY-1 FIXUP-1] Delete conflicting higher-priority scope params so the selected pillar becomes unambiguous
      // Priority order: asset > issueType > pillar - so when user selects pillar, clear issueType and asset scope
      params.delete('issueType');
      params.delete('assetType');
      params.delete('assetId');
    }
    const newUrl = params.toString()
      ? `?${params.toString()}`
      : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };

  // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Updated to use href-based actionability
  // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] Returns fixKind for card attributes
  // [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] "View affected" routes to filtered Products list (not product detail)
  const getFixAction = (issue: DeoIssue) => {
    // [COUNT-INTEGRITY-1 PATCH 6 FIXUP] Gate all fix CTAs on isActionableNow
    if (!issue.isActionableNow) {
      return null;
    }

    // [DIAGNOSTIC-GUIDANCE-1] Outside-control issues (actionability === 'informational') never have Fix CTAs
    if (issue.actionability === 'informational') {
      return null;
    }

    const fixType = issue.fixType as DeoIssueFixType | undefined;
    const fixReady = issue.fixReady ?? false;
    const primaryProductId = issue.primaryProductId;
    const issueType = (issue.type as string | undefined) || issue.id;

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] Derive fixKind from config (default to EDIT)
    const fixConfig = getIssueFixConfig(issueType);
    const fixKind = fixConfig?.fixKind || 'EDIT';

    // [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Build "View affected" href (Products list filtered by issueType)
    // This CTA is available even when fixHref is null, as long as there are affected products
    const buildViewAffectedHref = (): string => {
      return withRouteContext(`/projects/${projectId}/products`, {
        from: 'issues_engine',
        returnTo: currentIssuesPathWithQuery,
        issueType,
      });
    };

    // [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] "View affected" available when affectedProducts exist (before fixHref gate)
    // DIAGNOSTIC issues still use Review CTA (don't convert to View affected)
    if (
      fixKind !== 'DIAGNOSTIC' &&
      issue.affectedProducts &&
      issue.affectedProducts.length > 0
    ) {
      // If this is a multi-product issue (count > 1), always route to list view
      // Single-product issues with specific fix types get direct routing below
      if (issue.count > 1 && !primaryProductId) {
        return {
          kind: 'link' as const,
          label: 'View affected',
          href: buildViewAffectedHref(),
          variant: 'default' as const,
          fixKind,
        };
      }
    }

    // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Check if issue has a valid fix href (href-based actionability)
    const fixHref = buildIssueFixHref({
      projectId,
      issue,
      from: 'issues_engine',
    });

    // [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] If no fixHref but has affected products, use View affected
    if (!fixHref) {
      if (
        issue.affectedProducts &&
        issue.affectedProducts.length > 0 &&
        fixKind !== 'DIAGNOSTIC'
      ) {
        return {
          kind: 'link' as const,
          label: 'View affected',
          href: buildViewAffectedHref(),
          variant: 'default' as const,
          fixKind,
        };
      }
      // [COUNT-INTEGRITY-1 PATCH 6 FIXUP] No valid href and no affected products - no action
      return null;
    }

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] DIAGNOSTIC issues get "Review" CTA, not "Fix"
    if (fixKind === 'DIAGNOSTIC') {
      return {
        kind: 'link' as const,
        label: 'Review',
        href: fixHref,
        variant: 'diagnostic' as const,
        fixKind: 'DIAGNOSTIC' as const,
      };
    }

    // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Reuse fixHref computed above - no dead-click risk
    if (fixType === 'aiFix' && fixReady && primaryProductId && fixHref) {
      const supportsInlineFix =
        issueType === 'missing_seo_title' ||
        issueType === 'missing_seo_description';
      if (supportsInlineFix) {
        return {
          kind: 'ai-fix-now' as const,
          fixHref, // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Include href for navigation guarantee
          fixKind,
        };
      }
      return {
        kind: 'link' as const,
        label: 'Fix with AI',
        href: fixHref,
        variant: 'ai' as const,
        fixKind,
      };
    }

    if (fixType === 'manualFix' && primaryProductId && fixHref) {
      return {
        kind: 'link' as const,
        label: 'Open',
        href: fixHref,
        variant: 'manual' as const,
        fixKind,
      };
    }

    if (fixType === 'syncFix') {
      return {
        kind: 'link' as const,
        label: 'Sync',
        href: `/projects/${projectId}/products?action=sync`,
        variant: 'sync' as const,
        fixKind,
      };
    }

    // [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Default fallback: View affected routes to filtered Products list
    if (issue.affectedProducts && issue.affectedProducts.length > 0) {
      return {
        kind: 'link' as const,
        label: 'View affected',
        href: buildViewAffectedHref(),
        variant: 'default' as const,
        fixKind,
      };
    }

    // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Orphan issues (no fixHref, no affected products) - no fix action
    return null;
  };

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Gate button navigation with unsaved confirmation
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-4] Clear local unsaved state on confirmed leave to prevent double prompt
  // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Accept href as argument - no recomputation, guarantees navigation if clickable
  const handleIssueClick = (href: string) => {
    // [ISSUE-TO-FIX-PATH-1 FIXUP-2] href is pre-validated - if we're here, navigation is guaranteed
    const draftState = getDraftState();
    if (draftState === 'unsaved') {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) {
        return;
      }
      // User confirmed leaving - discard unsaved preview state (not sessionStorage saved drafts)
      setPreviewIssueId(null);
      setPreviewValue(null);
      setPreviewFieldLabel(null);
      setPreviewProductId(null);
      setPreviewCurrentTitle(null);
      setPreviewCurrentDescription(null);
      setPreviewError(null);
      setSavedDraft(null);
      setAppliedAt(null);
      // Immediately clear global unsaved state to prevent double prompt
      setHasUnsavedChanges(false);
    }
    router.push(href);
  };

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Check for stored draft and restore if found
  const handleOpenPreview = async (issue: DeoIssue) => {
    const primaryProductId = issue.primaryProductId;
    const issueType = (issue.type as string | undefined) || issue.id;

    if (!primaryProductId) {
      feedback.showError(
        'Cannot run AI fix: no primary product found for this issue.'
      );
      return;
    }

    if (
      issueType !== 'missing_seo_title' &&
      issueType !== 'missing_seo_description'
    ) {
      // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Compute href for navigation
      const href = buildIssueFixHref({
        projectId,
        issue,
        from: 'issues_engine',
      });
      if (href) {
        handleIssueClick(href);
      }
      return;
    }

    const fieldLabel =
      issueType === 'missing_seo_title' ? 'SEO title' : 'SEO description';

    // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Check sessionStorage for existing draft
    const storedDraft = loadIssueDraft(
      projectId,
      issue.id,
      primaryProductId,
      fieldLabel
    );
    if (storedDraft) {
      // Restore draft from sessionStorage without calling AI
      setPreviewIssueId(issue.id);
      setPreviewLoading(false);
      setPreviewError(null);
      setPreviewProductName(
        storedDraft.currentTitle || `Product ${primaryProductId}`
      );
      setPreviewFieldLabel(storedDraft.fieldLabel);
      setPreviewCurrentTitle(storedDraft.currentTitle ?? '');
      setPreviewCurrentDescription(storedDraft.currentDescription ?? '');
      setPreviewValue(storedDraft.value);
      setPreviewProductId(primaryProductId);
      setSavedDraft(storedDraft);
      setAppliedAt(null);
      // Scroll preview panel into view
      setTimeout(() => {
        if (previewPanelRef.current) {
          previewPanelRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);
      return;
    }

    try {
      setPreviewIssueId(issue.id);
      setPreviewLoading(true);
      setPreviewError(null);
      setFixingIssueId(issue.id);

      const result: any = await aiApi.suggestProductMetadata(primaryProductId);

      const currentTitle = result?.current?.title ?? '';
      const currentDescription = result?.current?.description ?? '';
      const suggestedTitle = result?.suggested?.title ?? '';
      const suggestedDescription = result?.suggested?.description ?? '';

      const productName =
        result?.current?.title || `Product ${primaryProductId}`;
      const previewText =
        issueType === 'missing_seo_title'
          ? suggestedTitle || ''
          : suggestedDescription || '';

      if (!previewText) {
        setPreviewError("Couldn't generate a preview. Try again.");
        setPreviewValue(null);
        return;
      }

      setPreviewProductName(productName);
      setPreviewFieldLabel(fieldLabel);
      // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Store both current values for field preservation
      setPreviewCurrentTitle(currentTitle || '');
      setPreviewCurrentDescription(currentDescription || '');
      setPreviewValue(previewText);
      // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Store productId and clear any old saved draft
      setPreviewProductId(primaryProductId);
      setSavedDraft(null);
      setAppliedAt(null);
      // Scroll preview panel into view
      setTimeout(() => {
        if (previewPanelRef.current) {
          previewPanelRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);
    } catch (err: unknown) {
      console.error('Error generating AI preview for issue:', err);

      if (err instanceof ApiError && err.code === 'AI_DAILY_LIMIT_REACHED') {
        const limitMessage =
          'Token limit reached. Upgrade to continue fixing products.';
        feedback.showLimit(limitMessage, '/settings/billing');
        setPreviewIssueId(null);
        return;
      }

      setPreviewError("Couldn't generate a preview. Try again.");
    } finally {
      setPreviewLoading(false);
      setFixingIssueId(null);
    }
  };

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Save draft handler
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Persist draft to sessionStorage
  const handleSaveDraft = useCallback(
    (issue: DeoIssue) => {
      if (
        !previewValue ||
        !previewFieldLabel ||
        !previewProductId ||
        previewIssueId !== issue.id
      ) {
        return;
      }
      const draft: IssueDraft = {
        issueId: issue.id,
        productId: previewProductId,
        fieldLabel: previewFieldLabel,
        value: previewValue,
        savedAt: new Date().toISOString(),
        // Store current values for field preservation on Apply
        currentTitle: previewCurrentTitle ?? undefined,
        currentDescription: previewCurrentDescription ?? undefined,
      };
      setSavedDraft(draft);
      // Persist to sessionStorage for cross-navigation persistence
      saveIssueDraftToStorage(projectId, draft);
      feedback.showSuccess('Draft saved. You can now apply it to Shopify.');
    },
    [
      previewValue,
      previewFieldLabel,
      previewProductId,
      previewIssueId,
      previewCurrentTitle,
      previewCurrentDescription,
      projectId,
      feedback,
    ]
  );

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Updated to apply saved draft only, no AI call
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Delete stored draft from sessionStorage on success
  const handleApplyFixFromPreview = async (issue: DeoIssue) => {
    // Must have a saved draft to apply
    if (!savedDraft || savedDraft.issueId !== issue.id) {
      feedback.showError('Please save your draft before applying to Shopify.');
      return;
    }

    const { productId, fieldLabel, value } = savedDraft;

    try {
      setFixingIssueId(issue.id);

      // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Apply saved draft values directly to Shopify (no AI call)
      // Use stored current values to preserve the other field correctly
      if (fieldLabel === 'SEO title') {
        // Apply title only, preserve current description
        await shopifyApi.updateProductSeo(
          productId,
          value,
          previewCurrentDescription ?? ''
        );
      } else {
        // Apply description only, preserve current title
        await shopifyApi.updateProductSeo(
          productId,
          previewCurrentTitle ?? '',
          value
        );
      }

      const applyTimestamp = new Date().toISOString();
      const productName = previewProductName;
      const remainingCount = Math.max((issue.count ?? 1) - 1, 0);

      const message = `${fieldLabel} applied to '${productName}'. ${remainingCount} remaining.`;
      feedback.showSuccess(message);

      // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Keep preview panel visible with applied state
      // Clear draft but keep previewValue to show applied state
      setSavedDraft(null);
      setAppliedAt(applyTimestamp);
      // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Delete from sessionStorage on successful apply
      deleteIssueDraftFromStorage(projectId, issue.id, productId, fieldLabel);
      // Don't clear previewIssueId or previewValue - keep panel visible showing applied state
      await fetchIssues();
    } catch (err: unknown) {
      console.error('Error applying fix to Shopify:', err);

      if (
        err instanceof ApiError &&
        err.code === 'ENTITLEMENTS_LIMIT_REACHED'
      ) {
        const message = 'Upgrade to apply fixes to Shopify.';
        feedback.showLimit(message, '/settings/billing');
        return;
      }

      feedback.showError('Failed to apply fix to Shopify. Please try again.');
    } finally {
      setFixingIssueId(null);
    }
  };

  const handleCancelPreview = (issue: DeoIssue) => {
    setPreviewIssueId(null);
    setPreviewError(null);
    setPreviewProductName(null);
    setPreviewFieldLabel(null);
    // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Clear both current value states
    setPreviewCurrentTitle(null);
    setPreviewCurrentDescription(null);
    setPreviewValue(null);
    // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Clear draft state on cancel
    setSavedDraft(null);
    setPreviewProductId(null);
    setAppliedAt(null);

    const button = document.getElementById(
      `issue-fix-next-${issue.id}`
    ) as HTMLButtonElement | null;
    if (button) {
      button.focus();
    }
  };

  // [ISSUES-ENGINE-REMOUNT-1] Create ContextDescriptor for RCP from issue
  const getIssueDescriptor = useCallback(
    (issue: DeoIssue): ContextDescriptor => {
      const safeTitle = getSafeIssueTitle(issue);
      const fixHref = buildIssueFixHref({
        projectId,
        issue,
        from: 'issues_engine',
      });

      return {
        kind: 'issue',
        id: issue.id,
        title: safeTitle,
        scopeProjectId: projectId,
        openHref: fixHref || undefined,
        metadata: {
          pillarId: issue.pillarId || '',
          severity: issue.severity,
          isActionableNow: String(issue.isActionableNow ?? false),
          actionability: issue.actionability || '',
          count: String(issue.count),
          type: issue.type || '',
          whyItMatters: issue.whyItMatters || issue.description || '',
          primaryProductId: issue.primaryProductId || '',
          productsCount: String(issue.assetTypeCounts?.products ?? 0),
          pagesCount: String(issue.assetTypeCounts?.pages ?? 0),
          collectionsCount: String(issue.assetTypeCounts?.collections ?? 0),
        },
      };
    },
    [projectId]
  );

  // [ISSUES-ENGINE-REMOUNT-1] DataTable columns definition
  const issueColumns = useMemo((): DataTableColumn<IssueRow>[] => {
    return [
      {
        key: 'summary',
        header: 'Issue',
        width: 'w-1/3',
        truncate: false,
        cell: (row) => {
          const safeTitle = getSafeIssueTitle(row);
          const isOutsideEngineControl = row.actionability === 'informational';
          const fixHref = isOutsideEngineControl
            ? null
            : buildIssueFixHref({ projectId, issue: row, from: 'issues_engine' });
          const isClickableIssue =
            !isOutsideEngineControl &&
            row.isActionableNow === true &&
            fixHref !== null;
          const fixAction = getFixAction(row);

          return (
            <div
              data-testid={
                isClickableIssue
                  ? 'issue-card-actionable'
                  : 'issue-card-informational'
              }
              data-fix-kind={fixAction?.fixKind}
            >
              {fixHref && isClickableIssue ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIssueClick(fixHref);
                  }}
                  data-no-row-click
                  className="text-left hover:underline"
                >
                  <span className="font-semibold text-foreground">
                    {safeTitle}
                  </span>
                </button>
              ) : (
                <span className="font-semibold text-foreground">{safeTitle}</span>
              )}
              {!isClickableIssue && (
                <span className="ml-2 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {row.actionability === 'informational'
                    ? 'Outside control'
                    : 'Informational'}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'scope',
        header: 'Asset Scope',
        width: 'w-1/6',
        cell: (row) => {
          const counts = row.assetTypeCounts;
          if (!counts) {
            return (
              <span className="text-sm text-muted-foreground">
                {row.count} item{row.count !== 1 ? 's' : ''}
              </span>
            );
          }
          const parts: string[] = [];
          if (counts.products > 0) parts.push(`${counts.products} product${counts.products !== 1 ? 's' : ''}`);
          if (counts.pages > 0) parts.push(`${counts.pages} page${counts.pages !== 1 ? 's' : ''}`);
          if (counts.collections > 0) parts.push(`${counts.collections} collection${counts.collections !== 1 ? 's' : ''}`);
          return (
            <span className="text-sm text-muted-foreground">
              {parts.join(', ') || `${row.count} item${row.count !== 1 ? 's' : ''}`}
            </span>
          );
        },
      },
      {
        key: 'pillar',
        header: 'Pillar',
        width: 'w-1/8',
        cell: (row) => {
          const pillar = DEO_PILLARS.find((p) => p.id === row.pillarId);
          return (
            <span className="text-sm text-muted-foreground">
              {pillar?.shortName || row.pillarId || 'Unknown'}
            </span>
          );
        },
      },
      {
        key: 'severity',
        header: 'Severity',
        width: 'w-1/12',
        cell: (row) => {
          const severityClass =
            row.severity === 'critical'
              ? 'border-[hsl(var(--danger-background))]/50 bg-[hsl(var(--danger-background))] text-[hsl(var(--danger-foreground))]'
              : row.severity === 'warning'
                ? 'border-[hsl(var(--warning-background))]/50 bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]'
                : 'border-border bg-muted text-muted-foreground';
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${severityClass}`}
            >
              {row.severity.charAt(0).toUpperCase() + row.severity.slice(1)}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        width: 'w-1/8',
        cell: (row) => {
          const statusLabel =
            row.actionability === 'informational'
              ? 'Informational'
              : row.isActionableNow === false
                ? 'Blocked'
                : 'Detected';
          return (
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {statusLabel}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        width: 'w-1/8',
        truncate: false,
        cell: (row) => {
          const fixAction = getFixAction(row);
          if (!fixAction) {
            return <span className="text-muted-foreground">—</span>;
          }

          if (fixAction.kind === 'ai-fix-now') {
            return (
              <button
                id={`issue-fix-next-${row.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPreview(row);
                }}
                disabled={fixingIssueId === row.id}
                data-testid="issue-fix-next-button"
                data-no-row-click
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-primary bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {fixingIssueId === row.id ? 'Fixing…' : 'Fix next'}
              </button>
            );
          }

          if (fixAction.kind === 'link') {
            return (
              <GuardedLink
                href={fixAction.href}
                data-testid="issue-card-cta"
                data-no-row-click
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/80"
              >
                {fixAction.label}
              </GuardedLink>
            );
          }

          return null;
        },
      },
    ];
  }, [projectId, fixingIssueId, handleIssueClick, handleOpenPreview, getFixAction]);

  // [ISSUES-ENGINE-REMOUNT-1] Render expansion row content for ai-fix-now preview
  const renderExpandedContent = useCallback(
    (row: IssueRow) => {
      if (previewIssueId !== row.id) return null;

      const isOutsideEngineControl = row.actionability === 'informational';
      const fixHref = isOutsideEngineControl
        ? null
        : buildIssueFixHref({ projectId, issue: row, from: 'issues_engine' });
      const isClickableIssue =
        !isOutsideEngineControl &&
        row.isActionableNow === true &&
        fixHref !== null;

      if (!isClickableIssue) return null;

      return (
        <div
          ref={previewPanelRef}
          tabIndex={-1}
          data-testid="issue-preview-draft-panel"
          className="rounded-md border border-border bg-[hsl(var(--surface-raised))] p-3 text-xs focus:outline-none"
        >
          {previewLoading ? (
            <p className="text-sm text-muted-foreground">Generating preview…</p>
          ) : previewError ? (
            <p className="text-sm text-[hsl(var(--danger-foreground))]">{previewError}</p>
          ) : previewValue ? (
            <>
              {/* Draft state banner */}
              <div
                data-testid="issue-draft-state-banner"
                className={`mb-2 rounded px-2 py-1 text-[11px] font-medium ${
                  getDraftState() === 'unsaved'
                    ? 'bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]'
                    : getDraftState() === 'saved'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]'
                }`}
              >
                {getDraftState() === 'unsaved' && 'Draft — not applied'}
                {getDraftState() === 'saved' && 'Draft saved — not applied'}
                {getDraftState() === 'applied' && (
                  <>
                    Applied to Shopify on{' '}
                    {appliedAt
                      ? new Date(appliedAt).toLocaleString()
                      : 'unknown date'}
                  </>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground">
                {previewProductName || 'Selected product'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Field: {previewFieldLabel ?? 'SEO field'}
              </p>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Current value
                  </p>
                  <p className="mt-1 rounded bg-[hsl(var(--surface-card))] px-2 py-1 text-[11px] text-foreground">
                    {previewFieldLabel === 'SEO title' ? (
                      previewCurrentTitle &&
                      previewCurrentTitle.trim().length > 0 ? (
                        previewCurrentTitle
                      ) : (
                        <span className="italic text-muted-foreground">
                          Missing
                        </span>
                      )
                    ) : previewCurrentDescription &&
                      previewCurrentDescription.trim().length > 0 ? (
                      previewCurrentDescription
                    ) : (
                      <span className="italic text-muted-foreground">
                        Missing
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    AI preview
                  </p>
                  <p className="mt-1 rounded bg-[hsl(var(--surface-card))] px-2 py-1 text-[11px] text-foreground">
                    {previewValue}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {getDraftState() === 'unsaved' && (
                  <button
                    type="button"
                    data-testid="issue-save-draft-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveDraft(row);
                    }}
                    className="inline-flex items-center rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary shadow-sm hover:bg-primary/20"
                  >
                    Save draft
                  </button>
                )}
                <button
                  type="button"
                  data-testid="issue-apply-to-shopify-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyFixFromPreview(row);
                  }}
                  disabled={
                    fixingIssueId === row.id || getDraftState() !== 'saved'
                  }
                  title={
                    getDraftState() !== 'saved'
                      ? 'Save your draft first before applying to Shopify'
                      : 'Applies saved draft only. Does not use AI.'
                  }
                  className="inline-flex items-center rounded-md border border-[hsl(var(--success-background))]/50 bg-[hsl(var(--success-background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--success-foreground))] shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {fixingIssueId === row.id ? 'Applying…' : 'Apply to Shopify'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelPreview(row);
                  }}
                  className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : null}
        </div>
      );
    },
    [
      previewIssueId,
      previewLoading,
      previewError,
      previewValue,
      previewProductName,
      previewFieldLabel,
      previewCurrentTitle,
      previewCurrentDescription,
      appliedAt,
      fixingIssueId,
      getDraftState,
      handleSaveDraft,
      handleApplyFixFromPreview,
      handleCancelPreview,
      projectId,
    ]
  );

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-muted-foreground">Loading issues...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-[hsl(var(--danger-background))]/50 bg-[hsl(var(--danger-background))] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[hsl(var(--danger-foreground))]">{error}</p>
            <button
              onClick={fetchIssues}
              className="text-sm font-medium text-[hsl(var(--danger-foreground))] hover:opacity-80"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* [COUNT-INTEGRITY-1 PATCH ERR-001] Counts-summary warning banner (non-blocking) */}
      {countsSummaryWarning && !error && (
        <div
          className="mb-6 rounded-lg border border-[hsl(var(--warning-background))]/50 bg-[hsl(var(--warning-background))] p-4"
          data-testid="counts-summary-warning-banner"
        >
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-[hsl(var(--warning))] mt-0.5"
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
            <div className="flex-1">
              <p className="text-sm text-[hsl(var(--warning-foreground))]">{countsSummaryWarning}</p>
            </div>
            <button
              onClick={fetchIssues}
              className="text-sm font-medium text-[hsl(var(--warning-foreground))] hover:opacity-80 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Issue Summary Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Issues Engine</h1>
            {projectName && <p className="text-muted-foreground">{projectName}</p>}
          </div>
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="inline-flex items-center justify-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rescanning ? (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4 animate-spin"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Scanning...
              </>
            ) : (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
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
                Re-scan Issues
              </>
            )}
          </button>
        </div>

        {/* [ROUTE-INTEGRITY-1 FIXUP-2] [SCOPE-CLARITY-1] ScopeBanner - placed immediately after h1 header row ("on arrival") */}
        {/* Uses normalized scope chips for explicit scope display */}
        <ScopeBanner
          from={fromParam}
          returnTo={validatedReturnTo || `/projects/${projectId}/issues`}
          showingText={scopeBannerShowingText}
          onClearFiltersHref={buildClearFiltersHref(
            `/projects/${projectId}/issues`
          )}
          chips={normalizedScopeResult.chips}
          wasAdjusted={normalizedScopeResult.wasAdjusted}
        />

        {/* [COUNT-INTEGRITY-1.1 Step 2A] Canonical Triplet Summary Display */}
        {/* [COUNT-INTEGRITY-1.1 UI HARDEN] Use currentTriplet (pillar-aware) instead of root triplet */}
        {currentTriplet ? (
          <div className="mt-4 rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6">
            <TripletDisplay
              triplet={currentTriplet}
              layout="horizontal"
              size="lg"
            />
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6 text-center">
            <div className="text-sm text-muted-foreground">
              Issue counts unavailable
            </div>
          </div>
        )}

        {/* [COUNT-INTEGRITY-1.1 PATCH 5] Zero-actionable suppression message */}
        {/* [COUNT-INTEGRITY-1.1 UI HARDEN] Use currentTriplet for pillar-aware suppression */}
        {currentTriplet &&
          effectiveMode === 'actionable' &&
          currentTriplet.actionableNowCount === 0 && (
            <div
              className="mt-4 rounded-lg border border-[hsl(var(--warning-background))]/50 bg-[hsl(var(--warning-background))] p-4 text-center"
              data-testid="no-eligible-items-message"
            >
              <p className="text-sm text-[hsl(var(--warning-foreground))]">
                No items currently eligible for action.
              </p>
              <p className="mt-1 text-xs text-[hsl(var(--warning-foreground))]/80">
                Switch to Detected mode to view all detected issues.
              </p>
            </div>
          )}

        {/* Severity Breakdown Cards */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-[hsl(var(--danger-background))]/50 bg-[hsl(var(--danger-background))] p-4">
            <div className="text-2xl font-bold text-[hsl(var(--danger-foreground))]">
              {criticalCount !== null ? criticalCount : '—'}
            </div>
            <div className="text-sm text-[hsl(var(--danger-foreground))]/80">Critical issue types</div>
          </div>
          <div className="rounded-lg border border-[hsl(var(--warning-background))]/50 bg-[hsl(var(--warning-background))] p-4">
            <div className="text-2xl font-bold text-[hsl(var(--warning-foreground))]">
              {warningCount !== null ? warningCount : '—'}
            </div>
            <div className="text-sm text-[hsl(var(--warning-foreground))]/80">Warning issue types</div>
          </div>
          <div className="rounded-lg border border-[hsl(var(--info-background))]/50 bg-[hsl(var(--info-background))] p-4">
            <div className="text-2xl font-bold text-[hsl(var(--info-foreground))]">
              {infoCount !== null ? infoCount : '—'}
            </div>
            <div className="text-sm text-[hsl(var(--info-foreground))]/80">Info issue types</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-6 space-y-4">
        {/* Pillar Filter */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Filter by DEO Pillar
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePillarFilterChange('all')}
              data-testid="pillar-filter-all"
              aria-pressed={pillarFilter === 'all'}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pillarFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              All pillars
            </button>
            {DEO_PILLARS.filter((p) => !p.comingSoon).map((pillar) => {
              // [COUNT-INTEGRITY-1.1 Step 2A] Use canonical triplet counts for pillar badges
              // [COUNT-INTEGRITY-1 PATCH ERR-001] Handle null countsSummary (hide badge when unavailable)
              const pillarTriplet = countsSummary?.byPillar[pillar.id];
              const pillarIssueCount = countsSummary
                ? effectiveMode === 'actionable'
                  ? (pillarTriplet?.actionable?.issueTypesCount ?? 0)
                  : (pillarTriplet?.detected?.issueTypesCount ?? 0)
                : null;
              return (
                <button
                  key={pillar.id}
                  onClick={() => handlePillarFilterChange(pillar.id)}
                  data-testid={`pillar-filter-${pillar.id}`}
                  aria-pressed={pillarFilter === pillar.id}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pillarFilter === pillar.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  {pillar.shortName}
                  {pillarIssueCount !== null && pillarIssueCount > 0 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({pillarIssueCount} issue types)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* [COUNT-INTEGRITY-1 PATCH 6] Mode Toggle (Actionable/Detected) */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Issue Mode
          </label>
          <div className="flex flex-wrap gap-2">
            {(['actionable', 'detected'] as const).map((mode) => {
              // [COUNT-INTEGRITY-1 PATCH 6 FIXUP-2] Disable actionable button when no actionable issues
              const isDisabled = mode === 'actionable' && !hasActionableIssues;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    if (isDisabled) return;
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('mode', mode);
                    const newUrl = `?${params.toString()}`;
                    router.replace(newUrl, { scroll: false });
                  }}
                  disabled={isDisabled}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    effectiveMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : isDisabled
                        ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                  data-testid={`mode-toggle-${mode}`}
                >
                  {mode === 'actionable' ? 'Actionable' : 'Detected'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity Filter */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Filter by Severity
          </label>
          <div className="flex flex-wrap gap-2">
            {(['all', 'critical', 'warning', 'info'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSeverityFilter(filter)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  severityFilter === filter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {filter === 'all'
                  ? 'All severities'
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
                {/* [COUNT-INTEGRITY-1.1 Step 2A] Show explicit "issue types" label */}
                {filter !== 'all' &&
                  (() => {
                    const count =
                      filter === 'critical'
                        ? criticalCount
                        : filter === 'warning'
                          ? warningCount
                          : infoCount;
                    return count !== null && count > 0 ? (
                      <span className="ml-1 text-xs">
                        ({count} issue types)
                      </span>
                    ) : null;
                  })()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* [ISSUES-ENGINE-REMOUNT-1] Issues List with DataTable + RCP integration */}
      {filteredIssues.length === 0 ? (
        <div className="rounded-lg border border-[hsl(var(--success-background))]/50 bg-[hsl(var(--success-background))] p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[hsl(var(--success-foreground))]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {/* [COUNT-INTEGRITY-1 PATCH 6 FIXUP-2] Mode-aware empty state text */}
          <h3 className="mt-2 text-sm font-medium text-[hsl(var(--success-foreground))]">
            {severityFilter === 'all' && pillarFilter === 'all'
              ? effectiveMode === 'actionable'
                ? 'No actionable issues'
                : 'No issues detected'
              : pillarFilter !== 'all'
                ? `No ${effectiveMode === 'actionable' ? 'actionable ' : ''}issues for ${DEO_PILLARS.find((p) => p.id === pillarFilter)?.shortName ?? pillarFilter}`
                : `No ${effectiveMode === 'actionable' ? 'actionable ' : ''}${severityFilter} issues`}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {severityFilter === 'all' && pillarFilter === 'all'
              ? 'Your project looks healthy based on the latest analysis.'
              : 'Try selecting a different filter to see other issues.'}
          </p>
        </div>
      ) : (
        <DataTable<IssueRow>
          rows={filteredIssues as IssueRow[]}
          columns={issueColumns}
          onRowClick={(row) => openPanel(getIssueDescriptor(row))}
          onOpenContext={openPanel}
          getRowDescriptor={getIssueDescriptor}
          isRowExpanded={(row) => previewIssueId === row.id}
          renderExpandedContent={renderExpandedContent}
        />
      )}
    </div>
  );
}
