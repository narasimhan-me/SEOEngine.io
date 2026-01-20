'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { isAuthenticated, getToken } from '@/lib/auth';
import { accountApi, projectsApi, shopifyApi, type RoleCapabilities } from '@/lib/api';
import { useUnsavedChanges } from '@/components/unsaved-changes/UnsavedChangesProvider';
import FriendlyError from '@/components/ui/FriendlyError';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { GovernanceSettingsSection } from '@/components/governance';
import { ShopifyPermissionNotice } from '@/components/shopify/ShopifyPermissionNotice';

type CrawlFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface IntegrationStatus {
  projectId: string;
  projectName: string;
  projectDomain?: string | null;
  autoCrawlEnabled: boolean;
  crawlFrequency: CrawlFrequency;
  lastCrawledAt: string | null;
  lastDeoComputedAt: string | null;
  autoSuggestMissingMetadata: boolean;
  autoSuggestThinContent: boolean;
  autoSuggestDailyCap: number;
  aeoSyncToShopifyMetafields: boolean;
  // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Project-level setting for Answer Block generation on product sync
  autoGenerateAnswerBlocksOnProductSync: boolean;
  shopify?: {
    connected: boolean;
    shopDomain?: string;
    installedAt?: string;
    scope?: string;
  };
  integrations: Array<{
    type: string;
    externalId: string;
    connected: boolean;
    createdAt: string;
    config: Record<string, unknown>;
  }>;
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

function calculateNextCrawl(
  lastCrawledAt: string | null,
  frequency: CrawlFrequency,
  autoCrawlEnabled: boolean,
): string {
  if (!autoCrawlEnabled) {
    return 'Auto crawl disabled';
  }
  if (!lastCrawledAt) {
    return 'Next nightly run (2:00 AM UTC)';
  }

  const lastCrawl = new Date(lastCrawledAt);
  const daysToAdd = frequency === 'DAILY' ? 1 : frequency === 'WEEKLY' ? 7 : 30;
  const nextCrawl = new Date(lastCrawl.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  // If next crawl is in the past, it will run on the next nightly run
  if (nextCrawl < new Date()) {
    return 'Next nightly run (2:00 AM UTC)';
  }

  return nextCrawl.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingUpMetafields, setSettingUpMetafields] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [capabilities, setCapabilities] = useState<RoleCapabilities | null>(null);
  const [connectingShopify, setConnectingShopify] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [disconnectingShopify, setDisconnectingShopify] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [shopifyMissingScopes, setShopifyMissingScopes] = useState<string[]>([]);
  const [reconnectCapability, setReconnectCapability] = useState<'pages_sync' | 'collections_sync' | null>(null);
  const [reconnectingShopify, setReconnectingShopify] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  // [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-2] Scope verification failure state
  const [scopeVerifyFailed, setScopeVerifyFailed] = useState(false);

  // Form state
  const [autoCrawlEnabled, setAutoCrawlEnabled] = useState(true);
  const [crawlFrequency, setCrawlFrequency] = useState<CrawlFrequency>('DAILY');
  const [autoSuggestMissingMetadata, setAutoSuggestMissingMetadata] = useState(false);
  const [autoSuggestThinContent, setAutoSuggestThinContent] = useState(false);
  const [autoSuggestDailyCap, setAutoSuggestDailyCap] = useState(50);
  const [aeoSyncToShopifyMetafields, setAeoSyncToShopifyMetafields] = useState(false);
  // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Project-level setting for Answer Block generation on product sync
  const [autoGenerateAnswerBlocksOnProductSync, setAutoGenerateAnswerBlocksOnProductSync] = useState(false);

  // Unsaved changes guard
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const feedback = useFeedback();

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await projectsApi.integrationStatus(projectId);
      setStatus(data);
      setAutoCrawlEnabled(data.autoCrawlEnabled ?? true);
      setCrawlFrequency(data.crawlFrequency ?? 'DAILY');
      setAutoSuggestMissingMetadata(data.autoSuggestMissingMetadata ?? false);
      setAutoSuggestThinContent(data.autoSuggestThinContent ?? false);
      setAutoSuggestDailyCap(data.autoSuggestDailyCap ?? 50);
      setAeoSyncToShopifyMetafields(data.aeoSyncToShopifyMetafields ?? false);
      setAutoGenerateAnswerBlocksOnProductSync(data.autoGenerateAnswerBlocksOnProductSync ?? false);
      if (data?.shopify?.connected) {
        const [pagesScope, collectionsScope] = await Promise.all([
          shopifyApi.getMissingScopes(projectId, 'pages_sync'),
          shopifyApi.getMissingScopes(projectId, 'collections_sync'),
        ]);
        const pagesMissing = (pagesScope as any)?.missingScopes ?? [];
        const collectionsMissing = (collectionsScope as any)?.missingScopes ?? [];
        const combined = Array.from(new Set([...(pagesMissing ?? []), ...(collectionsMissing ?? [])]));
        setShopifyMissingScopes(combined);
        setReconnectCapability(
          (pagesMissing?.length ?? 0) > 0 ? 'pages_sync' : (collectionsMissing?.length ?? 0) > 0 ? 'collections_sync' : null,
        );
      } else {
        setShopifyMissingScopes([]);
        setReconnectCapability(null);
      }
    } catch (err: unknown) {
      console.error('Error fetching integration status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project settings');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchCapabilities = useCallback(async () => {
    try {
      const roleResponse = await projectsApi.getUserRole(projectId);
      setCapabilities(roleResponse.capabilities);
    } catch (err) {
      console.error('Error fetching role:', err);
      setCapabilities(null);
    }
  }, [projectId]);

  const returnTo = `/projects/${projectId}/settings#integrations`;

  const handleSignInAgain = useCallback(() => {
    router.push(`/login?next=${encodeURIComponent(returnTo)}`);
  }, [router, returnTo]);

  const handleConnectShopify = useCallback(async () => {
    setConnectError(null);
    setConnectingShopify(true);
    const token = getToken();
    if (!token) {
      setConnectError(
        "We couldn't start Shopify connection because your session token is missing. Please sign in again, then retry.",
      );
      setConnectingShopify(false);
      return;
    }
    try {
      const result = await shopifyApi.getConnectUrl(projectId, returnTo);
      const url = result && typeof (result as any).url === 'string' ? (result as any).url : null;
      if (!url) {
        setConnectError("We couldn't start Shopify connection. Please refresh and try again.");
        setConnectingShopify(false);
        return;
      }
      window.location.href = url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "We couldn't start Shopify connection. Please try again.";
      setConnectError(message);
      setConnectingShopify(false);
    }
  }, [projectId, returnTo]);

  const handleDisconnectShopify = useCallback(async () => {
    setDisconnectError(null);
    setDisconnectingShopify(true);
    const token = getToken();
    if (!token) {
      setDisconnectError(
        "We couldn't disconnect Shopify because your session token is missing. Please sign in again, then retry.",
      );
      setDisconnectingShopify(false);
      return;
    }
    try {
      await accountApi.disconnectStore(projectId);
      const message = 'Shopify disconnected.';
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchIntegrationStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "We couldn't disconnect Shopify. Please try again.";
      setDisconnectError(message);
    } finally {
      setDisconnectingShopify(false);
    }
  }, [projectId, fetchIntegrationStatus]);

  const handleReconnectShopify = useCallback(async () => {
    setReconnectError(null);
    setReconnectingShopify(true);
    const token = getToken();
    if (!token) {
      setReconnectError(
        "We couldn't start Shopify reconnection because your session token is missing. Please sign in again, then retry.",
      );
      setReconnectingShopify(false);
      return;
    }
    if (!reconnectCapability) {
      setReconnectError("We couldn't determine which Shopify permission is missing. Please refresh and try again.");
      setReconnectingShopify(false);
      return;
    }
    try {
      const result = await shopifyApi.getReconnectUrl(projectId, reconnectCapability, returnTo);
      const url = result && typeof (result as any).url === 'string' ? (result as any).url : null;
      if (!url) {
        setReconnectError("We couldn't start Shopify reconnection. Please refresh and try again.");
        setReconnectingShopify(false);
        return;
      }
      window.location.href = url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "We couldn't start Shopify reconnection. Please try again.";
      setReconnectError(message);
      setReconnectingShopify(false);
    }
  }, [projectId, returnTo, reconnectCapability]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchIntegrationStatus();
    fetchCapabilities();
  }, [router, fetchIntegrationStatus, fetchCapabilities]);

  // [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-2] Handle shopify=verify_failed query param
  // [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-3] Clear stale missing-scope state to suppress fake warnings
  useEffect(() => {
    const shopifyParam = searchParams.get('shopify');
    if (shopifyParam === 'verify_failed') {
      setScopeVerifyFailed(true);
      // Clear any stale missing-scope state so no fake "Missing permission" list is shown
      setShopifyMissingScopes([]);
      setReconnectCapability(null);
      // Clear the query param so it doesn't persist on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('shopify');
      router.replace(url.pathname + url.search + url.hash, { scroll: false });
    }
  }, [searchParams, router]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      await projectsApi.update(projectId, {
        autoCrawlEnabled,
        crawlFrequency,
        autoSuggestMissingMetadata,
        autoSuggestThinContent,
        autoSuggestDailyCap,
        aeoSyncToShopifyMetafields,
        autoGenerateAnswerBlocksOnProductSync,
      });
      const message = 'Settings saved successfully';
      setSuccessMessage(message);
      feedback.showSuccess(message);
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchIntegrationStatus();
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
      feedback.showError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetupMetafields = async () => {
    try {
      setSettingUpMetafields(true);
      setError('');
      const result = await shopifyApi.ensureMetafieldDefinitions(projectId);
      const message = `Metafield definitions set up: ${result.created} created, ${result.existing} existing`;
      setSuccessMessage(message);
      feedback.showSuccess(message);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: unknown) {
      console.error('Error setting up metafields:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to set up metafield definitions';
      setError(message);
      feedback.showError(message);
    } finally {
      setSettingUpMetafields(false);
    }
  };

  const hasChanges =
    status &&
    (autoCrawlEnabled !== status.autoCrawlEnabled ||
      crawlFrequency !== status.crawlFrequency ||
      autoSuggestMissingMetadata !== status.autoSuggestMissingMetadata ||
      autoSuggestThinContent !== status.autoSuggestThinContent ||
      autoSuggestDailyCap !== status.autoSuggestDailyCap ||
      aeoSyncToShopifyMetafields !== status.aeoSyncToShopifyMetafields ||
      autoGenerateAnswerBlocksOnProductSync !== (status.autoGenerateAnswerBlocksOnProductSync ?? false));

  // Sync local hasChanges with global unsaved changes context
  useEffect(() => {
    setHasUnsavedChanges(!!hasChanges);
  }, [hasChanges, setHasUnsavedChanges]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FriendlyError
          title="We couldn't load this page."
          message="This is usually temporary (for example, right after a deploy). Check your connection and try again."
          onRetry={fetchIntegrationStatus}
        />
      </div>
    );
  }

  if (!status) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure crawl automation, integrations, and project preferences.
        </p>
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

      {/* Crawl Automation Section */}
      <div className="rounded-lg bg-white p-6 shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Crawl Automation</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure how often EngineO automatically crawls your site to update DEO scores and
          detect issues.
        </p>

        <div className="space-y-6">
          {/* Auto Crawl Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="autoCrawlEnabled" className="text-sm font-medium text-gray-900">
                Enable Automatic Crawling
              </label>
              <p className="text-sm text-gray-500 mt-0.5">
                When enabled, EngineO will crawl your site on the configured schedule.
              </p>
            </div>
            <button
              id="autoCrawlEnabled"
              type="button"
              role="switch"
              aria-checked={autoCrawlEnabled}
              onClick={() => setAutoCrawlEnabled(!autoCrawlEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                autoCrawlEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoCrawlEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Crawl Frequency */}
          <div>
            <label htmlFor="crawlFrequency" className="block text-sm font-medium text-gray-900">
              Crawl Frequency
            </label>
            <p className="text-sm text-gray-500 mt-0.5 mb-2">
              How often should EngineO crawl your site?
            </p>
            <select
              id="crawlFrequency"
              value={crawlFrequency}
              onChange={(e) => setCrawlFrequency(e.target.value as CrawlFrequency)}
              disabled={!autoCrawlEnabled}
              className={`block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                !autoCrawlEnabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
              }`}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          {/* Crawl Status Info */}
          <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Crawl Status</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Last Crawl
                </span>
                <p className="mt-1 text-sm text-gray-900">
                  {status.lastCrawledAt
                    ? new Date(status.lastCrawledAt).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Next Scheduled Crawl
                </span>
                <p className="mt-1 text-sm text-gray-900">
                  {calculateNextCrawl(status.lastCrawledAt, crawlFrequency, autoCrawlEnabled)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Current Frequency
                </span>
                <p className="mt-1 text-sm text-gray-900">
                  {formatCrawlFrequency(status.crawlFrequency)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Last DEO Score Update
                </span>
                <p className="mt-1 text-sm text-gray-900">
                  {status.lastDeoComputedAt
                    ? new Date(status.lastDeoComputedAt).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* AI Automation Rules Section */}
      <div className="rounded-lg bg-white p-6 shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Automation Rules</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure automatic AI suggestion generation after each crawl. Suggestions are created as
          drafts and never auto-applied.
        </p>

        <div className="space-y-6">
          {/* Missing Metadata Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label
                htmlFor="autoSuggestMissingMetadata"
                className="text-sm font-medium text-gray-900"
              >
                Suggest Missing Metadata
              </label>
              <p className="text-sm text-gray-500 mt-0.5">
                Generate AI suggestions for pages and products missing SEO titles or descriptions.
              </p>
            </div>
            <button
              id="autoSuggestMissingMetadata"
              type="button"
              role="switch"
              aria-checked={autoSuggestMissingMetadata}
              onClick={() => setAutoSuggestMissingMetadata(!autoSuggestMissingMetadata)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                autoSuggestMissingMetadata ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoSuggestMissingMetadata ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Thin Content Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label
                htmlFor="autoSuggestThinContent"
                className="text-sm font-medium text-gray-900"
              >
                Suggest for Thin Content
              </label>
              <p className="text-sm text-gray-500 mt-0.5">
                Generate AI suggestions for pages with less than 200 words or products with thin
                descriptions.
              </p>
            </div>
            <button
              id="autoSuggestThinContent"
              type="button"
              role="switch"
              aria-checked={autoSuggestThinContent}
              onClick={() => setAutoSuggestThinContent(!autoSuggestThinContent)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                autoSuggestThinContent ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoSuggestThinContent ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Answer Block → Shopify metafields Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label
                htmlFor="aeoSyncToShopifyMetafields"
                className="text-sm font-medium text-gray-900"
              >
                Sync Answer Blocks to Shopify metafields
              </label>
              <p className="text-sm text-gray-500 mt-0.5">
                When enabled, Answer Blocks can be synced to Shopify as metafields for each product.
              </p>
            </div>
            <button
              id="aeoSyncToShopifyMetafields"
              type="button"
              role="switch"
              aria-checked={aeoSyncToShopifyMetafields}
              onClick={() =>
                setAeoSyncToShopifyMetafields(!aeoSyncToShopifyMetafields)
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                aeoSyncToShopifyMetafields ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  aeoSyncToShopifyMetafields ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Generate Answer Blocks on product sync Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label
                htmlFor="autoGenerateAnswerBlocksOnProductSync"
                className="text-sm font-medium text-gray-900"
              >
                Generate Answer Blocks on product sync
              </label>
              <p className="text-sm text-gray-500 mt-0.5">
                When enabled, syncing products from Shopify may enqueue AI generation for Answer Blocks.
              </p>
            </div>
            <button
              id="autoGenerateAnswerBlocksOnProductSync"
              type="button"
              role="switch"
              aria-checked={autoGenerateAnswerBlocksOnProductSync}
              onClick={() =>
                setAutoGenerateAnswerBlocksOnProductSync(!autoGenerateAnswerBlocksOnProductSync)
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                autoGenerateAnswerBlocksOnProductSync ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoGenerateAnswerBlocksOnProductSync ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Daily Cap */}
          <div>
            <label htmlFor="autoSuggestDailyCap" className="block text-sm font-medium text-gray-900">
              Daily Suggestion Cap
            </label>
            <p className="text-sm text-gray-500 mt-0.5 mb-2">
              Maximum number of new AI suggestions to generate per day.
            </p>
            <input
              type="number"
              id="autoSuggestDailyCap"
              value={autoSuggestDailyCap}
              onChange={(e) => setAutoSuggestDailyCap(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              max="500"
              disabled={!autoSuggestMissingMetadata && !autoSuggestThinContent}
              className={`block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                !autoSuggestMissingMetadata && !autoSuggestThinContent
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
                  : ''
              }`}
            />
          </div>

          {/* Info box */}
          <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  AI suggestions are generated as drafts after each crawl. You can review and apply
                  them from the Products or Content pages. Suggestions are never auto-applied.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* [ENTERPRISE-GEO-1] Governance Settings Section */}
      <GovernanceSettingsSection
        projectId={projectId}
        onUnsavedChanges={(_hasGovernanceChanges) => {
          // Governance section manages its own save button
        }}
      />

      {/* [ROLES-3] Team Members Section */}
      <div className="rounded-lg bg-white p-6 shadow mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h2>
        <p className="text-sm text-gray-600 mb-4">
          Manage who has access to this project and their permissions.
        </p>
        <a
          href={`/projects/${projectId}/settings/members`}
          className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Manage team
          <svg
            className="ml-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>

      {/* Active Integrations Section */}
      <div id="integrations" className="rounded-lg bg-white p-6 shadow mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Integrations</h2>
        {/* [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-2] Scope verification failure notice */}
        {scopeVerifyFailed && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Could not verify Shopify permissions</h3>
                <p className="mt-1 text-sm text-red-700">
                  We were unable to verify the permissions granted by Shopify. This is usually temporary.
                  Please try connecting again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setScopeVerifyFailed(false);
                    handleConnectShopify();
                  }}
                  disabled={connectingShopify}
                  className="mt-3 inline-flex items-center rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
                >
                  {connectingShopify ? 'Connecting...' : 'Try again'}
                </button>
              </div>
            </div>
          </div>
        )}
        {status.shopify?.connected !== true && (
          <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              Shopify is not connected for this project.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={handleConnectShopify}
                disabled={(capabilities ? !capabilities.canModifySettings : false) || connectingShopify}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectingShopify ? 'Connecting...' : 'Connect Shopify'}
              </button>
              {capabilities && !capabilities.canModifySettings && (
                <span className="text-xs text-gray-500">Ask a project owner to connect Shopify.</span>
              )}
            </div>
            {connectError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p>{connectError}</p>
                <button
                  type="button"
                  onClick={handleSignInAgain}
                  className="mt-2 inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Sign in again
                </button>
              </div>
            )}
          </div>
        )}
        {/* [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-3] Don't show missing-scope notice when verify_failed */}
        {status.shopify?.connected === true && shopifyMissingScopes.length > 0 && !scopeVerifyFailed && (
          <div className="mb-4">
            <ShopifyPermissionNotice
              missingScopes={shopifyMissingScopes}
              canReconnect={capabilities?.canModifySettings ?? true}
              onReconnect={handleReconnectShopify}
              learnMoreHref="/help/shopify-permissions"
              errorMessage={reconnectError}
              onSignInAgain={handleSignInAgain}
              isReconnecting={reconnectingShopify}
            />
          </div>
        )}
        {status.integrations.length > 0 ? (
          <div className="space-y-3">
            {status.integrations.map((integration) => (
              <div
                key={integration.type}
                className="p-3 rounded-md bg-gray-50 border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <svg
                        className="h-4 w-4 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{integration.type}</p>
                      <p className="text-xs text-gray-500">{integration.externalId}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    Connected {new Date(integration.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {integration.type === 'SHOPIFY' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={handleSetupMetafields}
                      disabled={settingUpMetafields}
                      className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {settingUpMetafields ? (
                        <>
                          <svg
                            className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-blue-700"
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
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Setting up...
                        </>
                      ) : (
                        'Setup Answer Block Metafields'
                      )}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Creates metafield definitions in Shopify for Answer Block sync.
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleDisconnectShopify}
                        disabled={(capabilities ? !capabilities.canModifySettings : false) || disconnectingShopify}
                        className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {disconnectingShopify ? 'Disconnecting...' : 'Disconnect Shopify'}
                      </button>
                      {capabilities && !capabilities.canModifySettings && (
                        <span className="text-xs text-gray-500">Ask a project owner to disconnect Shopify.</span>
                      )}
                    </div>
                    {disconnectError && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p>{disconnectError}</p>
                        <button
                          type="button"
                          onClick={handleSignInAgain}
                          className="mt-2 inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Sign in again
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No integrations connected yet.</p>
            <p className="text-xs text-gray-400 mt-1">Connect Shopify to enable sync features.</p>
          </div>
        )}
      </div>

      {/* Global Save Section */}
      <div className="mt-6 flex items-center justify-between rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-gray-500">
          {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
        </p>
        <button
          onClick={handleSaveSettings}
          disabled={saving || !hasChanges}
          className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}
