'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue } from '@engineo/shared';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi, productsApi, aiApi, shopifyApi, ApiError } from '@/lib/api';
import type { Product } from '@/lib/products';
import { getProductStatus } from '@/lib/products';
import {
  ProductOptimizationLayout,
  ProductOverviewPanel,
  ProductAiSuggestionsPanel,
  ProductSeoEditor,
  ProductDeoInsightsPanel,
  type ProductMetadataSuggestion,
  type AutomationSuggestion,
} from '@/components/products/optimization';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

export default function ProductOptimizationPage() {
  const router = useRouter();
  const params = useParams();
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

  // Track if we've shown the auto-apply toast (one-time per page load)
  const autoApplyToastShown = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch project, products, issues, and automation suggestions in parallel
      const [projectData, productsData, issuesResponse, automationResponse] = await Promise.all([
        projectsApi.get(projectId),
        productsApi.list(projectId),
        projectsApi.deoIssues(projectId).catch(() => ({ issues: [] })),
        projectsApi.automationSuggestions(projectId).catch(() => ({ suggestions: [] })),
      ]);

      setProjectName(projectData.name);

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

      setSuccessMessage('SEO updated in Shopify successfully!');
      feedback.showSuccess('SEO updated in Shopify successfully!');
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

      {/* Back link */}
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}/products`}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Products
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Optimization Workspace</h1>
        <p className="text-gray-600">
          Optimize SEO metadata for {product?.title || 'this product'}
        </p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 rounded border border-green-400 bg-green-100 p-4 text-green-700">
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
        <ProductOptimizationLayout
          overview={<ProductOverviewPanel product={product} status={status} />}
          center={
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
          }
          insights={<ProductDeoInsightsPanel product={product} productIssues={productIssues} />}
        />
      )}
    </div>
  );
}
