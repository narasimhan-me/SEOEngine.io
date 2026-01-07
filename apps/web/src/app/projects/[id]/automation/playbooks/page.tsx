'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue } from '@/lib/deo-issues';
import { isAuthenticated } from '@/lib/auth';
import {
  ApiError,
  aiApi,
  billingApi,
  productsApi,
  projectsApi,
  shopifyApi,
  getRoleCapabilities,
  getRoleDisplayLabel,
} from '@/lib/api';
import type {
  AutomationPlaybookApplyResult,
  ProjectAiUsageSummary,
  AiUsageQuotaEvaluation,
  EffectiveProjectRole,
  GovernancePolicyResponse,
  ApprovalRequestResponse,
  ProjectMember,
  AutomationAssetType,
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
  /** Server-issued scope identifier for binding preview → estimate → apply */
  scopeId: string;
  /** Deterministic hash of rules configuration for binding preview → estimate → apply */
  rulesHash: string;
}

interface PreviewSample {
  productId: string;
  productTitle: string;
  currentTitle: string;
  currentDescription: string;
  suggestedTitle: string;
  suggestedDescription: string;
  ruleWarnings?: string[];
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

/**
 * CNAB-1: Contextual Next-Action Banner state for playbooks page.
 * Guides users through the playbook flow based on current state.
 */
type PlaybooksCnabState =
  | 'NO_RUN_WITH_ISSUES'          // Has issues but hasn't run any playbook yet
  | 'DESCRIPTIONS_DONE_TITLES_REMAIN' // Ran descriptions playbook, titles still need work
  | 'TITLES_DONE_DESCRIPTIONS_REMAIN' // Ran titles playbook, descriptions still need work
  | 'ALL_DONE'                    // Both playbooks have 0 affected products
  | null;                         // No banner to show

interface PlaybookRulesV1 {
  enabled: boolean;
  find: string;
  replace: string;
  caseSensitive: boolean;
  prefix: string;
  suffix: string;
  maxLength?: number;
  /**
   * Newline-separated forbidden phrases. Parsed into an array when applying rules.
   */
  forbiddenPhrasesText: string;
}

const DEFAULT_RULES: PlaybookRulesV1 = {
  enabled: false,
  find: '',
  replace: '',
  caseSensitive: false,
  prefix: '',
  suffix: '',
  maxLength: undefined,
  forbiddenPhrasesText: '',
};

/**
 * Error codes that can trigger inline error panels in Step 3 (Apply).
 * These are derived from 409 Conflict responses from the backend.
 */
type ApplyInlineErrorCode =
  | 'PLAYBOOK_RULES_CHANGED'
  | 'PLAYBOOK_SCOPE_INVALID'
  | 'PLAYBOOK_DRAFT_NOT_FOUND'
  | 'PLAYBOOK_DRAFT_EXPIRED';

interface ApplyInlineError {
  code: ApplyInlineErrorCode;
  message: string;
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

/**
 * [ASSETS-PAGES-1.1] Get display labels for asset types.
 */
function getAssetTypeLabel(assetType: AutomationAssetType): { singular: string; plural: string } {
  switch (assetType) {
    case 'PAGES':
      return { singular: 'page', plural: 'pages' };
    case 'COLLECTIONS':
      return { singular: 'collection', plural: 'collections' };
    case 'PRODUCTS':
    default:
      return { singular: 'product', plural: 'products' };
  }
}

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
  const [cnabDismissed, setCnabDismissed] = useState(false);

  // Deep-link support: read playbookId from URL query params
  const urlPlaybookId = searchParams.get('playbookId') as PlaybookId | null;
  const validUrlPlaybookId =
    urlPlaybookId === 'missing_seo_title' || urlPlaybookId === 'missing_seo_description'
      ? urlPlaybookId
      : null;

  // [ASSETS-PAGES-1.1] Deep-link support: read assetType from URL query params
  const urlAssetType = searchParams.get('assetType') as AutomationAssetType | null;
  const validUrlAssetType =
    urlAssetType === 'PRODUCTS' || urlAssetType === 'PAGES' || urlAssetType === 'COLLECTIONS'
      ? urlAssetType
      : 'PRODUCTS'; // Default to PRODUCTS

  // [ASSETS-PAGES-1.1-UI-HARDEN] Deep-link support: read scopeAssetRefs from URL (comma-separated)
  const urlScopeAssetRefs = searchParams.get('scopeAssetRefs');
  const parsedScopeAssetRefs = useMemo(() => {
    if (!urlScopeAssetRefs) return [];
    return urlScopeAssetRefs.split(',').map((ref) => ref.trim()).filter((ref) => ref.length > 0);
  }, [urlScopeAssetRefs]);

  // [ASSETS-PAGES-1.1-UI-HARDEN] Deterministic safety check: PAGES/COLLECTIONS require scopeAssetRefs
  const isMissingScopeForPagesCollections =
    (validUrlAssetType === 'PAGES' || validUrlAssetType === 'COLLECTIONS') &&
    parsedScopeAssetRefs.length === 0;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [issues, setIssues] = useState<DeoIssue[]>([]);
  // Initialize from URL param if valid, otherwise default to 'missing_seo_title'
  const [selectedPlaybookId, setSelectedPlaybookId] =
    useState<PlaybookId | null>(validUrlPlaybookId ?? 'missing_seo_title');
  // [ASSETS-PAGES-1.1] Track current asset type from URL deep link (read-only from URL params)
  const [currentAssetType] = useState<AutomationAssetType>(validUrlAssetType);
  // [ASSETS-PAGES-1.1-UI-HARDEN] Track scope asset refs from URL deep link (read-only)
  const [currentScopeAssetRefs] = useState<string[]>(parsedScopeAssetRefs);
  const [flowState, setFlowState] = useState<PlaybookFlowState>('PREVIEW_READY');
  const [previewSamples, setPreviewSamples] = useState<PreviewSample[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [estimate, setEstimate] = useState<PlaybookEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<AutomationPlaybookApplyResult | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);

  const [rules, setRules] = useState<PlaybookRulesV1>(() => ({
    ...DEFAULT_RULES,
  }));
  const [rulesVersion, setRulesVersion] = useState(0);
  const [previewRulesVersion, setPreviewRulesVersion] = useState<number | null>(null);
  const [applyInlineError, setApplyInlineError] = useState<ApplyInlineError | null>(null);

  const [resumedFromSession, setResumedFromSession] = useState(false);

  // AI-USAGE-1: AI Usage Summary state
  const [aiUsageSummary, setAiUsageSummary] = useState<ProjectAiUsageSummary | null>(null);
  const [aiUsageLoading, setAiUsageLoading] = useState(false);

  // AI-USAGE v2: Plan-aware quota evaluation state (used for predictive UX guard).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_aiQuotaEvaluation, setAiQuotaEvaluation] = useState<AiUsageQuotaEvaluation | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_aiQuotaLoading, setAiQuotaLoading] = useState(false);

  // [ROLES-2] Role and approval state for governance gating
  const [effectiveRole, setEffectiveRole] = useState<EffectiveProjectRole>('OWNER');
  const [governancePolicy, setGovernancePolicy] = useState<GovernancePolicyResponse | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequestResponse | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  // [ROLES-3 FIXUP-3 CORRECTION] Track if project has multiple members (affects approval UI)
  const [isMultiUserProject, setIsMultiUserProject] = useState(false);
  // [ROLES-3 PENDING-1] Members list for approval attribution UI
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

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

      // AI-USAGE-1: Fetch AI usage summary (silent fail on error)
      setAiUsageLoading(true);
      try {
        const usageSummary = await aiApi.getProjectAiUsageSummary(projectId);
        setAiUsageSummary(usageSummary);
      } catch {
        // Silent fail - don't block page load for usage stats
        setAiUsageSummary(null);
      } finally {
        setAiUsageLoading(false);
      }

      // [ROLES-2] Fetch governance policy for approval requirements
      try {
        const policy = await projectsApi.getGovernancePolicy(projectId);
        setGovernancePolicy(policy);
      } catch {
        // Silent fail - use defaults (no approval required)
        setGovernancePolicy(null);
      }

      // [ROLES-3] Resolve effective role from project membership API
      // This returns the user's ProjectMember role with capabilities
      // [ROLES-3 FIXUP-3 CORRECTION] Also fetch isMultiUserProject for approval flow decisions
      try {
        const roleResponse = await projectsApi.getUserRole(projectId);
        setEffectiveRole(roleResponse.role);
        setIsMultiUserProject(roleResponse.isMultiUserProject);
      } catch {
        // Silent fail - default to OWNER for backward compatibility
        setEffectiveRole('OWNER');
        setIsMultiUserProject(false);
      }

      // [ROLES-3 PENDING-1] Fetch project members for approval attribution UI
      try {
        const members = await projectsApi.listMembers(projectId);
        setProjectMembers(members);
      } catch {
        // Silent fail - attribution will show user IDs instead of names
        setProjectMembers([]);
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

  const enabledRulesLabels: string[] = [];
  if (rules.enabled) {
    if (rules.find) enabledRulesLabels.push('Find/Replace');
    if (rules.prefix) enabledRulesLabels.push('Prefix');
    if (rules.suffix) enabledRulesLabels.push('Suffix');
    if (rules.maxLength && rules.maxLength > 0) enabledRulesLabels.push('Max length');
    if (rules.forbiddenPhrasesText.trim()) enabledRulesLabels.push('Forbidden phrases');
  }
  const rulesSummaryLabel =
    enabledRulesLabels.length > 0 ? `Rules: ${enabledRulesLabels.join(', ')}` : 'Rules: None';

  /**
   * CNAB-1: Calculate contextual banner state based on playbook summaries.
   */
  const cnabState = useMemo((): PlaybooksCnabState => {
    const titlesSummary = playbookSummaries.find((s) => s.id === 'missing_seo_title');
    const descriptionsSummary = playbookSummaries.find((s) => s.id === 'missing_seo_description');

    const titlesAffected = titlesSummary?.totalAffected ?? 0;
    const descriptionsAffected = descriptionsSummary?.totalAffected ?? 0;

    // All done - no issues for either playbook
    if (titlesAffected === 0 && descriptionsAffected === 0) {
      return 'ALL_DONE';
    }

    // Check if user has completed any playbook run (applyResult exists and has updates)
    const hasCompletedTitlesRun =
      selectedPlaybookId === 'missing_seo_title' &&
      applyResult &&
      applyResult.updatedCount > 0;
    const hasCompletedDescriptionsRun =
      selectedPlaybookId === 'missing_seo_description' &&
      applyResult &&
      applyResult.updatedCount > 0;

    // Just finished descriptions, titles still need work
    if (hasCompletedDescriptionsRun && titlesAffected > 0) {
      return 'DESCRIPTIONS_DONE_TITLES_REMAIN';
    }

    // Just finished titles, descriptions still need work
    if (hasCompletedTitlesRun && descriptionsAffected > 0) {
      return 'TITLES_DONE_DESCRIPTIONS_REMAIN';
    }

    // Has issues but hasn't run any playbook successfully yet
    if (titlesAffected > 0 || descriptionsAffected > 0) {
      // Only show this if we're not in a completed state
      if (flowState !== 'APPLY_COMPLETED' && flowState !== 'APPLY_STOPPED') {
        return 'NO_RUN_WITH_ISSUES';
      }
    }

    return null;
  }, [playbookSummaries, selectedPlaybookId, applyResult, flowState]);

  const markRulesEdited = () => {
    setRules((previous) => ({
      ...previous,
      enabled: true,
    }));
    setRulesVersion((previous) => previous + 1);
  };

  const handleRulesChange = (patch: Partial<PlaybookRulesV1>) => {
    setRules((previous) => {
      const next: PlaybookRulesV1 = {
        ...previous,
        ...patch,
      };
      if (!previous.enabled && (patch.find || patch.replace || patch.prefix || patch.suffix || patch.maxLength || patch.forbiddenPhrasesText)) {
        next.enabled = true;
      }
      return next;
    });
    setRulesVersion((previous) => previous + 1);
  };

  const loadEstimate = useCallback(
    async (playbookId: PlaybookId, assetType?: AutomationAssetType, scopeAssetRefs?: string[]) => {
      try {
        setLoadingEstimate(true);
        setError('');
        setEstimate(null);
        // [ASSETS-PAGES-1.1-UI-HARDEN] Pass assetType and scopeAssetRefs to estimate endpoint
        const effectiveAssetType = assetType ?? currentAssetType;
        const effectiveScopeAssetRefs = scopeAssetRefs ?? currentScopeAssetRefs;
        const data = (await projectsApi.automationPlaybookEstimate(
          projectId,
          playbookId,
          undefined, // scopeProductIds - only for PRODUCTS
          effectiveAssetType !== 'PRODUCTS' ? effectiveAssetType : undefined,
          effectiveAssetType !== 'PRODUCTS' && effectiveScopeAssetRefs.length > 0
            ? effectiveScopeAssetRefs
            : undefined,
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
    [projectId, currentAssetType, currentScopeAssetRefs],
  );

  const loadPreview = useCallback(
    async (playbookId: PlaybookId): Promise<boolean> => {
      const definition = PLAYBOOKS.find((pb) => pb.id === playbookId);
      if (!definition) return false;

      try {
        setLoadingPreview(true);
        setError('');
        setPreviewSamples([]);

        // AI-USAGE v2: Predictive quota guard for preview generation.
        // This runs before any AI work is triggered.
        setAiQuotaLoading(true);
        try {
          const quota = await aiApi.getProjectAiUsageQuota(projectId, {
            action: 'PREVIEW_GENERATE',
          });
          setAiQuotaEvaluation(quota);

          if (quota.status === 'warning' && quota.currentUsagePercent !== null) {
            // [BILLING-GTM-1] Predict → Warn: Show limit-style toast with Upgrade CTA but allow action.
            const percentRounded = Math.round(quota.currentUsagePercent);
            feedback.showLimit(
              `This will use AI. You're at ${percentRounded}% of your monthly limit. You can still proceed, but consider upgrading for more AI runs.`,
              '/settings/billing',
            );
          }

          if (quota.status === 'blocked' && quota.policy.hardEnforcementEnabled) {
            const message =
              'AI usage limit reached. Upgrade your plan or wait until your monthly AI quota resets to generate new previews.';
            setError(message);
            feedback.showLimit(message, '/settings/billing');
            return false;
          }
        } catch {
          // Quota evaluation failures must never silently block AI; fall back to existing behavior.
          setAiQuotaEvaluation(null);
        } finally {
          setAiQuotaLoading(false);
        }

        // Call the backend preview endpoint which:
        // 1. Computes scopeId and rulesHash
        // 2. Creates/updates a draft in the database
        // 3. Generates AI suggestions for sample products
        // 4. Returns everything needed for the apply flow
        // [ASSETS-PAGES-1.1-UI-HARDEN] Pass assetType and scopeAssetRefs
        const previewResult = await projectsApi.previewAutomationPlaybook(
          projectId,
          playbookId,
          rules.enabled ? rules : undefined,
          3, // sampleSize
          undefined, // scopeProductIds - only for PRODUCTS
          currentAssetType !== 'PRODUCTS' ? currentAssetType : undefined,
          currentAssetType !== 'PRODUCTS' && currentScopeAssetRefs.length > 0
            ? currentScopeAssetRefs
            : undefined,
        ) as {
          projectId: string;
          playbookId: string;
          scopeId: string;
          rulesHash: string;
          draftId: string;
          status: string;
          counts: {
            totalAffected: number;
            sampleGenerated: number;
            noSuggestionCount: number;
          };
          samples: Array<{
            productId: string;
            productTitle: string;
            field: 'seoTitle' | 'seoDescription';
            currentTitle: string;
            currentDescription: string;
            rawSuggestion: string;
            finalSuggestion: string;
            ruleWarnings: string[];
          }>;
        };

        // Convert backend samples to frontend PreviewSample format
        const samples: PreviewSample[] = previewResult.samples.map((sample) => ({
          productId: sample.productId,
          productTitle: sample.productTitle,
          currentTitle: sample.currentTitle,
          currentDescription: sample.currentDescription,
          suggestedTitle: sample.field === 'seoTitle' ? sample.finalSuggestion : '',
          suggestedDescription: sample.field === 'seoDescription' ? sample.finalSuggestion : '',
          ruleWarnings: sample.ruleWarnings.length > 0 ? sample.ruleWarnings : undefined,
        }));

        setPreviewSamples(samples);

        // Update estimate with scopeId and rulesHash from preview
        if (estimate) {
          setEstimate({
            ...estimate,
            scopeId: previewResult.scopeId,
            rulesHash: previewResult.rulesHash,
          });
        } else {
          // Fetch fresh estimate to get scopeId and rulesHash
          await loadEstimate(playbookId);
        }

        if (samples.length > 0) {
          setPreviewRulesVersion(rulesVersion);
        }

        return samples.length > 0;
      } catch (err: unknown) {
        console.error('Error generating preview:', err);

        if (err instanceof ApiError) {
          if (err.code === 'AI_DAILY_LIMIT_REACHED') {
            const limitMessage =
              "Daily AI limit reached. You've used all AI suggestions available on your plan. Your limit resets tomorrow, or upgrade to continue.";
            setError(limitMessage);
            feedback.showLimit(limitMessage, '/settings/billing');
            return false;
          }
          if (err.code === 'AI_QUOTA_EXCEEDED') {
            const quotaMessage =
              'AI usage limit reached for Playbooks. Upgrade your plan or wait until your monthly AI quota resets to generate new previews.';
            setError(quotaMessage);
            feedback.showLimit(quotaMessage, '/settings/billing');
            return false;
          }
          setError(err.message);
          feedback.showError(err.message);
          return false;
        }

        // Check for AI quota exhaustion (Gemini rate limits)
        const errMessage = err instanceof Error ? err.message : String(err);
        if (errMessage.includes('AI_QUOTA_EXHAUSTED')) {
          const quotaMessage =
            'AI service quota exceeded. Please wait a few minutes and try again.';
          setError(quotaMessage);
          feedback.showError(quotaMessage);
          return false;
        }

        // Check for all models exhausted (all AI models tried and failed)
        if (errMessage.includes('AI_ALL_MODELS_EXHAUSTED')) {
          const exhaustedMessage =
            'All AI models are currently unavailable. The system tried multiple models but all are experiencing issues. Please wait a few minutes and try again.';
          setError(exhaustedMessage);
          feedback.showError(exhaustedMessage);
          return false;
        }

        const message =
          'AI suggestions are temporarily unavailable. Please try again later.';
        setError(message);
        feedback.showError(message);
        return false;
      } finally {
        setLoadingPreview(false);
      }
    },
    [projectId, feedback, rules, rulesVersion, estimate, loadEstimate, currentAssetType, currentScopeAssetRefs],
  );

  useEffect(() => {
    if (!selectedPlaybookId) return;
    loadEstimate(selectedPlaybookId).catch(() => {
      // handled via state
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaybookId]);

  /**
   * [ROLES-3 FIXUP-3 PATCH 4.6] Clear approval state when approval is not required.
   * This ensures no stale approval state is shown when policy changes.
   */
  useEffect(() => {
    if (!governancePolicy?.requireApprovalForApply) {
      setPendingApproval(null);
    }
  }, [governancePolicy?.requireApprovalForApply]);

  /**
   * [ROLES-3 FIXUP-3 PATCH 4.6] Prefetch approval status when Step 3 is ready.
   * This ensures the UI shows correct approval state on page load/refresh.
   *
   * Triggers when:
   * - governancePolicy?.requireApprovalForApply === true
   * - selectedPlaybookId is set
   * - estimate?.scopeId is present (resourceId can be formed)
   * - flowState is APPLY_READY (Step 3 is visible)
   *
   * Includes stale-response guard to prevent race conditions when playbook changes.
   */
  useEffect(() => {
    // Only prefetch when approval is required by policy
    if (!governancePolicy?.requireApprovalForApply) {
      return;
    }

    // Need all pieces to form resourceId
    if (!selectedPlaybookId || !estimate?.scopeId) {
      return;
    }

    // Only prefetch when Step 3 is visible (APPLY_READY state)
    if (flowState !== 'APPLY_READY') {
      return;
    }

    const resourceId = `${selectedPlaybookId}:${estimate.scopeId}`;
    let cancelled = false;

    const prefetchApprovalStatus = async () => {
      setApprovalLoading(true);
      try {
        const { approval } = await projectsApi.getApprovalStatus(
          projectId,
          'AUTOMATION_PLAYBOOK_APPLY',
          resourceId,
        );
        // Stale-response guard: only update if this effect is still current
        if (!cancelled) {
          setPendingApproval(approval);
        }
      } catch (err) {
        // Silent fail - don't block UI for prefetch errors
        console.error('[ROLES-3 FIXUP-3] Approval status prefetch failed:', err);
        // Only clear if we can confirm resourceId changed (cancelled flag)
        // Otherwise leave as-is to avoid flickering
      } finally {
        if (!cancelled) {
          setApprovalLoading(false);
        }
      }
    };

    prefetchApprovalStatus();

    return () => {
      cancelled = true;
    };
  }, [
    governancePolicy?.requireApprovalForApply,
    selectedPlaybookId,
    estimate?.scopeId,
    flowState,
    projectId,
  ]);

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
    setApplyInlineError(null);
    // [ROLES-3 FIXUP-3 PATCH 4.6] Reset stale approval state when switching playbooks
    setPendingApproval(null);
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
    // Determine active step from flowState
    const currentStep =
      flowState === 'APPLY_READY' ||
      flowState === 'APPLY_RUNNING' ||
      flowState === 'APPLY_COMPLETED' ||
      flowState === 'APPLY_STOPPED'
        ? 3
        : flowState === 'ESTIMATE_READY'
          ? 2
          : 1;

    if (currentStep === 1) {
      // Use derived readiness instead of raw flowState
      setFlowState('ESTIMATE_READY');
    } else if (currentStep === 2) {
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
    if (!estimate.scopeId || !estimate.rulesHash) {
      // scopeId and rulesHash are required but missing - fetch a fresh estimate
      feedback.showError(
        'Estimate is stale (missing scopeId or rulesHash). Please re-run the preview to refresh.',
      );
      setFlowState('PREVIEW_READY');
      return;
    }
    if (flowState !== 'APPLY_READY') return;

    const capabilities = getRoleCapabilities(effectiveRole);
    const approvalRequiredByPolicy = governancePolicy?.requireApprovalForApply ?? false;
    const resourceId = `${selectedPlaybookId}:${estimate.scopeId}`;

    // [ROLES-3 FIXUP-3 CORRECTION] EDITOR can NEVER apply, even if approved
    // EDITOR can only request approval; OWNER must apply after approval is granted
    if (!capabilities.canApply) {
      // This is EDITOR or VIEWER
      if (!capabilities.canRequestApproval) {
        // VIEWER - blocked entirely
        feedback.showError('Viewer role cannot apply playbooks.');
        return;
      }

      // EDITOR - check approval status and act accordingly
      if (approvalRequiredByPolicy) {
        setApprovalLoading(true);
        try {
          const { approval } = await projectsApi.getApprovalStatus(
            projectId,
            'AUTOMATION_PLAYBOOK_APPLY',
            resourceId,
          );
          setPendingApproval(approval);

          if (!approval || approval.status === 'REJECTED' || approval.consumed) {
            // No approval or rejected/consumed - create new request
            const newApproval = await projectsApi.createApprovalRequest(projectId, {
              resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
              resourceId,
            });
            setPendingApproval(newApproval);
            feedback.showInfo(
              'Approval request submitted. An owner must approve and apply this playbook.',
            );
          } else if (approval.status === 'PENDING_APPROVAL') {
            // Already pending - just inform
            feedback.showInfo('Approval is pending. Waiting for an owner to approve.');
          } else if (approval.status === 'APPROVED') {
            // Approved but EDITOR still cannot apply - inform them
            feedback.showInfo('Approval granted. An owner must apply this playbook.');
          }
        } catch (requestErr) {
          console.error('Error handling approval request:', requestErr);
          feedback.showError('Failed to process approval request. Please try again.');
        } finally {
          setApprovalLoading(false);
        }
      } else {
        // No approval required but EDITOR still cannot apply
        feedback.showError('Editor role cannot apply playbooks. An owner must apply.');
      }
      return;
    }

    // From here on, user is OWNER (canApply === true)
    try {
      setApplying(true);
      setError('');
      setApplyResult(null);
      setFlowState('APPLY_RUNNING');

      let approvalIdToUse: string | undefined;

      if (approvalRequiredByPolicy) {
        setApprovalLoading(true);
        try {
          // Always refresh approval status from server (derived state rule)
          const { approval } = await projectsApi.getApprovalStatus(
            projectId,
            'AUTOMATION_PLAYBOOK_APPLY',
            resourceId,
          );
          setPendingApproval(approval);

          if (approval && approval.status === 'APPROVED' && !approval.consumed) {
            // Use existing valid approval
            approvalIdToUse = approval.id;
          } else if (approval && approval.status === 'PENDING_APPROVAL') {
            // OWNER approves the pending request, then applies
            const approvedRequest = await projectsApi.approveRequest(projectId, approval.id);
            approvalIdToUse = approvedRequest.id;
            setPendingApproval(approvedRequest);
          } else if (isMultiUserProject) {
            // [ROLES-3 FIXUP-3 CORRECTION] Multi-user project: OWNER cannot self-request
            // An EDITOR must request approval first
            setApprovalLoading(false);
            feedback.showError(
              'In multi-user projects, an Editor must request approval first. Add an Editor in Members settings.',
            );
            setFlowState('APPLY_READY');
            setApplying(false);
            return;
          } else {
            // Single-user project: OWNER can create → approve → apply (ROLES-2 convenience)
            const newApproval = await projectsApi.createApprovalRequest(projectId, {
              resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
              resourceId,
            });
            const approvedRequest = await projectsApi.approveRequest(projectId, newApproval.id);
            approvalIdToUse = approvedRequest.id;
            setPendingApproval(approvedRequest);
          }
        } catch (approvalErr) {
          console.error('Error handling approval flow:', approvalErr);
          feedback.showError('Failed to process approval. Please try again.');
          setFlowState('APPLY_READY');
          setApplying(false);
          return;
        } finally {
          setApprovalLoading(false);
        }
      }

      // [ASSETS-PAGES-1.1-UI-HARDEN] Pass assetType and scopeAssetRefs to apply
      const data = await projectsApi.applyAutomationPlaybook(
        projectId,
        selectedPlaybookId,
        estimate.scopeId,
        estimate.rulesHash,
        undefined, // scopeProductIds - only for PRODUCTS
        approvalIdToUse,
        currentAssetType !== 'PRODUCTS' ? currentAssetType : undefined,
        currentAssetType !== 'PRODUCTS' && currentScopeAssetRefs.length > 0
          ? currentScopeAssetRefs
          : undefined,
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
        // Handle 409 Conflict errors with inline error panels
        const inlineErrorCodes: ApplyInlineErrorCode[] = [
          'PLAYBOOK_RULES_CHANGED',
          'PLAYBOOK_SCOPE_INVALID',
          'PLAYBOOK_DRAFT_NOT_FOUND',
          'PLAYBOOK_DRAFT_EXPIRED',
        ];
        if (err.code && inlineErrorCodes.includes(err.code as ApplyInlineErrorCode)) {
          setApplyInlineError({
            code: err.code as ApplyInlineErrorCode,
            message: err.message,
          });
          // Don't show toast for inline errors - they have dedicated UI
          return;
        }
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
    governancePolicy,
    effectiveRole,
    isMultiUserProject,
    currentAssetType,
    currentScopeAssetRefs,
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
  const previewStale =
    hasPreview &&
    previewRulesVersion !== null &&
    previewRulesVersion !== rulesVersion;

  const planEligible = !planIsFree;
  const previewPresent = hasPreview;
  const estimatePresent = !!estimate;
  const estimateEligible = !!estimate && estimate.canProceed;
  const previewValid = previewPresent && !previewStale;

  // [ROLES-3] Derived state for role-based access control
  const roleCapabilities = getRoleCapabilities(effectiveRole);
  const canGenerateDrafts = roleCapabilities.canGenerateDrafts; // OWNER/EDITOR can generate, VIEWER cannot
  const approvalRequired = governancePolicy?.requireApprovalForApply ?? false;

  // [ROLES-3 PENDING-1] Helper to look up user display name from members list
  const getUserDisplayName = useCallback((userId: string): string => {
    const member = projectMembers.find((m) => m.userId === userId);
    if (member) {
      return member.name || member.email;
    }
    // Fallback: show shortened user ID
    return userId.length > 8 ? `${userId.slice(0, 8)}…` : userId;
  }, [projectMembers]);

  const canContinueToEstimate =
    previewPresent &&
    previewValid &&
    planEligible &&
    estimatePresent &&
    estimateEligible;

  const step2Locked =
    isEligibilityEmptyState ||
    !previewPresent ||
    !planEligible ||
    !estimatePresent ||
    !estimateEligible;

  const step3Locked = step2Locked;

  const continueBlockers: Array<
    'preview_stale' | 'plan_not_eligible' | 'estimate_not_eligible' | 'estimate_missing'
  > = [];

  if (previewPresent && previewStale) {
    continueBlockers.push('preview_stale');
  }
  if (!planEligible) {
    continueBlockers.push('plan_not_eligible');
  }
  if (estimatePresent && !estimateEligible) {
    continueBlockers.push('estimate_not_eligible');
  }
  if (
    previewPresent &&
    !previewStale &&
    planEligible &&
    !estimatePresent
  ) {
    continueBlockers.push('estimate_missing');
  }

  const showContinueBlockedPanel =
    previewPresent && !canContinueToEstimate && continueBlockers.length > 0;

  let previewValidityLabel: string | null = null;
  let previewValidityClass = '';
  if (hasPreview) {
    if (previewStale) {
      previewValidityLabel = 'Rules changed — preview out of date';
      previewValidityClass =
        'border border-amber-200 bg-amber-50 text-amber-800';
    } else if (!estimatePresent) {
      previewValidityLabel = 'Estimate required to continue';
      previewValidityClass =
        'border border-amber-200 bg-amber-50 text-amber-800';
    } else if (planEligible && estimateEligible) {
      previewValidityLabel = 'Preview valid';
      previewValidityClass =
        'border border-green-200 bg-green-50 text-green-800';
    }
  }

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
    } else if (flowState === 'PREVIEW_READY' && previewSamples.length > 0) {
      // If we have preview samples but flowState is still PREVIEW_READY,
      // upgrade to PREVIEW_GENERATED to enable the Continue button.
      // This handles the case where preview samples were restored from sessionStorage
      // but the flowState wasn't properly upgraded.
      setFlowState('PREVIEW_GENERATED');
    }
  }, [estimate, flowState, previewSamples.length]);

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
      setResumedFromSession(true);
      const parsed = JSON.parse(stored) as {
        flowState?: PlaybookFlowState;
        previewSamples?: PreviewSample[];
        estimate?: PlaybookEstimate | null;
        applyResult?: AutomationPlaybookApplyResult | null;
        rules?: PlaybookRulesV1;
        rulesVersion?: number;
        previewRulesVersion?: number | null;
      };
      // Restore flowState, but ensure it's PREVIEW_GENERATED if we have preview samples
      if (parsed.flowState) {
        // If we have preview samples, ensure flowState reflects that
        if (parsed.previewSamples && parsed.previewSamples.length > 0) {
          // Keep the restored flowState if it's past PREVIEW_GENERATED, otherwise set to PREVIEW_GENERATED
          const advancedStates: PlaybookFlowState[] = [
            'PREVIEW_GENERATED',
            'ESTIMATE_READY',
            'APPLY_READY',
            'APPLY_RUNNING',
            'APPLY_COMPLETED',
            'APPLY_STOPPED',
          ];
          if (advancedStates.includes(parsed.flowState)) {
            setFlowState(parsed.flowState);
          } else {
            setFlowState('PREVIEW_GENERATED');
          }
        } else {
          setFlowState(parsed.flowState);
        }
      }
      if (parsed.previewSamples) {
        setPreviewSamples(parsed.previewSamples);
      }
      // Only restore estimate if it has scopeId and rulesHash (required since AUTO-PB-1.3).
      // Stale estimates from before these fields were added will be re-fetched fresh.
      const hasValidEstimate = parsed.estimate && parsed.estimate.scopeId && parsed.estimate.rulesHash;
      if (hasValidEstimate && parsed.estimate) {
        setEstimate(parsed.estimate);
      } else if (parsed.previewSamples && parsed.previewSamples.length > 0) {
        // If we have preview samples but no valid estimate, fetch a fresh estimate.
        // This handles cases where the user generated a preview before AUTO-PB-1.3 added scopeId/rulesHash.
        loadEstimate(selectedPlaybookId).catch(() => {
          // handled via state
        });
      }
      if (parsed.applyResult) {
        setApplyResult(parsed.applyResult);
      }
      if (parsed.rules) {
        setRules({ ...DEFAULT_RULES, ...parsed.rules });
      }
      if (typeof parsed.rulesVersion === 'number') {
        setRulesVersion(parsed.rulesVersion);
      }
      if (
        typeof parsed.previewRulesVersion === 'number' ||
        parsed.previewRulesVersion === null
      ) {
        setPreviewRulesVersion(
          parsed.previewRulesVersion === undefined
            ? null
            : parsed.previewRulesVersion,
        );
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
        rules,
        rulesVersion,
        previewRulesVersion,
      });
      window.sessionStorage.setItem(key, payload);
    } catch {
      // ignore persist errors
    }
  }, [
    projectId,
    selectedPlaybookId,
    flowState,
    previewSamples,
    estimate,
    applyResult,
    rules,
    rulesVersion,
    previewRulesVersion,
  ]);

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
        <div className="text-gray-600">Loading playbooks...</div>
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
              href={`/projects/${projectId}/store-health`}
              onClick={(event) => {
                event.preventDefault();
                handleNavigate(`/projects/${projectId}/store-health`);
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
              Playbooks
            </Link>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Playbooks
            {/* [ASSETS-PAGES-1.1] Show asset type badge when not PRODUCTS */}
            {currentAssetType !== 'PRODUCTS' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {getAssetTypeLabel(currentAssetType).plural}
              </span>
            )}
          </h1>
          <p className="text-gray-600">
            Safely apply AI-powered fixes to missing SEO metadata, with preview and
            token estimates before you run anything.
          </p>
          {/* [ROLES-3] Role visibility label */}
          <p className="mt-1 text-xs text-gray-500">
            You are the {getRoleDisplayLabel(effectiveRole)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}/automation/playbooks/entry?source=playbooks_page`)}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Create playbook
        </button>
      </div>

      {/* [ASSETS-PAGES-1.1-UI-HARDEN] Missing scope safety block for PAGES/COLLECTIONS */}
      {isMissingScopeForPagesCollections && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
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
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">
                Missing scope for {getAssetTypeLabel(currentAssetType).plural}. Return to Work Queue.
              </p>
              <p className="mt-1 text-xs text-red-700">
                To run playbooks on {getAssetTypeLabel(currentAssetType).plural}, you must navigate from the Work Queue
                with a specific scope. This prevents unintended project-wide changes.
              </p>
              <div className="mt-3">
                <Link
                  href={`/projects/${projectId}/work-queue`}
                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700"
                >
                  Return to Work Queue
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* [ASSETS-PAGES-1.1-UI-HARDEN] Scope summary for PAGES/COLLECTIONS with valid scope */}
      {currentAssetType !== 'PRODUCTS' && currentScopeAssetRefs.length > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Scope summary</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {getAssetTypeLabel(currentAssetType).plural}
                </span>
                <span className="text-xs text-blue-700">
                  {currentScopeAssetRefs.slice(0, 3).map((ref) => {
                    // Extract just the handle part (e.g., 'page_handle:about-us' -> 'about-us')
                    const parts = ref.split(':');
                    return parts.length > 1 ? parts[1] : ref;
                  }).join(', ')}
                  {currentScopeAssetRefs.length > 3 && (
                    <span className="text-blue-500"> +{currentScopeAssetRefs.length - 3} more</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* [ROLES-3] VIEWER mode banner */}
      {effectiveRole === 'VIEWER' && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">View-only mode</p>
              <p className="mt-1 text-xs text-gray-500">
                You are viewing this project as a Viewer. To generate previews or apply changes,
                ask the project Owner to upgrade your role.
              </p>
            </div>
          </div>
        </div>
      )}

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
                  Next up, use Playbooks to fix missing SEO titles and
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

      {/* CNAB-1: Contextual Next-Action Banners */}
      {cnabState === 'NO_RUN_WITH_ISSUES' && !cnabDismissed && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  Next step: Fix missing SEO metadata
                </h3>
                <p className="mt-1 text-xs text-blue-800">
                  Use Playbooks to safely generate missing SEO descriptions in bulk.
                  Start with a preview — nothing is applied until you confirm.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setCnabDismissed(true);
                      setSelectedPlaybookId('missing_seo_description');
                      const ok = await loadPreview('missing_seo_description');
                      if (ok) {
                        setFlowState('PREVIEW_GENERATED');
                      }
                    }}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Preview missing SEO descriptions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCnabDismissed(true);
                      handleNavigate(`/projects/${projectId}/automation`);
                    }}
                    className="inline-flex items-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                  >
                    How Playbooks work
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCnabDismissed(true)}
              className="flex-shrink-0 text-blue-500 hover:text-blue-700"
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

      {cnabState === 'DESCRIPTIONS_DONE_TITLES_REMAIN' && !cnabDismissed && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  SEO descriptions updated — next, fix titles
                </h3>
                <p className="mt-1 text-xs text-blue-800">
                  You&apos;ve improved SEO descriptions. Run the titles playbook using the same
                  safe preview → estimate → apply flow.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setCnabDismissed(true);
                      setSelectedPlaybookId('missing_seo_title');
                      const ok = await loadPreview('missing_seo_title');
                      if (ok) {
                        setFlowState('PREVIEW_GENERATED');
                      }
                    }}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Preview missing SEO titles
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCnabDismissed(true);
                      handleNavigate(
                        `/projects/${projectId}/products?from=playbook_results`,
                      );
                    }}
                    className="inline-flex items-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                  >
                    View updated products
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCnabDismissed(true)}
              className="flex-shrink-0 text-blue-500 hover:text-blue-700"
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

      {cnabState === 'TITLES_DONE_DESCRIPTIONS_REMAIN' && !cnabDismissed && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  SEO titles updated — next, fix descriptions
                </h3>
                <p className="mt-1 text-xs text-blue-800">
                  You&apos;ve improved SEO titles. Run the descriptions playbook using the same
                  safe preview → estimate → apply flow.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setCnabDismissed(true);
                      setSelectedPlaybookId('missing_seo_description');
                      const ok = await loadPreview('missing_seo_description');
                      if (ok) {
                        setFlowState('PREVIEW_GENERATED');
                      }
                    }}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Preview missing SEO descriptions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCnabDismissed(true);
                      handleNavigate(
                        `/projects/${projectId}/products?from=playbook_results`,
                      );
                    }}
                    className="inline-flex items-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                  >
                    View updated products
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCnabDismissed(true)}
              className="flex-shrink-0 text-blue-500 hover:text-blue-700"
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

      {cnabState === 'ALL_DONE' && !cnabDismissed && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-600"
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
                <h3 className="text-sm font-semibold text-green-900">
                  SEO metadata is up to date
                </h3>
                <p className="mt-1 text-xs text-green-800">
                  All eligible products have SEO titles and descriptions. You can sync
                  changes to Shopify or explore other optimizations.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCnabDismissed(true);
                      handleSyncToShopify();
                    }}
                    className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Sync changes to Shopify
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCnabDismissed(true);
                      handleNavigate(`/projects/${projectId}/store-health`);
                    }}
                    className="inline-flex items-center rounded-md border border-green-200 bg-white px-3 py-1.5 text-xs font-medium text-green-700 shadow-sm hover:bg-green-50"
                  >
                    Explore other optimizations
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCnabDismissed(true)}
              className="flex-shrink-0 text-green-500 hover:text-green-700"
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

          {/* AI-USAGE-1: AI Usage Summary Chip */}
          {!aiUsageLoading && aiUsageSummary && (aiUsageSummary.previewRuns > 0 || aiUsageSummary.draftGenerateRuns > 0) && (
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-sm">
              <p className="text-xs font-semibold text-purple-900">
                AI usage this month
              </p>
              <p className="mt-1 text-xs text-purple-700">
                Previews and drafts generated: {aiUsageSummary.previewRuns + aiUsageSummary.draftGenerateRuns}
              </p>
              {/* CACHE/REUSE v2: Show AI runs avoided */}
              {aiUsageSummary.aiRunsAvoided > 0 && (
                <p className="mt-0.5 text-xs text-green-700">
                  AI runs avoided (reused): {aiUsageSummary.aiRunsAvoided}
                </p>
              )}
              {aiUsageSummary.totalAiRuns > 0 && (
                <p className="mt-0.5 text-xs text-purple-600">
                  Apply uses saved drafts only — no new AI runs.
                </p>
              )}
            </div>
          )}

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
                    disabled={loadingPreview || planIsFree || !canGenerateDrafts}
                    title={!canGenerateDrafts ? 'Viewer role cannot generate previews' : undefined}
                    className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                      hasPreview
                        ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        : 'border border-transparent bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {loadingPreview ? 'Generating preview…' : 'Generate preview (uses AI)'}
                  </button>
                </div>
                {resumedFromSession && hasPreview && (
                  <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-blue-900">
                          Saved preview found
                        </p>
                        <p className="mt-1">
                          {previewStale
                            ? 'Your rules changed after this preview. Regenerate to see updated suggestions.'
                            : !estimatePresent
                              ? 'You can continue by recalculating the estimate.'
                              : 'This preview is still valid for the current rules and product set.'}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-shrink-0 flex-wrap gap-2">
                        {previewStale && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedPlaybookId) return;
                              const ok = await loadPreview(selectedPlaybookId);
                              if (ok) {
                                setFlowState('PREVIEW_GENERATED');
                              }
                            }}
                            disabled={loadingPreview}
                            className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Regenerate preview (uses AI)
                          </button>
                        )}
                        {!previewStale && !estimatePresent && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedPlaybookId) return;
                              loadEstimate(selectedPlaybookId).catch(() => {
                                // handled via state
                              });
                            }}
                            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                          >
                            Recalculate estimate
                          </button>
                        )}
                        {!previewStale &&
                          estimatePresent &&
                          canContinueToEstimate && (
                            <button
                              type="button"
                              onClick={handleNextStep}
                              className="inline-flex items-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                            >
                              Continue
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900">
                        Playbook rules
                      </h3>
                      <p className="mt-1 text-[11px] text-gray-600">
                        Rules shape the AI drafts you preview and apply. Rules do not
                        change Shopify until you Apply.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-600">
                        Use rules for this run
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRules((previous) => ({
                            ...previous,
                            enabled: !previous.enabled,
                          }))
                        }
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          rules.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        aria-pressed={rules.enabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            rules.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700">
                        Find
                      </label>
                      <input
                        type="text"
                        value={rules.find}
                        onChange={(event) => {
                          handleRulesChange({ find: event.target.value });
                          markRulesEdited();
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. AI"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700">
                        Replace
                      </label>
                      <input
                        type="text"
                        value={rules.replace}
                        onChange={(event) => {
                          handleRulesChange({ replace: event.target.value });
                          markRulesEdited();
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. EngineO"
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700">
                        Prefix
                      </label>
                      <input
                        type="text"
                        value={rules.prefix}
                        onChange={(event) => {
                          handleRulesChange({ prefix: event.target.value });
                          markRulesEdited();
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. EngineO | "
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700">
                        Suffix
                      </label>
                      <input
                        type="text"
                        value={rules.suffix}
                        onChange={(event) => {
                          handleRulesChange({ suffix: event.target.value });
                          markRulesEdited();
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. | Official Store"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700">
                        Max length
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={rules.maxLength ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          handleRulesChange({
                            maxLength: value ? Number(value) : undefined,
                          });
                          markRulesEdited();
                        }}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. 60"
                      />
                      <p className="mt-1 text-[11px] text-gray-500">
                        Enforced by trimming the AI suggestion to this many characters.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[11px] font-medium text-gray-700">
                      Forbidden phrases (one per line)
                    </label>
                    <textarea
                      value={rules.forbiddenPhrasesText}
                      onChange={(event) => {
                        handleRulesChange({
                          forbiddenPhrasesText: event.target.value,
                        });
                        markRulesEdited();
                      }}
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={'e.g.\nclick here\nbest ever'}
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Forbidden phrases are highlighted in preview but not removed in v1.
                    </p>
                  </div>
                </div>
                <div className="mb-3 text-xs text-gray-500">
                  Total affected products:{' '}
                  <span className="font-semibold text-gray-900">
                    {totalAffectedProducts}
                  </span>
                </div>
                {planIsFree && (
                  <p className="mb-3 text-xs text-amber-700">
                    Bulk Playbooks are gated on the Free plan. Upgrade to
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
                      {previewValidityLabel && (
                        <span
                          className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${previewValidityClass}`}
                        >
                          {previewValidityLabel}
                        </span>
                      )}
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
                          {(() => {
                            // [TRUST-ROUTING-1] Build preview context URL for product deep link
                            const returnToPath = `/projects/${projectId}/automation/playbooks?playbookId=${selectedPlaybookId}${currentAssetType !== 'PRODUCTS' ? `&assetType=${currentAssetType}` : ''}${currentScopeAssetRefs.length > 0 ? `&scopeAssetRefs=${encodeURIComponent(currentScopeAssetRefs.join(','))}` : ''}`;
                            const previewContextUrl = `/projects/${projectId}/products/${sample.productId}?from=playbook_preview&playbookId=${selectedPlaybookId}&returnTo=${encodeURIComponent(returnToPath)}`;
                            return (
                              <Link
                                href={previewContextUrl}
                                onClick={(event) => {
                                  event.preventDefault();
                                  handleNavigate(previewContextUrl);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Open product →
                              </Link>
                            );
                          })()}
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
                        {sample.ruleWarnings && sample.ruleWarnings.length > 0 && (
                          <p className="mt-2 text-[11px] text-amber-700">
                            Rules applied:{' '}
                            {sample.ruleWarnings
                              .map((warning) =>
                                warning === 'trimmed_to_max_length'
                                  ? 'Trimmed to max length'
                                  : warning === 'forbidden_phrase_detected'
                                    ? 'Forbidden phrase detected'
                                    : warning,
                              )
                              .join(', ')}
                            .
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {hasPreview && showContinueBlockedPanel && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <p className="font-medium">Why you can&apos;t continue yet</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {continueBlockers.includes('preview_stale') && (
                        <li>
                          Rules changed since this preview. Regenerate preview to
                          continue safely.
                        </li>
                      )}
                      {continueBlockers.includes('plan_not_eligible') && (
                        <li>
                          Your current plan doesn&apos;t support Playbooks
                          for bulk fixes.
                        </li>
                      )}
                      {continueBlockers.includes('estimate_not_eligible') && (
                        <li>
                          {estimateBlockingReasons.includes('ai_daily_limit_reached')
                            ? 'Daily AI limit reached for product optimization. Try again tomorrow or upgrade your plan.'
                            : estimateBlockingReasons.includes(
                                  'token_cap_would_be_exceeded',
                                )
                              ? 'Estimated token usage would exceed your remaining capacity for today. Reduce scope or try again tomorrow.'
                              : estimateBlockingReasons.includes(
                                    'no_affected_products',
                                  )
                                ? "No products currently match this playbook's criteria."
                                : estimateBlockingReasons.includes('plan_not_eligible')
                                  ? 'This playbook requires a Pro or Business plan. Upgrade to unlock bulk automations.'
                                  : 'This playbook cannot run with the current estimate. Adjust your setup to continue.'}
                        </li>
                      )}
                      {continueBlockers.includes('estimate_missing') && (
                        <li>
                          Estimate needed to continue. Recalculate estimate from your
                          current preview.
                        </li>
                      )}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {continueBlockers.includes('preview_stale') && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedPlaybookId) return;
                            const ok = await loadPreview(selectedPlaybookId);
                            if (ok) {
                              setFlowState('PREVIEW_GENERATED');
                            }
                          }}
                          disabled={loadingPreview}
                          className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Regenerate preview (uses AI)
                        </button>
                      )}
                      {!planEligible && (
                        <button
                          type="button"
                          onClick={() => handleNavigate('/settings/billing')}
                          className="inline-flex items-center rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                        >
                          View plans
                        </button>
                      )}
                      {continueBlockers.includes('estimate_missing') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedPlaybookId) return;
                            loadEstimate(selectedPlaybookId).catch(() => {
                              // handled via state
                            });
                          }}
                          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                        >
                          Recalculate estimate
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  {hasPreview && (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={!canContinueToEstimate}
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
                <p className="mt-2 text-xs text-gray-500">{rulesSummaryLabel}</p>
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
            {rules.enabled && (
              <p className="mb-3 text-xs text-gray-600">
                These drafts were generated using your Playbook rules.
              </p>
            )}
            {rules.enabled &&
              previewSamples.some(
                (sample) => sample.ruleWarnings && sample.ruleWarnings.length > 0,
              ) && (
                <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  Some suggestions were trimmed or flagged to fit your rules. Review
                  the preview before applying.
                </div>
              )}
            {/* Inline error panels for 409 Conflict errors */}
            {applyInlineError?.code === 'PLAYBOOK_RULES_CHANGED' && (
              <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
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
                    <p className="font-semibold">Rules changed since preview</p>
                    <p className="mt-0.5">
                      Your playbook rules have changed since the preview was generated.
                      Regenerate the preview to see updated suggestions before applying.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setApplyInlineError(null);
                        if (!selectedPlaybookId) return;
                        const ok = await loadPreview(selectedPlaybookId);
                        if (ok) {
                          setFlowState('PREVIEW_GENERATED');
                        }
                      }}
                      disabled={loadingPreview}
                      className="mt-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Regenerate preview (uses AI)
                    </button>
                  </div>
                </div>
              </div>
            )}
            {applyInlineError?.code === 'PLAYBOOK_SCOPE_INVALID' && (
              <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
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
                    <p className="font-semibold">Product scope changed</p>
                    <p className="mt-0.5">
                      The set of affected products has changed since the preview was generated
                      (products may have been added, removed, or updated). Regenerate the preview
                      to work with the current product set.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setApplyInlineError(null);
                        if (!selectedPlaybookId) return;
                        const ok = await loadPreview(selectedPlaybookId);
                        if (ok) {
                          setFlowState('PREVIEW_GENERATED');
                        }
                      }}
                      disabled={loadingPreview}
                      className="mt-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Regenerate preview (uses AI)
                    </button>
                  </div>
                </div>
              </div>
            )}
            {applyInlineError?.code === 'PLAYBOOK_DRAFT_NOT_FOUND' && (
              <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
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
                    <p className="font-semibold">Draft not found</p>
                    <p className="mt-0.5">
                      No draft was found for this playbook configuration. Generate a preview
                      first to create a draft before applying.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setApplyInlineError(null);
                        if (!selectedPlaybookId) return;
                        const ok = await loadPreview(selectedPlaybookId);
                        if (ok) {
                          setFlowState('PREVIEW_GENERATED');
                        }
                      }}
                      disabled={loadingPreview || !canGenerateDrafts}
                      title={!canGenerateDrafts ? 'Viewer role cannot generate previews' : undefined}
                      className="mt-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Generate preview (uses AI)
                    </button>
                  </div>
                </div>
              </div>
            )}
            {applyInlineError?.code === 'PLAYBOOK_DRAFT_EXPIRED' && (
              <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
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
                    <p className="font-semibold">Draft expired</p>
                    <p className="mt-0.5">
                      The draft for this playbook has expired. Regenerate the preview to create
                      a fresh draft before applying.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setApplyInlineError(null);
                        if (!selectedPlaybookId) return;
                        const ok = await loadPreview(selectedPlaybookId);
                        if (ok) {
                          setFlowState('PREVIEW_GENERATED');
                        }
                      }}
                      disabled={loadingPreview}
                      className="mt-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Regenerate preview (uses AI)
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            {/* Trust contract note */}
            <p className="mb-3 text-[11px] text-gray-500">
              EngineO.ai validates that your rules and product scope haven&apos;t changed since
              the preview. If they have, you&apos;ll be asked to regenerate the preview before
              applying.
            </p>
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
                {/* Skipped products warning */}
                {applyResult.skippedCount > 0 && !applyResult.stopped && (
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
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="font-semibold">
                          {applyResult.skippedCount} product(s) skipped
                        </p>
                        <p className="mt-0.5">
                          Some products were skipped because they already had valid SEO{' '}
                          {selectedDefinition?.field === 'seoTitle'
                            ? 'titles'
                            : 'descriptions'}{' '}
                          or encountered validation issues. View per-product results below for
                          details.
                        </p>
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
                                    (() => {
                                      // [TRUST-ROUTING-1] Build results context URL for product deep link
                                      const returnToPath = `/projects/${projectId}/automation/playbooks?playbookId=${selectedPlaybookId}${currentAssetType !== 'PRODUCTS' ? `&assetType=${currentAssetType}` : ''}${currentScopeAssetRefs.length > 0 ? `&scopeAssetRefs=${encodeURIComponent(currentScopeAssetRefs.join(','))}` : ''}`;
                                      const resultsContextUrl = `/projects/${projectId}/products/${item.productId}?from=playbook_results&playbookId=${selectedPlaybookId}&returnTo=${encodeURIComponent(returnToPath)}`;
                                      return (
                                        <Link
                                          href={resultsContextUrl}
                                          onClick={(event) => {
                                            event.preventDefault();
                                            handleNavigate(resultsContextUrl);
                                          }}
                                          className="text-blue-600 hover:text-blue-800"
                                        >
                                          {product?.title || item.productId}
                                        </Link>
                                      );
                                    })()
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
                        handleNavigate(`/projects/${projectId}/automation/playbooks`)
                      }
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      Return to Playbooks
                    </button>
                  </>
                )}
              </div>
              {flowState !== 'APPLY_COMPLETED' && flowState !== 'APPLY_STOPPED' && (
                <>
                  {/* [ROLES-3 FIXUP-3 CORRECTION] All notices derived from server state (pendingApproval) */}
                  {(() => {
                    // Derive approval state from server-sourced pendingApproval
                    const approvalStatus = pendingApproval?.status;
                    const approvalConsumed = pendingApproval?.consumed ?? false;
                    const hasPendingApproval = approvalStatus === 'PENDING_APPROVAL';
                    const hasApprovedApproval = approvalStatus === 'APPROVED' && !approvalConsumed;
                    const needsNewRequest = !pendingApproval || approvalStatus === 'REJECTED' || approvalConsumed;

                    // VIEWER notice
                    if (!roleCapabilities.canRequestApproval && !roleCapabilities.canApply) {
                      return (
                        <p className="mr-4 text-xs text-gray-500">
                          Viewer role cannot apply. Preview and export remain available.
                        </p>
                      );
                    }

                    // EDITOR notices (can request but not apply)
                    if (roleCapabilities.canRequestApproval && !roleCapabilities.canApply) {
                      if (!approvalRequired) {
                        return (
                          <p className="mr-4 text-xs text-gray-500">
                            Editor role cannot apply. An owner must apply this playbook.
                          </p>
                        );
                      }
                      if (hasPendingApproval) {
                        return (
                          <p className="mr-4 text-xs text-amber-600">
                            Approval pending. Waiting for owner to approve.
                          </p>
                        );
                      }
                      if (hasApprovedApproval) {
                        return (
                          <p className="mr-4 text-xs text-green-600">
                            Approved — an owner must apply this playbook.
                          </p>
                        );
                      }
                      return (
                        <p className="mr-4 text-xs text-amber-600">
                          Approval required. Click to request owner approval.
                        </p>
                      );
                    }

                    // OWNER notices
                    if (roleCapabilities.canApply && approvalRequired) {
                      if (hasPendingApproval) {
                        return (
                          <p className="mr-4 text-xs text-amber-600">
                            Pending approval from Editor. Click to approve and apply.
                          </p>
                        );
                      }
                      if (hasApprovedApproval) {
                        return (
                          <p className="mr-4 text-xs text-green-600">
                            Approval granted. Ready to apply.
                          </p>
                        );
                      }
                      if (isMultiUserProject && needsNewRequest) {
                        return (
                          <p className="mr-4 text-xs text-amber-600">
                            An Editor must request approval first.
                          </p>
                        );
                      }
                      return (
                        <p className="mr-4 text-xs text-amber-600">
                          Approval required before apply.
                        </p>
                      );
                    }

                    return null;
                  })()}
                  {/* [ROLES-3 PENDING-1] Approval Attribution Panel */}
                  {pendingApproval && approvalRequired && (
                    <div className="mr-4 flex flex-col gap-0.5 text-xs text-gray-500">
                      <span>
                        Requested by {getUserDisplayName(pendingApproval.requestedByUserId)}{' '}
                        on {new Date(pendingApproval.requestedAt).toLocaleDateString()}
                      </span>
                      {pendingApproval.decidedByUserId && pendingApproval.decidedAt && (
                        <span>
                          {pendingApproval.status === 'APPROVED' ? 'Approved' : 'Decided'} by{' '}
                          {getUserDisplayName(pendingApproval.decidedByUserId)} on{' '}
                          {new Date(pendingApproval.decidedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleApplyPlaybook}
                    disabled={(() => {
                      // Base conditions
                      if (flowState !== 'APPLY_READY' || applying || !estimate || !estimate.canProceed || !confirmApply || approvalLoading) {
                        return true;
                      }
                      // VIEWER blocked
                      if (!roleCapabilities.canRequestApproval && !roleCapabilities.canApply) {
                        return true;
                      }
                      // EDITOR: blocked if approval already pending or approved (they can only request once)
                      if (roleCapabilities.canRequestApproval && !roleCapabilities.canApply) {
                        const status = pendingApproval?.status;
                        if (status === 'PENDING_APPROVAL' || (status === 'APPROVED' && !pendingApproval?.consumed)) {
                          return true;
                        }
                      }
                      // OWNER in multi-user project with approval required but no pending request
                      if (roleCapabilities.canApply && approvalRequired && isMultiUserProject) {
                        const hasActionableApproval = pendingApproval &&
                          (pendingApproval.status === 'PENDING_APPROVAL' || (pendingApproval.status === 'APPROVED' && !pendingApproval.consumed));
                        if (!hasActionableApproval) {
                          return true;
                        }
                      }
                      return false;
                    })()}
                    className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {(() => {
                      if (applying || approvalLoading) return 'Processing…';

                      // EDITOR button text
                      if (roleCapabilities.canRequestApproval && !roleCapabilities.canApply) {
                        const status = pendingApproval?.status;
                        if (status === 'PENDING_APPROVAL') return 'Pending approval';
                        if (status === 'APPROVED' && !pendingApproval?.consumed) return 'Approved — Owner applies';
                        return 'Request approval';
                      }

                      // OWNER button text
                      if (roleCapabilities.canApply) {
                        if (!approvalRequired) return 'Apply playbook';
                        const status = pendingApproval?.status;
                        if (status === 'PENDING_APPROVAL') return 'Approve and apply';
                        if (status === 'APPROVED' && !pendingApproval?.consumed) return 'Apply playbook';
                        if (isMultiUserProject) return 'Waiting for Editor request';
                        return 'Approve and apply';
                      }

                      return 'Apply playbook';
                    })()}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
