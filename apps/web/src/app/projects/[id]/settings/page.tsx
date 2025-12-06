'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { projectsApi } from '@/lib/api';

type CrawlFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface IntegrationStatus {
  projectId: string;
  projectName: string;
  autoCrawlEnabled: boolean;
  crawlFrequency: CrawlFrequency;
  lastCrawledAt: string | null;
  lastDeoComputedAt: string | null;
  autoSuggestMissingMetadata: boolean;
  autoSuggestThinContent: boolean;
  autoSuggestDailyCap: number;
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
  const projectId = params.id as string;

  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [autoCrawlEnabled, setAutoCrawlEnabled] = useState(true);
  const [crawlFrequency, setCrawlFrequency] = useState<CrawlFrequency>('DAILY');
  const [autoSuggestMissingMetadata, setAutoSuggestMissingMetadata] = useState(false);
  const [autoSuggestThinContent, setAutoSuggestThinContent] = useState(false);
  const [autoSuggestDailyCap, setAutoSuggestDailyCap] = useState(50);

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
    } catch (err: unknown) {
      console.error('Error fetching integration status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project settings');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchIntegrationStatus();
  }, [router, fetchIntegrationStatus]);

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
      });
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchIntegrationStatus();
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    status &&
    (autoCrawlEnabled !== status.autoCrawlEnabled ||
      crawlFrequency !== status.crawlFrequency ||
      autoSuggestMissingMetadata !== status.autoSuggestMissingMetadata ||
      autoSuggestThinContent !== status.autoSuggestThinContent ||
      autoSuggestDailyCap !== status.autoSuggestDailyCap);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
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

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
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

      {/* Active Integrations Section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Integrations</h2>
        {status.integrations.length > 0 ? (
          <div className="space-y-3">
            {status.integrations.map((integration) => (
              <div
                key={integration.type}
                className="flex items-center justify-between p-3 rounded-md bg-gray-50 border border-gray-200"
              >
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
            <p className="text-xs text-gray-400 mt-1">
              Connect Shopify or other platforms from the Overview page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
