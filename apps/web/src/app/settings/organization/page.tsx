'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { accountApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface ConnectedStore {
  projectId: string;
  projectName: string;
  storeDomain: string | null;
  integrationType: string;
  integrationId: string;
  connectedAt: string;
}

/**
 * [SELF-SERVICE-1] Organization / Stores Page (D2)
 *
 * - Organization name edit (OWNER/EDITOR; viewer read-only)
 * - List connected Shopify stores (derived from projects/integrations)
 * - Actions: connect new store, disconnect store (OWNER only), re-auth Shopify
 */
export default function OrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(
    null
  );

  const [organizationName, setOrganizationName] = useState('');
  const [accountRole, setAccountRole] = useState('OWNER');
  const [stores, setStores] = useState<ConnectedStore[]>([]);

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
      const [profile, storesData] = await Promise.all([
        accountApi.getProfile(),
        accountApi.getStores(),
      ]);
      setOrganizationName(profile.organizationName || '');
      setAccountRole(profile.accountRole);
      setStores(storesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (accountRole === 'VIEWER') {
      setError('Viewers cannot edit organization settings');
      return;
    }

    try {
      setSaving(true);
      await accountApi.updateProfile({
        organizationName: organizationName || null,
      });
      setSuccess('Organization name updated.');
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (projectId: string) => {
    if (accountRole !== 'OWNER') {
      setError('Only account owners can disconnect stores');
      return;
    }

    try {
      setDisconnecting(projectId);
      await accountApi.disconnectStore(projectId);
      setSuccess('Store disconnected successfully.');
      setConfirmDisconnect(null);
      // Reload stores
      const storesData = await accountApi.getStores();
      setStores(storesData);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect store');
    } finally {
      setDisconnecting(null);
    }
  };

  const isReadOnly = accountRole === 'VIEWER';
  const canDisconnect = accountRole === 'OWNER';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Stores</h1>
      <p className="text-gray-600 mb-6">
        Manage your connected Shopify stores and organization settings.
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
          {success}
        </div>
      )}

      {/* Organization Name */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Organization
        </h2>
        <form onSubmit={handleSaveOrg}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Organization Name
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              disabled={isReadOnly}
              className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="Your organization name"
            />
            {isReadOnly && (
              <p className="mt-1 text-xs text-gray-500">
                You have read-only access
              </p>
            )}
          </div>
          {!isReadOnly && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Connected Stores */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Connected Stores
          </h2>
          <a
            href="/projects"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Connect New Store
          </a>
        </div>

        {stores.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No stores connected. Connect a Shopify store from your projects.
          </p>
        ) : (
          <div className="space-y-4">
            {stores.map((store) => (
              <div
                key={store.integrationId}
                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium text-gray-900">
                    {store.projectName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {store.storeDomain || 'No domain'} &middot;{' '}
                    {store.integrationType}
                  </p>
                  <p className="text-xs text-gray-400">
                    Connected {new Date(store.connectedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {canDisconnect && (
                    <>
                      {confirmDisconnect === store.projectId ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDisconnect(store.projectId)}
                            disabled={disconnecting === store.projectId}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {disconnecting === store.projectId
                              ? 'Disconnecting...'
                              : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDisconnect(null)}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDisconnect(store.projectId)}
                          className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                        >
                          Disconnect
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!canDisconnect && stores.length > 0 && (
          <p className="mt-4 text-sm text-gray-500">
            Only account owners can disconnect stores.
          </p>
        )}
      </div>
    </div>
  );
}
