'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue } from '@engineo/shared';
import { isAuthenticated } from '@/lib/auth';
import {
  ApiError,
  aiApi,
  billingApi,
  productsApi,
  projectsApi,
  shopifyApi,
} from '@/lib/api';
import type { Product } from '@/lib/products';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

type PlaybookId = 'missing_seo_title' | 'missing_seo_description';

interface PlaybookDefinition {
  id: PlaybookId;
  name: string;
  description: string;
  field: 'seoTitle' | 'seoDescription';
}

interface PlaybookEstimate {
  projectId: string;
  playbookId: PlaybookId;
  totalAffectedProducts: number;
  estimatedTokens: number;
  planId: string;
  eligible: boolean;
  canProceed: boolean;
  reasons: string[];
  aiDailyLimit: {
    limit: number;
    used: number;
    remaining: number;
  };
}

interface PreviewSample {
  productId: string;
  productTitle: string;
  currentTitle: string;
  currentDescription: string;
  suggestedTitle: string;
  suggestedDescription: string;
}

const PLAYBOOKS: PlaybookDefinition[] = [
  {
    id: 'missing_seo_title',
    name: 'Fix missing SEO titles',
    description:
      'Generate SEO titles for products that are missing them, using existing product data.',
    field: 'seoTitle',
  },
  {
    id: 'missing_seo_description',
    name: 'Fix missing SEO descriptions',
    description:
      'Generate SEO descriptions for products that are missing them, using existing product data.',
    field: 'seoDescription',
  },
];

export default function AutomationPlaybooksPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const feedback = useFeedback();

  const source = searchParams.get('source');
  const showNextDeoWinBanner = source === 'next_deo_win';
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [issues, setIssues] = useState<DeoIssue[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] =
    useState<PlaybookId | null>('missing_seo_title');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [previewSamples, setPreviewSamples] = useState<PreviewSample[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [estimate, setEstimate] = useState<PlaybookEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    updated: number;
    skipped: number;
    total: number;
    limitReached: boolean;
  } | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [projectData, productsData, issuesResponse, entitlements] =
        await Promise.all([
          projectsApi.get(projectId),
          productsApi.list(projectId),
          projectsApi.deoIssues(projectId).catch(() => ({ issues: [] })),
          billingApi.getEntitlements().catch(() => null),
        ]);
      setProjectName(projectData.name);
      setProducts(productsData);
      setIssues((issuesResponse.issues ?? []) as DeoIssue[]);
      if (entitlements && typeof (entitlements as any).plan === 'string') {
        setPlanId((entitlements as any).plan as string);
      } else {
        setPlanId(null);
      }
    } catch (err: unknown) {
      console.error('Error loading automation playbooks data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load automation playbooks data',
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchInitialData();
  }, [router, fetchInitialData]);

  const issuesByType = useMemo(() => {
    const map = new Map<string, DeoIssue>();
    for (const issue of issues) {
      if (issue.type) {
        map.set(issue.type, issue);
      }
    }
    return map;
  }, [issues]);

  const playbookSummaries = useMemo(() => {
    return PLAYBOOKS.map((pb) => {
      const issue = issuesByType.get(pb.id);
      return {
        ...pb,
        totalAffected: issue?.count ?? 0,
      };
    });
  }, [issuesByType]);

  const loadEstimate = useCallback(
    async (playbookId: PlaybookId) => {
      try {
        setLoadingEstimate(true);
        setError('');
        setEstimate(null);
        const data = (await projectsApi.automationPlaybookEstimate(
          projectId,
          playbookId,
        )) as PlaybookEstimate;
        setEstimate(data);
      } catch (err: unknown) {
        console.error('Error estimating automation playbook:', err);
        setEstimate(null);
        if (err instanceof ApiError) {
          setError(err.message);
          return;
        }
        setError('Failed to estimate automation playbook.');
      } finally {
        setLoadingEstimate(false);
      }
    },
    [projectId],
  );

  const loadPreview = useCallback(
    async (playbookId: PlaybookId) => {
      const definition = PLAYBOOKS.find((pb) => pb.id === playbookId);
      if (!definition) return;
      const candidates = products.filter((p) => {
        if (definition.field === 'seoTitle') {
          return !p.seoTitle || p.seoTitle.trim() === '';
        }
        return !p.seoDescription || p.seoDescription.trim() === '';
      });
      const sampleProducts = candidates.slice(0, 3);
      if (sampleProducts.length === 0) {
        setPreviewSamples([]);
        return;
      }
      try {
        setLoadingPreview(true);
        setError('');
        setPreviewSamples([]);
        const samples: PreviewSample[] = [];
        for (const product of sampleProducts) {
          try {
            const result = await aiApi.suggestProductMetadata(product.id);
            samples.push({
              productId: product.id,
              productTitle: product.title,
              currentTitle:
                product.seoTitle || product.title || '',
              currentDescription:
                product.seoDescription || product.description || '',
              suggestedTitle: result?.suggested?.title || '',
              suggestedDescription: result?.suggested?.description || '',
            });
          } catch (err: unknown) {
            console.error('Error generating preview suggestion:', err);
            if (err instanceof ApiError && err.code === 'AI_DAILY_LIMIT_REACHED') {
              const limitMessage =
                "Daily AI limit reached. You've used all AI suggestions available on your plan. Your limit resets tomorrow, or upgrade to continue.";
              setError(limitMessage);
              feedback.showLimit(limitMessage, '/settings/billing');
              break;
            }
            const message =
              'AI suggestions are temporarily unavailable. Please try again later.';
            setError(message);
            feedback.showError(message);
            break;
          }
        }
        setPreviewSamples(samples);
      } finally {
        setLoadingPreview(false);
      }
    },
    [products, feedback],
  );

  useEffect(() => {
    if (!selectedPlaybookId) return;
    loadEstimate(selectedPlaybookId).catch(() => {
      // handled via state
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaybookId]);

  const handleSelectPlaybook = (playbookId: PlaybookId) => {
    setSelectedPlaybookId(playbookId);
    setCurrentStep(1);
    setPreviewSamples([]);
    setApplyResult(null);
    setConfirmApply(false);
  };

  const handleGeneratePreview = async () => {
    if (!selectedPlaybookId) return;
    await loadPreview(selectedPlaybookId);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleApplyPlaybook = useCallback(async () => {
    if (!selectedPlaybookId) return;
    if (!estimate || !estimate.canProceed) return;
    try {
      setApplying(true);
      setError('');
      setApplyResult(null);
      const data = (await projectsApi.applyAutomationPlaybook(
        projectId,
        selectedPlaybookId,
      )) as {
        projectId: string;
        playbookId: PlaybookId;
        totalAffectedProducts: number;
        attempted: number;
        updated: number;
        skipped: number;
        limitReached: boolean;
      };
      setApplyResult({
        updated: data.updated,
        skipped: data.skipped,
        total: data.totalAffectedProducts,
        limitReached: data.limitReached,
      });
      if (data.updated > 0) {
        feedback.showSuccess(
          `Automation Playbook applied to ${data.updated} product(s).`,
        );
      } else if (data.limitReached) {
        feedback.showLimit(
          'Daily AI limit reached before any products could be updated.',
          '/settings/billing',
        );
      } else {
        feedback.showInfo('No products were updated by this playbook.');
      }
      // Refresh estimates and preview data after apply
      await fetchInitialData();
      await loadEstimate(selectedPlaybookId);
    } catch (err: unknown) {
      console.error('Error applying automation playbook:', err);
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.code === 'ENTITLEMENTS_LIMIT_REACHED') {
          feedback.showLimit(err.message, '/settings/billing');
        } else {
          feedback.showError(err.message);
        }
        return;
      }
      const message =
        'Failed to apply Automation Playbook. Please try again later.';
      setError(message);
      feedback.showError(message);
    } finally {
      setApplying(false);
    }
  }, [
    selectedPlaybookId,
    estimate,
    projectId,
    fetchInitialData,
    loadEstimate,
    feedback,
  ]);

  const handleSyncToShopify = useCallback(async () => {
    try {
      await shopifyApi.syncProducts(projectId);
      feedback.showSuccess('Shopify sync triggered for updated products.');
    } catch (err: unknown) {
      console.error('Error triggering Shopify sync:', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to trigger Shopify sync. Please try again.';
      setError(message);
      feedback.showError(message);
    }
  }, [projectId, feedback]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-gray-600">Loading automation playbooks...</div>
      </div>
    );
  }

  const selectedDefinition = PLAYBOOKS.find(
    (pb) => pb.id === selectedPlaybookId,
  );
  const selectedSummary = playbookSummaries.find(
    (s) => s.id === selectedPlaybookId,
  );
  const planIsFree = planId === 'free';
  const estimateBlockingReasons = estimate?.reasons ?? [];

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-2 text-gray-500">
          <li>
            <Link href="/projects" className="hover:text-gray-700">
              Projects
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/projects/${projectId}/overview`}
              className="hover:text-gray-700"
            >
              {projectName || 'Project'}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/projects/${projectId}/automation`}
              className="hover:text-gray-700"
            >
              Automation
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900">Playbooks</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Automation Playbooks</h1>
        <p className="text-gray-600">
          Safely apply AI-powered fixes to missing SEO metadata, with preview and
          token estimates before you run anything.
        </p>
      </div>

      {/* Next DEO Win Banner - shown when navigating from overview card */}
      {showNextDeoWinBanner && !bannerDismissed && (
        <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-purple-600"
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
              </div>
              <div>
                <h3 className="text-sm font-semibold text-purple-900">
                  Nice work on your first DEO win
                </h3>
                <p className="mt-1 text-xs text-purple-800">
                  Next up, use Automation Playbooks to fix missing SEO titles and
                  descriptions in bulk. Start with a preview — no changes are
                  applied until you confirm.
                </p>
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="flex-shrink-0 text-purple-500 hover:text-purple-700"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Automation tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="-mb-px flex gap-6 text-sm">
          <Link
            href={`/projects/${projectId}/automation`}
            className={`border-b-2 px-1 pb-2 ${
              pathname === `/projects/${projectId}/automation`
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Activity
          </Link>
          <Link
            href={`/projects/${projectId}/automation/playbooks`}
            className={`border-b-2 px-1 pb-2 ${
              pathname?.startsWith(`/projects/${projectId}/automation/playbooks`)
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Playbooks
          </Link>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Playbooks list */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {playbookSummaries.map((pb) => {
          const isSelected = pb.id === selectedPlaybookId;
          const isEligible = planId !== 'free';
          return (
            <button
              key={pb.id}
              type="button"
              onClick={() => handleSelectPlaybook(pb.id)}
              className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="mb-2 flex w-full items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  {pb.name}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    isEligible
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isEligible ? 'Pro / Business' : 'Upgrade for bulk automations'}
                </span>
              </div>
              <p className="mb-3 text-sm text-gray-600">{pb.description}</p>
              <div className="mt-auto flex w-full items-center justify-between text-xs text-gray-500">
                <span>
                  Affected products:{' '}
                  <span className="font-semibold text-gray-900">
                    {pb.totalAffected}
                  </span>
                </span>
                <span>
                  Target field:{' '}
                  <span className="font-mono text-gray-700">{pb.field}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {!selectedDefinition && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-600">
            Select a playbook above to see preview, estimate, and apply steps.
          </p>
        </div>
      )}

      {selectedDefinition && (
        <div className="space-y-6">
          {/* Stepper */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  currentStep === 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                1
              </span>
              <span
                className={
                  currentStep === 1 ? 'font-semibold text-gray-900' : 'text-gray-600'
                }
              >
                Preview
              </span>
            </div>
            <div className="h-px flex-1 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                2
              </span>
              <span
                className={
                  currentStep === 2 ? 'font-semibold text-gray-900' : 'text-gray-600'
                }
              >
                Estimate
              </span>
            </div>
            <div className="h-px flex-1 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  currentStep === 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                3
              </span>
              <span
                className={
                  currentStep === 3 ? 'font-semibold text-gray-900' : 'text-gray-600'
                }
              >
                Apply
              </span>
            </div>
          </div>

          {/* Step 1: Preview */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Step 1 – Preview changes
                </h2>
                <p className="text-xs text-gray-600">
                  Generate a preview for a few sample products. No changes are saved
                  during this step.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={loadingPreview || planIsFree}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingPreview ? 'Generating preview…' : 'Generate preview'}
              </button>
            </div>
            <div className="mb-3 text-xs text-gray-500">
              Total affected products:{' '}
              <span className="font-semibold text-gray-900">
                {selectedSummary?.totalAffected ?? 0}
              </span>
            </div>
            {planIsFree && (
              <p className="mb-3 text-xs text-amber-700">
                Bulk Automation Playbooks are gated on the Free plan. Upgrade to Pro
                to unlock bulk metadata fixes.
              </p>
            )}
            {loadingPreview && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                Generating AI previews for sample products…
              </div>
            )}
            {!loadingPreview && previewSamples.length === 0 && (
              <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                No preview yet. Click &quot;Generate preview&quot; to see Before/After
                examples for a few sample products.
              </div>
            )}
            {!loadingPreview && previewSamples.length > 0 && (
              <div className="mt-3 space-y-3">
                {previewSamples.map((sample) => (
                  <div
                    key={sample.productId}
                    className="rounded-md border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-900">
                        {sample.productTitle}
                      </span>
                      <Link
                        href={`/projects/${projectId}/products/${sample.productId}`}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Open product →
                      </Link>
                    </div>
                    <div className="grid gap-3 text-xs md:grid-cols-2">
                      <div>
                        <div className="mb-1 font-medium text-gray-700">
                          Before ({selectedDefinition.field})
                        </div>
                        <div className="rounded border border-gray-200 bg-white p-2 text-gray-800">
                          {selectedDefinition.field === 'seoTitle'
                            ? sample.currentTitle || <span className="text-gray-400">Empty</span>
                            : sample.currentDescription || (
                                <span className="text-gray-400">Empty</span>
                              )}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 font-medium text-gray-700">
                          After (AI suggestion)
                        </div>
                        <div className="rounded border border-gray-200 bg-white p-2 text-gray-800">
                          {selectedDefinition.field === 'seoTitle'
                            ? sample.suggestedTitle || (
                                <span className="text-gray-400">No suggestion</span>
                              )
                            : sample.suggestedDescription || (
                                <span className="text-gray-400">No suggestion</span>
                              )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={
                  currentStep !== 1 ||
                  planIsFree ||
                  (estimate !== null && !estimate.eligible)
                }
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Estimate
              </button>
            </div>
          </section>

          {/* Step 2: Estimate */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Step 2 – Estimate impact & tokens
                </h2>
                <p className="text-xs text-gray-600">
                  Review how many products will be updated and an approximate token
                  cost before you apply.
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectedPlaybookId && loadEstimate(selectedPlaybookId)}
                disabled={loadingEstimate}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingEstimate ? 'Refreshing…' : 'Recalculate estimate'}
              </button>
            </div>
            {loadingEstimate && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                Calculating playbook estimate…
              </div>
            )}
            {!loadingEstimate && estimate && (
              <div className="space-y-3 text-sm text-gray-700">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded border border-gray-100 bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Products to update</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {estimate.totalAffectedProducts}
                    </div>
                  </div>
                  <div className="rounded border border-gray-100 bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">
                      Estimated token usage (approx)
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {estimate.estimatedTokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded border border-gray-100 bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Plan & daily capacity</div>
                    <div className="text-xs text-gray-700">
                      Plan:{' '}
                      <span className="font-medium">
                        {estimate.planId.toUpperCase()}
                      </span>
                      <br />
                      Daily AI limit:{' '}
                      {estimate.aiDailyLimit.limit === -1
                        ? 'Unlimited'
                        : `${estimate.aiDailyLimit.used}/${estimate.aiDailyLimit.limit}`}
                    </div>
                  </div>
                </div>
                {estimateBlockingReasons.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
                    {estimateBlockingReasons.includes('plan_not_eligible') && (
                      <li>
                        This playbook requires a Pro or Business plan. Upgrade to
                        unlock bulk automations.
                      </li>
                    )}
                    {estimateBlockingReasons.includes('no_affected_products') && (
                      <li>No products currently match this playbook&apos;s criteria.</li>
                    )}
                    {estimateBlockingReasons.includes('ai_daily_limit_reached') && (
                      <li>
                        Daily AI limit reached for product optimization. Try again
                        tomorrow or upgrade your plan.
                      </li>
                    )}
                    {estimateBlockingReasons.includes(
                      'token_cap_would_be_exceeded',
                    ) && (
                      <li>
                        Estimated token usage would exceed your remaining capacity for
                        today. Reduce scope or try again tomorrow.
                      </li>
                    )}
                  </ul>
                )}
                {estimate.canProceed && (
                  <p className="mt-2 text-xs text-green-700">
                    This playbook can run safely within your current plan and daily AI
                    limits.
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Back to Preview
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!estimate || !estimate.canProceed}
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Apply
              </button>
            </div>
          </section>

          {/* Step 3: Apply */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Step 3 – Apply playbook
              </h2>
              <p className="text-xs text-gray-600">
                Confirm that you want EngineO.ai to write AI-generated SEO{' '}
                {selectedDefinition.field === 'seoTitle' ? 'titles' : 'descriptions'}{' '}
                for the affected products.
              </p>
            </div>
            <div className="mb-3 rounded border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
              <p>
                This playbook will attempt to update up to{' '}
                <span className="font-semibold">
                  {estimate?.totalAffectedProducts ?? 0}
                </span>{' '}
                product(s) where{' '}
                <span className="font-mono">{selectedDefinition.field}</span> is
                missing.
              </p>
              <p className="mt-1">
                Changes are applied sequentially in small batches, respecting your
                daily AI limits. If the daily limit is reached mid-run, remaining
                products will be skipped.
              </p>
            </div>
            <label className="mb-3 flex items-start gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={confirmApply}
                onChange={(e) => setConfirmApply(e.target.checked)}
                className="mt-0.5 h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                I understand that this will write AI-generated SEO{' '}
                {selectedDefinition.field === 'seoTitle'
                  ? 'titles'
                  : 'descriptions'}{' '}
                directly to my products for the affected items above.
              </span>
            </label>
            {applying && (
              <div className="mb-3 rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                Applying Automation Playbook… This may take a moment for larger
                catalogs.
              </div>
            )}
            {applyResult && (
              <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                <p>
                  Updated products:{' '}
                  <span className="font-semibold">{applyResult.updated}</span>
                </p>
                <p>
                  Skipped products:{' '}
                  <span className="font-semibold">{applyResult.skipped}</span>
                </p>
                {applyResult.limitReached && (
                  <p className="mt-1">
                    Daily AI limit was reached during execution. Remaining products
                    were not updated.
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/projects/${projectId}/products`)
                  }
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  View updated products
                </button>
                <button
                  type="button"
                  onClick={handleSyncToShopify}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Sync to Shopify
                </button>
              </div>
              <button
                type="button"
                onClick={handleApplyPlaybook}
                disabled={
                  applying ||
                  !estimate ||
                  !estimate.canProceed ||
                  !confirmApply
                }
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applying ? 'Applying…' : 'Apply playbook'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
