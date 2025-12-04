'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { ProductTable } from '@/components/products/ProductTable';
import { isAuthenticated, getToken } from '@/lib/auth';
import { productsApi, shopifyApi, seoScanApi, aiApi } from '@/lib/api';
import type { Product } from '@/lib/products';

interface ProductMetadataSuggestion {
  productId: string;
  current: {
    title: string | null;
    description: string | null;
  };
  suggested: {
    title: string;
    description: string;
  };
}

interface IntegrationStatus {
  projectName: string;
  shopify: {
    connected: boolean;
    shopDomain?: string;
  };
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

  // AI Suggestions state
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<ProductMetadataSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);

  // Scanning state
  const [scanningId, setScanningId] = useState<string | null>(null);

  // Apply to Shopify state
  const [applyingToShopify, setApplyingToShopify] = useState(false);

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

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchProjectInfo();
    fetchProducts();
  }, [projectId, router, fetchProducts, fetchProjectInfo]);

  const handleSyncProducts = async () => {
    try {
      setSyncing(true);
      setError('');
      const result = await shopifyApi.syncProducts(projectId);
      setSuccessMessage(`Synced ${result.synced} products (${result.created} new, ${result.updated} updated)`);
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sync products');
    } finally {
      setSyncing(false);
    }
  };

  const handleScanProduct = async (productId: string) => {
    try {
      setScanningId(productId);
      setError('');
      await seoScanApi.scanProduct(productId);
      setSuccessMessage('Product page scanned! View results on the project SEO Scanner.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to scan product');
    } finally {
      setScanningId(null);
    }
  };

  const handleSuggestMetadata = async (productId: string) => {
    try {
      setSuggestingId(productId);
      setLoadingSuggestion(true);
      const suggestion = await aiApi.suggestProductMetadata(productId);
      setCurrentSuggestion(suggestion);
      setShowSuggestionModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to get AI suggestions');
    } finally {
      setLoadingSuggestion(false);
      setSuggestingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage(`${label} copied to clipboard!`);
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  const handleApplyToShopify = async () => {
    if (!currentSuggestion) return;

    // Capture values before async operation to avoid closure issues
    const targetProductId = currentSuggestion.productId;
    const newSeoTitle = currentSuggestion.suggested.title;
    const newSeoDescription = currentSuggestion.suggested.description;

    try {
      setApplyingToShopify(true);
      setError('');

      await shopifyApi.updateProductSeo(
        targetProductId,
        newSeoTitle,
        newSeoDescription,
      );

      // Update local product state with captured values
      setProducts((prev) =>
        prev.map((p) =>
          p.id === targetProductId
            ? {
                ...p,
                seoTitle: newSeoTitle,
                seoDescription: newSeoDescription,
              }
            : p,
        ),
      );

      setSuccessMessage('SEO updated in Shopify successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);

      // Close modal
      setShowSuggestionModal(false);
      setCurrentSuggestion(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update SEO in Shopify');
    } finally {
      setApplyingToShopify(false);
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
    <div>
      <div className="mb-4 text-sm">
        <Link href={`/projects/${projectId}/overview`} className="text-blue-600 hover:text-blue-800">
          ← Back to Overview
        </Link>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">
            {projectInfo?.shopify.connected
              ? `Connected to ${projectInfo.shopify.shopDomain}`
              : 'Sync products from your connected Shopify store'}
          </p>
        </div>
        <button
          onClick={handleSyncProducts}
          disabled={syncing || !projectInfo?.shopify.connected}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Products
            </>
          )}
        </button>
      </div>

      {/* Products List */}
      <div className="rounded-lg bg-white shadow">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
            <p className="mt-1 text-sm text-gray-500">
              {projectInfo?.shopify.connected
                ? 'Click "Sync Products" to import products from your Shopify store.'
                : 'Connect a Shopify store first, then sync products.'}
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
            onScanProduct={handleScanProduct}
            onSuggestMetadata={handleSuggestMetadata}
            onSyncProducts={handleSyncProducts}
            syncing={syncing}
            scanningId={scanningId}
            suggestingId={suggestingId}
            loadingSuggestion={loadingSuggestion}
          />
        )}
      </div>

      {/* AI Metadata Suggestion Modal */}
      {showSuggestionModal && currentSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI SEO Suggestions</h3>
                  <p className="text-sm text-gray-500">Product metadata optimization</p>
                </div>
                <button
                  onClick={() => {
                    setShowSuggestionModal(false);
                    setCurrentSuggestion(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Current Metadata */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Metadata</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {currentSuggestion.current.title || <span className="text-red-500 italic">Not set</span>}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {currentSuggestion.current.description || <span className="text-red-500 italic">Not set</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggested Metadata (Editable) */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Suggested Metadata
                  <span className="ml-2 text-xs text-gray-500 font-normal">(editable)</span>
                </h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-purple-700 uppercase">SEO Title</label>
                      <span className={`text-xs ${currentSuggestion.suggested.title.length > 60 ? 'text-red-500' : 'text-gray-500'}`}>
                        {currentSuggestion.suggested.title.length}/60 chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={currentSuggestion.suggested.title}
                      onChange={(e) => setCurrentSuggestion({
                        ...currentSuggestion,
                        suggested: {
                          ...currentSuggestion.suggested,
                          title: e.target.value,
                        },
                      })}
                      className="w-full text-sm text-gray-900 bg-white rounded px-3 py-2 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter SEO title..."
                    />
                    <button
                      onClick={() => copyToClipboard(currentSuggestion.suggested.title, 'Title')}
                      className="mt-2 text-xs text-purple-600 hover:text-purple-800 flex items-center"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy to clipboard
                    </button>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-purple-700 uppercase">SEO Description</label>
                      <span className={`text-xs ${currentSuggestion.suggested.description.length > 155 ? 'text-red-500' : 'text-gray-500'}`}>
                        {currentSuggestion.suggested.description.length}/155 chars
                      </span>
                    </div>
                    <textarea
                      value={currentSuggestion.suggested.description}
                      onChange={(e) => setCurrentSuggestion({
                        ...currentSuggestion,
                        suggested: {
                          ...currentSuggestion.suggested,
                          description: e.target.value,
                        },
                      })}
                      rows={3}
                      className="w-full text-sm text-gray-900 bg-white rounded px-3 py-2 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="Enter SEO description..."
                    />
                    <button
                      onClick={() => copyToClipboard(currentSuggestion.suggested.description, 'Description')}
                      className="mt-2 text-xs text-purple-600 hover:text-purple-800 flex items-center"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy to clipboard
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSuggestionModal(false);
                    setCurrentSuggestion(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
                <button
                  onClick={handleApplyToShopify}
                  disabled={applyingToShopify}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applyingToShopify ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Applying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Apply to Shopify
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
