'use client';

import { useCallback, useEffect, useState } from 'react';
import { projectsApi, GovernancePolicyResponse } from '@/lib/api';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

interface GovernanceSettingsSectionProps {
  projectId: string;
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

/**
 * [ENTERPRISE-GEO-1] Governance Settings Section
 *
 * Displays and allows editing of governance policy settings:
 * - Require approval for Apply actions
 * - Restrict share links
 * - Share link expiry days
 * - Allowed export audience
 * - Allow competitor mentions in exports
 *
 * Note: allowPIIInExports is always false and not editable (per spec)
 */
export function GovernanceSettingsSection({
  projectId,
  onUnsavedChanges,
}: GovernanceSettingsSectionProps) {
  const feedback = useFeedback();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState<GovernancePolicyResponse | null>(null);

  // Form state
  const [requireApprovalForApply, setRequireApprovalForApply] = useState(false);
  const [restrictShareLinks, setRestrictShareLinks] = useState(false);
  const [shareLinkExpiryDays, setShareLinkExpiryDays] = useState(14);
  const [allowedExportAudience, setAllowedExportAudience] = useState<
    'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY'
  >('ANYONE_WITH_LINK');
  const [
    allowCompetitorMentionsInExports,
    setAllowCompetitorMentionsInExports,
  ] = useState(false);

  const fetchPolicy = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await projectsApi.getGovernancePolicy(projectId);
      setPolicy(data);
      setRequireApprovalForApply(data.requireApprovalForApply);
      setRestrictShareLinks(data.restrictShareLinks);
      setShareLinkExpiryDays(data.shareLinkExpiryDays);
      setAllowedExportAudience(data.allowedExportAudience);
      setAllowCompetitorMentionsInExports(
        data.allowCompetitorMentionsInExports
      );
    } catch (err) {
      console.error('Error fetching governance policy:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load governance settings'
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const hasChanges =
    policy &&
    (requireApprovalForApply !== policy.requireApprovalForApply ||
      restrictShareLinks !== policy.restrictShareLinks ||
      shareLinkExpiryDays !== policy.shareLinkExpiryDays ||
      allowedExportAudience !== policy.allowedExportAudience ||
      allowCompetitorMentionsInExports !==
        policy.allowCompetitorMentionsInExports);

  useEffect(() => {
    onUnsavedChanges?.(!!hasChanges);
  }, [hasChanges, onUnsavedChanges]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await projectsApi.updateGovernancePolicy(projectId, {
        requireApprovalForApply,
        restrictShareLinks,
        shareLinkExpiryDays,
        allowedExportAudience,
        allowCompetitorMentionsInExports,
      });
      feedback.showSuccess('Governance settings saved');
      await fetchPolicy();
    } catch (err) {
      console.error('Error saving governance policy:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to save governance settings';
      setError(message);
      feedback.showError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-72 bg-gray-200 rounded mb-6" />
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Governance & Approvals
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Configure approval workflows and export controls for enterprise
        compliance.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Require Approval for Apply */}
        <div className="flex items-center justify-between">
          <div>
            <label
              htmlFor="requireApprovalForApply"
              className="text-sm font-medium text-gray-900"
            >
              Require Approval for Apply Actions
            </label>
            <p className="text-sm text-gray-500 mt-0.5">
              When enabled, GEO fixes, Answer Block syncs, and Playbooks apply
              require approval before execution.
            </p>
          </div>
          <button
            id="requireApprovalForApply"
            type="button"
            role="switch"
            aria-checked={requireApprovalForApply}
            onClick={() => setRequireApprovalForApply(!requireApprovalForApply)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              requireApprovalForApply ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                requireApprovalForApply ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Restrict Share Links */}
        <div className="flex items-center justify-between">
          <div>
            <label
              htmlFor="restrictShareLinks"
              className="text-sm font-medium text-gray-900"
            >
              Restrict Share Links
            </label>
            <p className="text-sm text-gray-500 mt-0.5">
              When enabled, share links must meet the minimum audience
              requirement below.
            </p>
          </div>
          <button
            id="restrictShareLinks"
            type="button"
            role="switch"
            aria-checked={restrictShareLinks}
            onClick={() => setRestrictShareLinks(!restrictShareLinks)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              restrictShareLinks ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                restrictShareLinks ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Allowed Export Audience */}
        <div>
          <label
            htmlFor="allowedExportAudience"
            className="block text-sm font-medium text-gray-900"
          >
            Minimum Share Link Protection
          </label>
          <p className="text-sm text-gray-500 mt-0.5 mb-2">
            The minimum protection level required for new share links.
          </p>
          <select
            id="allowedExportAudience"
            value={allowedExportAudience}
            onChange={(e) =>
              setAllowedExportAudience(
                e.target.value as 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY'
              )
            }
            disabled={!restrictShareLinks}
            className={`block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              !restrictShareLinks
                ? 'opacity-50 cursor-not-allowed bg-gray-100'
                : ''
            }`}
          >
            <option value="ANYONE_WITH_LINK">
              Anyone with link (no restriction)
            </option>
            <option value="PASSCODE">Passcode required</option>
            <option value="ORG_ONLY">Organization only (disabled)</option>
          </select>
        </div>

        {/* Share Link Expiry Days */}
        <div>
          <label
            htmlFor="shareLinkExpiryDays"
            className="block text-sm font-medium text-gray-900"
          >
            Share Link Expiry (days)
          </label>
          <p className="text-sm text-gray-500 mt-0.5 mb-2">
            How long share links remain valid before expiring.
          </p>
          <input
            type="number"
            id="shareLinkExpiryDays"
            value={shareLinkExpiryDays}
            onChange={(e) =>
              setShareLinkExpiryDays(Math.max(1, parseInt(e.target.value) || 1))
            }
            min="1"
            max="365"
            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Allow Competitor Mentions in Exports */}
        <div className="flex items-center justify-between">
          <div>
            <label
              htmlFor="allowCompetitorMentionsInExports"
              className="text-sm font-medium text-gray-900"
            >
              Allow Competitor Mentions in Exports
            </label>
            <p className="text-sm text-gray-500 mt-0.5">
              When disabled, competitor names are redacted from shared reports.
            </p>
          </div>
          <button
            id="allowCompetitorMentionsInExports"
            type="button"
            role="switch"
            aria-checked={allowCompetitorMentionsInExports}
            onClick={() =>
              setAllowCompetitorMentionsInExports(
                !allowCompetitorMentionsInExports
              )
            }
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              allowCompetitorMentionsInExports ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                allowCompetitorMentionsInExports
                  ? 'translate-x-5'
                  : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* PII Protection (locked toggle) */}
        <div className="flex items-center justify-between rounded-md bg-gray-50 p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900">
                Allow PII in Exports
                <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                  Locked
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-0.5">
                PII (Personally Identifiable Information) is never included in
                exports. This setting cannot be changed for compliance reasons.
              </p>
            </div>
          </div>
          <div
            className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent bg-gray-200 opacity-50 cursor-not-allowed"
            title="This setting cannot be changed"
            aria-label="Allow PII in Exports (disabled)"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 translate-x-0"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
        </p>
        <button
          onClick={handleSave}
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
            'Save Governance Settings'
          )}
        </button>
      </div>
    </div>
  );
}
