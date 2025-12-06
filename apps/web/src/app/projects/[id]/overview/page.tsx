'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, removeToken, getToken } from '@/lib/auth';
import { projectsApi, seoScanApi } from '@/lib/api';
import type {
  DeoScoreLatestResponse,
  DeoScoreSignals,
  DeoIssuesResponse,
  DeoIssue,
} from '@engineo/shared';
import { DeoScoreCard } from '@/components/projects/DeoScoreCard';
import { DeoComponentBreakdown } from '@/components/projects/DeoComponentBreakdown';
import { DeoSignalsSummary } from '@/components/projects/DeoSignalsSummary';
import { ProjectHealthCards } from '@/components/projects/ProjectHealthCards';
import { IssuesSummaryCard } from '@/components/issues/IssuesSummaryCard';
import { IssuesList } from '@/components/issues/IssuesList';

type CrawlFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

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
  // Crawl settings
  autoCrawlEnabled?: boolean;
  crawlFrequency?: CrawlFrequency;
  lastCrawledAt?: string | null;
  lastDeoComputedAt?: string | null;
}

function formatCrawlFrequency(frequency: CrawlFrequency): string {
  switch (frequency) {
    case 'DAILY':
      return 'Daily';
    case 'WEEKLY':
      return 'Weekly';
    case 'MONTHLY':
      return 'Monthly';
    default:
      return frequency;
  }
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

  // AI Suggestions state
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<MetadataSuggestion | null>(null);

  // Project overview state
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [deoScore, setDeoScore] = useState<DeoScoreLatestResponse | null>(null);
  const [, setDeoScoreLoading] = useState(false);
  const [deoScoreRecomputing, setDeoScoreRecomputing] = useState(false);
  const [deoSignals, setDeoSignals] = useState<DeoScoreSignals | null>(null);
  const [deoSignalsLoading, setDeoSignalsLoading] = useState(false);
  const [deoIssues, setDeoIssues] = useState<DeoIssuesResponse | null>(null);
  const [deoIssuesLoading, setDeoIssuesLoading] = useState(false);
  const [deoIssuesError, setDeoIssuesError] = useState<string | null>(null);
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
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
      const results = await seoScanApi.results(projectId);
      setScanResults(results);
    } catch (err: unknown) {
      console.error('Error fetching scan results:', err);
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

  const fetchDeoSignals = useCallback(async () => {
    try {
      setDeoSignalsLoading(true);
      const data = await projectsApi.deoSignalsDebug(projectId);
      setDeoSignals(data);
    } catch (err: unknown) {
      console.error('Error fetching DEO signals:', err);
    } finally {
      setDeoSignalsLoading(false);
    }
  }, [projectId]);

  const fetchDeoIssues = useCallback(async () => {
    try {
      setDeoIssuesLoading(true);
      setDeoIssuesError(null);
      const data = await projectsApi.deoIssues(projectId);
      setDeoIssues(data as DeoIssuesResponse);
    } catch (err: unknown) {
      console.error('Error fetching DEO issues:', err);
      setDeoIssuesError(
        err instanceof Error ? err.message : 'Failed to fetch DEO issues',
      );
    } finally {
      setDeoIssuesLoading(false);
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
        await fetchDeoSignals();
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
    fetchDeoSignals();
    fetchDeoIssues();

    if (searchParams.get('shopify') === 'connected') {
      setSuccessMessage('Successfully connected to Shopify!');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [
    projectId,
    searchParams,
    router,
    fetchIntegrationStatus,
    fetchScanResults,
    fetchOverview,
    fetchDeoScore,
    fetchDeoSignals,
    fetchDeoIssues,
  ]);

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
      await fetchOverview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to run SEO scan');
    } finally {
      setScanning(false);
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
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {status?.projectName || 'Project Overview'}
          </h1>
          <p className="text-gray-600">
            DEO intelligence for your project across content, entities, technical, and visibility.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-100">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      )}

      {/* Top section: DEO Score + Components + Freshness */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <DeoScoreCard
            score={deoScore?.latestScore ?? null}
            lastComputedAt={deoScore?.latestSnapshot?.computedAt ?? null}
          />
          <DeoComponentBreakdown score={deoScore?.latestScore ?? null} />
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">DEO Freshness</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Recompute to refresh crawl and product signals when your site or catalog
                  changes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRecomputeDeoScore}
                  disabled={deoScoreRecomputing}
                  className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deoScoreRecomputing ? (
                    <>
                      <svg
                        className="-ml-0.5 mr-1.5 h-3.5 w-3.5 animate-spin text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Recomputing...
                    </>
                  ) : (
                    'Recompute DEO Score'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Right column: Signals + Issues */}
        <div className="space-y-6">
          <DeoSignalsSummary signals={deoSignals} loading={deoSignalsLoading} />
          <ProjectHealthCards signals={deoSignals} />
          <IssuesSummaryCard
            issues={(deoIssues?.issues as DeoIssue[]) ?? []}
            loading={deoIssuesLoading}
            error={deoIssuesError}
            onViewAll={() => setShowIssuesPanel(true)}
          />
        </div>
      </section>

      {/* Secondary section: Integrations + Crawl / Products overview */}
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Column 1: Crawl & DEO Issues */}
        <div className="space-y-6">
          {/* Crawl details entry point */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Crawl & DEO Issues</h2>
                <p className="mt-1 text-sm text-gray-600">
                  View full crawl results, per-page issues, and detailed SEO/DEO diagnostics.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleRunScan}
                  disabled={scanning}
                  className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {scanning ? (
                    <>
                      <svg
                        className="-ml-0.5 mr-1.5 h-3.5 w-3.5 animate-spin text-gray-700"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Running crawl...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-1.5 h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      Run Crawl
                    </>
                  )}
                </button>
                <Link
                  href={`/projects/${projectId}/issues`}
                  className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  View Crawl Details
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Shopify Integration */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
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
        </div>

        {/* Column 3: Project stats, integrations, auto crawl */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Crawls</span>
                <span className="text-sm font-medium text-gray-900">{overview?.crawlCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Issues Found</span>
                <span className={`text-sm font-medium ${overview?.issueCount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {overview?.issueCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Products</span>
                <span className="text-sm font-medium text-gray-900">{overview?.productCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Products with SEO</span>
                <span className="text-sm font-medium text-gray-900">{overview?.productsWithAppliedSeo ?? 0}</span>
              </div>
              {scanResults.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Scan</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(scanResults[0].scannedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Active Integrations */}
          {status.integrations.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Integrations</h2>
              <div className="space-y-3">
                {status.integrations.map((integration) => (
                  <div key={integration.type} className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{integration.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto Crawl Status */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Auto Crawl</h2>
              <Link
                href={`/projects/${projectId}/settings`}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Configure
              </Link>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status.autoCrawlEnabled !== false ? (
                  <>
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">Enabled</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-500">Disabled</span>
                  </>
                )}
              </div>
              {status.autoCrawlEnabled !== false && status.crawlFrequency && (
                <p className="text-xs text-gray-500">
                  Frequency: {formatCrawlFrequency(status.crawlFrequency)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* All Issues Modal */}
      {showIssuesPanel && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="issues-modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowIssuesPanel(false)}
          />
          {/* Center container */}
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Modal panel */}
            <div
              className="relative w-full max-w-4xl transform rounded-lg bg-white shadow-xl transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - sticky */}
              <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-4 rounded-t-lg">
                <div>
                  <h3 id="issues-modal-title" className="text-lg font-semibold text-gray-900">
                    Issues identified in your project
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Based on the latest crawl, DEO signals, and product metadata.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIssuesPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-6 w-6"
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
              {/* Content - scrollable */}
              <div className="max-h-[calc(90vh-100px)] overflow-y-auto px-6 py-5">
                <IssuesList issues={(deoIssues?.issues as DeoIssue[]) ?? []} />
              </div>
            </div>
          </div>
        </div>
      )}

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
