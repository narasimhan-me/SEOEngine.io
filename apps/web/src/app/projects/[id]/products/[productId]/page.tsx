'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue } from '@engineo/shared';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi, productsApi, aiApi, shopifyApi, ApiError, billingApi } from '@/lib/api';
import type { Product } from '@/lib/products';
import { getProductStatus } from '@/lib/products';
import {
  ProductOptimizationLayout,
  ProductOverviewPanel,
  ProductAiSuggestionsPanel,
  ProductSeoEditor,
  ProductDeoInsightsPanel,
  ProductSearchIntentPanel,
  type ProductMetadataSuggestion,
  type AutomationSuggestion,
} from '@/components/products/optimization';
import { ProductAnswersPanel, type ProductAnswersResponse } from '@/components/products/optimization/ProductAnswersPanel';
import {
  ProductAnswerBlocksPanel,
  ProductAutomationHistoryPanel,
} from '@/components/products/optimization';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

export default function ProductOptimizationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const productId = params.productId as string;
  const feedback = useFeedback();

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
        projectsApi.deoIssues(projectId).catch(() => ({ issues: [] })),
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

      // Filter issues to only those affecting this product
      const issuesForProduct = (issuesResponse.issues ?? []).filter((issue: DeoIssue) =>
        issue.affectedProducts?.includes(productId)
      );
      setProductIssues(issuesForProduct);

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

      setEditorTitle(title);
      setEditorDescription(description);
      setInitialTitle(title);
      setInitialDescription(description);
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
  }, [product, feedback]);

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

    try {
      setApplyingToShopify(true);
      setError('');

      await shopifyApi.updateProductSeo(product.id, editorTitle, editorDescription);

      // Update local product state
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              seoTitle: editorTitle,
              seoDescription: editorDescription,
              lastOptimizedAt: new Date().toISOString(),
            }
          : prev
      );

      // Update initial values to match new values
      setInitialTitle(editorTitle);
      setInitialDescription(editorDescription);

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
  }, [product, editorTitle, editorDescription, feedback]);

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
    },
    []
  );

  const scrollToSection = useCallback((sectionId: string) => {
    if (typeof window === 'undefined') return;
    const element = document.getElementById(sectionId);
    if (!element) return;
    const stickyOffset = 96;
    const rect = element.getBoundingClientRect();
    const offset = rect.top + window.scrollY - stickyOffset;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Reset AI diagnostic preview visibility when navigating between products
    setShowAiDiagnosticPreviews(false);
  }, [productId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!product) return;
    const focus = searchParams.get('focus');

    // Handle different focus query params for deep-linking
    if (focus === 'metadata') {
      const timeoutId = window.setTimeout(() => {
        scrollToSection('metadata-section');
      }, 200);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (focus === 'deo-issues') {
      const timeoutId = window.setTimeout(() => {
        scrollToSection('deo-issues-section');
      }, 200);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (focus === 'search-intent') {
      const timeoutId = window.setTimeout(() => {
        scrollToSection('search-intent-section');
      }, 200);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [product, searchParams, scrollToSection]);

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
            <Link href={`/projects/${projectId}/overview`} className="hover:text-gray-700">
              {projectName || 'Project'}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/projects/${projectId}/products`} className="hover:text-gray-700">
              Products
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900">{product?.title || 'Product'}</li>
        </ol>
      </nav>

      {/* Product not found */}
      {!product && !loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">Product not found.</p>
          <Link
            href={`/projects/${projectId}/products`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Back to Products
          </Link>
        </div>
      )}

      {/* Main content */}
      {product && (
        <>
          {/* Sticky workspace header + section anchors */}
          <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur shadow-sm">
            <div className="flex items-center justify-between gap-4 px-1 py-3 sm:px-2">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link
                  href={`/projects/${projectId}/products`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  ← Back to Products
                </Link>
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
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyToShopify}
                disabled={applyingToShopify}
                className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {applyingToShopify ? 'Applying…' : 'Apply to Shopify'}
              </button>
            </div>
            <div className="flex items-center gap-3 border-t border-gray-100 px-1 py-2 text-xs text-gray-600 sm:px-2">
              <span className="font-medium text-gray-700">Jump to:</span>
              <button
                type="button"
                onClick={() => scrollToSection('metadata-section')}
                className="rounded-full px-2 py-1 text-xs hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Metadata
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('answers-section')}
                className="rounded-full px-2 py-1 text-xs hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Answers
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('search-intent-section')}
                className="rounded-full px-2 py-1 text-xs hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Search &amp; Intent
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('automations-section')}
                className="rounded-full px-2 py-1 text-xs hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Automations
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('deo-issues-section')}
                className="rounded-full px-2 py-1 text-xs hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Issues
              </button>
            </div>
          </div>

          {/* CNAB-1: Product optimization banner */}
          {(productIssues.length > 0 || status === 'missing-metadata' || status === 'needs-optimization') && (
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
                    Use the AI suggestions below to generate optimized titles and descriptions,
                    then apply them to Shopify with one click.
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
          {error && (
            <div className="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
              <p>{error}</p>
              {isAiLimitError && (
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

          <ProductOptimizationLayout
            overview={<ProductOverviewPanel product={product} status={status} />}
            center={
              <div className="space-y-10">
                <section id="metadata-section" aria-label="Metadata">
                  <h2 className="mb-4 text-base font-semibold text-gray-900">Metadata</h2>
                  <div className="space-y-6">
                    <ProductAiSuggestionsPanel
                      suggestion={suggestion}
                      automationSuggestion={automationSuggestion}
                      loading={loadingSuggestion}
                      onGenerate={fetchSuggestion}
                      onApply={handleApplySuggestion}
                    />
                    <ProductSeoEditor
                      title={editorTitle}
                      description={editorDescription}
                      handle={product.handle ?? product.externalId}
                      onTitleChange={setEditorTitle}
                      onDescriptionChange={setEditorDescription}
                      onReset={handleReset}
                      onApplyToShopify={handleApplyToShopify}
                      applying={applyingToShopify}
                    />
                  </div>
                </section>
                <section id="answers-section" aria-label="Answers">
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
                <section id="search-intent-section" aria-label="Search & Intent">
                  <h2 className="mb-4 text-base font-semibold text-gray-900">Search & Intent</h2>
                  <p className="mb-3 text-xs text-gray-500">
                    Analyze how well this product covers common search intents.
                    High-value intents (transactional, comparative) have the most impact on conversions.
                  </p>
                  <ProductSearchIntentPanel productId={product.id} />
                </section>
                <section id="automations-section" aria-label="Automations">
                  <h2 className="mb-4 text-base font-semibold text-gray-900">Automations</h2>
                  <ProductAutomationHistoryPanel productId={product.id} />
                </section>
              </div>
            }
            insights={<ProductDeoInsightsPanel product={product} productIssues={productIssues} />}
          />
        </>
      )}
    </div>
  );
}
