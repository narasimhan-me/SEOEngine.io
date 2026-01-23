'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useParams,
  useRouter,
  usePathname,
  useSearchParams,
} from 'next/navigation';
import Link from 'next/link';

import {
  DataTable,
  type DataTableColumn,
} from '@/components/tables/DataTable';
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
import { ScopeBanner } from '@/components/common/ScopeBanner';
import { getSafeReturnTo } from '@/lib/route-context';
// [SCOPE-CLARITY-1] Import scope normalization utilities
import {
  normalizeScopeParams,
  buildClearFiltersHref,
} from '@/lib/scope-normalization';
import type {
  AutomationPlaybookApplyResult,
  ProjectAiUsageSummary,
  AiUsageQuotaEvaluation,
  EffectiveProjectRole,
  GovernancePolicyResponse,
  ApprovalRequestResponse,
  ProjectMember,
  AutomationAssetType,
  AssetScopedDraftsResponse,
} from '@/lib/api';
import {
  buildAssetIssuesHref,
  type AssetListType,
} from '@/lib/list-actions-clarity';
import type { Product } from '@/lib/products';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
// [DRAFT-AI-ENTRYPOINT-CLARITY-1] AI boundary note for human-only review and AI generation surfaces
import { DraftAiBoundaryNote } from '@/components/common/DraftAiBoundaryNote';
// [PLAYBOOKS-SHELL-REMOUNT-1] RCP integration for playbook details panel
import { useRightContextPanel, type ContextDescriptor } from '@/components/right-context-panel/RightContextPanelProvider';
// [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Centralized routing helper
// [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5] Added buildPlaybookScopePayload
// [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Added getRoutingScopeFromPayload
import {
  buildPlaybookRunHref,
  buildPlaybookRunHrefOrNull,
  buildPlaybookScopePayload,
  getRoutingScopeFromPayload,
  isValidPlaybookId,
  type PlaybookSource,
  type PlaybookScopePayload,
} from '@/lib/playbooks-routing';

type PlaybookId = 'missing_seo_title' | 'missing_seo_description';

interface PlaybookDefinition {
  id: PlaybookId;
  name: string;
  description: string;
  field: 'seoTitle' | 'seoDescription';
}

/**
 * [PLAYBOOK-STEP-CONTINUITY-1] Draft status values returned by the server.
 * Used to determine Apply readiness / blocker evaluation in Step 2.
 */
type PlaybookDraftStatus = 'READY' | 'PARTIAL' | 'FAILED' | 'EXPIRED';

/**
 * [PLAYBOOK-STEP-CONTINUITY-1] Draft counts returned by the server.
 */
interface PlaybookDraftCounts {
  affectedTotal: number;
  draftGenerated: number;
  noSuggestionCount: number;
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
  /**
   * [PLAYBOOK-STEP-CONTINUITY-1] Status of the latest draft for this scope/rules combination.
   * Used to determine Apply readiness in Step 2.
   */
  draftStatus?: PlaybookDraftStatus;
  /**
   * [PLAYBOOK-STEP-CONTINUITY-1] Aggregated counts for the latest draft.
   */
  draftCounts?: PlaybookDraftCounts;
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
  | 'NO_RUN_WITH_ISSUES' // Has issues but hasn't run any playbook yet
  | 'DESCRIPTIONS_DONE_TITLES_REMAIN' // Ran descriptions playbook, titles still need work
  | 'TITLES_DONE_DESCRIPTIONS_REMAIN' // Ran titles playbook, descriptions still need work
  | 'ALL_DONE' // Both playbooks have 0 affected products
  | null; // No banner to show

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
function getAssetTypeLabel(assetType: AutomationAssetType): {
  singular: string;
  plural: string;
} {
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
  // [PLAYBOOKS-SHELL-REMOUNT-1] RCP integration
  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-3] Extended destructure for descriptor hydration
  const {
    openPanel,
    isOpen: rcpIsOpen,
    descriptor: rcpDescriptor,
  } = useRightContextPanel();

  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Deep-link support: read playbookId from path param or query param
  // Path param is preferred (canonical route: /playbooks/:playbookId)
  const pathPlaybookId = params.playbookId as string | undefined;
  const queryPlaybookId = searchParams.get('playbookId') as PlaybookId | null;
  const urlPlaybookId = (pathPlaybookId ||
    queryPlaybookId) as PlaybookId | null;
  const validUrlPlaybookId = isValidPlaybookId(urlPlaybookId)
    ? urlPlaybookId
    : null;

  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Read step and source from URL
  // NOTE: urlSource must be defined before showNextDeoWinBanner to avoid TDZ
  const urlSource = (searchParams.get('source') || 'default') as PlaybookSource;

  // Next DEO Win banner visibility (must come after urlSource)
  const showNextDeoWinBanner = urlSource === 'next_deo_win';
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [cnabDismissed, setCnabDismissed] = useState(false);

  // [DRAFT-ROUTING-INTEGRITY-1] Draft Review mode: mode=drafts activates asset-scoped draft review
  const urlMode = searchParams.get('mode');
  const isDraftReviewMode = urlMode === 'drafts';
  const draftReviewAssetId = searchParams.get('assetId') || null;

  // [ASSETS-PAGES-1.1] Deep-link support: read assetType from URL query params
  // [DRAFT-ROUTING-INTEGRITY-1] Draft Review uses lowercase assetType (products|pages|collections)
  const urlAssetType = searchParams.get('assetType') as
    | AutomationAssetType
    | string
    | null;
  const validUrlAssetType = (() => {
    // Handle Draft Review mode lowercase values
    if (urlAssetType === 'products') return 'PRODUCTS';
    if (urlAssetType === 'pages') return 'PAGES';
    if (urlAssetType === 'collections') return 'COLLECTIONS';
    // Handle standard uppercase values
    if (
      urlAssetType === 'PRODUCTS' ||
      urlAssetType === 'PAGES' ||
      urlAssetType === 'COLLECTIONS'
    ) {
      return urlAssetType;
    }
    return 'PRODUCTS'; // Default to PRODUCTS
  })();

  // [ASSETS-PAGES-1.1-UI-HARDEN] Deep-link support: read scopeAssetRefs from URL (repeated query params and/or comma-separated)
  const parsedScopeAssetRefs = useMemo(() => {
    const rawValues = searchParams.getAll('scopeAssetRefs');
    if (!rawValues || rawValues.length === 0) return [];
    return rawValues
      .flatMap((value) => value.split(','))
      .map((ref) => ref.trim())
      .filter((ref) => ref.length > 0);
  }, [searchParams]);

  // [ASSETS-PAGES-1.1-UI-HARDEN] Deterministic safety check: PAGES/COLLECTIONS require scopeAssetRefs
  const isMissingScopeForPagesCollections =
    (validUrlAssetType === 'PAGES' || validUrlAssetType === 'COLLECTIONS') &&
    parsedScopeAssetRefs.length === 0;

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

  // [ROUTE-INTEGRITY-1] Derive showingText for ScopeBanner
  const scopeBannerShowingText = useMemo(() => {
    const parts: string[] = [];
    if (validUrlPlaybookId) {
      const playbook = PLAYBOOKS.find((p) => p.id === validUrlPlaybookId);
      parts.push(playbook?.name || validUrlPlaybookId);
    }
    if (validUrlAssetType && validUrlAssetType !== 'PRODUCTS') {
      const labels = getAssetTypeLabel(validUrlAssetType);
      parts.push(`Asset type: ${labels.plural}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Playbooks';
  }, [validUrlPlaybookId, validUrlAssetType]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [issues, setIssues] = useState<DeoIssue[]>([]);
  // [PLAYBOOKS-SHELL-REMOUNT-1] Selection is now in-page state (no navigation on selection).
  // URL params still used for step/source routing but playbook selection is local state.
  const [selectedPlaybookId, setSelectedPlaybookId] =
    useState<PlaybookId | null>(validUrlPlaybookId);
  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Track eligibility counts for default selection + banner visibility
  const [titlesEligibleCount, setTitlesEligibleCount] = useState<number | null>(
    null
  );
  const [descriptionsEligibleCount, setDescriptionsEligibleCount] = useState<
    number | null
  >(null);
  // [ASSETS-PAGES-1.1] Track current asset type from URL deep link (read-only from URL params)
  const [currentAssetType] = useState<AutomationAssetType>(validUrlAssetType);
  // [ASSETS-PAGES-1.1-UI-HARDEN] Track scope asset refs from URL deep link (read-only)
  const [currentScopeAssetRefs] = useState<string[]>(parsedScopeAssetRefs);

  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Explicit scope payload for API calls + routing
  // This payload includes scopeProductIds for API calls (when PRODUCTS scope)
  const playbookScopePayload: PlaybookScopePayload = useMemo(
    () => buildPlaybookScopePayload(currentAssetType, currentScopeAssetRefs),
    [currentAssetType, currentScopeAssetRefs]
  );

  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Routing-only subset (excludes scopeProductIds)
  const playbookRunScopeForUrl = useMemo(
    () => getRoutingScopeFromPayload(playbookScopePayload),
    [playbookScopePayload]
  );

  const [flowState, setFlowState] =
    useState<PlaybookFlowState>('PREVIEW_READY');
  const [previewSamples, setPreviewSamples] = useState<PreviewSample[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [estimate, setEstimate] = useState<PlaybookEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] =
    useState<AutomationPlaybookApplyResult | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);

  const [rules, setRules] = useState<PlaybookRulesV1>(() => ({
    ...DEFAULT_RULES,
  }));
  const [rulesVersion, setRulesVersion] = useState(0);
  const [previewRulesVersion, setPreviewRulesVersion] = useState<number | null>(
    null
  );
  const [applyInlineError, setApplyInlineError] =
    useState<ApplyInlineError | null>(null);

  const [resumedFromSession, setResumedFromSession] = useState(false);

  // AI-USAGE-1: AI Usage Summary state
  const [aiUsageSummary, setAiUsageSummary] =
    useState<ProjectAiUsageSummary | null>(null);
  const [aiUsageLoading, setAiUsageLoading] = useState(false);

  // AI-USAGE v2: Plan-aware quota evaluation state (used for predictive UX guard).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_aiQuotaEvaluation, setAiQuotaEvaluation] =
    useState<AiUsageQuotaEvaluation | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_aiQuotaLoading, setAiQuotaLoading] = useState(false);

  // [ROLES-2] Role and approval state for governance gating
  const [effectiveRole, setEffectiveRole] =
    useState<EffectiveProjectRole>('OWNER');
  const [governancePolicy, setGovernancePolicy] =
    useState<GovernancePolicyResponse | null>(null);
  const [pendingApproval, setPendingApproval] =
    useState<ApprovalRequestResponse | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  // [ROLES-3 FIXUP-3 CORRECTION] Track if project has multiple members (affects approval UI)
  const [isMultiUserProject, setIsMultiUserProject] = useState(false);
  // [ROLES-3 PENDING-1] Members list for approval attribution UI
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Pre-computed flag for CTA label truthfulness
  const [
    willGenerateAnswerBlocksOnProductSync,
    setWillGenerateAnswerBlocksOnProductSync,
  ] = useState(false);

  // [DRAFT-ROUTING-INTEGRITY-1] Draft Review mode state
  const [draftReviewLoading, setDraftReviewLoading] = useState(false);
  const [draftReviewData, setDraftReviewData] =
    useState<AssetScopedDraftsResponse | null>(null);
  const [draftReviewError, setDraftReviewError] = useState<string | null>(null);

  // [DRAFT-EDIT-INTEGRITY-1] Inline edit state for Draft Review mode
  // Key format: `${draftId}-${itemIndex}` -> editing state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // [DRAFT-DIFF-CLARITY-1] Current/live field values for diff display in Draft Review mode
  const [draftReviewCurrentFields, setDraftReviewCurrentFields] = useState<{
    seoTitle?: string | null;
    seoDescription?: string | null;
  } | null>(null);

  // [PLAYBOOKS-SHELL-REMOUNT-1] Deep-link compatibility: sync selectedPlaybookId from panel params
  // When URL includes panel=details&entityType=playbook&entityId=<playbookId>, select that playbook
  useEffect(() => {
    const panelType = searchParams.get('panel');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    if (panelType === 'details' && entityType === 'playbook' && entityId) {
      if (isValidPlaybookId(entityId) && entityId !== selectedPlaybookId) {
        setSelectedPlaybookId(entityId as PlaybookId);
      }
    }
  }, [searchParams, selectedPlaybookId]);

  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-3] Hydrate RCP descriptor with playbook name
  // Only runs when panel is open with matching playbook; does NOT reopen if dismissed
  useEffect(() => {
    if (
      !rcpIsOpen ||
      rcpDescriptor?.kind !== 'playbook' ||
      !rcpDescriptor.id
    ) {
      return;
    }
    // Find the matching playbook definition
    const matchingPlaybook = PLAYBOOKS.find((pb) => pb.id === rcpDescriptor.id);
    if (!matchingPlaybook) {
      return;
    }
    // Check if title differs
    if (rcpDescriptor.title === matchingPlaybook.name) {
      return;
    }
    // Enrich descriptor with display title (in-place update, no close/reopen)
    openPanel({
      kind: 'playbook',
      id: matchingPlaybook.id,
      title: matchingPlaybook.name,
      scopeProjectId: projectId,
    });
  }, [rcpIsOpen, rcpDescriptor, projectId, openPanel]);

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

      // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Fetch integration status for CTA label truthfulness
      try {
        const integrationStatus =
          await projectsApi.integrationStatus(projectId);
        setWillGenerateAnswerBlocksOnProductSync(
          (integrationStatus as any).willGenerateAnswerBlocksOnProductSync ??
            false
        );
      } catch {
        // Silent fail - default to false (no Answer Block generation)
        setWillGenerateAnswerBlocksOnProductSync(false);
      }
    } catch (err: unknown) {
      console.error('Error loading automation playbooks data:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load automation playbooks data'
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

  // [DRAFT-ROUTING-INTEGRITY-1] Fetch asset-scoped drafts when in Draft Review mode
  // [DRAFT-DIFF-CLARITY-1] Also fetch current/live values for diff display
  useEffect(() => {
    if (!isDraftReviewMode || !draftReviewAssetId) {
      setDraftReviewData(null);
      setDraftReviewError(null);
      setDraftReviewCurrentFields(null);
      return;
    }

    const fetchDraftReviewData = async () => {
      setDraftReviewLoading(true);
      setDraftReviewError(null);
      try {
        // Convert uppercase to lowercase for API
        const assetTypeLower = validUrlAssetType.toLowerCase() as
          | 'products'
          | 'pages'
          | 'collections';

        // [DRAFT-DIFF-CLARITY-1] Fetch drafts and current/live values in parallel
        const [draftData, currentFields] = await Promise.all([
          projectsApi.listAutomationPlaybookDraftsForAsset(projectId, {
            assetType: assetTypeLower,
            assetId: draftReviewAssetId,
          }),
          // Fetch current/live field values based on asset type
          (async () => {
            try {
              if (assetTypeLower === 'products') {
                // Use existing products list and find by ID
                const productsList = await productsApi.list(projectId);
                const product = productsList.find(
                  (p: any) => p.id === draftReviewAssetId
                );
                return product
                  ? {
                      seoTitle: product.seoTitle,
                      seoDescription: product.seoDescription,
                    }
                  : null;
              } else if (assetTypeLower === 'pages') {
                // Fetch pages (static) and find by ID
                const pages = await projectsApi.crawlPages(projectId, {
                  pageType: 'static',
                });
                const page = pages.find(
                  (p: any) => p.id === draftReviewAssetId
                );
                return page
                  ? {
                      seoTitle: page.title,
                      seoDescription: page.metaDescription,
                    }
                  : null;
              } else if (assetTypeLower === 'collections') {
                // Fetch collections and find by ID
                const collections = await projectsApi.crawlPages(projectId, {
                  pageType: 'collection',
                });
                const collection = collections.find(
                  (c: any) => c.id === draftReviewAssetId
                );
                return collection
                  ? {
                      seoTitle: collection.title,
                      seoDescription: collection.metaDescription,
                    }
                  : null;
              }
              return null;
            } catch {
              // Silent fail - diff display will show empty current values
              return null;
            }
          })(),
        ]);

        setDraftReviewData(draftData);
        setDraftReviewCurrentFields(currentFields);
      } catch (err) {
        console.error(
          '[DRAFT-ROUTING-INTEGRITY-1] Failed to fetch draft review data:',
          err
        );
        setDraftReviewError(
          err instanceof Error ? err.message : 'Failed to load drafts'
        );
      } finally {
        setDraftReviewLoading(false);
      }
    };

    fetchDraftReviewData();
  }, [isDraftReviewMode, draftReviewAssetId, validUrlAssetType, projectId]);

  // [DRAFT-EDIT-INTEGRITY-1] Handlers for inline edit mode in Draft Review
  const handleStartEdit = useCallback(
    (draftId: string, itemIndex: number, currentValue: string) => {
      const editKey = `${draftId}-${itemIndex}`;
      setEditingItem(editKey);
      setEditValue(currentValue);
      setEditError(null);
    },
    []
  );

  const handleCancelEdit = useCallback(() => {
    setEditingItem(null);
    setEditValue('');
    setEditError(null);
  }, []);

  // [DRAFT-DIFF-CLARITY-1] Updated to accept fieldName for empty draft confirmation
  const handleSaveEdit = useCallback(
    async (
      draftId: string,
      itemIndex: number,
      fieldName?: 'seoTitle' | 'seoDescription'
    ) => {
      // [DRAFT-DIFF-CLARITY-1] Empty draft confirmation when clearing a live field
      if (editValue.trim() === '' && fieldName && draftReviewCurrentFields) {
        const currentValue =
          fieldName === 'seoTitle'
            ? draftReviewCurrentFields.seoTitle
            : draftReviewCurrentFields.seoDescription;
        if (currentValue && currentValue.trim() !== '') {
          const confirmed = window.confirm(
            'Saving an empty draft will clear this field when applied.\n\nAre you sure you want to save an empty draft?'
          );
          if (!confirmed) return;
        }
      }

      setEditSaving(true);
      setEditError(null);

      try {
        const response = await projectsApi.updateDraftItem(
          projectId,
          draftId,
          itemIndex,
          editValue
        );

        // Update local state with the server response
        // [DRAFT-ENTRYPOINT-UNIFICATION-1-FIXUP-1] Use item.itemIndex for stable matching
        // (filteredItems is a subset; idx may not equal item.itemIndex)
        setDraftReviewData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            drafts: prev.drafts.map((draft) => {
              if (draft.id !== draftId) return draft;
              return {
                ...draft,
                updatedAt: response.updatedAt,
                filteredItems: draft.filteredItems.map((item, idx) => {
                  // Use item.itemIndex for stable comparison; fall back to idx if absent
                  const itemServerIndex = item.itemIndex ?? idx;
                  if (itemServerIndex !== itemIndex) return item;
                  // Update the finalSuggestion with the edited value
                  return {
                    ...item,
                    finalSuggestion: editValue,
                  };
                }),
              };
            }),
          };
        });

        // Exit edit mode
        setEditingItem(null);
        setEditValue('');
        feedback.showSuccess('Draft saved successfully');
      } catch (err) {
        console.error(
          '[DRAFT-EDIT-INTEGRITY-1] Failed to save draft edit:',
          err
        );
        setEditError(
          err instanceof Error ? err.message : 'Failed to save changes'
        );
      } finally {
        setEditSaving(false);
      }
    },
    [projectId, editValue, feedback, draftReviewCurrentFields]
  );

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
    if (rules.maxLength && rules.maxLength > 0)
      enabledRulesLabels.push('Max length');
    if (rules.forbiddenPhrasesText.trim())
      enabledRulesLabels.push('Forbidden phrases');
  }
  const rulesSummaryLabel =
    enabledRulesLabels.length > 0
      ? `Rules: ${enabledRulesLabels.join(', ')}`
      : 'Rules: None';

  /**
   * CNAB-1: Calculate contextual banner state based on canonical eligibility counts.
   * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] Strict: eligibility counts must be known (not null)
   * to show any CNAB banner. No fallback to issue counts - hide banner if eligibility unknown.
   */
  const cnabState = useMemo((): PlaybooksCnabState => {
    // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] If eligibility counts are unknown, hide CNAB
    // Do not fall back to issue counts - that violates deterministic banner derivation
    if (titlesEligibleCount === null || descriptionsEligibleCount === null) {
      return null;
    }

    const titlesAffected = titlesEligibleCount;
    const descriptionsAffected = descriptionsEligibleCount;

    // All done - no eligible items for either playbook
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

    // Has eligible items but hasn't run any playbook successfully yet
    if (titlesAffected > 0 || descriptionsAffected > 0) {
      // Only show this if we're not in a completed state
      if (flowState !== 'APPLY_COMPLETED' && flowState !== 'APPLY_STOPPED') {
        return 'NO_RUN_WITH_ISSUES';
      }
    }

    return null;
  }, [
    titlesEligibleCount,
    descriptionsEligibleCount,
    selectedPlaybookId,
    applyResult,
    flowState,
  ]);

  /**
   * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] Primary CNAB playbook for NO_RUN_WITH_ISSUES banner.
   * Derived from eligibility counts: max wins; tie → descriptions.
   * Returns null if both counts are 0 (banner should not render).
   */
  const primaryCnabPlaybookId = useMemo((): PlaybookId | null => {
    if (titlesEligibleCount === null || descriptionsEligibleCount === null) {
      return null;
    }
    if (titlesEligibleCount === 0 && descriptionsEligibleCount === 0) {
      return null;
    }
    // Max wins; tie → prefer descriptions
    if (descriptionsEligibleCount >= titlesEligibleCount) {
      return 'missing_seo_description';
    }
    return 'missing_seo_title';
  }, [titlesEligibleCount, descriptionsEligibleCount]);

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
      if (
        !previous.enabled &&
        (patch.find ||
          patch.replace ||
          patch.prefix ||
          patch.suffix ||
          patch.maxLength ||
          patch.forbiddenPhrasesText)
      ) {
        next.enabled = true;
      }
      return next;
    });
    setRulesVersion((previous) => previous + 1);
  };

  const loadEstimate = useCallback(
    async (
      playbookId: PlaybookId,
      assetType?: AutomationAssetType,
      scopeAssetRefs?: string[]
    ) => {
      try {
        setLoadingEstimate(true);
        setError('');
        // [PLAYBOOK-STEP-CONTINUITY-1] Do NOT clear estimate to null while loading.
        // Keep the last known estimate visible so the UI can show stale data during refresh.
        // This prevents the "Continue to Apply" button race condition where estimate === null
        // while loadingEstimate is still true.
        // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Use explicit scope payload (removes positional branching)
        const effectiveAssetType = assetType ?? currentAssetType;
        const effectiveScopeAssetRefs = scopeAssetRefs ?? currentScopeAssetRefs;
        const payload = buildPlaybookScopePayload(
          effectiveAssetType,
          effectiveScopeAssetRefs
        );
        const data = (await projectsApi.automationPlaybookEstimate(
          projectId,
          playbookId,
          payload.scopeProductIds,
          payload.assetType,
          payload.assetType !== 'PRODUCTS' ? payload.scopeAssetRefs : undefined
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
    [projectId, currentAssetType, currentScopeAssetRefs]
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

          if (
            quota.status === 'warning' &&
            quota.currentUsagePercent !== null
          ) {
            // [BILLING-GTM-1] Predict → Warn: Show limit-style toast with Upgrade CTA but allow action.
            const percentRounded = Math.round(quota.currentUsagePercent);
            feedback.showLimit(
              `This will use AI. You're at ${percentRounded}% of your monthly limit. You can still proceed, but consider upgrading for more AI runs.`,
              '/settings/billing'
            );
          }

          if (
            quota.status === 'blocked' &&
            quota.policy.hardEnforcementEnabled
          ) {
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
        // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Use explicit scope payload
        const previewResult = (await projectsApi.previewAutomationPlaybook(
          projectId,
          playbookId,
          rules.enabled ? rules : undefined,
          3, // sampleSize
          playbookScopePayload.scopeProductIds,
          playbookScopePayload.assetType,
          playbookScopePayload.assetType !== 'PRODUCTS'
            ? playbookScopePayload.scopeAssetRefs
            : undefined
        )) as {
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
        const samples: PreviewSample[] = previewResult.samples.map(
          (sample) => ({
            productId: sample.productId,
            productTitle: sample.productTitle,
            currentTitle: sample.currentTitle,
            currentDescription: sample.currentDescription,
            suggestedTitle:
              sample.field === 'seoTitle' ? sample.finalSuggestion : '',
            suggestedDescription:
              sample.field === 'seoDescription' ? sample.finalSuggestion : '',
            ruleWarnings:
              sample.ruleWarnings.length > 0 ? sample.ruleWarnings : undefined,
          })
        );

        setPreviewSamples(samples);

        // [PLAYBOOK-STEP-CONTINUITY-1-FIXUP-1] UNCONDITIONAL estimate refresh after preview generation.
        // This is required so draftStatus/draftCounts are guaranteed to reflect the latest draft,
        // which unblocks Step 2 after Regenerate/Retry CTAs are clicked.
        // The previous conditional check caused the blocker state to persist incorrectly.
        await loadEstimate(playbookId);
        // Update the estimate with scopeId and rulesHash from preview
        setEstimate((prev) =>
          prev && prev.playbookId === playbookId
            ? {
                ...prev,
                scopeId: previewResult.scopeId,
                rulesHash: previewResult.rulesHash,
              }
            : prev
        );

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
    [
      projectId,
      feedback,
      rules,
      rulesVersion,
      estimate,
      loadEstimate,
      currentAssetType,
      currentScopeAssetRefs,
    ]
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
          resourceId
        );
        // Stale-response guard: only update if this effect is still current
        if (!cancelled) {
          setPendingApproval(approval);
        }
      } catch (err) {
        // Silent fail - don't block UI for prefetch errors
        console.error(
          '[ROLES-3 FIXUP-3] Approval status prefetch failed:',
          err
        );
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

  // [PLAYBOOKS-SHELL-REMOUNT-1] Helper to build RCP descriptor for a playbook
  const getPlaybookDescriptor = useCallback(
    (pb: { id: PlaybookId; name: string; description: string; field: string; totalAffected?: number }): ContextDescriptor => {
      const isEligible = planId !== 'free';
      const runnableState = isEligible
        ? (pb.totalAffected ?? 0) > 0
          ? 'Ready'
          : 'Informational'
        : 'Blocked';
      const runnableGuidance = !isEligible
        ? 'This playbook requires a Pro or Business plan.'
        : (pb.totalAffected ?? 0) === 0
          ? 'No applicable items found for this playbook.'
          : 'This playbook can be run on the applicable items.';

      return {
        kind: 'playbook',
        id: pb.id,
        title: pb.name,
        scopeProjectId: projectId,
        // [PLAYBOOKS-SHELL-REMOUNT-1 FIXUP-2] Canonical playbook run route
        openHref: `/projects/${projectId}/playbooks/${pb.id}?step=preview&source=default`,
        openHrefLabel: 'Open playbook',
        metadata: {
          description: pb.description,
          assetTypes: 'Products',
          scopeSummary: `${pb.totalAffected ?? 0} item${(pb.totalAffected ?? 0) !== 1 ? 's' : ''} affected`,
          preconditions: isEligible
            ? 'Pro or Business plan active'
            : 'Pro or Business plan required',
          runnableState,
          runnableGuidance,
        },
      };
    },
    [planId, projectId]
  );

  const handleSelectPlaybook = (playbookId: PlaybookId) => {
    // [PLAYBOOKS-SHELL-REMOUNT-1] Selection is in-page state only (no navigation).
    // Sets selectedPlaybookId for highlighting and step flow.
    setSelectedPlaybookId(playbookId);
    // Reset flow state for new selection
    setFlowState('PREVIEW_READY');
    setPreviewSamples([]);
    setEstimate(null);
    setApplyResult(null);
    setApplyInlineError(null);
  };

  const handleGeneratePreview = async () => {
    if (!selectedPlaybookId) return;
    const ok = await loadPreview(selectedPlaybookId);
    if (ok) {
      setFlowState('PREVIEW_GENERATED');
    }
  };

  const handleNextStep = () => {
    // [PLAYBOOK-STEP-CONTINUITY-1] Defensive fallback: never return silently.
    // When required data is missing/stale, show an explicit user-visible message.
    if (!estimate) {
      feedback.showError(
        'Estimate data is not available. Please wait for the estimate to load or regenerate the preview.'
      );
      return;
    }
    if (!estimate.canProceed) {
      feedback.showError(
        'Cannot proceed: the playbook is blocked by plan limits or eligibility requirements.'
      );
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
      // [PLAYBOOK-STEP-CONTINUITY-1] Deterministic Step 2 → Step 3 transition guarantee.
      // Always set flowState to APPLY_READY and scroll/focus Step 3 reliably.
      setFlowState('APPLY_READY');
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          const el = document.getElementById('automation-playbook-apply-step');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Focus the section for accessibility
            el.focus({ preventScroll: true });
          }
        });
      }
    }
  };

  const handleApplyPlaybook = useCallback(async () => {
    if (!selectedPlaybookId) return;
    if (!estimate || !estimate.canProceed) return;
    if (!estimate.scopeId || !estimate.rulesHash) {
      // scopeId and rulesHash are required but missing - fetch a fresh estimate
      feedback.showError(
        'Estimate is stale (missing scopeId or rulesHash). Please re-run the preview to refresh.'
      );
      setFlowState('PREVIEW_READY');
      return;
    }
    if (flowState !== 'APPLY_READY') return;

    const capabilities = getRoleCapabilities(effectiveRole);
    const approvalRequiredByPolicy =
      governancePolicy?.requireApprovalForApply ?? false;
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
            resourceId
          );
          setPendingApproval(approval);

          if (
            !approval ||
            approval.status === 'REJECTED' ||
            approval.consumed
          ) {
            // No approval or rejected/consumed - create new request
            const newApproval = await projectsApi.createApprovalRequest(
              projectId,
              {
                resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
                resourceId,
              }
            );
            setPendingApproval(newApproval);
            feedback.showInfo(
              'Approval request submitted. An owner must approve and apply this playbook.'
            );
          } else if (approval.status === 'PENDING_APPROVAL') {
            // Already pending - just inform
            feedback.showInfo(
              'Approval is pending. Waiting for an owner to approve.'
            );
          } else if (approval.status === 'APPROVED') {
            // Approved but EDITOR still cannot apply - inform them
            feedback.showInfo(
              'Approval granted. An owner must apply this playbook.'
            );
          }
        } catch (requestErr) {
          console.error('Error handling approval request:', requestErr);
          feedback.showError(
            'Failed to process approval request. Please try again.'
          );
        } finally {
          setApprovalLoading(false);
        }
      } else {
        // No approval required but EDITOR still cannot apply
        feedback.showError(
          'Editor role cannot apply playbooks. An owner must apply.'
        );
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
            resourceId
          );
          setPendingApproval(approval);

          if (
            approval &&
            approval.status === 'APPROVED' &&
            !approval.consumed
          ) {
            // Use existing valid approval
            approvalIdToUse = approval.id;
          } else if (approval && approval.status === 'PENDING_APPROVAL') {
            // OWNER approves the pending request, then applies
            const approvedRequest = await projectsApi.approveRequest(
              projectId,
              approval.id
            );
            approvalIdToUse = approvedRequest.id;
            setPendingApproval(approvedRequest);
          } else if (isMultiUserProject) {
            // [ROLES-3 FIXUP-3 CORRECTION] Multi-user project: OWNER cannot self-request
            // An EDITOR must request approval first
            setApprovalLoading(false);
            feedback.showError(
              'In multi-user projects, an Editor must request approval first. Add an Editor in Members settings.'
            );
            setFlowState('APPLY_READY');
            setApplying(false);
            return;
          } else {
            // Single-user project: OWNER can create → approve → apply (ROLES-2 convenience)
            const newApproval = await projectsApi.createApprovalRequest(
              projectId,
              {
                resourceType: 'AUTOMATION_PLAYBOOK_APPLY',
                resourceId,
              }
            );
            const approvedRequest = await projectsApi.approveRequest(
              projectId,
              newApproval.id
            );
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

      // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Use explicit scope payload
      const data = await projectsApi.applyAutomationPlaybook(
        projectId,
        selectedPlaybookId,
        estimate.scopeId,
        estimate.rulesHash,
        playbookScopePayload.scopeProductIds,
        approvalIdToUse,
        playbookScopePayload.assetType,
        playbookScopePayload.assetType !== 'PRODUCTS'
          ? playbookScopePayload.scopeAssetRefs
          : undefined
      );
      setApplyResult(data);
      if (data.updatedCount > 0) {
        if (data.stopped && !data.limitReached) {
          feedback.showInfo(
            `Updated ${data.updatedCount} product(s). Playbook stopped early due to an error.`
          );
        } else if (data.limitReached) {
          feedback.showLimit(
            `Updated ${data.updatedCount} product(s). Daily AI limit reached during execution.`,
            '/settings/billing'
          );
        } else {
          feedback.showSuccess(
            `Automation Playbook applied to ${data.updatedCount} product(s).`
          );
        }
      } else if (data.limitReached) {
        feedback.showLimit(
          'Daily AI limit reached before any products could be updated.',
          '/settings/billing'
        );
      } else if (data.stopped) {
        feedback.showError(
          `Playbook stopped due to an error: ${data.failureReason || 'Unknown error'}`
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
        if (
          err.code &&
          inlineErrorCodes.includes(err.code as ApplyInlineErrorCode)
        ) {
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

  // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Renamed from handleSyncProducts for clarity
  const handleSyncProducts = useCallback(async () => {
    try {
      await shopifyApi.syncProducts(projectId);
      // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Neutral toast - no misleading "updated products" or "to Shopify" claims
      feedback.showSuccess('Products sync triggered.');
    } catch (err: unknown) {
      console.error('Error triggering products sync:', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to trigger products sync. Please try again.';
      setError(message);
      feedback.showError(message);
    }
  }, [projectId, feedback]);

  const selectedDefinition = PLAYBOOKS.find(
    (pb) => pb.id === selectedPlaybookId
  );
  const selectedSummary = playbookSummaries.find(
    (s) => s.id === selectedPlaybookId
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
  const getUserDisplayName = useCallback(
    (userId: string): string => {
      const member = projectMembers.find((m) => m.userId === userId);
      if (member) {
        return member.name || member.email;
      }
      // Fallback: show shortened user ID
      return userId.length > 8 ? `${userId.slice(0, 8)}…` : userId;
    },
    [projectMembers]
  );

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
    | 'preview_stale'
    | 'plan_not_eligible'
    | 'estimate_not_eligible'
    | 'estimate_missing'
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
  if (previewPresent && !previewStale && planEligible && !estimatePresent) {
    continueBlockers.push('estimate_missing');
  }

  const showContinueBlockedPanel =
    previewPresent && !canContinueToEstimate && continueBlockers.length > 0;

  // [UI-POLISH-&-CLARITY-1 FIXUP-2] Token-only previewValidityClass
  let previewValidityLabel: string | null = null;
  let previewValidityClass = '';
  if (hasPreview) {
    if (previewStale) {
      previewValidityLabel = 'Rules changed — preview out of date';
      previewValidityClass =
        'border border-border bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]';
    } else if (!estimatePresent) {
      previewValidityLabel = 'Estimate required to continue';
      previewValidityClass =
        'border border-border bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]';
    } else if (planEligible && estimateEligible) {
      previewValidityLabel = 'Preview valid';
      previewValidityClass =
        'border border-border bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]';
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
      const hasValidEstimate =
        parsed.estimate && parsed.estimate.scopeId && parsed.estimate.rulesHash;
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
            : parsed.previewRulesVersion
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

  /**
   * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] Effect 1: Eligibility counts fetch.
   *
   * Runs for all non-draft-mode entrypoints (including /playbooks/:playbookId).
   * Fetches NON-AI estimates for both playbooks to populate titlesEligibleCount
   * and descriptionsEligibleCount for banner visibility.
   *
   * On failure: sets both counts to null (banner hidden). Does NOT set selectedPlaybookId.
   */
  useEffect(() => {
    // Skip in Draft Review mode
    if (isDraftReviewMode) {
      return;
    }

    let cancelled = false;

    async function fetchEligibilityCounts() {
      try {
        // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1] Use explicit scope payload (reused for both estimates)
        const scopePayload = buildPlaybookScopePayload(
          currentAssetType,
          currentScopeAssetRefs
        );
        // Fetch estimates for both playbooks (NON-AI - just counts)
        const [titleEst, descEst] = await Promise.all([
          projectsApi.automationPlaybookEstimate(
            projectId,
            'missing_seo_title',
            scopePayload.scopeProductIds,
            scopePayload.assetType,
            scopePayload.assetType !== 'PRODUCTS'
              ? scopePayload.scopeAssetRefs
              : undefined
          ) as Promise<{ totalAffectedProducts: number }>,
          projectsApi.automationPlaybookEstimate(
            projectId,
            'missing_seo_description',
            scopePayload.scopeProductIds,
            scopePayload.assetType,
            scopePayload.assetType !== 'PRODUCTS'
              ? scopePayload.scopeAssetRefs
              : undefined
          ) as Promise<{ totalAffectedProducts: number }>,
        ]);

        if (cancelled) return;

        const titleCount = titleEst.totalAffectedProducts ?? 0;
        const descCount = descEst.totalAffectedProducts ?? 0;

        // Update eligibility counts for banner visibility
        setTitlesEligibleCount(titleCount);
        setDescriptionsEligibleCount(descCount);
      } catch (err) {
        console.error(
          '[PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] Failed to fetch eligibility counts:',
          err
        );
        // [FIXUP-1] On failure: set both to null, do NOT set selectedPlaybookId
        if (!cancelled) {
          setTitlesEligibleCount(null);
          setDescriptionsEligibleCount(null);
        }
      }
    }

    fetchEligibilityCounts();

    return () => {
      cancelled = true;
    };
    // Run on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [PLAYBOOKS-SHELL-REMOUNT-1 FIXUP-1] Removed legacy auto-navigation effect.
  // Landing on Playbooks with no playbookId in URL must remain neutral (no route change, no implicit selection).
  // Selection is now explicit in-page state via row click.

  const handleNavigate = useCallback(
    (href: string) => {
      if (
        shouldWarnOnNavigate &&
        typeof window !== 'undefined' &&
        !window.confirm(
          'You have an in-progress playbook preview. Leaving will discard it.'
        )
      ) {
        return;
      }
      router.push(href);
    },
    [router, shouldWarnOnNavigate]
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading playbooks...</div>
      </div>
    );
  }

  // [DRAFT-ROUTING-INTEGRITY-1] Draft Review mode UI
  // Renders scoped draft review panel with ScopeBanner + empty state + CTAs
  if (isDraftReviewMode && draftReviewAssetId) {
    // Derive lowercase assetType for href builders
    const assetTypeLower = validUrlAssetType.toLowerCase() as AssetListType;
    const returnLabel = `${assetTypeLower.charAt(0).toUpperCase() + assetTypeLower.slice(1)}`;

    // Build Issues Engine href for "View issues" CTA
    const viewIssuesHref = buildAssetIssuesHref(
      projectId,
      assetTypeLower,
      draftReviewAssetId,
      {
        returnTo:
          validatedReturnTo ||
          `/projects/${projectId}/${assetTypeLower === 'products' ? 'products' : `assets/${assetTypeLower}`}`,
        returnLabel,
        from: 'asset_list',
      }
    );

    // Back href: use validated returnTo or fallback to asset list
    const backHref =
      validatedReturnTo ||
      `/projects/${projectId}/${assetTypeLower === 'products' ? 'products' : `assets/${assetTypeLower}`}`;

    const hasDrafts = draftReviewData && draftReviewData.drafts.length > 0;

    return (
      <div data-testid="draft-review-panel">
        {/* [DRAFT-ROUTING-INTEGRITY-1 FIXUP-1] ScopeBanner for context and back navigation */}
        {/* Uses normalized scope chips to show asset scope explicitly */}
        <ScopeBanner
          from={fromParam ?? 'asset_list'}
          returnTo={backHref}
          showingText={`Draft Review · ${returnLabel}`}
          onClearFiltersHref={buildClearFiltersHref(
            `/projects/${projectId}/automation/playbooks`
          )}
          chips={normalizedScopeResult.chips}
          wasAdjusted={normalizedScopeResult.wasAdjusted}
        />

        {/* [DRAFT-AI-ENTRYPOINT-CLARITY-1] Human-only review boundary note */}
        <div className="mt-4">
          <DraftAiBoundaryNote mode="review" />
        </div>

        {/* Header */}
        <div className="mb-6 mt-4">
          <h1 className="text-2xl font-bold text-foreground">Draft Review</h1>
          <p className="text-muted-foreground">
            Review pending drafts for this {assetTypeLower.slice(0, -1)}.
          </p>
        </div>

        {/* Loading state */}
        {draftReviewLoading && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-muted-foreground">Loading drafts...</div>
          </div>
        )}

        {/* Error state */}
        {draftReviewError && (
          <div className="rounded-md bg-[hsl(var(--danger-background))] p-4">
            <p className="text-sm text-[hsl(var(--danger-foreground))]">{draftReviewError}</p>
          </div>
        )}

        {/* Draft list or empty state */}
        {!draftReviewLoading && !draftReviewError && (
          <>
            {hasDrafts ? (
              <div data-testid="draft-review-list" className="space-y-4">
                {draftReviewData?.drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">
                          {draft.playbookId === 'missing_seo_title'
                            ? 'SEO Title Suggestion'
                            : 'SEO Description Suggestion'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Status: {draft.status} · Updated:{' '}
                          {new Date(draft.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          draft.status === 'READY'
                            ? 'bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]'
                            : 'bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]'
                        }`}
                      >
                        {draft.status}
                      </span>
                    </div>
                    {/* [FIXUP-2] Render draft items supporting both canonical and legacy/testkit shapes */}
                    {/* [DRAFT-EDIT-INTEGRITY-1] With inline edit mode */}
                    {/* [DRAFT-ENTRYPOINT-UNIFICATION-1] Use item.itemIndex for API calls */}
                    {draft.filteredItems.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {draft.filteredItems.map((item, idx) => {
                          // [FIXUP-2] Support canonical shape (field, finalSuggestion, rawSuggestion)
                          // and legacy/testkit shape (suggestedTitle, suggestedDescription)
                          const hasCanonicalShape = item.field !== undefined;
                          const legacyItem = item as any; // For accessing suggestedTitle/suggestedDescription

                          // [DRAFT-ENTRYPOINT-UNIFICATION-1] Use itemIndex from server for API calls,
                          // fall back to idx for backwards compatibility with older responses
                          const itemIndex = item.itemIndex ?? idx;

                          // [DRAFT-EDIT-INTEGRITY-1] Edit state for this item
                          const editKey = `${draft.id}-${itemIndex}`;
                          const isEditing = editingItem === editKey;
                          const currentValue =
                            item.finalSuggestion || item.rawSuggestion || '';

                          if (hasCanonicalShape) {
                            // [DRAFT-DIFF-CLARITY-1] Canonical playbook draft shape with diff UI and inline edit
                            // Compute live value from draftReviewCurrentFields
                            const liveValue =
                              item.field === 'seoTitle'
                                ? draftReviewCurrentFields?.seoTitle || ''
                                : draftReviewCurrentFields?.seoDescription ||
                                  '';
                            const draftValue =
                              item.finalSuggestion ??
                              item.rawSuggestion ??
                              null;

                            // [DRAFT-DIFF-CLARITY-1] Derive empty draft messaging:
                            // - If both rawSuggestion and finalSuggestion are empty/null: "No draft generated yet"
                            // - If explicitly cleared (has rawSuggestion but finalSuggestion is empty): "Draft will clear this field when applied"
                            const hasDraftContent =
                              draftValue !== null && draftValue.trim() !== '';
                            const wasExplicitlyCleared =
                              item.rawSuggestion &&
                              item.rawSuggestion.trim() !== '' &&
                              (item.finalSuggestion === '' ||
                                item.finalSuggestion === null);
                            const noDraftGenerated =
                              !item.rawSuggestion ||
                              item.rawSuggestion.trim() === '';

                            return (
                              <div
                                key={itemIndex}
                                data-testid={`draft-item-${draft.id}-${itemIndex}`}
                                className="rounded border border-border bg-[hsl(var(--surface-card))] p-4 text-sm"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-medium text-foreground">
                                    {item.field === 'seoTitle'
                                      ? 'Title'
                                      : 'Description'}
                                  </div>
                                  {/* [DRAFT-EDIT-INTEGRITY-1] Edit button - only show when not editing */}
                                  {!isEditing && (
                                    <button
                                      type="button"
                                      data-testid={`draft-item-edit-${draft.id}-${itemIndex}`}
                                      onClick={() =>
                                        handleStartEdit(
                                          draft.id,
                                          itemIndex,
                                          currentValue
                                        )
                                      }
                                      className="text-xs text-primary hover:text-primary/80"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>

                                {/* [DRAFT-DIFF-CLARITY-1] Diff UI: Current (live) vs Draft (staged) */}
                                <div
                                  data-testid="draft-diff-current"
                                  className="rounded bg-[hsl(var(--surface-raised))] p-3 mb-3"
                                >
                                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                    Current (live)
                                  </div>
                                  <div className="text-foreground">
                                    {liveValue || (
                                      <span className="italic text-muted-foreground/70">
                                        (empty)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div
                                  data-testid="draft-diff-draft"
                                  className="rounded bg-[hsl(var(--info-background))] p-3"
                                >
                                  <div className="text-xs font-medium text-[hsl(var(--info-foreground))] uppercase tracking-wide mb-1">
                                    Draft (staged)
                                  </div>

                                  {isEditing ? (
                                    /* [DRAFT-EDIT-INTEGRITY-1] Edit mode UI */
                                    <div className="mt-1">
                                      <textarea
                                        data-testid={`draft-item-input-${draft.id}-${itemIndex}`}
                                        value={editValue}
                                        onChange={(e) =>
                                          setEditValue(e.target.value)
                                        }
                                        className="w-full rounded border border-border bg-background p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        rows={
                                          item.field === 'seoDescription'
                                            ? 4
                                            : 2
                                        }
                                        disabled={editSaving}
                                      />
                                      {/* Edit error inline */}
                                      {editError && (
                                        <div className="mt-1 text-xs text-[hsl(var(--danger-foreground))]">
                                          {editError}
                                        </div>
                                      )}
                                      {/* Save/Cancel buttons */}
                                      <div className="mt-2 flex gap-2">
                                        <button
                                          type="button"
                                          data-testid={`draft-item-save-${draft.id}-${itemIndex}`}
                                          onClick={() =>
                                            handleSaveEdit(
                                              draft.id,
                                              itemIndex,
                                              item.field as
                                                | 'seoTitle'
                                                | 'seoDescription'
                                            )
                                          }
                                          disabled={editSaving}
                                          className="inline-flex items-center rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                        >
                                          {editSaving
                                            ? 'Saving...'
                                            : 'Save changes'}
                                        </button>
                                        <button
                                          type="button"
                                          data-testid={`draft-item-cancel-${draft.id}-${itemIndex}`}
                                          onClick={handleCancelEdit}
                                          disabled={editSaving}
                                          className="inline-flex items-center rounded bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-inset ring-border hover:bg-muted disabled:opacity-50"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Display mode with empty draft messaging */
                                    <div className="text-[hsl(var(--info-foreground))]">
                                      {hasDraftContent ? (
                                        <>
                                          {draftValue}
                                          {item.ruleWarnings &&
                                            item.ruleWarnings.length > 0 && (
                                              <div className="mt-1 text-xs text-[hsl(var(--warning-foreground))]">
                                                Warnings:{' '}
                                                {item.ruleWarnings.join(', ')}
                                              </div>
                                            )}
                                        </>
                                      ) : wasExplicitlyCleared ? (
                                        <span className="italic text-[hsl(var(--warning-foreground))]">
                                          Draft will clear this field when
                                          applied
                                        </span>
                                      ) : noDraftGenerated ? (
                                        <span className="italic text-muted-foreground/70">
                                          No draft generated yet
                                        </span>
                                      ) : (
                                        <span className="italic text-muted-foreground/70">
                                          (empty)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            // Legacy/testkit shape with suggestedTitle and/or suggestedDescription
                            // [DRAFT-EDIT-INTEGRITY-1] Legacy items are read-only (no edit button)
                            return (
                              <div
                                key={itemIndex}
                                data-testid={`draft-item-${draft.id}-${itemIndex}`}
                                className="space-y-2"
                              >
                                {legacyItem.suggestedTitle && (
                                  <div className="rounded bg-[hsl(var(--surface-raised))] p-3 text-sm">
                                    <div className="font-medium text-foreground">
                                      Title
                                    </div>
                                    <div className="mt-1 text-foreground">
                                      {legacyItem.suggestedTitle}
                                    </div>
                                  </div>
                                )}
                                {legacyItem.suggestedDescription && (
                                  <div className="rounded bg-[hsl(var(--surface-raised))] p-3 text-sm">
                                    <div className="font-medium text-foreground">
                                      Description
                                    </div>
                                    <div className="mt-1 text-foreground">
                                      {legacyItem.suggestedDescription}
                                    </div>
                                  </div>
                                )}
                                {!legacyItem.suggestedTitle &&
                                  !legacyItem.suggestedDescription && (
                                    <div className="rounded bg-[hsl(var(--surface-raised))] p-3 text-sm">
                                      <div className="text-muted-foreground">
                                        (No suggestion)
                                      </div>
                                    </div>
                                  )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Zero-draft empty state - MANDATORY per DRAFT-ROUTING-INTEGRITY-1 */
              <div
                data-testid="draft-review-empty"
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-[hsl(var(--surface-raised))] p-8 text-center"
              >
                <svg
                  className="mx-auto h-12 w-12 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-foreground">
                  No drafts available for this item.
                </h3>
                <div className="mt-6 flex gap-3">
                  {/* Primary CTA: View issues */}
                  <Link
                    href={viewIssuesHref}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    View issues
                  </Link>
                  {/* Secondary CTA: Back - [FIXUP-1] Use phase-specific testid, not scope-banner-back */}
                  <Link
                    href={backHref}
                    data-testid="draft-review-back"
                    className="inline-flex items-center rounded-md bg-[hsl(var(--surface-card))] px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted"
                  >
                    Back
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <li>
            <Link
              href="/projects"
              onClick={(event) => {
                event.preventDefault();
                handleNavigate('/projects');
              }}
              className="hover:text-foreground"
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
              className="hover:text-foreground"
            >
              {projectName || 'Project'}
            </Link>
          </li>
          <li>/</li>
          <li>
            {/* [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-2] Breadcrumb uses canonical /playbooks route */}
            <Link
              href={`/projects/${projectId}/playbooks`}
              onClick={(event) => {
                event.preventDefault();
                handleNavigate(`/projects/${projectId}/playbooks`);
              }}
              className="hover:text-foreground"
            >
              Playbooks
            </Link>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Playbooks
            {/* [ASSETS-PAGES-1.1] Show asset type badge when not PRODUCTS */}
            {currentAssetType !== 'PRODUCTS' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-[hsl(var(--info-background))] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--info-foreground))]">
                {getAssetTypeLabel(currentAssetType).plural}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Safely apply AI-powered fixes to missing SEO metadata, with preview
            and token estimates before you run anything.
          </p>
          {/* [ROLES-3] Role visibility label */}
          <p className="mt-1 text-xs text-muted-foreground">
            You are the {getRoleDisplayLabel(effectiveRole)}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/projects/${projectId}/automation/playbooks/entry?source=playbooks_page`
            )
          }
          className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
        >
          Create playbook
        </button>
      </div>

      {/* [ROUTE-INTEGRITY-1 FIXUP-1] [SCOPE-CLARITY-1] ScopeBanner - moved after header for visual hierarchy */}
      {/* [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Uses canonical /playbooks route */}
      <ScopeBanner
        from={fromParam}
        returnTo={validatedReturnTo || `/projects/${projectId}/playbooks`}
        showingText={scopeBannerShowingText}
        onClearFiltersHref={buildClearFiltersHref(
          `/projects/${projectId}/playbooks`
        )}
        chips={normalizedScopeResult.chips}
        wasAdjusted={normalizedScopeResult.wasAdjusted}
      />

      {/* [ASSETS-PAGES-1.1-UI-HARDEN] Missing scope safety block for PAGES/COLLECTIONS */}
      {isMissingScopeForPagesCollections && (
        <div className="mb-6 rounded-lg border border-border bg-[hsl(var(--danger-background))] p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-[hsl(var(--danger-foreground))]"
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
              <p className="text-sm font-semibold text-[hsl(var(--danger-foreground))]">
                Missing scope for {getAssetTypeLabel(currentAssetType).plural}.
                Return to Work Queue.
              </p>
              <p className="mt-1 text-xs text-[hsl(var(--danger-foreground))]">
                To run playbooks on {getAssetTypeLabel(currentAssetType).plural}
                , you must navigate from the Work Queue with a specific scope.
                This prevents unintended project-wide changes.
              </p>
              <div className="mt-3">
                <Link
                  href={`/projects/${projectId}/work-queue`}
                  className="inline-flex items-center rounded-md bg-[hsl(var(--danger))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90"
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
        <div className="mb-6 rounded-lg border border-border bg-[hsl(var(--info-background))] p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-[hsl(var(--info-foreground))]"
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
              <p className="text-sm font-semibold text-[hsl(var(--info-foreground))]">
                Scope summary
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[hsl(var(--info-background))] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--info-foreground))]">
                  {getAssetTypeLabel(currentAssetType).plural}
                </span>
                <span className="text-xs text-[hsl(var(--info-foreground))]">
                  {currentScopeAssetRefs
                    .slice(0, 3)
                    .map((ref) => {
                      // Extract just the handle part (e.g., 'page_handle:about-us' -> 'about-us')
                      const parts = ref.split(':');
                      return parts.length > 1 ? parts[1] : ref;
                    })
                    .join(', ')}
                  {currentScopeAssetRefs.length > 3 && (
                    <span className="text-[hsl(var(--info-foreground))]/70">
                      {' '}
                      +{currentScopeAssetRefs.length - 3} more
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* [ROLES-3] VIEWER mode banner */}
      {effectiveRole === 'VIEWER' && (
        <div className="mb-6 rounded-lg border border-border bg-[hsl(var(--surface-raised))] p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
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
              <p className="text-sm font-semibold text-foreground">
                View-only mode
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You are viewing this project as a Viewer. To generate previews
                or apply changes, ask the project Owner to upgrade your role.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next DEO Win Banner - shown when navigating from overview card */}
      {showNextDeoWinBanner && !bannerDismissed && (
        <div className="mb-6 rounded-lg border border-border bg-[hsl(var(--success-background))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-[hsl(var(--success-foreground))]"
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
                <h3 className="text-sm font-semibold text-[hsl(var(--success-foreground))]">
                  Nice work on your first DEO win
                </h3>
                <p className="mt-1 text-xs text-[hsl(var(--success-foreground))]">
                  Next up, use Playbooks to fix missing SEO titles and
                  descriptions in bulk. Start with a preview — no changes are
                  applied until you confirm.
                </p>
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="flex-shrink-0 text-[hsl(var(--success-foreground))]/70 hover:text-[hsl(var(--success-foreground))]"
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
      {/* [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] NO_RUN_WITH_ISSUES uses primaryCnabPlaybookId for routing */}
      {cnabState === 'NO_RUN_WITH_ISSUES' &&
        !cnabDismissed &&
        primaryCnabPlaybookId && (
          <div className="mb-6 rounded-lg border border-border bg-[hsl(var(--info-background))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-[hsl(var(--info-foreground))]"
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
                  <h3 className="text-sm font-semibold text-[hsl(var(--info-foreground))]">
                    Next step: Fix missing SEO metadata
                  </h3>
                  <p className="mt-1 text-xs text-[hsl(var(--info-foreground))]">
                    {primaryCnabPlaybookId === 'missing_seo_title'
                      ? 'Use Playbooks to safely generate missing SEO titles in bulk. Start with a preview — nothing is applied until you confirm.'
                      : 'Use Playbooks to safely generate missing SEO descriptions in bulk. Start with a preview — nothing is applied until you confirm.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] Route to primaryCnabPlaybookId, no AI side effects
                        // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Use guardrail + shared scope args
                        const href = buildPlaybookRunHrefOrNull({
                          projectId,
                          playbookId: primaryCnabPlaybookId,
                          step: 'preview',
                          source: 'banner',
                          ...playbookRunScopeForUrl,
                        });
                        if (!href) return;
                        setCnabDismissed(true);
                        handleNavigate(href);
                      }}
                      className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {primaryCnabPlaybookId === 'missing_seo_title'
                        ? 'Preview missing SEO titles'
                        : 'Preview missing SEO descriptions'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCnabDismissed(true);
                        handleNavigate(`/projects/${projectId}/playbooks`);
                      }}
                      className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                    >
                      How Playbooks work
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCnabDismissed(true)}
                className="flex-shrink-0 text-[hsl(var(--info-foreground))]/70 hover:text-[hsl(var(--info-foreground))]"
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
        <div className="mb-6 rounded-lg border border-border bg-[hsl(var(--info-background))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-[hsl(var(--info-foreground))]"
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
                <h3 className="text-sm font-semibold text-[hsl(var(--info-foreground))]">
                  SEO descriptions updated — next, fix titles
                </h3>
                <p className="mt-1 text-xs text-[hsl(var(--info-foreground))]">
                  You&apos;ve improved SEO descriptions. Run the titles playbook
                  using the same safe preview → estimate → apply flow.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Route canonically, no AI side effects
                      // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Use guardrail + shared scope args
                      const href = buildPlaybookRunHrefOrNull({
                        projectId,
                        playbookId: 'missing_seo_title',
                        step: 'preview',
                        source: 'banner',
                        ...playbookRunScopeForUrl,
                      });
                      if (!href) return;
                      setCnabDismissed(true);
                      handleNavigate(href);
                    }}
                    className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Preview missing SEO titles
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCnabDismissed(true);
                      handleNavigate(
                        `/projects/${projectId}/products?from=playbook_results`
                      );
                    }}
                    className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                  >
                    View updated products
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCnabDismissed(true)}
              className="flex-shrink-0 text-[hsl(var(--info-foreground))]/70 hover:text-[hsl(var(--info-foreground))]"
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
        <div className="mb-6 rounded-lg border border-border bg-[hsl(var(--info-background))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-[hsl(var(--info-foreground))]"
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
                <h3 className="text-sm font-semibold text-[hsl(var(--info-foreground))]">
                  SEO titles updated — next, fix descriptions
                </h3>
                <p className="mt-1 text-xs text-[hsl(var(--info-foreground))]">
                  You&apos;ve improved SEO titles. Run the descriptions playbook
                  using the same safe preview → estimate → apply flow.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Route canonically, no AI side effects
                      // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Use guardrail + shared scope args
                      const href = buildPlaybookRunHrefOrNull({
                        projectId,
                        playbookId: 'missing_seo_description',
                        step: 'preview',
                        source: 'banner',
                        ...playbookRunScopeForUrl,
                      });
                      if (!href) return;
                      setCnabDismissed(true);
                      handleNavigate(href);
                    }}
                    className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Preview missing SEO descriptions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCnabDismissed(true);
                      handleNavigate(
                        `/projects/${projectId}/products?from=playbook_results`
                      );
                    }}
                    className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                  >
                    View updated products
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCnabDismissed(true)}
              className="flex-shrink-0 text-[hsl(var(--info-foreground))]/70 hover:text-[hsl(var(--info-foreground))]"
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
        <div className="mb-6 rounded-lg border border-border bg-[hsl(var(--success-background))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-[hsl(var(--success-foreground))]"
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
                <h3 className="text-sm font-semibold text-[hsl(var(--success-foreground))]">
                  SEO metadata is up to date
                </h3>
                <p className="mt-1 text-xs text-[hsl(var(--success-foreground))]">
                  All eligible products have SEO titles and descriptions. You
                  can sync changes to Shopify or explore other optimizations.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCnabDismissed(true);
                      handleSyncProducts();
                    }}
                    className="inline-flex items-center rounded-md bg-[hsl(var(--success))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--success))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {/* [AUTOMATION-TRIGGER-TRUTHFULNESS-1] CTA label is deterministic */}
                    {willGenerateAnswerBlocksOnProductSync
                      ? 'Sync products + Generate Answer Blocks'
                      : 'Sync products'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCnabDismissed(true);
                      handleNavigate(`/projects/${projectId}/store-health`);
                    }}
                    className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                  >
                    Explore other optimizations
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCnabDismissed(true)}
              className="flex-shrink-0 text-[hsl(var(--success-foreground))]/70 hover:text-[hsl(var(--success-foreground))]"
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
      <div className="mb-6 border-b border-border">
        <div className="-mb-px flex gap-6 text-sm">
          <Link
            href={`/projects/${projectId}/automation`}
            className={`border-b-2 px-1 pb-2 ${
              pathname === `/projects/${projectId}/automation`
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={(event) => {
              event.preventDefault();
              handleNavigate(`/projects/${projectId}/automation`);
            }}
          >
            Activity
          </Link>
          {/* [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-2] Use canonical /playbooks, highlight on both routes */}
          <Link
            href={`/projects/${projectId}/playbooks`}
            className={`border-b-2 px-1 pb-2 ${
              pathname?.startsWith(`/projects/${projectId}/playbooks`) ||
              pathname?.startsWith(
                `/projects/${projectId}/automation/playbooks`
              )
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Playbooks
          </Link>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded border border-border bg-[hsl(var(--danger-background))] p-4 text-[hsl(var(--danger-foreground))]">
          {error}
        </div>
      )}

      {/* [PLAYBOOKS-SHELL-REMOUNT-1] Playbooks list - canonical DataTable */}
      <div className="mb-8">
        <DataTable<(typeof playbookSummaries)[0] & { id: string }>
          rows={playbookSummaries}
          columns={[
            {
              key: 'name',
              header: 'Playbook',
              cell: (row) => (
                <div>
                  {/* [PLAYBOOKS-SHELL-REMOUNT-1 FIXUP-1] Selection highlight on title itself */}
                  <p className={`text-foreground ${row.id === selectedPlaybookId ? 'font-semibold' : 'font-medium'}`}>
                    {row.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {row.description}
                  </p>
                </div>
              ),
            },
            {
              key: 'field',
              header: 'What It Fixes',
              cell: (row) => (
                <span className="text-sm text-muted-foreground">
                  {row.field === 'seoTitle' ? 'Missing SEO titles' : 'Missing SEO descriptions'}
                </span>
              ),
            },
            {
              key: 'assetType',
              header: 'Asset Type',
              cell: () => (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  Products
                </span>
              ),
            },
            {
              key: 'availability',
              header: 'Availability',
              cell: (row) => {
                const isEligible = planId !== 'free';
                const hasItems = row.totalAffected > 0;
                const availabilityState = !isEligible
                  ? 'Blocked'
                  : !hasItems
                    ? 'Informational'
                    : 'Ready';
                const stateClass = availabilityState === 'Ready'
                  ? 'bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]'
                  : availabilityState === 'Informational'
                    ? 'bg-[hsl(var(--info-background))] text-[hsl(var(--info-foreground))]'
                    : 'bg-muted text-muted-foreground';
                return (
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${stateClass}`}>
                      {availabilityState}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.totalAffected} item{row.totalAffected !== 1 ? 's' : ''} affected
                    </span>
                  </div>
                );
              },
            },
          ]}
          getRowDescriptor={(row) => getPlaybookDescriptor(row)}
          onRowClick={(row) => handleSelectPlaybook(row.id as PlaybookId)}
          onOpenContext={(descriptor) => openPanel(descriptor)}
          density="comfortable"
          hideContextAction={false}
        />
      </div>

      {!selectedDefinition && (
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Select a playbook above to see preview, estimate, and apply steps.
          </p>
        </div>
      )}

      {selectedDefinition &&
        (isEligibilityEmptyState ? (
          <div
            className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6"
            data-testid="playbook-zero-eligible-empty-state"
          >
            {/* [PLAYBOOK-STEP-CONTINUITY-1] Primary message: "No applicable changes found" */}
            <h2 className="text-lg font-semibold text-foreground">
              No applicable changes found
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This playbook only applies to{' '}
              {currentAssetType === 'PRODUCTS'
                ? 'products'
                : currentAssetType === 'PAGES'
                  ? 'pages'
                  : 'collections'}{' '}
              missing SEO{' '}
              {selectedDefinition.field === 'seoTitle'
                ? 'titles'
                : 'descriptions'}{' '}
              in the current scope.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Common reasons: items are already optimized, the selected scope is
              out of date, or Shopify data hasn&apos;t been synced recently.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {/* [PLAYBOOK-STEP-CONTINUITY-1-FIXUP-1] Back/Exit path - use canonical /playbooks route */}
              <button
                type="button"
                onClick={() =>
                  handleNavigate(`/projects/${projectId}/playbooks`)
                }
                className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
              >
                ← Return to Playbooks
              </button>
              {/* [PLAYBOOK-STEP-CONTINUITY-1-FIXUP-1] Restore test-stable CTA label for PRODUCTS */}
              <button
                type="button"
                onClick={() =>
                  handleNavigate(`/projects/${projectId}/products`)
                }
                className="inline-flex items-center rounded-md border border-transparent bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentAssetType === 'PRODUCTS'
                  ? 'View products that need optimization'
                  : currentAssetType === 'PAGES'
                    ? 'View pages that need optimization'
                    : 'View collections that need optimization'}
              </button>
              {/* [AUTOMATION-TRIGGER-TRUTHFULNESS-1] CTA label is deterministic */}
              <button
                type="button"
                onClick={() => handleSyncProducts()}
                className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
              >
                {willGenerateAnswerBlocksOnProductSync
                  ? 'Sync products + Generate Answer Blocks'
                  : 'Sync products'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stepper */}
            <div
              data-testid="playbooks-stepper"
              className="flex items-center gap-4 text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    activeStep === 1
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  1
                </span>
                <span
                  className={
                    activeStep === 1
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  }
                >
                  Preview
                </span>
              </div>
              <div className="h-px flex-1 bg-border" />
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    activeStep === 2
                      ? 'bg-primary text-primary-foreground'
                      : step2Locked
                        ? 'bg-muted text-muted-foreground/50'
                        : 'bg-muted text-foreground'
                  }`}
                  title={step2Locked ? 'Generate preview first' : undefined}
                >
                  2
                </span>
                <span
                  className={
                    activeStep === 2
                      ? 'font-semibold text-foreground'
                      : step2Locked
                        ? 'text-muted-foreground/50'
                        : 'text-muted-foreground'
                  }
                >
                  Estimate
                </span>
              </div>
              <div className="h-px flex-1 bg-border" />
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    activeStep === 3
                      ? 'bg-primary text-primary-foreground'
                      : step3Locked
                        ? 'bg-muted text-muted-foreground/50'
                        : 'bg-muted text-foreground'
                  }`}
                  title={step3Locked ? 'Generate preview first' : undefined}
                >
                  3
                </span>
                <span
                  className={
                    activeStep === 3
                      ? 'font-semibold text-foreground'
                      : step3Locked
                        ? 'text-muted-foreground/50'
                        : 'text-muted-foreground'
                  }
                >
                  Apply
                </span>
              </div>
            </div>

            {/* AI-USAGE-1: AI Usage Summary Chip */}
            {!aiUsageLoading &&
              aiUsageSummary &&
              (aiUsageSummary.previewRuns > 0 ||
                aiUsageSummary.draftGenerateRuns > 0) && (
                <div className="rounded-lg border border-border bg-[hsl(var(--surface-raised))] p-3 text-sm">
                  <p className="text-xs font-semibold text-foreground">
                    AI usage this month
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Previews and drafts generated:{' '}
                    {aiUsageSummary.previewRuns +
                      aiUsageSummary.draftGenerateRuns}
                  </p>
                  {/* CACHE/REUSE v2: Show AI runs avoided */}
                  {aiUsageSummary.aiRunsAvoided > 0 && (
                    <p className="mt-0.5 text-xs text-[hsl(var(--success-foreground))]">
                      AI runs avoided (reused): {aiUsageSummary.aiRunsAvoided}
                    </p>
                  )}
                  {aiUsageSummary.totalAiRuns > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Apply uses saved drafts only — no new AI runs.
                    </p>
                  )}
                </div>
              )}

            {(flowState === 'APPLY_COMPLETED' ||
              flowState === 'APPLY_STOPPED') && (
              <div className="rounded-lg border border-border bg-[hsl(var(--success-background))] p-3 text-sm text-[hsl(var(--success-foreground))]">
                <p className="text-sm font-semibold text-foreground">
                  {flowState === 'APPLY_COMPLETED'
                    ? 'Playbook run completed'
                    : 'Playbook stopped safely'}
                </p>
                <p className="mt-1 text-xs">
                  Review the results below, then view updated products or sync
                  changes to Shopify.
                </p>
              </div>
            )}

            {/* Step 1: Preview */}
            <section className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4">
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Step 1 – Preview changes
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Generate a preview for a few sample products. No changes
                      are saved during this step.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePreview}
                    disabled={
                      loadingPreview || planIsFree || !canGenerateDrafts
                    }
                    title={
                      !canGenerateDrafts
                        ? 'Viewer role cannot generate previews'
                        : undefined
                    }
                    className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                      hasPreview
                        ? 'border border-border bg-[hsl(var(--surface-card))] text-foreground hover:bg-muted'
                        : 'border border-transparent bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {loadingPreview
                      ? 'Generating preview…'
                      : 'Generate preview (uses AI)'}
                  </button>
                </div>
                {/* [DRAFT-AI-ENTRYPOINT-CLARITY-1] AI usage disclosure for generation */}
                <DraftAiBoundaryNote mode="generate" />
                {resumedFromSession && hasPreview && (
                  <div className="mb-3 rounded-md border border-border bg-[hsl(var(--info-background))] p-3 text-xs text-[hsl(var(--info-foreground))]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">
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
                            className="inline-flex items-center rounded-md bg-[hsl(var(--warning))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:bg-[hsl(var(--warning))]/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
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
                              className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                            >
                              Continue
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                )}
                {/* [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only rules block styling */}
                <div className="mb-4 rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">
                        Playbook rules
                      </h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Rules shape the AI drafts you preview and apply. Rules
                        do not change Shopify until you Apply.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        Use rules for this run
                      </span>
                      {/* [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only toggle switch */}
                      <button
                        type="button"
                        onClick={() =>
                          setRules((previous) => ({
                            ...previous,
                            enabled: !previous.enabled,
                          }))
                        }
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          rules.enabled ? 'bg-primary' : 'bg-muted'
                        }`}
                        aria-pressed={rules.enabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                            rules.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  {/* [UI-POLISH-&-CLARITY-1 FIXUP-1] Token-only input styling with increased padding */}
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground">
                        Find
                      </label>
                      <input
                        type="text"
                        value={rules.find}
                        onChange={(event) => {
                          handleRulesChange({ find: event.target.value });
                          markRulesEdited();
                        }}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        placeholder="e.g. AI"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground">
                        Replace
                      </label>
                      <input
                        type="text"
                        value={rules.replace}
                        onChange={(event) => {
                          handleRulesChange({ replace: event.target.value });
                          markRulesEdited();
                        }}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        placeholder="e.g. EngineO"
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground">
                        Prefix
                      </label>
                      <input
                        type="text"
                        value={rules.prefix}
                        onChange={(event) => {
                          handleRulesChange({ prefix: event.target.value });
                          markRulesEdited();
                        }}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        placeholder="e.g. EngineO | "
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground">
                        Suffix
                      </label>
                      <input
                        type="text"
                        value={rules.suffix}
                        onChange={(event) => {
                          handleRulesChange({ suffix: event.target.value });
                          markRulesEdited();
                        }}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        placeholder="e.g. | Official Store"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground">
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
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        placeholder="e.g. 60"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Enforced by trimming the AI suggestion to this many
                        characters.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[11px] font-medium text-muted-foreground">
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
                      className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      placeholder={'e.g.\nclick here\nbest ever'}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Forbidden phrases are highlighted in preview but not
                      removed in v1.
                    </p>
                  </div>
                </div>
                <div className="mb-3 text-xs text-muted-foreground">
                  Total affected products:{' '}
                  <span className="font-semibold text-foreground">
                    {totalAffectedProducts}
                  </span>
                </div>
                {planIsFree && (
                  <p className="mb-3 text-xs text-[hsl(var(--warning-foreground))]">
                    Bulk Playbooks are gated on the Free plan. Upgrade to Pro to
                    unlock bulk metadata fixes.
                  </p>
                )}
                {/* [UI-POLISH-&-CLARITY-1 FIXUP-2] Token-only loading/empty states */}
                {loadingPreview && (
                  <div className="rounded-md border border-border bg-[hsl(var(--surface-raised))] p-4 text-sm text-muted-foreground">
                    Generating AI previews for sample products…
                  </div>
                )}
                {!loadingPreview && !hasPreview && (
                  <div className="rounded-md border border-dashed border-border bg-[hsl(var(--surface-raised))] p-4 text-sm text-muted-foreground">
                    No preview yet. Click &quot;Generate preview&quot; to see
                    Before/After examples for a few sample products.
                  </div>
                )}
                {/* [UI-POLISH-&-CLARITY-1 FIXUP-2] Token-only preview sample section */}
                {!loadingPreview && hasPreview && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">
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
                        className="rounded-md border border-border bg-[hsl(var(--surface-raised))] p-3"
                      >
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">
                            {sample.productTitle}
                          </span>
                          {(() => {
                            // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Build preview context URL for product deep link with canonical route
                            // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Use shared scope args via playbookRunScopeForUrl
                            const returnToPath = buildPlaybookRunHref({
                              projectId,
                              playbookId: selectedPlaybookId!,
                              step: 'preview',
                              source: 'product_details',
                              ...playbookRunScopeForUrl,
                            });
                            const previewContextUrl = `/projects/${projectId}/products/${sample.productId}?from=playbook_preview&playbookId=${selectedPlaybookId}&returnTo=${encodeURIComponent(returnToPath)}`;
                            return (
                              <Link
                                href={previewContextUrl}
                                onClick={(event) => {
                                  event.preventDefault();
                                  handleNavigate(previewContextUrl);
                                }}
                                className="text-xs text-primary hover:text-primary/80"
                              >
                                Open product →
                              </Link>
                            );
                          })()}
                        </div>
                        <div className="grid gap-3 text-xs md:grid-cols-2">
                          <div>
                            <div className="mb-1 font-medium text-foreground">
                              Before ({selectedDefinition.field})
                            </div>
                            <div className="rounded border border-border bg-[hsl(var(--surface-card))] p-2 text-foreground">
                              {selectedDefinition.field === 'seoTitle'
                                ? sample.currentTitle || (
                                    <span className="text-muted-foreground/70">Empty</span>
                                  )
                                : sample.currentDescription || (
                                    <span className="text-muted-foreground/70">Empty</span>
                                  )}
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 font-medium text-foreground">
                              After (AI suggestion)
                            </div>
                            <div className="rounded border border-border bg-[hsl(var(--surface-card))] p-2 text-foreground">
                              {selectedDefinition.field === 'seoTitle'
                                ? sample.suggestedTitle || (
                                    <span className="text-muted-foreground/70">
                                      No suggestion
                                    </span>
                                  )
                                : sample.suggestedDescription || (
                                    <span className="text-muted-foreground/70">
                                      No suggestion
                                    </span>
                                  )}
                            </div>
                          </div>
                        </div>
                        {sample.ruleWarnings &&
                          sample.ruleWarnings.length > 0 && (
                            <p className="mt-2 text-[11px] text-[hsl(var(--warning-foreground))]">
                              Rules applied:{' '}
                              {sample.ruleWarnings
                                .map((warning) =>
                                  warning === 'trimmed_to_max_length'
                                    ? 'Trimmed to max length'
                                    : warning === 'forbidden_phrase_detected'
                                      ? 'Forbidden phrase detected'
                                      : warning
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
                  <div className="mt-4 rounded-md border border-border bg-[hsl(var(--warning-background))] p-3 text-xs text-[hsl(var(--warning-foreground))]">
                    <p className="font-medium">
                      Why you can&apos;t continue yet
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {continueBlockers.includes('preview_stale') && (
                        <li>
                          Rules changed since this preview. Regenerate preview
                          to continue safely.
                        </li>
                      )}
                      {continueBlockers.includes('plan_not_eligible') && (
                        <li>
                          Your current plan doesn&apos;t support Playbooks for
                          bulk fixes.
                        </li>
                      )}
                      {continueBlockers.includes('estimate_not_eligible') && (
                        <li>
                          {estimateBlockingReasons.includes(
                            'ai_daily_limit_reached'
                          )
                            ? 'Daily AI limit reached for product optimization. Try again tomorrow or upgrade your plan.'
                            : estimateBlockingReasons.includes(
                                  'token_cap_would_be_exceeded'
                                )
                              ? 'Estimated token usage would exceed your remaining capacity for today. Reduce scope or try again tomorrow.'
                              : estimateBlockingReasons.includes(
                                    'no_affected_products'
                                  )
                                ? 'No eligible items right now.'
                                : estimateBlockingReasons.includes(
                                      'plan_not_eligible'
                                    )
                                  ? 'This playbook requires a Pro or Business plan. Upgrade to unlock bulk automations.'
                                  : 'This playbook cannot run with the current estimate. Adjust your setup to continue.'}
                        </li>
                      )}
                      {continueBlockers.includes('estimate_missing') && (
                        <li>
                          Estimate needed to continue. Recalculate estimate from
                          your current preview.
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
                          className="inline-flex items-center rounded-md bg-[hsl(var(--warning))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:bg-[hsl(var(--warning))]/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Regenerate preview (uses AI)
                        </button>
                      )}
                      {!planEligible && (
                        <button
                          type="button"
                          onClick={() => handleNavigate('/settings/billing')}
                          className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
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
                          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
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
                      className="inline-flex items-center rounded-md border border-transparent bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue to Estimate
                    </button>
                  )}
                </div>
              </>
            </section>

            {/* Step 2: Estimate */}
            <section
              className={`rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4 ${
                step2Locked ? 'opacity-50' : ''
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Step 2 – Estimate impact & tokens
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Estimate updates automatically from your latest preview.
                    Review how many products will be updated and approximate
                    token usage before you apply.
                  </p>
                </div>
              </div>
              {loadingEstimate && (
                <div className="rounded-md border border-border bg-[hsl(var(--surface-raised))] p-4 text-sm text-muted-foreground">
                  Calculating playbook estimate…
                </div>
              )}
              {!loadingEstimate && estimate && (
                <div className="space-y-3 text-sm text-foreground">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded border border-border bg-[hsl(var(--surface-raised))] p-3">
                      <div className="text-xs text-muted-foreground">
                        Products to update
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {estimate.totalAffectedProducts}
                      </div>
                    </div>
                    <div className="rounded border border-border bg-[hsl(var(--surface-raised))] p-3">
                      <div className="text-xs text-muted-foreground">
                        Estimated token usage (approx)
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {estimate.estimatedTokens.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded border border-border bg-[hsl(var(--surface-raised))] p-3">
                      <div className="text-xs text-muted-foreground">
                        Plan & daily capacity
                      </div>
                      <div className="text-xs text-foreground">
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
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                      {estimateBlockingReasons.includes(
                        'plan_not_eligible'
                      ) && (
                        <li>
                          This playbook requires a Pro or Business plan. Upgrade
                          to unlock bulk automations.
                        </li>
                      )}
                      {estimateBlockingReasons.includes(
                        'no_affected_products'
                      ) && <li>No eligible items right now.</li>}
                      {estimateBlockingReasons.includes(
                        'ai_daily_limit_reached'
                      ) && (
                        <li>
                          Daily AI limit reached for product optimization. Try
                          again tomorrow or upgrade your plan.
                        </li>
                      )}
                      {estimateBlockingReasons.includes(
                        'token_cap_would_be_exceeded'
                      ) && (
                        <li>
                          Estimated token usage would exceed your remaining
                          capacity for today. Reduce scope or try again
                          tomorrow.
                        </li>
                      )}
                    </ul>
                  )}
                  {estimate.canProceed && (
                    <p className="mt-2 text-xs text-[hsl(var(--success-foreground))]">
                      This playbook can run safely within your current plan and
                      daily AI limits.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {rulesSummaryLabel}
                  </p>
                  {/* [PLAYBOOK-STEP-CONTINUITY-1] Draft status blocker evaluation */}
                  {/* [PLAYBOOK-STEP-CONTINUITY-1-FIXUP-2] Permission-safe blocker CTAs */}
                  {estimate.draftStatus === 'EXPIRED' && (
                    <div className="mt-3 rounded border border-border bg-[hsl(var(--warning-background))] p-3 text-xs text-[hsl(var(--warning-foreground))]">
                      <div className="flex items-start gap-2">
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-[hsl(var(--warning-foreground))]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div>
                          <p className="font-semibold">Draft expired</p>
                          <p className="mt-0.5">
                            The preview draft has expired. Regenerate the
                            preview to continue with apply.
                          </p>
                          {canGenerateDrafts ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedPlaybookId) {
                                  loadPreview(selectedPlaybookId);
                                }
                              }}
                              className="mt-2 inline-flex items-center rounded-md bg-[hsl(var(--warning))] px-2 py-1 text-xs font-medium text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--warning))]/90"
                            >
                              Regenerate Preview
                            </button>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Viewer role cannot generate previews.{' '}
                              <Link
                                href={`/projects/${projectId}/settings/members`}
                                className="text-primary hover:underline"
                              >
                                Request access
                              </Link>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {estimate.draftStatus === 'FAILED' && (
                    <div className="mt-3 rounded border border-border bg-[hsl(var(--danger-background))] p-3 text-xs text-[hsl(var(--danger-foreground))]">
                      <div className="flex items-start gap-2">
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-[hsl(var(--danger))]"
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
                          <p className="font-semibold">
                            Draft generation failed
                          </p>
                          <p className="mt-0.5">
                            The preview draft could not be generated. Please try
                            regenerating the preview.
                          </p>
                          {canGenerateDrafts ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedPlaybookId) {
                                  loadPreview(selectedPlaybookId);
                                }
                              }}
                              className="mt-2 inline-flex items-center rounded-md bg-[hsl(var(--danger))] px-2 py-1 text-xs font-medium text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--danger))]/90"
                            >
                              Retry Preview
                            </button>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Viewer role cannot generate previews.{' '}
                              <Link
                                href={`/projects/${projectId}/settings/members`}
                                className="text-primary hover:underline"
                              >
                                Request access
                              </Link>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* [PLAYBOOK-STEP-CONTINUITY-1-FIXUP-1] Blocker panel for draft missing/unknown */}
                  {/* [PLAYBOOK-STEP-CONTINUITY-1-FIXUP-2] Permission-safe blocker CTA */}
                  {!estimate.draftStatus && (
                    <div className="mt-3 rounded border border-border bg-[hsl(var(--surface-raised))] p-3 text-xs text-foreground">
                      <div className="flex items-start gap-2">
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-muted-foreground"
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
                          <p className="font-semibold">No draft available</p>
                          <p className="mt-0.5">
                            Generate a preview first to create a draft before
                            applying.
                          </p>
                          {canGenerateDrafts ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedPlaybookId) {
                                  loadPreview(selectedPlaybookId);
                                }
                              }}
                              className="mt-2 inline-flex items-center rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            >
                              Generate Preview
                            </button>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Viewer role cannot generate previews.{' '}
                              <Link
                                href={`/projects/${projectId}/settings/members`}
                                className="text-primary hover:underline"
                              >
                                Request access
                              </Link>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* [PLAYBOOK-STEP-CONTINUITY-1] Apply readiness / blocker evaluation
                EXACTLY ONE outcome at the end of Step 2:
                A) Actionable items exist + draft is valid → show "Continue to Apply"
                B) No actionable items → handled by isEligibilityEmptyState (zero-eligible empty state)
                C) Blocked by permission/scope → handled by role capability checks + inline notices
                D) Draft missing/invalid/expired/failed → show blocker panel above, hide "Continue to Apply"
            */}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFlowState(
                      hasPreview ? 'PREVIEW_GENERATED' : 'PREVIEW_READY'
                    )
                  }
                  className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                >
                  Back to Preview
                </button>
                {/* [PLAYBOOK-STEP-CONTINUITY-1-FIXUP-1] Only show "Continue to Apply" when draft has explicit valid status (READY or PARTIAL) */}
                {(estimate?.draftStatus === 'READY' ||
                  estimate?.draftStatus === 'PARTIAL') && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={
                      flowState !== 'ESTIMATE_READY' ||
                      step2Locked ||
                      !estimate ||
                      !estimate.canProceed ||
                      loadingEstimate
                    }
                    className="inline-flex items-center rounded-md border border-transparent bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue to Apply
                  </button>
                )}
              </div>
            </section>

            {/* Step 3: Apply */}
            {/* [PLAYBOOK-STEP-CONTINUITY-1] tabIndex for focus accessibility on scroll */}
            <section
              id="automation-playbook-apply-step"
              tabIndex={-1}
              className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4 focus:outline-none"
            >
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Step 3 – Apply playbook
                </h2>
                <p className="text-xs text-muted-foreground">
                  Confirm that you want EngineO.ai to write AI-generated SEO{' '}
                  {selectedDefinition.field === 'seoTitle'
                    ? 'titles'
                    : 'descriptions'}{' '}
                  for the affected products.
                </p>
              </div>
              {rules.enabled && (
                <p className="mb-3 text-xs text-muted-foreground">
                  These drafts were generated using your Playbook rules.
                </p>
              )}
              {rules.enabled &&
                previewSamples.some(
                  (sample) =>
                    sample.ruleWarnings && sample.ruleWarnings.length > 0
                ) && (
                  <div className="mb-3 rounded border border-border bg-[hsl(var(--warning-background))] p-2 text-xs text-[hsl(var(--warning-foreground))]">
                    Some suggestions were trimmed or flagged to fit your rules.
                    Review the preview before applying.
                  </div>
                )}
              {/* Inline error panels for 409 Conflict errors */}
              {applyInlineError?.code === 'PLAYBOOK_RULES_CHANGED' && (
                <div className="mb-3 rounded border border-border bg-[hsl(var(--warning-background))] p-3 text-xs text-[hsl(var(--warning-foreground))]">
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-[hsl(var(--warning-foreground))]"
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
                      <p className="font-semibold">
                        Rules changed since preview
                      </p>
                      <p className="mt-0.5">
                        Your playbook rules have changed since the preview was
                        generated. Regenerate the preview to see updated
                        suggestions before applying.
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
                        className="mt-2 inline-flex items-center rounded-md bg-[hsl(var(--warning))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:bg-[hsl(var(--warning))]/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Regenerate preview (uses AI)
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {applyInlineError?.code === 'PLAYBOOK_SCOPE_INVALID' && (
                <div className="mb-3 rounded border border-border bg-[hsl(var(--warning-background))] p-3 text-xs text-[hsl(var(--warning-foreground))]">
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-[hsl(var(--warning))]"
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
                        The set of affected products has changed since the
                        preview was generated (products may have been added,
                        removed, or updated). Regenerate the preview to work
                        with the current product set.
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
                        className="mt-2 inline-flex items-center rounded-md bg-[hsl(var(--warning))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:bg-[hsl(var(--warning))]/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Regenerate preview (uses AI)
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {applyInlineError?.code === 'PLAYBOOK_DRAFT_NOT_FOUND' && (
                <div className="mb-3 rounded border border-border bg-[hsl(var(--warning-background))] p-3 text-xs text-[hsl(var(--warning-foreground))]">
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-[hsl(var(--warning))]"
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
                        No draft was found for this playbook configuration.
                        Generate a preview first to create a draft before
                        applying.
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
                        title={
                          !canGenerateDrafts
                            ? 'Viewer role cannot generate previews'
                            : undefined
                        }
                        className="mt-2 inline-flex items-center rounded-md bg-[hsl(var(--warning))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:bg-[hsl(var(--warning))]/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Generate preview (uses AI)
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {applyInlineError?.code === 'PLAYBOOK_DRAFT_EXPIRED' && (
                <div className="mb-3 rounded border border-border bg-[hsl(var(--warning-background))] p-3 text-xs text-[hsl(var(--warning-foreground))]">
                  <div className="flex items-start gap-2">
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-[hsl(var(--warning))]"
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
                        The draft for this playbook has expired. Regenerate the
                        preview to create a fresh draft before applying.
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
                        className="mt-2 inline-flex items-center rounded-md bg-[hsl(var(--warning))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-sm hover:bg-[hsl(var(--warning))]/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Regenerate preview (uses AI)
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="mb-3 rounded border border-border bg-[hsl(var(--surface-raised))] p-3 text-xs text-foreground">
                <p>
                  This playbook will attempt to update up to{' '}
                  <span className="font-semibold">
                    {estimate?.totalAffectedProducts ?? 0}
                  </span>{' '}
                  product(s) where{' '}
                  <span className="font-mono">{selectedDefinition.field}</span>{' '}
                  is missing.
                </p>
                <p className="mt-1">
                  Changes are applied sequentially in small batches, respecting
                  your daily AI limits. If the daily limit is reached mid-run,
                  remaining products will be skipped.
                </p>
              </div>
              {/* Trust contract note */}
              <p className="mb-3 text-[11px] text-muted-foreground">
                EngineO.ai validates that your rules and product scope
                haven&apos;t changed since the preview. If they have,
                you&apos;ll be asked to regenerate the preview before applying.
              </p>
              <label className="mb-3 flex items-start gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={confirmApply}
                  onChange={(e) => setConfirmApply(e.target.checked)}
                  className="mt-0.5 h-3 w-3 rounded border-border text-primary focus:ring-primary"
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
                <div className="mb-3 rounded border border-border bg-[hsl(var(--surface-raised))] p-3 text-xs text-foreground">
                  Applying Automation Playbook… This may take a moment for
                  larger catalogs.
                </div>
              )}
              {applyResult && (
                <div className="mb-3 space-y-3">
                  {/* Summary */}
                  <div className="rounded border border-border bg-[hsl(var(--success-background))] p-3 text-xs text-[hsl(var(--success-foreground))]">
                    <p>
                      Updated products:{' '}
                      <span className="font-semibold">
                        {applyResult.updatedCount}
                      </span>
                    </p>
                    <p>
                      Skipped products:{' '}
                      <span className="font-semibold">
                        {applyResult.skippedCount}
                      </span>
                    </p>
                    <p>
                      Attempted:{' '}
                      <span className="font-semibold">
                        {applyResult.attemptedCount}
                      </span>{' '}
                      / {applyResult.totalAffectedProducts}
                    </p>
                  </div>
                  {/* Stopped safely banner */}
                  {applyResult.stopped && (
                    <div className="rounded border border-border bg-[hsl(var(--warning-background))] p-3 text-xs text-[hsl(var(--warning-foreground))]">
                      <div className="flex items-start gap-2">
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-[hsl(var(--warning-foreground))]"
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
                                className="font-medium underline hover:text-foreground"
                              >
                                {products.find(
                                  (p) => p.id === applyResult.stoppedAtProductId
                                )?.title || applyResult.stoppedAtProductId}
                              </Link>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Skipped products warning */}
                  {applyResult.skippedCount > 0 && !applyResult.stopped && (
                    <div className="rounded border border-border bg-[hsl(var(--warning-background))] p-3 text-xs text-[hsl(var(--warning-foreground))]">
                      <div className="flex items-start gap-2">
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-[hsl(var(--warning-foreground))]"
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
                            Some products were skipped because they already had
                            valid SEO{' '}
                            {selectedDefinition?.field === 'seoTitle'
                              ? 'titles'
                              : 'descriptions'}{' '}
                            or encountered validation issues. View per-product
                            results below for details.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Per-item results panel */}
                  {/* [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-5] Canonical DataTable (dense) for per-product results */}
                  {applyResult.results && applyResult.results.length > 0 && (
                    <details className="rounded border border-border bg-[hsl(var(--surface-card))]">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground hover:bg-[hsl(var(--menu-hover-bg)/0.14)]">
                        View per-product results ({applyResult.results.length}{' '}
                        items)
                      </summary>
                      <div className="max-h-64 overflow-y-auto border-t border-border">
                        <DataTable<{
                          id: string;
                          productId: string;
                          status: string;
                          message: string;
                        }>
                          columns={
                            [
                              {
                                key: 'product',
                                header: 'Product',
                                cell: (row) => {
                                  if (row.productId === 'LIMIT_REACHED') {
                                    return (
                                      <span className="text-muted-foreground">
                                        —
                                      </span>
                                    );
                                  }
                                  const product = products.find(
                                    (p) => p.id === row.productId
                                  );
                                  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Build results context URL for product deep link with canonical route
                                  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Use shared scope args via playbookRunScopeForUrl
                                  const returnToPath = buildPlaybookRunHref({
                                    projectId,
                                    playbookId: selectedPlaybookId!,
                                    step: 'preview',
                                    source: 'product_details',
                                    ...playbookRunScopeForUrl,
                                  });
                                  const resultsContextUrl = `/projects/${projectId}/products/${row.productId}?from=playbook_results&playbookId=${selectedPlaybookId}&returnTo=${encodeURIComponent(returnToPath)}`;
                                  return (
                                    <Link
                                      href={resultsContextUrl}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        handleNavigate(resultsContextUrl);
                                      }}
                                      className="text-primary hover:text-primary/80"
                                    >
                                      {product?.title || row.productId}
                                    </Link>
                                  );
                                },
                              },
                              {
                                key: 'status',
                                header: 'Status',
                                cell: (row) => (
                                  <span
                                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                                      row.status === 'UPDATED'
                                        ? 'bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]'
                                        : row.status === 'SKIPPED'
                                          ? 'bg-muted text-muted-foreground'
                                          : row.status === 'LIMIT_REACHED'
                                            ? 'bg-[hsl(var(--warning-background))] text-[hsl(var(--warning-foreground))]'
                                            : 'bg-[hsl(var(--danger-background))] text-[hsl(var(--danger-foreground))]'
                                    }`}
                                  >
                                    {row.status}
                                  </span>
                                ),
                              },
                              {
                                key: 'message',
                                header: 'Message',
                                cell: (row) => (
                                  <span className="text-muted-foreground">
                                    {row.message}
                                  </span>
                                ),
                              },
                            ] as DataTableColumn<{
                              id: string;
                              productId: string;
                              status: string;
                              message: string;
                            }>[]
                          }
                          rows={applyResult.results.map((item) => ({
                            id: item.productId,
                            productId: item.productId,
                            status: item.status,
                            message: item.message,
                          }))}
                          density="dense"
                          hideContextAction={true}
                        />
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
                            `/projects/${projectId}/products?from=playbook_results&playbookId=${selectedPlaybookId}`
                          )
                        }
                        className="inline-flex items-center rounded-md border border-transparent bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        View updated products
                      </button>
                      {/* [AUTOMATION-TRIGGER-TRUTHFULNESS-1] CTA label is deterministic */}
                      <button
                        type="button"
                        onClick={handleSyncProducts}
                        className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                      >
                        {willGenerateAnswerBlocksOnProductSync
                          ? 'Sync products + Generate Answer Blocks'
                          : 'Sync products'}
                      </button>
                      {/* [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-2] Use canonical /playbooks route */}
                      <button
                        type="button"
                        onClick={() =>
                          handleNavigate(`/projects/${projectId}/playbooks`)
                        }
                        className="inline-flex items-center rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                      >
                        Return to Playbooks
                      </button>
                    </>
                  )}
                </div>
                {flowState !== 'APPLY_COMPLETED' &&
                  flowState !== 'APPLY_STOPPED' && (
                    <>
                      {/* [ROLES-3 FIXUP-3 CORRECTION] All notices derived from server state (pendingApproval) */}
                      {(() => {
                        // Derive approval state from server-sourced pendingApproval
                        const approvalStatus = pendingApproval?.status;
                        const approvalConsumed =
                          pendingApproval?.consumed ?? false;
                        const hasPendingApproval =
                          approvalStatus === 'PENDING_APPROVAL';
                        const hasApprovedApproval =
                          approvalStatus === 'APPROVED' && !approvalConsumed;
                        const needsNewRequest =
                          !pendingApproval ||
                          approvalStatus === 'REJECTED' ||
                          approvalConsumed;

                        // [PLAYBOOK-STEP-CONTINUITY-1] VIEWER notice with resolution CTA
                        if (
                          !roleCapabilities.canRequestApproval &&
                          !roleCapabilities.canApply
                        ) {
                          return (
                            <p className="mr-4 text-xs text-muted-foreground">
                              Viewer role cannot apply. Preview and export
                              remain available.{' '}
                              <Link
                                href={`/projects/${projectId}/settings/members`}
                                className="text-primary hover:underline"
                              >
                                Request access
                              </Link>
                            </p>
                          );
                        }

                        // [PLAYBOOK-STEP-CONTINUITY-1] EDITOR notices with resolution CTA (can request but not apply)
                        if (
                          roleCapabilities.canRequestApproval &&
                          !roleCapabilities.canApply
                        ) {
                          if (!approvalRequired) {
                            return (
                              <p className="mr-4 text-xs text-muted-foreground">
                                Editor role cannot apply. An owner must apply
                                this playbook.{' '}
                                <Link
                                  href={`/projects/${projectId}/settings/members`}
                                  className="text-primary hover:underline"
                                >
                                  Manage members
                                </Link>
                              </p>
                            );
                          }
                          if (hasPendingApproval) {
                            return (
                              <p className="mr-4 text-xs text-[hsl(var(--warning-foreground))]">
                                Approval pending. Waiting for owner to approve.
                              </p>
                            );
                          }
                          if (hasApprovedApproval) {
                            return (
                              <p className="mr-4 text-xs text-[hsl(var(--success-foreground))]">
                                Approved — an owner must apply this playbook.
                              </p>
                            );
                          }
                          return (
                            <p className="mr-4 text-xs text-[hsl(var(--warning-foreground))]">
                              Approval required. Click to request owner
                              approval.
                            </p>
                          );
                        }

                        // OWNER notices
                        if (roleCapabilities.canApply && approvalRequired) {
                          if (hasPendingApproval) {
                            return (
                              <p className="mr-4 text-xs text-[hsl(var(--warning-foreground))]">
                                Pending approval from Editor. Click to approve
                                and apply.
                              </p>
                            );
                          }
                          if (hasApprovedApproval) {
                            return (
                              <p className="mr-4 text-xs text-[hsl(var(--success-foreground))]">
                                Approval granted. Ready to apply.
                              </p>
                            );
                          }
                          if (isMultiUserProject && needsNewRequest) {
                            return (
                              <p className="mr-4 text-xs text-[hsl(var(--warning-foreground))]">
                                An Editor must request approval first.
                              </p>
                            );
                          }
                          return (
                            <p className="mr-4 text-xs text-[hsl(var(--warning-foreground))]">
                              Approval required before apply.
                            </p>
                          );
                        }

                        return null;
                      })()}
                      {/* [ROLES-3 PENDING-1] Approval Attribution Panel */}
                      {pendingApproval && approvalRequired && (
                        <div className="mr-4 flex flex-col gap-0.5 text-xs text-muted-foreground">
                          <span>
                            Requested by{' '}
                            {getUserDisplayName(
                              pendingApproval.requestedByUserId
                            )}{' '}
                            on{' '}
                            {new Date(
                              pendingApproval.requestedAt
                            ).toLocaleDateString()}
                          </span>
                          {pendingApproval.decidedByUserId &&
                            pendingApproval.decidedAt && (
                              <span>
                                {pendingApproval.status === 'APPROVED'
                                  ? 'Approved'
                                  : 'Decided'}{' '}
                                by{' '}
                                {getUserDisplayName(
                                  pendingApproval.decidedByUserId
                                )}{' '}
                                on{' '}
                                {new Date(
                                  pendingApproval.decidedAt
                                ).toLocaleDateString()}
                              </span>
                            )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleApplyPlaybook}
                        disabled={(() => {
                          // Base conditions
                          if (
                            flowState !== 'APPLY_READY' ||
                            applying ||
                            !estimate ||
                            !estimate.canProceed ||
                            !confirmApply ||
                            approvalLoading
                          ) {
                            return true;
                          }
                          // VIEWER blocked
                          if (
                            !roleCapabilities.canRequestApproval &&
                            !roleCapabilities.canApply
                          ) {
                            return true;
                          }
                          // EDITOR: blocked if approval already pending or approved (they can only request once)
                          if (
                            roleCapabilities.canRequestApproval &&
                            !roleCapabilities.canApply
                          ) {
                            const status = pendingApproval?.status;
                            if (
                              status === 'PENDING_APPROVAL' ||
                              (status === 'APPROVED' &&
                                !pendingApproval?.consumed)
                            ) {
                              return true;
                            }
                          }
                          // OWNER in multi-user project with approval required but no pending request
                          if (
                            roleCapabilities.canApply &&
                            approvalRequired &&
                            isMultiUserProject
                          ) {
                            const hasActionableApproval =
                              pendingApproval &&
                              (pendingApproval.status === 'PENDING_APPROVAL' ||
                                (pendingApproval.status === 'APPROVED' &&
                                  !pendingApproval.consumed));
                            if (!hasActionableApproval) {
                              return true;
                            }
                          }
                          return false;
                        })()}
                        className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {(() => {
                          if (applying || approvalLoading) return 'Processing…';

                          // EDITOR button text
                          if (
                            roleCapabilities.canRequestApproval &&
                            !roleCapabilities.canApply
                          ) {
                            const status = pendingApproval?.status;
                            if (status === 'PENDING_APPROVAL')
                              return 'Pending approval';
                            if (
                              status === 'APPROVED' &&
                              !pendingApproval?.consumed
                            )
                              return 'Approved — Owner applies';
                            return 'Request approval';
                          }

                          // OWNER button text
                          if (roleCapabilities.canApply) {
                            if (!approvalRequired) return 'Apply playbook';
                            const status = pendingApproval?.status;
                            if (status === 'PENDING_APPROVAL')
                              return 'Approve and apply';
                            if (
                              status === 'APPROVED' &&
                              !pendingApproval?.consumed
                            )
                              return 'Apply playbook';
                            if (isMultiUserProject)
                              return 'Waiting for Editor request';
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
        ))}
    </div>
  );
}
