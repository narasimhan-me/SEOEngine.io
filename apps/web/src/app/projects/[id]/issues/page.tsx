'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue, DeoIssueFixType } from '@/lib/deo-issues';
import { DEO_PILLARS, type DeoPillarId } from '@/lib/deo-pillars';
import { ISSUE_UI_CONFIG } from '@/components/issues/IssuesList';
import { isAuthenticated, getToken } from '@/lib/auth';
import { ApiError, aiApi, projectsApi, shopifyApi } from '@/lib/api';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

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
}

export default function IssuesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  // Read pillar filter from URL query param (?pillar=metadata_snippet_quality)
  const pillarParam = searchParams.get('pillar') as DeoPillarId | null;

  const [issues, setIssues] = useState<DeoIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>(pillarParam ?? 'all');
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

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await projectsApi.deoIssues(projectId);
      setIssues(response.issues ?? []);
    } catch (err: unknown) {
      console.error('Error fetching issues:', err);
      setError(err instanceof Error ? err.message : 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

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

  // Sync pillarFilter state when URL param changes
  useEffect(() => {
    setPillarFilter(pillarParam ?? 'all');
  }, [pillarParam]);

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

  // Compute counts by severity
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  // Filter issues by severity and pillar
  const filteredIssues = issues.filter((issue) => {
    // Severity filter
    if (severityFilter !== 'all' && issue.severity !== severityFilter) {
      return false;
    }
    // Pillar filter
    if (pillarFilter !== 'all' && issue.pillarId !== pillarFilter) {
      return false;
    }
    return true;
  });

  // Handler to update pillar filter and URL
  const handlePillarFilterChange = (newFilter: PillarFilter) => {
    setPillarFilter(newFilter);
    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString());
    if (newFilter === 'all') {
      params.delete('pillar');
    } else {
      params.set('pillar', newFilter);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };

  const getFixAction = (issue: DeoIssue) => {
    const fixType = issue.fixType as DeoIssueFixType | undefined;
    const fixReady = issue.fixReady ?? false;
    const primaryProductId = issue.primaryProductId;
    const issueType = (issue.type as string | undefined) || issue.id;

    if (fixType === 'aiFix' && fixReady && primaryProductId) {
      const supportsInlineFix =
        issueType === 'missing_seo_title' || issueType === 'missing_seo_description';
      if (supportsInlineFix) {
        return {
          kind: 'ai-fix-now' as const,
        };
      }
      return {
        kind: 'link' as const,
        label: 'Fix with AI',
        href: `/projects/${projectId}/products/${primaryProductId}?from=issues&issueId=${issue.id}`,
        variant: 'ai' as const,
      };
    }

    if (fixType === 'manualFix' && primaryProductId) {
      return {
        kind: 'link' as const,
        label: 'Open',
        href: `/projects/${projectId}/products/${primaryProductId}?from=issues`,
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

    // Default: go to products page
    if (issue.affectedProducts && issue.affectedProducts.length > 0) {
      return {
        kind: 'link' as const,
        label: 'View affected',
        href: `/projects/${projectId}/products`,
        variant: 'default' as const,
      };
    }

    return null;
  };

  const handleIssueClick = (issue: DeoIssue) => {
    const primaryProductId = issue.primaryProductId;
    if (primaryProductId) {
      router.push(
        `/projects/${projectId}/products/${primaryProductId}?from=issues&issueId=${issue.id}`,
      );
    }
  };

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
      handleIssueClick(issue);
      return;
    }

    try {
      setPreviewIssueId(issue.id);
      setPreviewLoading(true);
      setPreviewError(null);
      setFixingIssueId(issue.id);

      const result: any = await aiApi.suggestProductMetadata(primaryProductId);

      const fieldLabel =
        issueType === 'missing_seo_title' ? 'SEO title' : 'SEO description';
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
    };
    setSavedDraft(draft);
    feedback.showSuccess('Draft saved. You can now apply it to Shopify.');
  }, [previewValue, previewFieldLabel, previewProductId, previewIssueId, feedback]);

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Updated to apply saved draft only, no AI call
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
      {/* Back to Store Health */}
      <div className="mb-4 text-sm">
        <Link
          href={`/projects/${projectId}/store-health`}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Store Health
        </Link>
      </div>

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

        {/* Summary Cards */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-gray-900">{issues.length}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-2xl font-bold text-red-700">{criticalCount}</div>
            <div className="text-sm text-red-600">Critical</div>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="text-2xl font-bold text-orange-700">{warningCount}</div>
            <div className="text-sm text-orange-600">Warning</div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="text-2xl font-bold text-blue-700">{infoCount}</div>
            <div className="text-sm text-blue-600">Info</div>
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
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pillarFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All pillars
            </button>
            {DEO_PILLARS.filter((p) => !p.comingSoon).map((pillar) => {
              const pillarIssueCount = issues.filter((i) => i.pillarId === pillar.id).length;
              return (
                <button
                  key={pillar.id}
                  onClick={() => handlePillarFilterChange(pillar.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pillarFilter === pillar.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pillar.shortName}
                  {pillarIssueCount > 0 && (
                    <span className="ml-1 text-xs opacity-75">({pillarIssueCount})</span>
                  )}
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
                {filter !== 'all' && (
                  <span className="ml-1">
                    ({filter === 'critical' ? criticalCount : filter === 'warning' ? warningCount : infoCount})
                  </span>
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
          <h3 className="mt-2 text-sm font-medium text-green-800">
            {severityFilter === 'all' && pillarFilter === 'all'
              ? 'No issues detected'
              : pillarFilter !== 'all'
                ? `No issues for ${DEO_PILLARS.find((p) => p.id === pillarFilter)?.shortName ?? pillarFilter}`
                : `No ${severityFilter} issues`}
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
            const uiConfig = ISSUE_UI_CONFIG[issue.id] ?? {
              label: issue.title,
              description: issue.description,
            };
            const fixAction = getFixAction(issue);

            return (
              <div
                key={issue.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    type="button"
                    onClick={() => handleIssueClick(issue)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {uiConfig.label}
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
                    <p className="mt-1 text-sm text-gray-600">{uiConfig.description}</p>
                    {issue.fixType === 'aiFix' && (
                      <p className="mt-1 text-xs text-gray-500">
                        Fixes one affected product at a time for safe review.
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {issue.count} {issue.count === 1 ? 'item' : 'items'} affected
                    </p>
                    {previewIssueId === issue.id && (
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
                  </button>

                  {fixAction && fixAction.kind === 'ai-fix-now' && (
                    <button
                      id={`issue-fix-next-${issue.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(issue);
                      }}
                      disabled={fixingIssueId === issue.id}
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

                  {fixAction && fixAction.kind === 'link' && (
                    <Link
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
                    </Link>
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
