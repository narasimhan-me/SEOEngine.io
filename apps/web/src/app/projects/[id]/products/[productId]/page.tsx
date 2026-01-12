'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue } from '@/lib/deo-issues';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi, productsApi, aiApi, shopifyApi, ApiError, billingApi } from '@/lib/api';
import type { Product } from '@/lib/products';
import { getProductStatus } from '@/lib/products';
import {
  getIssueFixPathForProduct,
  getSafeIssueTitle,
  FIX_SURFACE_TO_TAB,
  getActionableIssuesForProduct,
  getIssueFixConfig,
} from '@/lib/issue-to-fix-path';
// [ISSUE-FIX-NAV-AND-ANCHORS-1] Import navigation and anchor utilities
import {
  getValidatedReturnTo,
  buildBackLink,
  type FromContext,
} from '@/lib/issue-fix-navigation';
import { ScopeBanner } from '@/components/common/ScopeBanner';
import { getSafeReturnTo } from '@/lib/route-context';
// [SCOPE-CLARITY-1] Import scope normalization utilities
import { normalizeScopeParams, buildClearFiltersHref } from '@/lib/scope-normalization';
import {
  scrollToFixAnchor,
  getArrivalCalloutContent,
  injectHighlightStyles,
} from '@/lib/issue-fix-anchors';
import {
  ProductOptimizationLayout,
  ProductOverviewPanel,
  ProductAiSuggestionsPanel,
  ProductSeoEditor,
  ProductDeoInsightsPanel,
  ProductSearchIntentPanel,
  ProductCompetitorsPanel,
  ProductGeoPanel,
  ProductDetailsTabs,
  ProductIssuesPanel,
  useActiveProductTab,
  type ProductMetadataSuggestion,
  type AutomationSuggestion,
} from '@/components/products/optimization';
import { ProductAnswersPanel, type ProductAnswersResponse } from '@/components/products/optimization/ProductAnswersPanel';
import {
  ProductAnswerBlocksPanel,
  ProductAutomationHistoryPanel,
} from '@/components/products/optimization';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { useUnsavedChanges } from '@/components/unsaved-changes/UnsavedChangesProvider';
// [DRAFT-REVIEW-ISOLATION-1] Import isolated non-AI Draft Review component
// [DRAFT-FIELD-COVERAGE-1] Generalized to AssetDraftsTab supporting Products, Pages, Collections
import { AssetDraftsTab } from '@/components/products/AssetDraftsTab';

// [DRAFT-CLARITY-AND-ACTION-TRUST-1] Draft state types
type MetadataDraftState = 'unsaved' | 'saved' | 'applied';

interface MetadataDraft {
  title: string;
  description: string;
  savedAt?: string;
}

// Session storage key for metadata drafts
const getMetadataDraftKey = (productId: string) => `metadataDraft:${productId}`;

// [TRUST-ROUTING-1] Preview sample interface matching playbooks session storage
interface PlaybookPreviewSample {
  productId: string;
  productTitle: string;
  currentTitle: string;
  currentDescription: string;
  suggestedTitle: string;
  suggestedDescription: string;
  ruleWarnings?: string[];
}

export default function ProductOptimizationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const productId = params.productId as string;
  const feedback = useFeedback();

  // [TRUST-ROUTING-1] Read playbook context from URL query params
  const fromContext = searchParams.get('from') as FromContext | null;
  const playbookIdParam = searchParams.get('playbookId');
  const returnToParam = searchParams.get('returnTo');
  const returnLabelParam = searchParams.get('returnLabel');

  // [ISSUE-TO-FIX-PATH-1] Read issue context from URL query params
  const issueIdParam = searchParams.get('issueId');
  const highlightParam = searchParams.get('highlight');
  // [ISSUE-FIX-NAV-AND-ANCHORS-1] Read fix anchor from URL
  const fixAnchorParam = searchParams.get('fixAnchor');
  // [ISSUE-FIX-KIND-CLARITY-1] Read fixKind from URL
  const fixKindParam = searchParams.get('fixKind') as 'EDIT' | 'AI' | 'DIAGNOSTIC' | null;

  // [ISSUE-FIX-NAV-AND-ANCHORS-1] Validate returnTo using centralized validation
  const validatedNavContext = useMemo(() => {
    return getValidatedReturnTo(projectId, searchParams);
  }, [projectId, searchParams]);

  // [TRUST-ROUTING-1] Backward compat: Validate returnTo for playbook paths
  // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Expand to accept both /automation/playbooks and canonical /playbooks
  const validatedReturnTo = useMemo(() => {
    // First try the new validation
    if (validatedNavContext.returnTo) {
      return validatedNavContext.returnTo;
    }
    // Fallback to legacy playbook-only validation
    if (!returnToParam) return null;
    const decoded = decodeURIComponent(returnToParam);
    // Allow navigation to playbooks path for this project (both legacy and canonical)
    if (
      decoded.startsWith(`/projects/${projectId}/automation/playbooks`) ||
      decoded.startsWith(`/projects/${projectId}/playbooks`)
    ) {
      return decoded;
    }
    // Fallback to safe default using canonical route
    return playbookIdParam
      ? `/projects/${projectId}/playbooks/${playbookIdParam}?step=preview&source=product_details`
      : null;
  }, [validatedNavContext.returnTo, returnToParam, projectId, playbookIdParam]);

  // [ISSUE-FIX-NAV-AND-ANCHORS-1] Build the back link for issue fix mode
  const issueFixBackLink = useMemo(() => {
    return buildBackLink({
      projectId,
      returnTo: validatedNavContext.returnTo,
      returnLabel: validatedNavContext.returnLabel || returnLabelParam || undefined,
      from: validatedNavContext.from || (fromContext as FromContext | undefined),
      fallback: 'issues',
    });
  }, [projectId, validatedNavContext, returnLabelParam, fromContext]);

  // [TRUST-ROUTING-1] Determine preview/results mode
  const isPreviewMode = fromContext === 'playbook_preview' && !!playbookIdParam;
  const isResultsMode = fromContext === 'playbook_results' && !!playbookIdParam;

  // [ROUTE-INTEGRITY-1] Get validated returnTo for ScopeBanner
  const scopeBannerReturnTo = useMemo(() => {
    return getSafeReturnTo(searchParams, projectId);
  }, [searchParams, projectId]);

  // [SCOPE-CLARITY-1] Normalize scope params using canonical normalization
  const normalizedScopeResult = useMemo(() => {
    return normalizeScopeParams(searchParams);
  }, [searchParams]);

  // [ISSUE-TO-FIX-PATH-1 FIXUP-1] Determine issue fix mode - triggers on issueId alone, not requiring from=issues
  const isIssueFixMode = !!issueIdParam;

  // [TRUST-ROUTING-1] Preview sample state from session storage
  const [previewSample, setPreviewSample] = useState<PlaybookPreviewSample | null>(null);
  const [previewExpired, setPreviewExpired] = useState(false);

  // [ISSUE-TO-FIX-PATH-1] Issue fix context state
  // [ISSUE-FIX-NAV-AND-ANCHORS-1] Extended with nextActionLabel and anchor result
  // [ISSUE-FIX-KIND-CLARITY-1] Extended with fixKind
  const [issueFixContext, setIssueFixContext] = useState<{
    issueId: string;
    issueTitle: string;
    highlightTarget?: string;
    nextActionLabel?: string;
    fixAnchorTestId?: string;
    anchorFound?: boolean;
    issuePresentOnSurface?: boolean;
    fixKind?: 'EDIT' | 'AI' | 'DIAGNOSTIC';
  } | null>(null);
  const issueFixRouteHandledRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_issueHighlightActive, setIssueHighlightActive] = useState(false);

  // [ISSUE-FIX-NAV-AND-ANCHORS-1] Inject highlight styles on mount
  useEffect(() => {
    injectHighlightStyles();
  }, []);

  // [DEO-UX-REFRESH-1] Tab state from URL
  const activeTab = useActiveProductTab();

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAiLimitError, setIsAiLimitError] = useState(false);

  // Data states
  const [projectName, setProjectName] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productIssues, setProductIssues] = useState<DeoIssue[]>([]);
  // [COUNT-INTEGRITY-1.1 PATCH 6] Asset-scoped canonical triplet summary
  const [productIssuesSummary, setProductIssuesSummary] = useState<{
    detected: { issueTypesCount: number; affectedItemsCount: number; actionableNowCount: number };
    actionable: { issueTypesCount: number; affectedItemsCount: number; actionableNowCount: number };
  } | null>(null);

  // Editor states
  const [editorTitle, setEditorTitle] = useState('');
  const [editorDescription, setEditorDescription] = useState('');
  const [initialTitle, setInitialTitle] = useState('');
  const [initialDescription, setInitialDescription] = useState('');

  // AI states
  const [suggestion, setSuggestion] = useState<ProductMetadataSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [automationSuggestion, setAutomationSuggestion] = useState<AutomationSuggestion | null>(null);

  // Shopify apply state
  const [applyingToShopify, setApplyingToShopify] = useState(false);

  // Answer Engine states (AE-1.2)
  const [answersResponse, setAnswersResponse] = useState<ProductAnswersResponse | null>(null);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [hasAnswerBlocks, setHasAnswerBlocks] = useState(false);
  const [showAiDiagnosticPreviews, setShowAiDiagnosticPreviews] = useState(false);

  const [aeoSyncToShopifyMetafields, setAeoSyncToShopifyMetafields] = useState(false);

  // Track if we've shown the auto-apply toast (one-time per page load)
  const autoApplyToastShown = useRef(false);

  // [DRAFT-REVIEW-ISOLATION-1] Drafts tab state moved to isolated ProductDraftsTab component

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Draft lifecycle state
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [savedDraft, setSavedDraft] = useState<MetadataDraft | null>(null);
  const [appliedAt, setAppliedAt] = useState<string | null>(null);
  const [seoEditorHighlighted, setSeoEditorHighlighted] = useState(false);
  const seoEditorRef = useRef<HTMLDivElement>(null);

  // Compute draft state based on editor values vs saved/applied baseline
  const draftState = useMemo((): MetadataDraftState => {
    // If we have a saved draft and current editor matches saved draft (no edits since save)
    if (savedDraft) {
      const editorMatchesSaved =
        editorTitle === savedDraft.title && editorDescription === savedDraft.description;
      if (editorMatchesSaved) {
        return 'saved';
      }
      // Editor differs from saved draft - unsaved changes
      return 'unsaved';
    }
    // No saved draft - check if editor differs from initial/applied values
    const hasEditorChanges =
      editorTitle !== initialTitle || editorDescription !== initialDescription;
    if (hasEditorChanges) {
      return 'unsaved';
    }
    // No changes from baseline - could be applied state or initial
    if (appliedAt) {
      return 'applied';
    }
    return 'applied'; // Default to applied when no changes
  }, [savedDraft, editorTitle, editorDescription, initialTitle, initialDescription, appliedAt]);

  // Determine if Apply button should be enabled (only when saved draft exists and no unsaved edits)
  const canApplyToShopify = useMemo(() => {
    return draftState === 'saved' && savedDraft !== null;
  }, [draftState, savedDraft]);

  // Sync unsaved changes with global provider
  useEffect(() => {
    setHasUnsavedChanges(draftState === 'unsaved');
  }, [draftState, setHasUnsavedChanges]);

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Track if we've restored a saved draft (to prevent fetchData overwrite)
  const savedDraftRestoredRef = useRef(false);

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Load saved draft from session storage on mount
  useEffect(() => {
    if (!productId) return;
    try {
      const stored = sessionStorage.getItem(getMetadataDraftKey(productId));
      if (stored) {
        const draft = JSON.parse(stored) as MetadataDraft;
        setSavedDraft(draft);
        savedDraftRestoredRef.current = true;
        // Restore editor to saved draft values
        setEditorTitle(draft.title);
        setEditorDescription(draft.description);
      }
    } catch {
      // Ignore parse errors
    }
  }, [productId]);

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Save draft handler
  const handleSaveDraft = useCallback(() => {
    const draft: MetadataDraft = {
      title: editorTitle,
      description: editorDescription,
      savedAt: new Date().toISOString(),
    };
    setSavedDraft(draft);
    try {
      sessionStorage.setItem(getMetadataDraftKey(productId), JSON.stringify(draft));
    } catch {
      // Ignore storage errors
    }
    feedback.showSuccess('Draft saved. You can now apply it to Shopify.');
  }, [editorTitle, editorDescription, productId, feedback]);

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Auto-scroll and highlight SEO editor
  const scrollToAndHighlightSeoEditor = useCallback(() => {
    if (seoEditorRef.current) {
      seoEditorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSeoEditorHighlighted(true);
      setTimeout(() => setSeoEditorHighlighted(false), 2000);
    }
  }, []);

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Navigation protection for local router.push
  const navigateWithUnsavedCheck = useCallback(
    (href: string) => {
      if (draftState === 'unsaved') {
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to leave this page?'
        );
        if (!confirmed) return;
      }
      router.push(href);
    },
    [draftState, router]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch project, integrations, products, issues, automation suggestions, and entitlements in parallel
      const [
        projectData,
        integrationStatus,
        productsData,
        issuesResponse,
        automationResponse,
        entitlements,
      ] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.integrationStatus(projectId),
        productsApi.list(projectId),
        // [COUNT-INTEGRITY-1.1 PATCH 6] Use asset-specific issues endpoint
        projectsApi.assetIssues(projectId, 'products', productId).catch(() => ({
          issues: [],
          summary: {
            detected: { issueTypesCount: 0, affectedItemsCount: 0, actionableNowCount: 0 },
            actionable: { issueTypesCount: 0, affectedItemsCount: 0, actionableNowCount: 0 },
          },
        })),
        projectsApi.automationSuggestions(projectId).catch(() => ({ suggestions: [] })),
        billingApi.getEntitlements().catch(() => null),
      ]);

      setProjectName(projectData.name);
      setAeoSyncToShopifyMetafields(
        Boolean((integrationStatus as any)?.aeoSyncToShopifyMetafields),
      );
      if (entitlements && typeof (entitlements as any).plan === 'string') {
        setPlanId((entitlements as any).plan as string);
      } else {
        setPlanId(null);
      }

      // Find the specific product
      const foundProduct = productsData.find((p: Product) => p.id === productId);

      if (!foundProduct) {
        setError('Product not found for this project');
        setProduct(null);
        return;
      }

      setProduct(foundProduct);

      // [COUNT-INTEGRITY-1.1 PATCH 6] Use asset issues response directly (no client-side filtering)
      setProductIssues((issuesResponse as any).issues ?? []);
      setProductIssuesSummary((issuesResponse as any).summary ?? null);

      // Find automation suggestion for this product (if any)
      // Prefer unapplied suggestions for the panel
      const productAutomationSuggestion = (automationResponse.suggestions ?? []).find(
        (s: AutomationSuggestion) => s.targetType === 'product' && s.targetId === productId && !s.applied
      );
      setAutomationSuggestion(productAutomationSuggestion || null);

      // Check for recently auto-applied suggestion (within last 24 hours)
      const recentAutoApplied = (automationResponse.suggestions ?? []).find(
        (s: AutomationSuggestion) => {
          if (s.targetType !== 'product' || s.targetId !== productId || !s.applied || !s.appliedAt) {
            return false;
          }
          const appliedTime = new Date(s.appliedAt).getTime();
          const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
          return appliedTime > twentyFourHoursAgo;
        }
      );

      // Show one-time success toast for recent auto-apply
      if (recentAutoApplied && !autoApplyToastShown.current) {
        autoApplyToastShown.current = true;
        feedback.showSuccess('Automation Engine improved this product\'s metadata automatically.');
      }

      // Initialize editor fields
      const title = foundProduct.seoTitle || foundProduct.title || '';
      const description = foundProduct.seoDescription || foundProduct.description || '';

      // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Only set editor values if no saved draft was restored
      // This prevents fetchData from overwriting restored draft values
      setInitialTitle(title);
      setInitialDescription(description);
      if (!savedDraftRestoredRef.current) {
        setEditorTitle(title);
        setEditorDescription(description);
      }
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load product data');
    } finally {
      setLoading(false);
    }
  }, [projectId, productId, feedback]);

  const fetchSuggestion = useCallback(async () => {
    if (!product) return;

    try {
      setLoadingSuggestion(true);
      setError('');
      setIsAiLimitError(false);

      const result = await aiApi.suggestProductMetadata(product.id);
      setSuggestion(result);

      feedback.showSuccess('AI suggestion generated for this product.');

      // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Scroll to SEO editor after generation
      setTimeout(() => scrollToAndHighlightSeoEditor(), 100);
    } catch (err: unknown) {
      console.error('Error fetching AI suggestion:', err);

      // Handle daily AI limit reached with a clear, friendly message.
      if (err instanceof ApiError && err.code === 'AI_DAILY_LIMIT_REACHED') {
        const limitMessage =
          "Daily AI limit reached. You've used all 5 AI suggestions available on the Free plan. Your limit resets tomorrow, or upgrade to continue.";
        setIsAiLimitError(true);
        setError(limitMessage);
        feedback.showLimit(limitMessage, '/settings/billing');
        return;
      }

      // Generic provider/model failure – show a non-technical error and surface the
      // "AI unavailable" state in the panel.
      setIsAiLimitError(false);
      const message =
        'AI suggestions are temporarily unavailable. Please try again later.';
      setError(message);
      feedback.showError(message);
      if (product) {
        setSuggestion({
          productId: product.id,
          current: {
            title: product.seoTitle || product.title,
            description: product.seoDescription || product.description || '',
          },
          suggested: {
            title: '',
            description: '',
          },
        });
      }
    } finally {
      setLoadingSuggestion(false);
    }
  }, [product, feedback, scrollToAndHighlightSeoEditor]);

  const recommendedAutomationIntent = useMemo(() => {
    if (!product) return 'unknown';
    const missingTitle = !product.seoTitle || !product.seoTitle.trim();
    const missingDescription = !product.seoDescription || !product.seoDescription.trim();
    if (missingTitle || missingDescription) return 'missing_metadata';
    if (productIssues.some((i) => i.pillarId === 'search_intent_fit')) return 'search_intent';
    if (productIssues.some((i) => i.pillarId === 'content_commerce_signals')) return 'content';
    return 'unknown';
  }, [product, productIssues]);

  // [ISSUE-TO-FIX-PATH-1] Count only actionable-in-product issues for tab badge
  const actionableIssueCount = useMemo(() => {
    return getActionableIssuesForProduct(productIssues).length;
  }, [productIssues]);

  const handleAutomateThisFix = useCallback(() => {
    if (!product) return;
    const key = `automationEntryContext:${projectId}`;
    const scopeKey = `automationEntryScope:${projectId}`;
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          createdAt: new Date().toISOString(),
          source: 'product_details',
          intent: recommendedAutomationIntent,
          selectedProductIds: [productId],
        }),
      );
      sessionStorage.setItem(scopeKey, JSON.stringify({ productIds: [productId] }));
    } catch {
      // ignore
    }
    // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Use navigation protection
    navigateWithUnsavedCheck(
      `/projects/${projectId}/automation/playbooks/entry?source=product_details&intent=${encodeURIComponent(
        recommendedAutomationIntent,
      )}`,
    );
  }, [projectId, productId, product, navigateWithUnsavedCheck, recommendedAutomationIntent]);

  const fetchAnswers = useCallback(async () => {
    if (!product) return;

    try {
      setLoadingAnswers(true);
      setAnswersError(null);

      const result = await aiApi.generateProductAnswers(product.id);
      setAnswersResponse(result as ProductAnswersResponse);

      const answerCount = result.answers?.length || 0;
      feedback.showSuccess(`Generated ${answerCount} answer(s) for this product.`);
    } catch (err: unknown) {
      console.error('Error generating answers:', err);

      // Handle daily AI limit reached
      if (err instanceof ApiError && err.code === 'AI_DAILY_LIMIT_REACHED') {
        const limitMessage =
          "Daily AI limit reached. You've used all AI suggestions available on your plan. Your limit resets tomorrow, or upgrade to continue.";
        setAnswersError(limitMessage);
        feedback.showLimit(limitMessage, '/settings/billing');
        return;
      }

      // Generic error
      const message =
        err instanceof Error ? err.message : 'Failed to generate answers. Please try again.';
      setAnswersError(message);
      feedback.showError(message);
    } finally {
      setLoadingAnswers(false);
    }
  }, [product, feedback]);

  const handleApplyToShopify = useCallback(async () => {
    if (!product) return;

    // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Apply ONLY saved draft values, never auto-save
    if (!savedDraft) {
      feedback.showError('Please save your draft before applying to Shopify.');
      return;
    }

    // Use saved draft values, not current editor values
    const applyTitle = savedDraft.title;
    const applyDescription = savedDraft.description;

    try {
      setApplyingToShopify(true);
      setError('');

      await shopifyApi.updateProductSeo(product.id, applyTitle, applyDescription);

      const applyTimestamp = new Date().toISOString();

      // Update local product state with saved draft values
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              seoTitle: applyTitle,
              seoDescription: applyDescription,
              lastOptimizedAt: applyTimestamp,
            }
          : prev
      );

      // Update initial values to match applied values
      setInitialTitle(applyTitle);
      setInitialDescription(applyDescription);

      // Update editor to match applied values
      setEditorTitle(applyTitle);
      setEditorDescription(applyDescription);

      // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Clear saved draft and set applied timestamp
      setSavedDraft(null);
      setAppliedAt(applyTimestamp);
      try {
        sessionStorage.removeItem(getMetadataDraftKey(productId));
      } catch {
        // Ignore storage errors
      }

      const message =
        'SEO updated in Shopify successfully! Applied to Shopify and saved in EngineO.';
      setSuccessMessage(message);
      feedback.showSuccess(message);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: unknown) {
      console.error('Error applying to Shopify:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to update SEO in Shopify';
      setError(message);
      feedback.showError(message);
    } finally {
      setApplyingToShopify(false);
    }
  }, [product, savedDraft, productId, feedback]);

  const handleReset = useCallback(() => {
    setEditorTitle(initialTitle);
    setEditorDescription(initialDescription);
  }, [initialTitle, initialDescription]);

  const handleApplySuggestion = useCallback(
    (values: { title?: string; description?: string }) => {
      if (values.title !== undefined) {
        setEditorTitle(values.title);
      }
      if (values.description !== undefined) {
        setEditorDescription(values.description);
      }
      // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Auto-scroll and highlight SEO editor after adding to draft
      setTimeout(() => scrollToAndHighlightSeoEditor(), 100);
    },
    [scrollToAndHighlightSeoEditor]
  );

  // [DEO-UX-REFRESH-1] Scroll removed - now using tab-based navigation

  useEffect(() => {
    // Reset AI diagnostic preview visibility when navigating between products
    setShowAiDiagnosticPreviews(false);
  }, [productId]);

  // [TRUST-ROUTING-1] Load preview sample from session storage when in preview mode
  useEffect(() => {
    if (!isPreviewMode || !playbookIdParam) {
      setPreviewSample(null);
      setPreviewExpired(false);
      return;
    }

    try {
      const key = `automationPlaybookState:${projectId}:${playbookIdParam}`;
      const stored = window.sessionStorage.getItem(key);

      if (!stored) {
        setPreviewExpired(true);
        setPreviewSample(null);
        return;
      }

      const parsed = JSON.parse(stored) as {
        previewSamples?: PlaybookPreviewSample[];
      };

      if (!parsed.previewSamples || parsed.previewSamples.length === 0) {
        setPreviewExpired(true);
        setPreviewSample(null);
        return;
      }

      // Find matching sample for this product
      const matchingSample = parsed.previewSamples.find(
        (s) => s.productId === productId
      );

      if (matchingSample) {
        setPreviewSample(matchingSample);
        setPreviewExpired(false);
      } else {
        setPreviewExpired(true);
        setPreviewSample(null);
      }
    } catch {
      setPreviewExpired(true);
      setPreviewSample(null);
    }
  }, [isPreviewMode, playbookIdParam, projectId, productId]);

  // [ISSUE-TO-FIX-PATH-1] Handle issue fix routing and highlighting on initial load
  useEffect(() => {
    // Skip if not in issue fix mode or already handled
    if (!isIssueFixMode || issueFixRouteHandledRef.current || loading) {
      return;
    }

    // Find the matching issue from productIssues
    const matchingIssue = productIssues.find((i) => i.id === issueIdParam);
    const issuePresentOnSurface = !!matchingIssue;

    // Get the fix path for this issue (from issue itself or from URL param)
    const fixPath = matchingIssue ? getIssueFixPathForProduct(matchingIssue) : null;

    // [ISSUE-FIX-NAV-AND-ANCHORS-1] Get fix config for nextActionLabel even if issue not found
    const fixConfig = getIssueFixConfig(issueIdParam);

    // Determine the anchor to use (URL param > fix path > config)
    const fixAnchorTestId = fixAnchorParam || fixPath?.fixAnchorTestId || fixConfig?.fixAnchorTestId;
    const nextActionLabel = fixPath?.nextActionLabel || fixConfig?.nextActionLabel;
    // [ISSUE-FIX-KIND-CLARITY-1] Get fixKind from URL param > fix path > config
    const fixKind = fixKindParam || fixPath?.fixKind || fixConfig?.fixKind;

    // Set the fix context for the banner (even if issue not found - shows "already compliant")
    setIssueFixContext({
      issueId: issueIdParam,
      issueTitle: matchingIssue ? getSafeIssueTitle(matchingIssue) : (fixConfig?.ctaLabel || 'Issue'),
      highlightTarget: highlightParam || fixPath?.highlightTarget,
      nextActionLabel,
      fixAnchorTestId,
      issuePresentOnSurface,
      anchorFound: false, // Will be updated after scroll attempt
      fixKind,
    });

    // If issue not found on this product, we still show the banner but with "already compliant" message
    if (!matchingIssue || !fixPath) {
      issueFixRouteHandledRef.current = true;
      return;
    }

    // Check if we need to route to a different tab
    const expectedTab = FIX_SURFACE_TO_TAB[fixPath.fixSurface];
    if (expectedTab && activeTab !== expectedTab) {
      // Route to the correct tab while preserving query params
      const url = new URL(window.location.href);
      url.searchParams.set('tab', expectedTab);
      router.replace(url.pathname + url.search);
      issueFixRouteHandledRef.current = true;
      return;
    }

    // Already on correct tab - scroll and highlight
    issueFixRouteHandledRef.current = true;

    // [ISSUE-FIX-NAV-AND-ANCHORS-1] Use centralized scroll/highlight utility
    setTimeout(() => {
      const targetAnchor = fixAnchorTestId || highlightParam || fixPath.highlightTarget;
      if (targetAnchor) {
        const result = scrollToFixAnchor({ fixAnchorTestId: targetAnchor });
        // Update anchor found status
        setIssueFixContext((prev) => prev ? { ...prev, anchorFound: result.found } : null);
        if (result.found) {
          setIssueHighlightActive(true);
          setTimeout(() => setIssueHighlightActive(false), 2000);
        }
      }
    }, 200);
  }, [isIssueFixMode, issueIdParam, highlightParam, fixAnchorParam, fixKindParam, productIssues, activeTab, loading, router]);

  // [DRAFT-REVIEW-ISOLATION-1] Drafts tab fetch + edit handlers moved to isolated ProductDraftsTab component

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const status = product ? getProductStatus(product) : 'missing-metadata';

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
            <Link href={`/projects/${projectId}/store-health`} className="hover:text-gray-700">
              {projectName || 'Project'}
            </Link>
          </li>
          <li>/</li>
          {/* [TRUST-ROUTING-1] Context-aware Products breadcrumb */}
          <li>
            {isPreviewMode && validatedReturnTo ? (
              <Link href={validatedReturnTo} className="hover:text-gray-700">
                Preview
              </Link>
            ) : isResultsMode && validatedReturnTo ? (
              <Link href={validatedReturnTo} className="hover:text-gray-700">
                Results
              </Link>
            ) : (
              <Link href={`/projects/${projectId}/products`} className="hover:text-gray-700">
                Products
              </Link>
            )}
          </li>
          <li>/</li>
          <li className="text-gray-900">{product?.title || 'Product'}</li>
        </ol>
      </nav>

      {/* Product not found */}
      {!product && !loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">Product not found.</p>
          {/* [TRUST-ROUTING-1] Context-aware back link */}
          {isPreviewMode && validatedReturnTo ? (
            <Link
              href={validatedReturnTo}
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              ← Back to preview
            </Link>
          ) : isResultsMode && validatedReturnTo ? (
            <Link
              href={validatedReturnTo}
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              ← Back to results
            </Link>
          ) : (
            <Link
              href={`/projects/${projectId}/products`}
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              ← Back to Products
            </Link>
          )}
        </div>
      )}

      {/* Main content */}
      {product && (
        <>
          {/* [DEO-UX-REFRESH-1] Sticky workspace header + tab bar */}
          <div className="sticky top-0 z-20 bg-white/90 backdrop-blur shadow-sm">
            <div className="flex items-center justify-between gap-4 px-1 py-3 sm:px-2">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* [TRUST-ROUTING-1] Context-aware back link in sticky header */}
                {isPreviewMode && validatedReturnTo ? (
                  <Link
                    href={validatedReturnTo}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    ← Back to preview
                  </Link>
                ) : isResultsMode && validatedReturnTo ? (
                  <Link
                    href={validatedReturnTo}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    ← Back to results
                  </Link>
                ) : (
                  <Link
                    href={`/projects/${projectId}/products`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    ← Back to Products
                  </Link>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {product.title || 'Product'}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                      {status === 'optimized'
                        ? 'Optimized'
                        : status === 'needs-optimization'
                          ? 'Needs optimization'
                          : 'Missing key metadata'}
                    </span>
                    {product.lastOptimizedAt && (
                      <span>
                        Last optimized:{' '}
                        {new Date(product.lastOptimizedAt).toLocaleDateString()}
                      </span>
                    )}
                    {/* [DEO-UX-REFRESH-1] DEO Issues indicator in header */}
                    {productIssues.length > 0 && (
                      <Link
                        href={`/projects/${projectId}/products/${productId}?tab=issues`}
                        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 hover:bg-red-100"
                      >
                        <span>{productIssues.length} DEO {productIssues.length === 1 ? 'issue' : 'issues'}</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              {/* [DRAFT-ENTRYPOINT-UNIFICATION-1-FIXUP-1] Hide AI/generation + apply CTAs on Drafts tab */}
              {/* Draft Review is human-only - no AI actions, no apply, no automation */}
              {activeTab !== 'drafts' && (
                <div className="flex items-center gap-2">
                  {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Compact header draft state indicator */}
                  <span
                    data-testid="header-draft-state-indicator"
                    className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      draftState === 'unsaved'
                        ? 'bg-yellow-100 text-yellow-800'
                        : draftState === 'saved'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {draftState === 'unsaved' && 'Draft — not applied'}
                    {draftState === 'saved' && 'Draft saved — not applied'}
                    {draftState === 'applied' && (
                      <>Applied to Shopify on {appliedAt ? new Date(appliedAt).toLocaleDateString() : product?.lastOptimizedAt ? new Date(product.lastOptimizedAt).toLocaleDateString() : '—'}</>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleAutomateThisFix}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Automate this fix
                  </button>
                  {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Header Apply button - disabled unless draft is saved */}
                  <button
                    type="button"
                    data-testid="header-apply-to-shopify-button"
                    onClick={handleApplyToShopify}
                    disabled={applyingToShopify || !canApplyToShopify}
                    title={
                      !canApplyToShopify
                        ? 'Save draft first; Apply uses saved drafts only and never auto-saves.'
                        : 'Apply saved draft to Shopify'
                    }
                    className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {applyingToShopify ? 'Applying…' : 'Apply to Shopify'}
                  </button>
                </div>
              )}
            </div>
            {/* [DEO-UX-REFRESH-1] Tab bar replacing "Jump to:" anchors */}
            {/* [ISSUE-TO-FIX-PATH-1] Pass actionable issue count, not total */}
            <ProductDetailsTabs
              projectId={projectId}
              productId={productId}
              activeTab={activeTab}
              issueCount={actionableIssueCount}
            />
          </div>

          {/* [ROUTE-INTEGRITY-1] [SCOPE-CLARITY-1] ScopeBanner - show when from context is present */}
          {/* Uses normalized scope chips for explicit scope display */}
          <div className="mt-4">
            <ScopeBanner
              from={fromContext}
              returnTo={scopeBannerReturnTo || `/projects/${projectId}/products`}
              showingText={`Product · ${product?.title || 'Product'}`}
              onClearFiltersHref={buildClearFiltersHref(`/projects/${projectId}/products/${productId}`)}
              chips={normalizedScopeResult.chips}
              wasAdjusted={normalizedScopeResult.wasAdjusted}
            />
          </div>

          {/* [TRUST-ROUTING-1] Preview Mode Banner - shown when from=playbook_preview */}
          {isPreviewMode && previewSample && !previewExpired && (
            <div className="mb-6 mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
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
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-purple-900">
                    Previewing draft (not applied)
                  </h3>
                  <p className="mt-1 text-xs text-purple-800">
                    This is a preview from the Playbooks workflow. Changes have not been applied yet.
                  </p>
                  {/* Draft vs Current comparison */}
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded border border-purple-200 bg-white p-2">
                      <div className="text-xs font-medium text-purple-700 mb-1">Current</div>
                      <div className="text-xs text-gray-700">
                        {playbookIdParam === 'missing_seo_title'
                          ? previewSample.currentTitle || <span className="text-gray-400">Empty</span>
                          : previewSample.currentDescription || <span className="text-gray-400">Empty</span>}
                      </div>
                    </div>
                    <div className="rounded border border-purple-200 bg-white p-2">
                      <div className="text-xs font-medium text-purple-700 mb-1">Draft (suggested)</div>
                      <div className="text-xs text-gray-700">
                        {playbookIdParam === 'missing_seo_title'
                          ? previewSample.suggestedTitle || <span className="text-gray-400">No suggestion</span>
                          : previewSample.suggestedDescription || <span className="text-gray-400">No suggestion</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* [TRUST-ROUTING-1] Preview Expired Banner */}
          {isPreviewMode && previewExpired && (
            <div className="mb-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-amber-600"
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
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-amber-900">
                    Preview expired — regenerate
                  </h3>
                  <p className="mt-1 text-xs text-amber-800">
                    The preview session has expired or this product was not in the sample set.
                    Return to Playbooks to regenerate the preview.
                  </p>
                  {/* [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-2] Use canonical /playbooks/:playbookId route */}
                  <div className="mt-3">
                    <Link
                      href={validatedReturnTo || (playbookIdParam ? `/projects/${projectId}/playbooks/${playbookIdParam}?step=preview&source=product_details` : `/projects/${projectId}/playbooks`)}
                      className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700"
                    >
                      ← Back to preview
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* [ISSUE-TO-FIX-PATH-1] Issue Fix Context Banner */}
          {/* [ISSUE-FIX-NAV-AND-ANCHORS-1] Enhanced with callout content + returnTo back link */}
          {/* [ISSUE-FIX-KIND-CLARITY-1] Pass fixKind to arrival callout */}
          {isIssueFixMode && issueFixContext && (() => {
            const calloutContent = getArrivalCalloutContent({
              issueTitle: issueFixContext.issueTitle,
              nextActionLabel: issueFixContext.nextActionLabel,
              foundAnchor: issueFixContext.anchorFound ?? false,
              issuePresentOnSurface: issueFixContext.issuePresentOnSurface ?? true,
              fixKind: issueFixContext.fixKind,
            });
            return (
              <div
                data-testid="issue-fix-context-banner"
                className={`mb-6 mt-4 rounded-lg border p-4 ${calloutContent.containerClass}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">
                      {calloutContent.primaryMessage}
                    </h3>
                    {calloutContent.secondaryMessage && (
                      <p
                        data-testid="issue-fix-next-action-callout"
                        className="mt-1 text-xs opacity-90"
                      >
                        {calloutContent.secondaryMessage}
                      </p>
                    )}
                    {calloutContent.showBackLink && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Link
                          href={issueFixBackLink.href}
                          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
                        >
                          ← {issueFixBackLink.label}
                        </Link>
                        {/* [ISSUE-FIX-KIND-CLARITY-1] View related issues CTA for DIAGNOSTIC */}
                        {calloutContent.showViewRelatedIssues && (
                          <Link
                            href={`/projects/${projectId}/products/${productId}?tab=issues`}
                            data-testid="issue-fix-view-related-issues"
                            className="inline-flex items-center rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50"
                          >
                            View related issues
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CNAB-1: Product optimization banner */}
          {/* [DRAFT-ENTRYPOINT-UNIFICATION-1-FIXUP-1] Hide AI/generation banner on Drafts tab */}
          {activeTab !== 'drafts' && (productIssues.length > 0 || status === 'missing-metadata' || status === 'needs-optimization') && (
            <div className="mb-6 mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
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
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-blue-900">
                    Optimization suggestions available
                  </h3>
                  <p className="mt-1 text-xs text-blue-800">
                    {productIssues.length > 0
                      ? `${productIssues.length} issue${productIssues.length !== 1 ? 's' : ''} detected for this product. `
                      : 'This product has missing or incomplete SEO metadata. '}
                    Generate drafts, review, then apply to Shopify.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="mb-6 mt-4 rounded border border-green-400 bg-green-100 p-4 text-green-700">
              {successMessage}
            </div>
          )}

          {/* Error message */}
          {/* [DRAFT-ENTRYPOINT-UNIFICATION-1-FIXUP-1] Hide AI limit upsell on Drafts tab */}
          {error && (
            <div className="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
              <p>{error}</p>
              {isAiLimitError && activeTab !== 'drafts' && (
                <p className="mt-2">
                  <Link
                    href="/settings/billing"
                    className="font-semibold text-red-800 underline hover:text-red-900"
                  >
                    Upgrade your plan to unlock more AI suggestions.
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* [DEO-UX-REFRESH-1] Tab-based content - only active tab renders */}
          <ProductOptimizationLayout
            overview={<ProductOverviewPanel product={product} status={status} />}
            center={
              <div className="space-y-6">
                {/* Metadata Tab */}
                {activeTab === 'metadata' && (
                  <section aria-label="Metadata">
                    <h2 className="mb-4 text-base font-semibold text-gray-900">Metadata</h2>
                    {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Draft state banner */}
                    <div
                      data-testid="draft-state-banner"
                      className={`mb-4 rounded-md border px-4 py-3 text-sm ${
                        draftState === 'unsaved'
                          ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                          : draftState === 'saved'
                            ? 'border-blue-200 bg-blue-50 text-blue-800'
                            : 'border-green-200 bg-green-50 text-green-800'
                      }`}
                    >
                      {draftState === 'unsaved' && (
                        <span className="font-medium">Draft — not applied</span>
                      )}
                      {draftState === 'saved' && (
                        <span className="font-medium">Draft saved — not applied</span>
                      )}
                      {draftState === 'applied' && (
                        <span className="font-medium">
                          Applied to Shopify on{' '}
                          {appliedAt
                            ? new Date(appliedAt).toLocaleString()
                            : product?.lastOptimizedAt
                              ? new Date(product.lastOptimizedAt).toLocaleString()
                              : product?.lastSyncedAt
                                ? `${new Date(product.lastSyncedAt).toLocaleString()} (as of last sync)`
                                : 'unknown date'}
                        </span>
                      )}
                    </div>
                    <div className="mb-3 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                      Generate drafts, review, then apply to Shopify.
                    </div>
                    <div className="space-y-6">
                      <ProductAiSuggestionsPanel
                        suggestion={suggestion}
                        automationSuggestion={automationSuggestion}
                        loading={loadingSuggestion}
                        onGenerate={fetchSuggestion}
                        onApply={handleApplySuggestion}
                      />
                      <div
                        ref={seoEditorRef}
                        data-testid="seo-editor-anchor"
                        className={`rounded-md transition-all duration-300 ${
                          seoEditorHighlighted
                            ? 'ring-2 ring-indigo-400 ring-offset-2'
                            : ''
                        }`}
                      >
                        <ProductSeoEditor
                          title={editorTitle}
                          description={editorDescription}
                          handle={product.handle ?? product.externalId}
                          onTitleChange={setEditorTitle}
                          onDescriptionChange={setEditorDescription}
                          onReset={handleReset}
                          onApplyToShopify={handleApplyToShopify}
                          applying={applyingToShopify}
                          draftState={draftState}
                          canApply={canApplyToShopify}
                          onSaveDraft={handleSaveDraft}
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* Answers Tab */}
                {activeTab === 'answers' && (
                  <section aria-label="Answers" data-testid="answers-tab-anchor">
                    <h2 className="mb-4 text-base font-semibold text-gray-900">Answers (AEO)</h2>
                    <p className="mb-2 text-xs text-gray-500">
                      Answer Blocks are your canonical, persistent AEO answers. When enabled in{' '}
                      <Link
                        href={`/projects/${projectId}/settings`}
                        className="underline hover:text-indigo-700"
                      >
                        Settings
                      </Link>
                      , these canonical answers can be synced to Shopify as metafields.
                    </p>
                    {hasAnswerBlocks && (
                      <div className="mb-3 flex flex-col gap-2 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                        <div className="max-w-md">
                          <p className="font-medium text-gray-700">
                            {showAiDiagnosticPreviews
                              ? 'AI Answer previews are visible for diagnostics.'
                              : 'AI Answer previews are hidden because canonical Answer Blocks already exist for this product.'}
                          </p>
                          <p className="mt-0.5">
                            For advanced inspection only. Does not affect published content or DEO
                            Score.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setShowAiDiagnosticPreviews((previous) => !previous)
                          }
                          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                          {showAiDiagnosticPreviews
                            ? 'Hide AI diagnostic previews'
                            : 'Show AI diagnostic previews'}
                        </button>
                      </div>
                    )}
                    <div className="space-y-6">
                      {(!hasAnswerBlocks || showAiDiagnosticPreviews) && (
                        <ProductAnswersPanel
                          response={answersResponse}
                          loading={loadingAnswers}
                          error={answersError}
                          onGenerate={fetchAnswers}
                        />
                      )}
                      <ProductAnswerBlocksPanel
                        productId={product.id}
                        planId={planId}
                        aeoSyncToShopifyMetafields={aeoSyncToShopifyMetafields}
                        onBlocksLoaded={setHasAnswerBlocks}
                      />
                    </div>
                  </section>
                )}

                {/* Search & Intent Tab */}
                {activeTab === 'search-intent' && (
                  <section aria-label="Search & Intent" data-testid="search-intent-tab-anchor">
                    <h2 className="mb-4 text-base font-semibold text-gray-900">Search & Intent</h2>
                    <p className="mb-3 text-xs text-gray-500">
                      Analyze how well this product covers common search intents.
                      High-value intents (transactional, comparative) have the most impact on conversions.
                    </p>
                    <ProductSearchIntentPanel productId={product.id} />
                  </section>
                )}

                {/* Competitors Tab */}
                {activeTab === 'competitors' && (
                  <section aria-label="Competitive Positioning" data-testid="competitors-tab-anchor">
                    <h2 className="mb-4 text-base font-semibold text-gray-900">Competitive Positioning</h2>
                    <p className="mb-3 text-xs text-gray-500">
                      See how this product compares to typical competitors in your category.
                      Address gaps in intent coverage, content sections, and trust signals.
                    </p>
                    <ProductCompetitorsPanel productId={product.id} />
                  </section>
                )}

                {/* GEO Tab */}
                {activeTab === 'geo' && (
                  <section aria-label="GEO Readiness" data-testid="geo-tab-anchor">
                    <h2 className="mb-4 text-base font-semibold text-gray-900">GEO Readiness</h2>
                    <p className="mb-3 text-xs text-gray-500">
                      Evaluate how AI-engine-ready your product content is. GEO readiness signals
                      measure clarity, specificity, structure, context, and accessibility.
                    </p>
                    <ProductGeoPanel productId={product.id} />
                  </section>
                )}

                {/* Automations Tab */}
                {activeTab === 'automations' && (
                  <section aria-label="Automations">
                    <h2 className="mb-4 text-base font-semibold text-gray-900">Automations</h2>
                    <ProductAutomationHistoryPanel productId={product.id} />
                  </section>
                )}

                {/* [DEO-UX-REFRESH-1] Issues Tab */}
                {activeTab === 'issues' && (
                  <section aria-label="DEO Issues">
                    <h2 className="mb-4 text-base font-semibold text-gray-900">DEO Issues</h2>
                    <p className="mb-3 text-xs text-gray-500">
                      Issues are grouped by pillar. Address them in priority order for the best DEO impact.
                    </p>
                    {/* [COUNT-INTEGRITY-1.1 PATCH 6] Pass asset-scoped triplet summary */}
                    <ProductIssuesPanel
                      productId={productId}
                      projectId={projectId}
                      issues={productIssues}
                      summary={productIssuesSummary}
                    />
                  </section>
                )}

                {/* [DRAFT-REVIEW-ISOLATION-1] Drafts Tab - Isolated Non-AI Draft Review Component */}
                {/* Conditionally mounted to match standard tab behavior (no state preservation across tab switches) */}
                {/* [DRAFT-DIFF-CLARITY-1] Pass current/live field values for diff display */}
                {/* [DRAFT-FIELD-COVERAGE-1] AssetDraftsTab now supports Products, Pages, Collections */}
                {activeTab === 'drafts' && (
                  <AssetDraftsTab
                    projectId={projectId}
                    assetType="products"
                    assetId={productId}
                    currentFieldValues={{
                      seoTitle: product?.seoTitle,
                      seoDescription: product?.seoDescription,
                    }}
                  />
                )}
              </div>
            }
            insights={<ProductDeoInsightsPanel product={product} productIssues={productIssues} />}
          />
        </>
      )}
    </div>
  );
}
