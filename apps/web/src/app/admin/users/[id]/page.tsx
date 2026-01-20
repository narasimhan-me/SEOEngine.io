'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';

/**
 * [ADMIN-OPS-1][D2 User Detail]
 */
interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: string;
  adminRole: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  subscription: {
    plan: string;
    status: string;
  } | null;
  projects: Array<{
    id: string;
    name: string;
    domain: string;
    currentDeoScore: number | null;
    createdAt: string;
    _count: { products: number };
  }>;
  usageSummary: {
    aiUsageThisMonth: number;
    recentRuns: Array<{
      id: string;
      playbookId: string;
      runType: string;
      status: string;
      aiUsed: boolean;
      createdAt: string;
    }>;
  };
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  async function fetchUser() {
    try {
      const data = await adminApi.getUser(userId);
      setUser(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }

  async function handleImpersonate() {
    if (
      !confirm(
        'Start read-only impersonation for this user? This action will be logged.'
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const result = await adminApi.impersonateUser(
        userId,
        'Admin panel impersonation'
      );
      alert(
        `Impersonation token generated. Mode: ${result.mode}\n\nToken (copy and use in another browser):\n${result.token}`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to impersonate');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetQuota() {
    const reason = prompt('Reason for quota reset (optional):');
    if (reason === null) return; // Cancelled
    setActionLoading(true);
    try {
      await adminApi.resetUserQuota(userId, reason || undefined);
      alert('Quota reset successfully');
      fetchUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset quota');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdjustPlan() {
    const newPlan = prompt('Enter new plan (free, starter, pro, enterprise):');
    if (!newPlan) return;
    setActionLoading(true);
    try {
      await adminApi.updateUserSubscription(userId, newPlan);
      alert('Plan updated successfully');
      fetchUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return <p className="text-gray-600">Loading user...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!user) {
    return <p className="text-gray-600">User not found</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          &larr; Back to Users
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Detail</h1>

      {/* User Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{user.name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Plan</p>
            <p className="font-medium capitalize">
              {user.subscription?.plan || 'free'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                user.accountStatus === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {user.accountStatus}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">AI Usage This Month</p>
            <p className="font-medium">
              {user.usageSummary.aiUsageThisMonth} runs
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Activity</p>
            <p className="font-medium">{formatDate(user.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Actions (role-gated on backend) */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
        <p className="text-sm text-gray-500 mb-4">
          All actions are logged in the audit log.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleImpersonate}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Impersonate (Read-only)
          </button>
          <button
            onClick={handleAdjustPlan}
            disabled={actionLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            Adjust Plan
          </button>
          <button
            onClick={handleResetQuota}
            disabled={actionLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            Reset Quota
          </button>
        </div>
      </div>

      {/* Projects */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Projects ({user.projects.length})
        </h2>
        {user.projects.length === 0 ? (
          <p className="text-gray-500 text-sm">No projects</p>
        ) : (
          <div className="space-y-3">
            {user.projects.map((project) => (
              <div
                key={project.id}
                className="flex justify-between items-center border-b border-gray-100 pb-2"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-gray-500">{project.domain}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    DEO: {project.currentDeoScore ?? 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {project._count.products} products
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Runs</h2>
        {user.usageSummary.recentRuns.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent runs</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase">
                  Run Type
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase">
                  AI Used
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {user.usageSummary.recentRuns.map((run) => (
                <tr key={run.id}>
                  <td className="py-2 text-sm">{run.runType}</td>
                  <td className="py-2 text-sm">{run.status}</td>
                  <td className="py-2 text-sm">{run.aiUsed ? 'Yes' : 'No'}</td>
                  <td className="py-2 text-sm text-gray-500">
                    {formatDate(run.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
