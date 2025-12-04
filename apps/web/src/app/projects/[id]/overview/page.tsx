'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, removeToken, getToken } from '@/lib/auth';
import { aiApi, projectsApi, seoScanApi } from '@/lib/api';
import type { DeoScoreLatestResponse } from '@engineo/shared';

interface IntegrationStatus {
  projectId: string;
  projectName: string;
  integrations: Array<{
    type: string;
    externalId: string;
    connected: boolean;
    createdAt: string;
    config: Record<string, unknown>;
  }>;
  shopify: {
    connected: boolean;
    shopDomain?: string;
    installedAt?: string;
    scope?: string;
  };
  woocommerce: {
    connected: boolean;
    storeUrl?: string;
    createdAt?: string;
  };
  bigcommerce: {
    connected: boolean;
    storeHash?: string;
    createdAt?: string;
  };
  magento: {
    connected: boolean;
    storeUrl?: string;
    createdAt?: string;
  };
  customWebsite: {
    connected: boolean;
    url?: string;
    createdAt?: string;
  };
}

interface CrawlResult {
  id: string;
  url: string;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number | null;
  loadTimeMs: number | null;
  issues: string[];
  scannedAt: string;
  score: number;
}

interface MetadataSuggestion {
  crawlResultId: string;
  url: string;
  current: {
    title: string | null;
    description: string | null;
  };
  suggested: {
    title: string;
    description: string;
  };
}

interface ProjectOverview {
  crawlCount: number;
  issueCount: number;
  avgSeoScore: number | null;
  productCount: number;
  productsWithAppliedSeo: number;
}

export default function ProjectOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopDomain, setShopDomain] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // SEO Scan state
  const [scanResults, setScanResults] = useState<CrawlResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // AI Suggestions state
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<MetadataSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);

  // Project overview state
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [deoScore, setDeoScore] = useState<DeoScoreLatestResponse | null>(null);
  const [deoScoreLoading, setDeoScoreLoading] = useState(false);
  const [deoScoreRecomputing, setDeoScoreRecomputing] = useState(false);

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = getToken();

      const response = await fetch(`${API_URL}/projects/${projectId}/integration-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        removeToken();
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch integration status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err: unknown) {
      console.error('Error fetching integration status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  const fetchScanResults = useCallback(async () => {
    try {
      setLoadingResults(true);
      const results = await seoScanApi.results(projectId);
      setScanResults(results);
    } catch (err: unknown) {
      console.error('Error fetching scan results:', err);
    } finally {
      setLoadingResults(false);
    }
  }, [projectId]);

  const fetchOverview = useCallback(async () => {
    try {
      const data = await projectsApi.overview(projectId);
      setOverview(data);
    } catch (err: unknown) {
      console.error('Error fetching project overview:', err);
    }
  }, [projectId]);

  const fetchDeoScore = useCallback(async () => {
    try {
      setDeoScoreLoading(true);
      const data = await projectsApi.deoScore(projectId);
      setDeoScore(data);
    } catch (err: unknown) {
      console.error('Error fetching DEO score:', err);
    } finally {
      setDeoScoreLoading(false);
    }
  }, [projectId]);

  const handleRecomputeDeoScore = async () => {
    try {
      setDeoScoreRecomputing(true);
      setError('');
      const result = await projectsApi.recomputeDeoScoreSync(projectId);
      if (result.computed) {
        setSuccessMessage(`DEO Score recomputed: ${result.score}/100`);
        setTimeout(() => setSuccessMessage(''), 5000);
        await fetchDeoScore();
      } else {
        setError(result.message || 'Failed to recompute DEO score');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to recompute DEO score');
    } finally {
      setDeoScoreRecomputing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchIntegrationStatus();
    fetchScanResults();
    fetchOverview();
    fetchDeoScore();

    // Check if we just returned from Shopify OAuth
    if (searchParams.get('shopify') === 'connected') {
      setSuccessMessage('Successfully connected to Shopify!');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [projectId, searchParams, router, fetchIntegrationStatus, fetchScanResults, fetchOverview, fetchDeoScore]);

  const handleConnectShopify = () => {
    if (!shopDomain) {
      alert('Please enter your Shopify store domain');
      return;
    }

    let formattedDomain = shopDomain.trim();
    if (!formattedDomain.includes('.myshopify.com')) {
      formattedDomain = `${formattedDomain}.myshopify.com`;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = getToken();
    const installUrl = `${API_URL}/shopify/install?shop=${formattedDomain}&projectId=${projectId}&token=${token}`;
    window.location.href = installUrl;
  };

  const handleRunScan = async () => {
    try {
      setScanning(true);
      setError('');
      await seoScanApi.start(projectId);
      setSuccessMessage('SEO scan completed!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchScanResults();
      await fetchOverview(); // Refresh overview stats after scan
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to run SEO scan');
    } finally {
      setScanning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getIssueLabel = (issue: string) => {
    const labels: Record<string, string> = {
      MISSING_TITLE: 'Missing Title',
      TITLE_TOO_LONG: 'Title Too Long (>65 chars)',
      TITLE_TOO_SHORT: 'Title Too Short (<30 chars)',
      MISSING_META_DESCRIPTION: 'Missing Meta Description',
      META_DESCRIPTION_TOO_LONG: 'Meta Description Too Long (>160 chars)',
      META_DESCRIPTION_TOO_SHORT: 'Meta Description Too Short (<70 chars)',
      MISSING_H1: 'Missing H1',
      THIN_CONTENT: 'Thin Content (<300 words)',
      SLOW_LOAD_TIME: 'Slow Load Time (>3s)',
      HTTP_ERROR: 'HTTP Error',
      FETCH_ERROR: 'Failed to Fetch',
    };
    return labels[issue] || issue;
  };

  const handleSuggestMetadata = async (crawlResultId: string) => {
    try {
      setSuggestingId(crawlResultId);
      setLoadingSuggestion(true);
      const suggestion = await aiApi.suggestMetadata(crawlResultId);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div>
        <div className="mb-4 text-sm">
          <Link href="/projects" className="text-blue-600 hover:text-blue-800">
            ← Back to Projects
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Project not found'}
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div>
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

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{status.projectName}</h1>
        <p className="text-gray-600">Project ID: {status.projectId}</p>
      </div>
      {/* DEO Score Preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500">DEO Score</h2>
          <button
            onClick={handleRecomputeDeoScore}
            disabled={deoScoreRecomputing}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deoScoreRecomputing ? (
              <>
                <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-purple-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Computing...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recompute
              </>
            )}
          </button>
        </div>
        {deoScoreLoading ? (
          <p className="mt-1 text-sm text-gray-500">Loading...</p>
        ) : deoScore?.latestScore ? (
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {deoScore.latestScore.overall}/100
            <span className="ml-2 text-xs font-medium text-gray-500">
              v1 • computed {deoScore.latestScore.computedAt ? new Date(deoScore.latestScore.computedAt).toLocaleString() : 'recently'}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            No DEO Score yet. Click &quot;Recompute&quot; to calculate it.
          </p>
        )}
      </div>

        {/* Project Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">SEO Score</h3>
            <p className={`mt-1 text-2xl font-bold ${
              overview?.avgSeoScore !== null && overview?.avgSeoScore !== undefined
                ? overview.avgSeoScore >= 80
                  ? 'text-green-600'
                  : overview.avgSeoScore >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                : 'text-gray-400'
            }`}>
              {overview?.avgSeoScore !== null && overview?.avgSeoScore !== undefined
                ? overview.avgSeoScore
                : '--'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {overview?.avgSeoScore !== null && overview?.avgSeoScore !== undefined
                ? 'Average score'
                : 'Run scans to see'}
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Last Scan</h3>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {scanResults.length > 0
                ? new Date(scanResults[0].scannedAt).toLocaleDateString()
                : '--'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {scanResults.length > 0
                ? `${overview?.crawlCount ?? 0} total scans`
                : 'No scans yet'}
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Issues Found</h3>
            <p className={`mt-1 text-2xl font-bold ${
              overview?.issueCount === 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {overview?.issueCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {overview?.issueCount === 0 ? 'No issues' : 'Across all scans'}
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Products</h3>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {overview?.productCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {overview?.productsWithAppliedSeo
                ? `${overview.productsWithAppliedSeo} with SEO`
                : 'Synced from store'}
            </p>
          </div>
        </div>

        {/* SEO Scanner Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">SEO Scanner</h2>
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanning ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Run SEO Scan
                </>
              )}
            </button>
          </div>

          {loadingResults ? (
            <p className="text-gray-500">Loading scan results...</p>
          ) : scanResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No scan results yet. Click &quot;Run SEO Scan&quot; to analyze your website.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scanned</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scanResults.map((result) => (
                    <tr key={result.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {result.url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          result.statusCode === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {result.statusCode || 'Error'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(result.score)}`}>
                          {result.score}/100
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {result.title || <span className="text-red-500 italic">Missing</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {result.issues.length === 0 ? (
                          <span className="text-green-600">No issues</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {result.issues.slice(0, 2).map((issue, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                {getIssueLabel(issue)}
                              </span>
                            ))}
                            {result.issues.length > 2 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                +{result.issues.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(result.scannedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleSuggestMetadata(result.id)}
                          disabled={loadingSuggestion && suggestingId === result.id}
                          className="inline-flex items-center px-3 py-1.5 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingSuggestion && suggestingId === result.id ? (
                            <>
                              <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-purple-700" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Loading...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              Suggest
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Connected Integrations Summary */}
        {status.integrations.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {status.integrations.map((integration) => (
                <div key={integration.type} className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-green-800">{integration.type}</span>
                  </div>
                  <p className="text-sm text-gray-600">{integration.externalId}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shopify Integration */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shopify Integration</h2>

          {status.shopify.connected ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-800 font-semibold">Connected</span>
                </div>
                <Link
                  href={`/projects/${projectId}/products`}
                  className="inline-flex items-center px-3 py-1.5 border border-green-600 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  View Products
                </Link>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Store:</span> {status.shopify.shopDomain}</p>
                {status.shopify.installedAt && (
                  <p><span className="font-medium">Connected:</span> {new Date(status.shopify.installedAt).toLocaleDateString()}</p>
                )}
                {status.shopify.scope && (
                  <p><span className="font-medium">Scopes:</span> {status.shopify.scope}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 mb-4">Connect your Shopify store to sync products and apply AI-generated SEO optimizations.</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-2">
                    Shopify Store Domain
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="shopDomain"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="your-store"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="flex items-center text-gray-600 text-sm">.myshopify.com</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your Shopify store domain (e.g., &quot;my-store&quot; for my-store.myshopify.com)
                  </p>
                </div>

                <button
                  onClick={handleConnectShopify}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connect Shopify Store
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Other Platform Integrations */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Other Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`border rounded-lg p-4 ${status.woocommerce.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">WooCommerce</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
              </div>
              <p className="text-sm text-gray-600">WordPress e-commerce integration</p>
            </div>

            <div className={`border rounded-lg p-4 ${status.bigcommerce.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">BigCommerce</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
              </div>
              <p className="text-sm text-gray-600">BigCommerce store integration</p>
            </div>

            <div className={`border rounded-lg p-4 ${status.magento.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Magento</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
              </div>
              <p className="text-sm text-gray-600">Adobe Commerce / Magento integration</p>
            </div>

            <div className={`border rounded-lg p-4 ${status.customWebsite.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Custom Website</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
              </div>
              <p className="text-sm text-gray-600">Any website via sitemap crawling</p>
            </div>
          </div>
      </div>

      {/* AI Metadata Suggestion Modal */}
      {showSuggestionModal && currentSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Metadata Suggestions</h3>
                  <p className="text-sm text-gray-500 truncate max-w-md">{currentSuggestion.url}</p>
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
                      {currentSuggestion.current.title || <span className="text-red-500 italic">Missing</span>}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Meta Description</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {currentSuggestion.current.description || <span className="text-red-500 italic">Missing</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggested Metadata */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Suggested Metadata
                </h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-purple-700 uppercase">Suggested Title</label>
                      <span className="text-xs text-gray-500">{currentSuggestion.suggested.title.length}/60 chars</span>
                    </div>
                    <p className="text-sm text-gray-900 bg-white rounded px-3 py-2 border border-purple-200">
                      {currentSuggestion.suggested.title}
                    </p>
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
                      <label className="text-xs font-medium text-purple-700 uppercase">Suggested Description</label>
                      <span className="text-xs text-gray-500">{currentSuggestion.suggested.description.length}/155 chars</span>
                    </div>
                    <p className="text-sm text-gray-900 bg-white rounded px-3 py-2 border border-purple-200">
                      {currentSuggestion.suggested.description}
                    </p>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
