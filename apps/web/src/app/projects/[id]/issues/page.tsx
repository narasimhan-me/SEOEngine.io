'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import type { DeoIssue, DeoIssueFixType, CanonicalIssueCountsSummary } from '@/lib/deo-issues';
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
  getSafeIssueDescription,
} from '@/lib/issue-to-fix-path';
// [ISSUE-FIX-NAV-AND-ANCHORS-1] Import navigation utilities for returnTo chain
import {
  getValidatedReturnTo,
  buildBackLink,
} from '@/lib/issue-fix-navigation';
import { getSafeReturnTo } from '@/lib/route-context';
// [SCOPE-CLARITY-1] Import scope normalization utilities
import { normalizeScopeParams, buildClearFiltersHref } from '@/lib/scope-normalization';

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
function getIssueDraftKey(projectId: string, issueId: string, productId: string, fieldLabel: string): string {
  return `issue_draft:${projectId}:${issueId}:${productId}:${fieldLabel}`;
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Load saved draft from sessionStorage
function loadIssueDraft(projectId: string, issueId: string, productId: string, fieldLabel: string): IssueDraft | null {
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
    const key = getIssueDraftKey(projectId, draft.issueId, draft.productId, draft.fieldLabel);
    sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Ignore storage errors
  }
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Delete draft from sessionStorage
function deleteIssueDraftFromStorage(projectId: string, issueId: string, productId: string, fieldLabel: string): void {
  try {
    const key = getIssueDraftKey(projectId, issueId, productId, fieldLabel);
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

export default function IssuesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  // Read pillar filter from URL query param (?pillar=metadata_snippet_quality)
  const pillarParam = searchParams.get('pillar') as DeoPillarId | null;

  // [COUNT-INTEGRITY-1 PATCH 6] Read click-integrity filter params from Work Queue routing
  const modeParam = searchParams.get('mode') as 'actionable' | 'detected' | null;
  const actionKeyParam = searchParams.get('actionKey');
  // [COUNT-INTEGRITY-1.1 UI HARDEN] Support actionKeys for multi-action filtering (OR across keys)
  // Accepts repeated params (?actionKeys=KEY1&actionKeys=KEY2) or comma-separated (?actionKeys=KEY1,KEY2)
  const actionKeysParam = useMemo(() => {
    const repeatedParams = searchParams.getAll('actionKeys');
    if (repeatedParams.length > 0) {
      // Handle repeated params - flatten any comma-separated values
      return repeatedParams.flatMap(p => p.split(',').map(k => k.trim())).filter(Boolean);
    }
    return null;
  }, [searchParams]);
  const scopeTypeParam = searchParams.get('scopeType') as 'PRODUCTS' | 'PAGES' | 'COLLECTIONS' | 'STORE_WIDE' | null;

  // [LIST-ACTIONS-CLARITY-1] Read asset filter params for asset-specific issue views
  const assetTypeParam = searchParams.get('assetType') as 'products' | 'pages' | 'collections' | null;
  const assetIdParam = searchParams.get('assetId');

  // [ROUTE-INTEGRITY-1] Read from context from URL
  const fromParam = searchParams.get('from');

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

  // [ISSUE-FIX-NAV-AND-ANCHORS-1] Read and validate returnTo context from URL
  const validatedNavContext = useMemo(() => {
    return getValidatedReturnTo(projectId, searchParams);
  }, [projectId, searchParams]);

  // [ISSUE-FIX-NAV-AND-ANCHORS-1] Build primary back link when coming from another context
  const primaryBackLink = useMemo(() => {
    if (validatedNavContext.returnTo || validatedNavContext.from) {
      return buildBackLink({
        projectId,
        returnTo: validatedNavContext.returnTo,
        returnLabel: validatedNavContext.returnLabel,
        from: validatedNavContext.from,
        fallback: 'store_health',
      });
    }
    return null;
  }, [projectId, validatedNavContext]);

  // [ISSUE-FIX-NAV-AND-ANCHORS-1] Get current path for passing as returnTo to child navigation
  // Commented out for now - unused but kept for future navigation context
  // const currentIssuesPath = useMemo(() => {
  //   return getCurrentPathWithQuery(pathname, searchParams);
  // }, [pathname, searchParams]);

  const [issues, setIssues] = useState<DeoIssue[]>([]);
  // [COUNT-INTEGRITY-1.1 Step 2A] Migrated to canonical triplet counts
  const [countsSummary, setCountsSummary] = useState<CanonicalIssueCountsSummary | null>(null);
  // [COUNT-INTEGRITY-1 PATCH ERR-001] Graceful degradation for counts-summary API failures
  const [countsSummaryWarning, setCountsSummaryWarning] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  // [COUNT-INTEGRITY-1 PATCH 6 FIXUP] Don't auto-apply pillar param when click-integrity filters present
  // [COUNT-INTEGRITY-1.1 UI HARDEN] Include actionKeys in filter detection
  // [LIST-ACTIONS-CLARITY-1] Include assetType/assetId in filter detection
  const hasClickIntegrityFilters = !!(actionKeyParam || (actionKeysParam && actionKeysParam.length > 0) || scopeTypeParam || assetTypeParam || assetIdParam);
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
      return (countsSummary.byPillar[pillarFilter].actionable?.issueTypesCount ?? 0) > 0;
    }
    return (countsSummary.actionable.issueTypesCount ?? 0) > 0;
  }, [countsSummary, pillarFilter, issues]);

  const hasDetectedIssues = useMemo(() => {
    if (!countsSummary) {
      return issues.length > 0;
    }
    if (pillarFilter !== 'all' && countsSummary.byPillar?.[pillarFilter]) {
      return (countsSummary.byPillar[pillarFilter].detected?.issueTypesCount ?? 0) > 0;
    }
    return (countsSummary.detected.issueTypesCount ?? 0) > 0;
  }, [countsSummary, pillarFilter, issues]);

  const effectiveMode: 'actionable' | 'detected' =
    modeParam === 'detected'
      ? 'detected'
      : (!hasActionableIssues && hasDetectedIssues)
        ? 'detected'  // Force detected when no actionable but detected exist
        : 'actionable';
  const [rescanning, setRescanning] = useState(false);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);

  const [previewIssueId, setPreviewIssueId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewProductName, setPreviewProductName] = useState<string | null>(null);
  const [previewFieldLabel, setPreviewFieldLabel] = useState<'SEO title' | 'SEO description' | null>(null);
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Store both current title and description for field preservation
  const [previewCurrentTitle, setPreviewCurrentTitle] = useState<string | null>(null);
  const [previewCurrentDescription, setPreviewCurrentDescription] = useState<string | null>(null);
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
    if (savedDraft && previewIssueId === savedDraft.issueId && previewValue === savedDraft.value) {
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
        const normalizedScopeType = scopeTypeParam.toLowerCase() as 'products' | 'pages' | 'collections';
        if (['products', 'pages', 'collections'].includes(normalizedScopeType)) {
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
          severityFilter !== 'all' ? { severity: severityFilter } : undefined,
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
          projectsApi.canonicalIssueCountsSummary(projectId, Object.keys(summaryFilters).length > 0 ? summaryFilters : undefined),
        ]);

        // Handle issues response
        if (results[0].status === 'fulfilled') {
          setIssues(results[0].value.issues ?? []);
        } else {
          console.error('Error fetching issues:', results[0].reason);
          setError(results[0].reason instanceof Error ? results[0].reason.message : 'Failed to load issues');
        }

        // Handle counts-summary response (non-blocking)
        if (results[1].status === 'fulfilled') {
          setCountsSummary(results[1].value);
        } else {
          console.warn('Counts summary unavailable:', results[1].reason);
          setCountsSummary(null);
          setCountsSummaryWarning('Issue counts unavailable. Displaying issues list without summary statistics.');
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
  }, [projectId, actionKeyParam, actionKeysParam, scopeTypeParam, severityFilter, assetTypeParam, assetIdParam]);

  const fetchProjectInfo = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = getToken();
      const response = await fetch(`${API_URL}/projects/${projectId}/integration-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
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
    if (modeParam === 'actionable' && !hasActionableIssues && hasDetectedIssues) {
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
      return effectiveMode === 'actionable' ? pillarData.actionable : pillarData.detected;
    }
    return effectiveMode === 'actionable' ? countsSummary.actionable : countsSummary.detected;
  }, [countsSummary, pillarFilter, effectiveMode]);

  // [COUNT-INTEGRITY-1.1 Step 2A] Use canonical triplet counts for severity badges
  // [COUNT-INTEGRITY-1 PATCH ERR-001] When countsSummary is null (API failure), counts are unavailable (not 0)
  const criticalCount = countsSummary
    ? (effectiveMode === 'actionable'
        ? (countsSummary.bySeverity?.critical?.actionable?.issueTypesCount ?? 0)
        : (countsSummary.bySeverity?.critical?.detected?.issueTypesCount ?? 0))
    : null;
  const warningCount = countsSummary
    ? (effectiveMode === 'actionable'
        ? (countsSummary.bySeverity?.warning?.actionable?.issueTypesCount ?? 0)
        : (countsSummary.bySeverity?.warning?.detected?.issueTypesCount ?? 0))
    : null;
  const infoCount = countsSummary
    ? (effectiveMode === 'actionable'
        ? (countsSummary.bySeverity?.info?.actionable?.issueTypesCount ?? 0)
        : (countsSummary.bySeverity?.info?.detected?.issueTypesCount ?? 0))
    : null;

  // [COUNT-INTEGRITY-1.1 UI HARDEN] Helper to check if issue matches a single action key
  const issueMatchesActionKey = (issue: DeoIssue, key: string): boolean => {
    if (key === 'FIX_MISSING_METADATA') {
      return issue.pillarId === 'metadata_snippet_quality' || (issue.type?.includes('metadata') ?? false);
    } else if (key === 'RESOLVE_TECHNICAL_ISSUES') {
      return issue.pillarId === 'technical_indexability' || issue.category === 'technical';
    } else if (key === 'IMPROVE_SEARCH_INTENT') {
      return issue.pillarId === 'search_intent_fit' || Boolean(issue.intentType);
    } else if (key === 'OPTIMIZE_CONTENT') {
      return issue.pillarId === 'content_commerce_signals' || issue.category === 'content_entity';
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
      const matchesAnyKey = actionKeysParam.some(key => issueMatchesActionKey(issue, key));
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
      const assetTypeKey = scopeTypeParam.toLowerCase() as 'products' | 'pages' | 'collections';
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
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };

  // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Updated to use href-based actionability
  const getFixAction = (issue: DeoIssue) => {
    // [COUNT-INTEGRITY-1 PATCH 6 FIXUP] Gate all fix CTAs on isActionableNow
    if (!issue.isActionableNow) {
      return null;
    }

    const fixType = issue.fixType as DeoIssueFixType | undefined;
    const fixReady = issue.fixReady ?? false;
    const primaryProductId = issue.primaryProductId;
    const issueType = (issue.type as string | undefined) || issue.id;

    // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Check if issue has a valid fix href (href-based actionability)
    const fixHref = buildIssueFixHref({ projectId, issue, from: 'issues_engine' });

    // [COUNT-INTEGRITY-1 PATCH 6 FIXUP] Return null if no valid href (prevents "Fix next" without destination)
    if (!fixHref) {
      return null;
    }

    // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Reuse fixHref computed above - no dead-click risk
    if (fixType === 'aiFix' && fixReady && primaryProductId && fixHref) {
      const supportsInlineFix =
        issueType === 'missing_seo_title' || issueType === 'missing_seo_description';
      if (supportsInlineFix) {
        return {
          kind: 'ai-fix-now' as const,
          fixHref, // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Include href for navigation guarantee
        };
      }
      return {
        kind: 'link' as const,
        label: 'Fix with AI',
        href: fixHref,
        variant: 'ai' as const,
      };
    }

    if (fixType === 'manualFix' && primaryProductId && fixHref) {
      return {
        kind: 'link' as const,
        label: 'Open',
        href: fixHref,
        variant: 'manual' as const,
      };
    }

    if (fixType === 'syncFix') {
      return {
        kind: 'link' as const,
        label: 'Sync',
        href: `/projects/${projectId}/products?action=sync`,
        variant: 'sync' as const,
      };
    }

    // [ISSUE-TO-FIX-PATH-1 FIXUP-2] For actionable issues with affected products, use pre-computed fixHref
    if (fixHref && issue.affectedProducts && issue.affectedProducts.length > 0) {
      return {
        kind: 'link' as const,
        label: 'View affected',
        href: fixHref,
        variant: 'default' as const,
      };
    }

    // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Orphan issues (no fixHref) - no fix action
    return null;
  };

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Gate button navigation with unsaved confirmation
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-4] Clear local unsaved state on confirmed leave to prevent double prompt
  // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Accept href as argument - no recomputation, guarantees navigation if clickable
  const handleIssueClick = (href: string) => {
    // [ISSUE-TO-FIX-PATH-1 FIXUP-2] href is pre-validated - if we're here, navigation is guaranteed
    const draftState = getDraftState();
    if (draftState === 'unsaved') {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
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
      feedback.showError('Cannot run AI fix: no primary product found for this issue.');
      return;
    }

    if (
      issueType !== 'missing_seo_title' &&
      issueType !== 'missing_seo_description'
    ) {
      // [ISSUE-TO-FIX-PATH-1 FIXUP-2] Compute href for navigation
      const href = buildIssueFixHref({ projectId, issue, from: 'issues_engine' });
      if (href) {
        handleIssueClick(href);
      }
      return;
    }

    const fieldLabel =
      issueType === 'missing_seo_title' ? 'SEO title' : 'SEO description';

    // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Check sessionStorage for existing draft
    const storedDraft = loadIssueDraft(projectId, issue.id, primaryProductId, fieldLabel);
    if (storedDraft) {
      // Restore draft from sessionStorage without calling AI
      setPreviewIssueId(issue.id);
      setPreviewLoading(false);
      setPreviewError(null);
      setPreviewProductName(storedDraft.currentTitle || `Product ${primaryProductId}`);
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
          previewPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          previewPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  const handleSaveDraft = useCallback((issue: DeoIssue) => {
    if (!previewValue || !previewFieldLabel || !previewProductId || previewIssueId !== issue.id) {
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
  }, [previewValue, previewFieldLabel, previewProductId, previewIssueId, previewCurrentTitle, previewCurrentDescription, projectId, feedback]);

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
        await shopifyApi.updateProductSeo(productId, value, previewCurrentDescription ?? '');
      } else {
        // Apply description only, preserve current title
        await shopifyApi.updateProductSeo(productId, previewCurrentTitle ?? '', value);
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

      if (err instanceof ApiError && err.code === 'ENTITLEMENTS_LIMIT_REACHED') {
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
      `issue-fix-next-${issue.id}`,
    ) as HTMLButtonElement | null;
    if (button) {
      button.focus();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-gray-600">Loading issues...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchIssues}
              className="text-sm font-medium text-red-700 hover:text-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* [COUNT-INTEGRITY-1 PATCH ERR-001] Counts-summary warning banner (non-blocking) */}
      {countsSummaryWarning && !error && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4" data-testid="counts-summary-warning-banner">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-yellow-800">{countsSummaryWarning}</p>
            </div>
            <button
              onClick={fetchIssues}
              className="text-sm font-medium text-yellow-700 hover:text-yellow-800 underline"
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
            <h1 className="text-2xl font-bold text-gray-900">Issues Engine</h1>
            {projectName && (
              <p className="text-gray-600">{projectName}</p>
            )}
          </div>
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
          onClearFiltersHref={buildClearFiltersHref(`/projects/${projectId}/issues`)}
          chips={normalizedScopeResult.chips}
          wasAdjusted={normalizedScopeResult.wasAdjusted}
        />

        {/* [COUNT-INTEGRITY-1.1 Step 2A] Canonical Triplet Summary Display */}
        {/* [COUNT-INTEGRITY-1.1 UI HARDEN] Use currentTriplet (pillar-aware) instead of root triplet */}
        {currentTriplet ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
            <TripletDisplay
              triplet={currentTriplet}
              layout="horizontal"
              size="lg"
            />
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <div className="text-sm text-gray-500">Issue counts unavailable</div>
          </div>
        )}

        {/* [COUNT-INTEGRITY-1.1 PATCH 5] Zero-actionable suppression message */}
        {/* [COUNT-INTEGRITY-1.1 UI HARDEN] Use currentTriplet for pillar-aware suppression */}
        {currentTriplet && effectiveMode === 'actionable' && currentTriplet.actionableNowCount === 0 && (
          <div
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center"
            data-testid="no-eligible-items-message"
          >
            <p className="text-sm text-amber-800">No items currently eligible for action.</p>
            <p className="mt-1 text-xs text-amber-600">
              Switch to Detected mode to view all detected issues.
            </p>
          </div>
        )}

        {/* Severity Breakdown Cards */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-2xl font-bold text-red-700">{criticalCount !== null ? criticalCount : '—'}</div>
            <div className="text-sm text-red-600">Critical issue types</div>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="text-2xl font-bold text-orange-700">{warningCount !== null ? warningCount : '—'}</div>
            <div className="text-sm text-orange-600">Warning issue types</div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="text-2xl font-bold text-blue-700">{infoCount !== null ? infoCount : '—'}</div>
            <div className="text-sm text-blue-600">Info issue types</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-6 space-y-4">
        {/* Pillar Filter */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Filter by DEO Pillar
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePillarFilterChange('all')}
              data-testid="pillar-filter-all"
              aria-pressed={pillarFilter === 'all'}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pillarFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All pillars
            </button>
            {DEO_PILLARS.filter((p) => !p.comingSoon).map((pillar) => {
              // [COUNT-INTEGRITY-1.1 Step 2A] Use canonical triplet counts for pillar badges
              // [COUNT-INTEGRITY-1 PATCH ERR-001] Handle null countsSummary (hide badge when unavailable)
              const pillarTriplet = countsSummary?.byPillar[pillar.id];
              const pillarIssueCount = countsSummary
                ? (effectiveMode === 'actionable'
                    ? (pillarTriplet?.actionable?.issueTypesCount ?? 0)
                    : (pillarTriplet?.detected?.issueTypesCount ?? 0))
                : null;
              return (
                <button
                  key={pillar.id}
                  onClick={() => handlePillarFilterChange(pillar.id)}
                  data-testid={`pillar-filter-${pillar.id}`}
                  aria-pressed={pillarFilter === pillar.id}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pillarFilter === pillar.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pillar.shortName}
                  {pillarIssueCount !== null && pillarIssueCount > 0 && (
                    <span className="ml-1 text-xs opacity-75">({pillarIssueCount} issue types)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* [COUNT-INTEGRITY-1 PATCH 6] Mode Toggle (Actionable/Detected) */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
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
                      ? 'bg-blue-600 text-white'
                      : isDisabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Filter by Severity
          </label>
          <div className="flex flex-wrap gap-2">
            {(['all', 'critical', 'warning', 'info'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSeverityFilter(filter)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  severityFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? 'All severities' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                {/* [COUNT-INTEGRITY-1.1 Step 2A] Show explicit "issue types" label */}
                {filter !== 'all' && (
                  (() => {
                    const count = filter === 'critical' ? criticalCount : filter === 'warning' ? warningCount : infoCount;
                    return count !== null && count > 0 ? <span className="ml-1 text-xs">({count} issue types)</span> : null;
                  })()
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Issues List with Fix Actions */}
      {filteredIssues.length === 0 ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-green-400"
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
          <h3 className="mt-2 text-sm font-medium text-green-800">
            {severityFilter === 'all' && pillarFilter === 'all'
              ? (effectiveMode === 'actionable' ? 'No actionable issues' : 'No issues detected')
              : pillarFilter !== 'all'
                ? `No ${effectiveMode === 'actionable' ? 'actionable ' : ''}issues for ${DEO_PILLARS.find((p) => p.id === pillarFilter)?.shortName ?? pillarFilter}`
                : `No ${effectiveMode === 'actionable' ? 'actionable ' : ''}${severityFilter} issues`}
          </h3>
          <p className="mt-1 text-sm text-green-700">
            {severityFilter === 'all' && pillarFilter === 'all'
              ? 'Your project looks healthy based on the latest analysis.'
              : 'Try selecting a different filter to see other issues.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => {
            // [ISSUE-TO-FIX-PATH-1] Use safe title/description helpers
            const safeTitle = getSafeIssueTitle(issue);
            const safeDescription = getSafeIssueDescription(issue);

            // [COUNT-INTEGRITY-1 PATCH 6 FIXUP] Compute fixHref unconditionally, then define isClickableIssue
            const fixHref = buildIssueFixHref({ projectId, issue, from: 'issues_engine' });
            const isClickableIssue = (issue.isActionableNow === true) && (fixHref !== null);
            const fixAction = getFixAction(issue);

            return (
              <div
                key={issue.id}
                // [COUNT-INTEGRITY-1 PATCH 6 FIXUP] Test hooks use isClickableIssue (both isActionableNow AND fixHref)
                data-testid={isClickableIssue ? 'issue-card-actionable' : 'issue-card-informational'}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* [COUNT-INTEGRITY-1 PATCH 6 FIXUP] Only render as button if isClickableIssue */}
                  {isClickableIssue ? (
                    <button
                      type="button"
                      onClick={() => handleIssueClick(fixHref)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {safeTitle}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            issue.severity === 'critical'
                              ? 'border border-red-200 bg-red-50 text-red-700'
                              : issue.severity === 'warning'
                                ? 'border border-orange-200 bg-orange-50 text-orange-700'
                                : 'border border-blue-200 bg-blue-50 text-blue-700'
                          }`}
                        >
                          {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{safeDescription}</p>
                      {issue.fixType === 'aiFix' && (
                        <p className="mt-1 text-xs text-gray-500">
                          Fixes one affected product at a time for safe review.
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {issue.count} {issue.count === 1 ? 'item' : 'items'} affected
                      </p>
                    </button>
                  ) : (
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {safeTitle}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            issue.severity === 'critical'
                              ? 'border border-red-200 bg-red-50 text-red-700'
                              : issue.severity === 'warning'
                                ? 'border border-orange-200 bg-orange-50 text-orange-700'
                                : 'border border-blue-200 bg-blue-50 text-blue-700'
                          }`}
                        >
                          {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                        </span>
                        {/* [ISSUE-TO-FIX-PATH-1] Informational badge for orphan issues */}
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-200">
                          Informational — no action required
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{safeDescription}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {issue.count} {issue.count === 1 ? 'item' : 'items'} affected
                      </p>
                    </div>
                  )}

                  {/* Preview panel for actionable issues */}
                  {isClickableIssue && previewIssueId === issue.id && (
                      <div
                        ref={previewPanelRef}
                        tabIndex={-1}
                        data-testid="issue-preview-draft-panel"
                        className="mt-3 rounded-md border border-purple-100 bg-purple-50 p-3 text-xs text-gray-800 focus:outline-none"
                      >
                        {previewLoading ? (
                          <p className="text-xs text-gray-600">Generating preview…</p>
                        ) : previewError ? (
                          <p className="text-xs text-red-600">{previewError}</p>
                        ) : previewValue ? (
                          <>
                            {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Draft state banner */}
                            <div
                              data-testid="issue-draft-state-banner"
                              className={`mb-2 rounded px-2 py-1 text-[11px] font-medium ${
                                getDraftState() === 'unsaved'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : getDraftState() === 'saved'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {getDraftState() === 'unsaved' && 'Draft — not applied'}
                              {getDraftState() === 'saved' && 'Draft saved — not applied'}
                              {getDraftState() === 'applied' && (
                                <>Applied to Shopify on {appliedAt ? new Date(appliedAt).toLocaleString() : 'unknown date'}</>
                              )}
                            </div>
                            <p className="text-xs font-semibold">
                              {previewProductName || 'Selected product'}
                            </p>
                            <p className="mt-1 text-xs text-gray-700">
                              Field: {previewFieldLabel ?? 'SEO field'}
                            </p>
                            <div className="mt-2 grid gap-3 md:grid-cols-2">
                              <div>
                                <p className="text-[11px] font-semibold text-gray-700">
                                  Current value
                                </p>
                                <p className="mt-1 rounded bg-white px-2 py-1 text-[11px] text-gray-700">
                                  {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Show correct current value for the field being edited */}
                                  {previewFieldLabel === 'SEO title' ? (
                                    previewCurrentTitle && previewCurrentTitle.trim().length > 0 ? (
                                      previewCurrentTitle
                                    ) : (
                                      <span className="italic text-gray-500">Missing</span>
                                    )
                                  ) : (
                                    previewCurrentDescription && previewCurrentDescription.trim().length > 0 ? (
                                      previewCurrentDescription
                                    ) : (
                                      <span className="italic text-gray-500">Missing</span>
                                    )
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold text-gray-700">
                                  AI preview
                                </p>
                                <p className="mt-1 rounded bg-white px-2 py-1 text-[11px] text-gray-800">
                                  {previewValue}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Save draft button */}
                              {getDraftState() === 'unsaved' && (
                                <button
                                  type="button"
                                  data-testid="issue-save-draft-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveDraft(issue);
                                  }}
                                  className="inline-flex items-center rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-100"
                                >
                                  Save draft
                                </button>
                              )}
                              {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Apply to Shopify button - disabled unless draft is saved */}
                              <button
                                type="button"
                                data-testid="issue-apply-to-shopify-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyFixFromPreview(issue);
                                }}
                                disabled={fixingIssueId === issue.id || getDraftState() !== 'saved'}
                                title={
                                  getDraftState() !== 'saved'
                                    ? 'Save your draft first before applying to Shopify'
                                    : 'Applies saved draft only. Does not use AI.'
                                }
                                className="inline-flex items-center rounded-md border border-green-600 bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {fixingIssueId === issue.id ? 'Applying…' : 'Apply to Shopify'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelPreview(issue);
                                }}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}

                  {fixAction && fixAction.kind === 'ai-fix-now' && (
                    <button
                      id={`issue-fix-next-${issue.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(issue);
                      }}
                      disabled={fixingIssueId === issue.id}
                      data-testid="issue-fix-next-button"
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-purple-500 bg-purple-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {fixingIssueId === issue.id ? (
                        <>
                          <svg
                            className="-ml-0.5 mr-1.5 h-3.5 w-3.5 animate-spin text-white"
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
                          Fixing…
                        </>
                      ) : (
                        'Fix next'
                      )}
                    </button>
                  )}

                  {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3] Use GuardedLink for unsaved changes blocking */}
                  {fixAction && fixAction.kind === 'link' && (
                    <GuardedLink
                      href={fixAction.href}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                        fixAction.variant === 'ai'
                          ? 'border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                          : fixAction.variant === 'sync'
                            ? 'border border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                            : 'border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {fixAction.variant === 'ai' && (
                        <svg
                          className="mr-1.5 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      )}
                      {fixAction.variant === 'sync' && (
                        <svg
                          className="mr-1.5 h-4 w-4"
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
                      )}
                      {fixAction.label}
                    </GuardedLink>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
