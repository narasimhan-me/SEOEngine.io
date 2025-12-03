'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalProjects: number;
  usersToday: number;
  usersByRole: Record<string, number>;
  subscriptionsByPlan: Record<string, number>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await adminApi.getStats();
        setStats(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return <p className="text-gray-600">Loading statistics...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Users</h3>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Projects</h3>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalProjects || 0}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">New Users Today</h3>
          <p className="text-3xl font-bold text-gray-900">{stats?.usersToday || 0}</p>
        </div>
      </div>

      {/* Users by Role */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Users by Role</h3>
          <div className="space-y-3">
            {Object.entries(stats?.usersByRole || {}).map(([role, count]) => (
              <div key={role} className="flex justify-between items-center">
                <span className="text-gray-600">{role}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(stats?.usersByRole || {}).length === 0 && (
              <p className="text-gray-500 text-sm">No data available</p>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Subscriptions by Plan</h3>
          <div className="space-y-3">
            {Object.entries(stats?.subscriptionsByPlan || {}).map(([plan, count]) => (
              <div key={plan} className="flex justify-between items-center">
                <span className="text-gray-600 capitalize">{plan}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
            {Object.keys(stats?.subscriptionsByPlan || {}).length === 0 && (
              <p className="text-gray-500 text-sm">No subscriptions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
