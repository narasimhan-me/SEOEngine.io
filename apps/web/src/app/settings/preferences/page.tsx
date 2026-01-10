'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { accountApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface Preferences {
  notifyQuotaWarnings: boolean;
  notifyRunFailures: boolean;
  notifyWeeklyDeoSummary: boolean;
  autoOpenIssuesTab: boolean;
  preferredPillarLanding: string | null;
}

/**
 * [SELF-SERVICE-1] Preferences Page (D5)
 *
 * Reversible toggles:
 * - Quota warnings
 * - Run failures
 * - Weekly DEO summary
 * - Default behaviors (auto-open issues tab, preferred pillar landing)
 *
 * Persist via /account/preferences.
 * VIEWER is read-only.
 */
export default function PreferencesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accountRole, setAccountRole] = useState('OWNER');

  const [preferences, setPreferences] = useState<Preferences>({
    notifyQuotaWarnings: true,
    notifyRunFailures: true,
    notifyWeeklyDeoSummary: true,
    autoOpenIssuesTab: false,
    preferredPillarLanding: null,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profile, prefs] = await Promise.all([
        accountApi.getProfile(),
        accountApi.getPreferences(),
      ]);
      setAccountRole(profile.accountRole);
      setPreferences(prefs);
    } catch (err: any) {
      setError(err.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof Preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    try {
      setSaving(true);
      await accountApi.updatePreferences(preferences);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = accountRole === 'VIEWER';

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Preferences</h1>
      <p className="text-gray-600 mb-6">
        Customize notifications and default behaviors.
      </p>

      {isReadOnly && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
          You have read-only access. Contact an account owner to change preferences.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
          Preferences saved successfully.
        </div>
      )}

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {/* Notification Settings */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Quota Warnings</p>
                <p className="text-sm text-gray-500">Get notified when approaching AI quota limits</p>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => handleToggle('notifyQuotaWarnings')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.notifyQuotaWarnings ? 'bg-blue-600' : 'bg-gray-200'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.notifyQuotaWarnings ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Run Failures</p>
                <p className="text-sm text-gray-500">Get notified when automation runs fail</p>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => handleToggle('notifyRunFailures')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.notifyRunFailures ? 'bg-blue-600' : 'bg-gray-200'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.notifyRunFailures ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Weekly DEO Summary</p>
                <p className="text-sm text-gray-500">Receive weekly email with your DEO score changes</p>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => handleToggle('notifyWeeklyDeoSummary')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.notifyWeeklyDeoSummary ? 'bg-blue-600' : 'bg-gray-200'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.notifyWeeklyDeoSummary ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Default Behaviors */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Behaviors</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auto-Open Issues Tab</p>
                <p className="text-sm text-gray-500">Automatically open the issues tab when viewing a project</p>
              </div>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => handleToggle('autoOpenIssuesTab')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.autoOpenIssuesTab ? 'bg-blue-600' : 'bg-gray-200'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.autoOpenIssuesTab ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <div>
              <label className="block font-medium text-gray-900">Preferred Pillar Landing</label>
              <p className="text-sm text-gray-500 mb-2">Default pillar to show when opening a project</p>
              <select
                value={preferences.preferredPillarLanding || ''}
                onChange={(e) => setPreferences({ ...preferences, preferredPillarLanding: e.target.value || null })}
                disabled={isReadOnly}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Default (Overview)</option>
                <option value="metadata">Metadata</option>
                <option value="search_intent">Search Intent</option>
                <option value="competitive">Competitive</option>
                <option value="offsite">Off-site Signals</option>
                <option value="local">Local Discovery</option>
                <option value="media">Media</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {!isReadOnly && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}
    </div>
  );
}
