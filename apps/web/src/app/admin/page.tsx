'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

/**
 * [ADMIN-OPS-1] Overview response type from the new overview endpoint.
 */
interface Overview {
  totalUsers: number;
  activeUsers: number;
  shopifyConnectedProjects: number;
  deoHealthDistribution: Record<string, number>;
  aiUsage: {
    today: number;
    month: number;
    reuseRate: number;
  };
  quotaPressure: {
    usersNearLimit: number;
  };
  errorRates: {
    failedRunsThisMonth: number;
    shopifyFailuresLast7Days: number;
  };
}

/**
 * [ADMIN-OPS-1][D1 Overview UI]
 * Executive snapshot dashboard using the new overview endpoint/fields.
 * Read-only and does not trigger any background/AI work.
 */
export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOverview() {
      try {
        const data = await adminApi.getOverview();
        setOverview(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to load overview'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, []);

  if (loading) {
    return <p className="text-gray-600">Loading overview...</p>;
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Total Users
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {overview?.totalUsers || 0}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Active Users (7d)
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {overview?.activeUsers || 0}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Shopify Projects
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {overview?.shopifyConnectedProjects || 0}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Quota Pressure
          </h3>
          <p className="text-3xl font-bold text-orange-600">
            {overview?.quotaPressure.usersNearLimit || 0}
          </p>
          <p className="text-xs text-gray-500">users near limit</p>
        </div>
      </div>

      {/* AI Usage and Error Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">AI Usage</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Today</span>
              <span className="font-medium text-gray-900">
                {overview?.aiUsage.today || 0} runs
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="font-medium text-gray-900">
                {overview?.aiUsage.month || 0} runs
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Reuse Rate</span>
              <span className="font-medium text-green-600">
                {overview?.aiUsage.reuseRate || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Error Rates
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Failed Runs (month)</span>
              <span className="font-medium text-red-600">
                {overview?.errorRates.failedRunsThisMonth || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Shopify Failures (7d)</span>
              <span className="font-medium text-red-600">
                {overview?.errorRates.shopifyFailuresLast7Days || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            DEO Health Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(overview?.deoHealthDistribution || {}).map(
              ([bucket, count]) => (
                <div key={bucket} className="flex justify-between items-center">
                  <span className="text-gray-600 capitalize">
                    {bucket.replace('_', ' ')}
                  </span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              )
            )}
            {Object.keys(overview?.deoHealthDistribution || {}).length ===
              0 && <p className="text-gray-500 text-sm">No data available</p>}
          </div>
        </div>
      </div>

      {/* Note about read-only */}
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
        This overview is read-only and does not trigger any AI work or
        background jobs.
      </div>
    </div>
  );
}
