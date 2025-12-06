'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue } from '@engineo/shared';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi, productsApi, aiApi, shopifyApi } from '@/lib/api';
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

export default function ProductOptimizationPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const productId = params.productId as string;

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
      const productAutomationSuggestion = (automationResponse.suggestions ?? []).find(
        (s: AutomationSuggestion) => s.targetType === 'product' && s.targetId === productId && !s.applied
      );
      setAutomationSuggestion(productAutomationSuggestion || null);

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
  }, [projectId, productId]);

  const fetchSuggestion = useCallback(async () => {
    if (!product) return;

    try {
      setLoadingSuggestion(true);
      setError('');

      const result = await aiApi.suggestProductMetadata(product.id);
      setSuggestion(result);
    } catch (err: unknown) {
      console.error('Error fetching AI suggestion:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI suggestions');
    } finally {
      setLoadingSuggestion(false);
    }
  }, [product]);

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
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: unknown) {
      console.error('Error applying to Shopify:', err);
      setError(err instanceof Error ? err.message : 'Failed to update SEO in Shopify');
    } finally {
      setApplyingToShopify(false);
    }
  }, [product, editorTitle, editorDescription]);

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
          {error}
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
