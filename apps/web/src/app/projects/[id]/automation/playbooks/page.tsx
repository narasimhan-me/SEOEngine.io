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
import type { AutomationPlaybookApplyResult } from '@/lib/api';
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

type PlaybookFlowState =
  | 'ELIGIBILITY_EMPTY'
  | 'PREVIEW_READY'
  | 'PREVIEW_GENERATED'
  | 'ESTIMATE_READY'
  | 'APPLY_READY'
  | 'APPLY_RUNNING'
  | 'APPLY_COMPLETED'
  | 'APPLY_STOPPED';

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
  const [flowState, setFlowState] = useState<PlaybookFlowState>('PREVIEW_READY');
  const [previewSamples, setPreviewSamples] = useState<PreviewSample[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [estimate, setEstimate] = useState<PlaybookEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<AutomationPlaybookApplyResult | null>(null);
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
    async (playbookId: PlaybookId): Promise<boolean> => {
      const definition = PLAYBOOKS.find((pb) => pb.id === playbookId);
      if (!definition) return false;
      const candidates = products.filter((p) => {
        if (definition.field === 'seoTitle') {
          return !p.seoTitle || p.seoTitle.trim() === '';
        }
        return !p.seoDescription || p.seoDescription.trim() === '';
      });
      const sampleProducts = candidates.slice(0, 3);
      if (sampleProducts.length === 0) {
        setPreviewSamples([]);
        return false;
      }
      const samples: PreviewSample[] = [];
      try {
        setLoadingPreview(true);
        setError('');
        setPreviewSamples([]);
        for (const product of sampleProducts) {
          try {
            const result = await aiApi.suggestProductMetadata(product.id);
            samples.push({
              productId: product.id,
              productTitle: product.title,
              currentTitle: product.seoTitle || product.title || '',
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
            // Check for AI quota exhaustion (Gemini rate limits)
            const errMessage =
              err instanceof Error ? err.message : String(err);
            if (errMessage.includes('AI_QUOTA_EXHAUSTED')) {
              const quotaMessage =
                'AI service quota exceeded. Please wait a few minutes and try again.';
              setError(quotaMessage);
              feedback.showError(quotaMessage);
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
      return samples.length > 0;
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
    const summary = playbookSummaries.find((s) => s.id === playbookId);
    if ((summary?.totalAffected ?? 0) === 0) {
      setFlowState('ELIGIBILITY_EMPTY');
    } else {
      setFlowState('PREVIEW_READY');
    }
    setPreviewSamples([]);
    setEstimate(null);
    setApplyResult(null);
    setConfirmApply(false);
  };

  const handleGeneratePreview = async () => {
    if (!selectedPlaybookId) return;
    const ok = await loadPreview(selectedPlaybookId);
    if (ok) {
      setFlowState('PREVIEW_GENERATED');
    }
  };

  const handleNextStep = () => {
    if (!estimate || !estimate.canProceed) {
      return;
    }
    if (flowState === 'PREVIEW_GENERATED') {
      setFlowState('ESTIMATE_READY');
    } else if (flowState === 'ESTIMATE_READY') {
      setFlowState('APPLY_READY');
      if (typeof window !== 'undefined') {
        const el = document.getElementById('automation-playbook-apply-step');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };

  const handleApplyPlaybook = useCallback(async () => {
    if (!selectedPlaybookId) return;
    if (!estimate || !estimate.canProceed) return;
    if (flowState !== 'APPLY_READY') return;
    try {
      setApplying(true);
      setError('');
      setApplyResult(null);
      setFlowState('APPLY_RUNNING');
      const data = await projectsApi.applyAutomationPlaybook(
        projectId,
        selectedPlaybookId,
      );
      setApplyResult(data);
      if (data.updatedCount > 0) {
        if (data.stopped && !data.limitReached) {
          feedback.showInfo(
            `Updated ${data.updatedCount} product(s). Playbook stopped early due to an error.`,
          );
        } else if (data.limitReached) {
          feedback.showLimit(
            `Updated ${data.updatedCount} product(s). Daily AI limit reached during execution.`,
            '/settings/billing',
          );
        } else {
          feedback.showSuccess(
            `Automation Playbook applied to ${data.updatedCount} product(s).`,
          );
        }
      } else if (data.limitReached) {
        feedback.showLimit(
          'Daily AI limit reached before any products could be updated.',
          '/settings/billing',
        );
      } else if (data.stopped) {
        feedback.showError(
          `Playbook stopped due to an error: ${data.failureReason || 'Unknown error'}`,
        );
      } else {
        feedback.showInfo('No products were updated by this playbook.');
      }
      if (data.stopped) {
        setFlowState('APPLY_STOPPED');
      } else {
        setFlowState('APPLY_COMPLETED');
      }
      // Refresh estimates and preview data after apply
      await fetchInitialData();
      await loadEstimate(selectedPlaybookId);
    } catch (err: unknown) {
      console.error('Error applying automation playbook:', err);
      setFlowState('APPLY_READY');
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
    flowState,
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

  const selectedDefinition = PLAYBOOKS.find(
    (pb) => pb.id === selectedPlaybookId,
  );
  const selectedSummary = playbookSummaries.find(
    (s) => s.id === selectedPlaybookId,
  );
  const planIsFree = planId === 'free';
  const estimateBlockingReasons = estimate?.reasons ?? [];
  const totalAffectedProducts =
    estimate?.totalAffectedProducts ?? selectedSummary?.totalAffected ?? 0;
  const isEligibilityEmptyState = flowState === 'ELIGIBILITY_EMPTY';
  const hasPreview = previewSamples.length > 0;
  const step2Locked = isEligibilityEmptyState || !hasPreview;
  const step3Locked =
    isEligibilityEmptyState || !hasPreview || !estimate || !estimate.canProceed;

  const activeStep = useMemo(() => {
    if (
      flowState === 'APPLY_READY' ||
      flowState === 'APPLY_RUNNING' ||
      flowState === 'APPLY_COMPLETED' ||
      flowState === 'APPLY_STOPPED'
    ) {
      return 3 as const;
    }
    if (flowState === 'ESTIMATE_READY') {
      return 2 as const;
    }
    return 1 as const;
  }, [flowState]);

  const shouldWarnOnNavigate =
    flowState === 'PREVIEW_GENERATED' ||
    flowState === 'ESTIMATE_READY' ||
    flowState === 'APPLY_READY' ||
    flowState === 'APPLY_RUNNING';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!shouldWarnOnNavigate) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarnOnNavigate]);

  useEffect(() => {
    if (!estimate) {
      return;
    }
    if (
      flowState === 'APPLY_RUNNING' ||
      flowState === 'APPLY_COMPLETED' ||
      flowState === 'APPLY_STOPPED'
    ) {
      return;
    }
    if (estimate.totalAffectedProducts === 0) {
      setFlowState('ELIGIBILITY_EMPTY');
    } else if (flowState === 'ELIGIBILITY_EMPTY') {
      setFlowState('PREVIEW_READY');
    }
  }, [estimate, flowState]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!selectedPlaybookId) {
      return;
    }
    const key = `automationPlaybookState:${projectId}:${selectedPlaybookId}`;
    try {
      const stored = window.sessionStorage.getItem(key);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as {
        flowState?: PlaybookFlowState;
        previewSamples?: PreviewSample[];
        estimate?: PlaybookEstimate | null;
        applyResult?: AutomationPlaybookApplyResult | null;
      };
      if (parsed.flowState) {
        setFlowState(parsed.flowState);
      }
      if (parsed.previewSamples) {
        setPreviewSamples(parsed.previewSamples);
      }
      if (parsed.estimate) {
        setEstimate(parsed.estimate);
      }
      if (parsed.applyResult) {
        setApplyResult(parsed.applyResult);
      }
    } catch {
      // ignore session restore errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selectedPlaybookId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!selectedPlaybookId) {
      return;
    }
    const key = `automationPlaybookState:${projectId}:${selectedPlaybookId}`;
    try {
      const payload = JSON.stringify({
        flowState,
        previewSamples,
        estimate,
        applyResult,
      });
      window.sessionStorage.setItem(key, payload);
    } catch {
      // ignore persist errors
    }
  }, [projectId, selectedPlaybookId, flowState, previewSamples, estimate, applyResult]);

  const handleNavigate = useCallback(
    (href: string) => {
      if (
        shouldWarnOnNavigate &&
        typeof window !== 'undefined' &&
        !window.confirm(
          'You have an in-progress playbook preview. Leaving will discard it.',
        )
      ) {
        return;
      }
      router.push(href);
    },
    [router, shouldWarnOnNavigate],
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-gray-600">Loading automation playbooks...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-2 text-gray-500">
          <li>
            <Link
              href="/projects"
              onClick={(event) => {
                event.preventDefault();
                handleNavigate('/projects');
              }}
              className="hover:text-gray-700"
            >
              Projects
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/projects/${projectId}/overview`}
              onClick={(event) => {
                event.preventDefault();
                handleNavigate(`/projects/${projectId}/overview`);
              }}
              className="hover:text-gray-700"
            >
              {projectName || 'Project'}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/projects/${projectId}/automation`}
              onClick={(event) => {
                event.preventDefault();
                handleNavigate(`/projects/${projectId}/automation`);
              }}
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
            onClick={(event) => {
              event.preventDefault();
              handleNavigate(`/projects/${projectId}/automation`);
            }}
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
                  activeStep === 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                1
              </span>
              <span
                className={
                  activeStep === 1 ? 'font-semibold text-gray-900' : 'text-gray-600'
                }
              >
                Preview
              </span>
            </div>
            <div className="h-px flex-1 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  activeStep === 2
                    ? 'bg-blue-600 text-white'
                    : step2Locked
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-gray-200 text-gray-700'
                }`}
                title={step2Locked ? 'Generate preview first' : undefined}
              >
                2
              </span>
              <span
                className={
                  activeStep === 2
                    ? 'font-semibold text-gray-900'
                    : step2Locked
                      ? 'text-gray-400'
                      : 'text-gray-600'
                }
              >
                Estimate
              </span>
            </div>
            <div className="h-px flex-1 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  activeStep === 3
                    ? 'bg-blue-600 text-white'
                    : step3Locked
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-gray-200 text-gray-700'
                }`}
                title={step3Locked ? 'Generate preview first' : undefined}
              >
                3
              </span>
              <span
                className={
                  activeStep === 3
                    ? 'font-semibold text-gray-900'
                    : step3Locked
                      ? 'text-gray-400'
                      : 'text-gray-600'
                }
              >
                Apply
              </span>
            </div>
          </div>

          {(flowState === 'APPLY_COMPLETED' || flowState === 'APPLY_STOPPED') && (
            <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-800">
              <p className="text-sm font-semibold text-green-900">
                {flowState === 'APPLY_COMPLETED'
                  ? 'Playbook run completed'
                  : 'Playbook stopped safely'}
              </p>
              <p className="mt-1 text-xs">
                Review the results below, then view updated products or sync changes to Shopify.
              </p>
            </div>
          )}

          {/* Step 1: Preview */}
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            {isEligibilityEmptyState ? (
              <div className="space-y-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Step 0 – Eligibility
                  </h2>
                  <p className="text-xs text-gray-600">
                    No products currently qualify for this playbook. When your
                    products match this playbook&apos;s criteria, you&apos;ll be able
                    to generate a preview and run an estimate.
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  Use the Products view to find and optimize items that still need SEO
                  improvements.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handleNavigate(`/projects/${projectId}/products`)
                  }
                  className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  View products that need optimization
                </button>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      Step 1 – Preview changes
                    </h2>
                    <p className="text-xs text-gray-600">
                      Generate a preview for a few sample products. No changes are
                      saved during this step.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePreview}
                    disabled={loadingPreview || planIsFree}
                    className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                      hasPreview
                        ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        : 'border border-transparent bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {loadingPreview ? 'Generating preview…' : 'Generate preview'}
                  </button>
                </div>
                <div className="mb-3 text-xs text-gray-500">
                  Total affected products:{' '}
                  <span className="font-semibold text-gray-900">
                    {totalAffectedProducts}
                  </span>
                </div>
                {planIsFree && (
                  <p className="mb-3 text-xs text-amber-700">
                    Bulk Automation Playbooks are gated on the Free plan. Upgrade to
                    Pro to unlock bulk metadata fixes.
                  </p>
                )}
                {loadingPreview && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    Generating AI previews for sample products…
                  </div>
                )}
                {!loadingPreview && !hasPreview && (
                  <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    No preview yet. Click &quot;Generate preview&quot; to see
                    Before/After examples for a few sample products.
                  </div>
                )}
                {!loadingPreview && hasPreview && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs font-medium text-gray-600">
                      Sample preview (up to 3 products)
                    </p>
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
                            onClick={(event) => {
                              event.preventDefault();
                              handleNavigate(
                                `/projects/${projectId}/products/${sample.productId}`,
                              );
                            }}
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
                                ? sample.currentTitle || (
                                    <span className="text-gray-400">Empty</span>
                                  )
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
                  {hasPreview && (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={
                        flowState !== 'PREVIEW_GENERATED' ||
                        planIsFree ||
                        !estimate ||
                        !estimate.canProceed
                      }
                      className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue to Estimate
                    </button>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Step 2: Estimate */}
          <section
            className={`rounded-lg border border-gray-200 bg-white p-4 ${
              step2Locked ? 'opacity-50' : ''
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Step 2 – Estimate impact & tokens
                </h2>
                <p className="text-xs text-gray-600">
                  Estimate updates automatically from your latest preview. Review how
                  many products will be updated and approximate token usage before you
                  apply.
                </p>
              </div>
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
                onClick={() =>
                  setFlowState(hasPreview ? 'PREVIEW_GENERATED' : 'PREVIEW_READY')
                }
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Back to Preview
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={
                  flowState !== 'ESTIMATE_READY' ||
                  step2Locked ||
                  !estimate ||
                  !estimate.canProceed
                }
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Apply
              </button>
            </div>
          </section>

          {/* Step 3: Apply */}
          <section
            id="automation-playbook-apply-step"
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
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
              <div className="mb-3 space-y-3">
                {/* Summary */}
                <div className="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                  <p>
                    Updated products:{' '}
                    <span className="font-semibold">{applyResult.updatedCount}</span>
                  </p>
                  <p>
                    Skipped products:{' '}
                    <span className="font-semibold">{applyResult.skippedCount}</span>
                  </p>
                  <p>
                    Attempted:{' '}
                    <span className="font-semibold">{applyResult.attemptedCount}</span>{' '}
                    / {applyResult.totalAffectedProducts}
                  </p>
                </div>
                {/* Stopped safely banner */}
                {applyResult.stopped && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <div className="flex items-start gap-2">
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-amber-600"
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
                      <div>
                        <p className="font-semibold">Stopped safely</p>
                        <p className="mt-0.5">
                          {applyResult.limitReached
                            ? 'Daily AI limit was reached during execution. Remaining products were not updated.'
                            : `Playbook stopped due to: ${applyResult.failureReason || 'Unknown error'}`}
                        </p>
                        {applyResult.stoppedAtProductId && (
                          <p className="mt-1">
                            Stopped at product:{' '}
                            <Link
                              href={`/projects/${projectId}/products/${applyResult.stoppedAtProductId}`}
                              className="font-medium text-amber-700 underline hover:text-amber-900"
                            >
                              {products.find((p) => p.id === applyResult.stoppedAtProductId)?.title ||
                                applyResult.stoppedAtProductId}
                            </Link>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Per-item results panel */}
                {applyResult.results && applyResult.results.length > 0 && (
                  <details className="rounded border border-gray-200 bg-gray-50">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100">
                      View per-product results ({applyResult.results.length} items)
                    </summary>
                    <div className="max-h-64 overflow-y-auto border-t border-gray-200">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-100">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-600">Product</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-600">Status</th>
                            <th className="px-3 py-1.5 text-left font-medium text-gray-600">Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applyResult.results.map((item) => {
                            const product = products.find((p) => p.id === item.productId);
                            return (
                              <tr key={item.productId} className="border-t border-gray-100">
                                <td className="px-3 py-1.5">
                                  {item.productId === 'LIMIT_REACHED' ? (
                                    <span className="text-gray-500">—</span>
                                  ) : (
                                    <Link
                                      href={`/projects/${projectId}/products/${item.productId}`}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        handleNavigate(
                                          `/projects/${projectId}/products/${item.productId}`,
                                        );
                                      }}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      {product?.title || item.productId}
                                    </Link>
                                  )}
                                </td>
                                <td className="px-3 py-1.5">
                                  <span
                                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                                      item.status === 'UPDATED'
                                        ? 'bg-green-100 text-green-800'
                                        : item.status === 'SKIPPED'
                                          ? 'bg-gray-100 text-gray-700'
                                          : item.status === 'LIMIT_REACHED'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-gray-600">{item.message}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(flowState === 'APPLY_COMPLETED' ||
                  flowState === 'APPLY_STOPPED') && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleNavigate(
                          `/projects/${projectId}/products?from=playbook_results&playbookId=${selectedPlaybookId}`,
                        )
                      }
                      className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <button
                      type="button"
                      onClick={() =>
                        handleNavigate(`/projects/${projectId}/overview`)
                      }
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      Return to Automation overview
                    </button>
                  </>
                )}
              </div>
              {flowState !== 'APPLY_COMPLETED' && flowState !== 'APPLY_STOPPED' && (
                <button
                  type="button"
                  onClick={handleApplyPlaybook}
                  disabled={
                    flowState !== 'APPLY_READY' ||
                    applying ||
                    !estimate ||
                    !estimate.canProceed ||
                    !confirmApply
                  }
                  className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applying ? 'Applying…' : 'Apply playbook'}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
