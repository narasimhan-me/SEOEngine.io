'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { DeoIssue } from '@engineo/shared';
import { ProductTable } from '@/components/products/ProductTable';
import { isAuthenticated, getToken } from '@/lib/auth';
import {
  productsApi,
  projectsApi,
  shopifyApi,
  seoScanApi,
} from '@/lib/api';
import type { Product } from '@/lib/products';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

interface IntegrationStatus {
  projectName: string;
  shopify: {
    connected: boolean;
    shopDomain?: string;
  };
}

interface ProjectOverview {
  crawlCount: number;
  productCount: number;
  productsWithAppliedSeo: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [projectInfo, setProjectInfo] = useState<IntegrationStatus | null>(null);
  const [productIssues, setProductIssues] = useState<DeoIssue[]>([]);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [showPreCrawlGuard, setShowPreCrawlGuard] = useState(true);

  // Scanning state
  const [scanningId, setScanningId] = useState<string | null>(null);

  const feedback = useFeedback();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await productsApi.list(projectId);
      setProducts(data);
    } catch (err: unknown) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProjectInfo(data);
      }
    } catch (err) {
      console.error('Error fetching project info:', err);
    }
  }, [projectId]);

  const fetchProductIssues = useCallback(async () => {
    try {
      const response = await projectsApi.deoIssues(projectId);
      // Filter to only product-related issues
      const issues = (response.issues ?? []).filter(
        (issue: DeoIssue) => (issue.affectedProducts?.length ?? 0) > 0,
      );
      setProductIssues(issues);
    } catch (err) {
      console.error('Error fetching product issues:', err);
    }
  }, [projectId]);

  const fetchOverview = useCallback(async () => {
    try {
      const data = await projectsApi.overview(projectId);
      setOverview(data);
    } catch (err) {
      console.error('Error fetching project overview:', err);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchProjectInfo();
    fetchProducts();
    fetchProductIssues();
    fetchOverview();
  }, [projectId, router, fetchProducts, fetchProjectInfo, fetchProductIssues, fetchOverview]);

  const handleSyncProducts = async () => {
    try {
      setSyncing(true);
      setError('');
      const result = await shopifyApi.syncProducts(projectId);
      const message = `Synced ${result.synced} products (${result.created} new, ${result.updated} updated)`;
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 5000);
      feedback.showSuccess(message);
      await fetchProducts();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to sync products';
      setError(message);
      feedback.showError(message);
    } finally {
      setSyncing(false);
    }
  };

  const handleScanProduct = async (productId: string) => {
    try {
      setScanningId(productId);
      setError('');
      await seoScanApi.scanProduct(productId);
      const message =
        'Product page scanned! View results on the project SEO Scanner.';
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 5000);
      feedback.showSuccess(message);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to scan product';
      setError(message);
      feedback.showError(message);
    } finally {
      setScanningId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <div className="mb-4 text-sm">
        <Link href={`/projects/${projectId}/overview`} className="text-blue-600 hover:text-blue-800">
          ← Back to Overview
        </Link>
      </div>

      {successMessage && (
        <div className="mb-6 rounded border border-green-400 bg-green-100 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Pre-crawl guardrail banner */}
      {overview && overview.crawlCount === 0 && showPreCrawlGuard && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">
                No crawl has been run yet
              </h3>
              <p className="mt-1 text-xs text-yellow-700">
                DEO Score and issues may be empty until you run your first crawl. After crawling, product issues will be surfaced in the{' '}
                <Link href={`/projects/${projectId}/issues`} className="font-medium underline hover:text-yellow-800">
                  Issues Engine
                </Link>{' '}
                for faster diagnosis and AI-powered fixes.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => router.push(`/projects/${projectId}/overview?focus=crawl`)}
                  className="inline-flex items-center rounded-md border border-transparent bg-yellow-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-yellow-700"
                >
                  Run first crawl
                </button>
                <button
                  onClick={() => setShowPreCrawlGuard(false)}
                  className="inline-flex items-center rounded-md border border-yellow-600 bg-white px-2.5 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50"
                >
                  Continue to products
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header - responsive stacking */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            {productIssues.length > 0 && (
              <Link
                href={`/projects/${projectId}/issues`}
                className="inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
              >
                <svg
                  className="mr-1 h-3.5 w-3.5"
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
                {productIssues.length} Issue{productIssues.length !== 1 ? 's' : ''}
              </Link>
            )}
          </div>
          <p className="truncate text-gray-600">
            {projectInfo?.shopify.connected
              ? `Connected to ${projectInfo.shopify.shopDomain}`
              : 'Sync products from your connected Shopify store'}
          </p>
        </div>
        <button
          onClick={handleSyncProducts}
          disabled={syncing || !projectInfo?.shopify.connected}
          className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {syncing ? (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Products
            </>
          )}
        </button>
      </div>

      {/* Products List */}
      <div className="overflow-hidden rounded-lg bg-white shadow md:overflow-visible">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
            <p className="mt-1 text-sm text-gray-500">
              {projectInfo?.shopify.connected
                ? 'Sync products and run your first crawl to see DEO insights. Issues will be surfaced in the Issues Engine for AI-powered fixes.'
                : 'Step 1: Connect your Shopify store, then sync products and run your first crawl to surface issues.'}
            </p>
            {!projectInfo?.shopify.connected && (
              <div className="mt-4">
                <Link
                  href={`/projects/${projectId}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Go to project settings to connect Shopify
                </Link>
              </div>
            )}
          </div>
        ) : (
          <ProductTable
            products={products}
            projectId={projectId}
            onScanProduct={handleScanProduct}
            onSyncProducts={handleSyncProducts}
            syncing={syncing}
            scanningId={scanningId}
            productIssues={productIssues}
          />
        )}
      </div>
    </div>
  );
}
