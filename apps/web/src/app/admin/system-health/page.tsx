'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

/**
 * [ADMIN-OPS-1][D7 System Health]
 */
interface SystemHealth {
  queueHealth: {
    queuedRuns: number;
    stalledRuns: number;
    jobLagWarning: boolean;
  };
  failureSignals: {
    recentFailures: number;
    shopifyFailures24h: number;
  };
  checkedAt: string;
}

export default function AdminSystemHealthPage() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchHealth() {
      try {
        const result = await adminApi.getSystemHealth();
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load system health');
      } finally {
        setLoading(false);
      }
    }

    fetchHealth();
  }, []);

  if (loading) {
    return <p className="text-gray-600">Loading system health...</p>;
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Health</h1>

      {/* Job Lag Warning */}
      {data?.queueHealth.jobLagWarning && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-lg mb-6">
          <h2 className="text-lg font-bold">Job Lag Warning</h2>
          <p className="mt-1">
            {data.queueHealth.stalledRuns} run(s) have been queued for more than 1 hour.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Queue Health */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Queue Health</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Queued Runs</span>
              <span className="text-2xl font-bold text-gray-900">{data?.queueHealth.queuedRuns || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Stalled Runs (1h+)</span>
              <span className={`text-2xl font-bold ${
                (data?.queueHealth.stalledRuns || 0) > 0 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {data?.queueHealth.stalledRuns || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Job Lag Status</span>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                data?.queueHealth.jobLagWarning
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {data?.queueHealth.jobLagWarning ? 'Warning' : 'OK'}
              </span>
            </div>
          </div>
        </div>

        {/* Failure Signals */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Failure Signals</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Recent Failures (1h)</span>
              <span className={`text-2xl font-bold ${
                (data?.failureSignals.recentFailures || 0) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {data?.failureSignals.recentFailures || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Shopify Failures (24h)</span>
              <span className={`text-2xl font-bold ${
                (data?.failureSignals.shopifyFailures24h || 0) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {data?.failureSignals.shopifyFailures24h || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
        Last checked: {data?.checkedAt ? new Date(data.checkedAt).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
}
