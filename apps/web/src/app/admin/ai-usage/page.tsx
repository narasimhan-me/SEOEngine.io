'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

/**
 * [ADMIN-OPS-1][D6 AI Usage Console]
 */
interface AiUsageData {
  usageByPlan: Record<string, number>;
  topConsumers: Array<{
    userId: string;
    email: string;
    aiRunsThisMonth: number;
  }>;
  reuseEffectiveness: {
    totalAiRuns: number;
    reusedRuns: number;
    reuseRate: number;
  };
  applyInvariantRedAlert: boolean;
  applyRunsWithAiCount: number;
}

export default function AdminAiUsagePage() {
  const [data, setData] = useState<AiUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAiUsage() {
      try {
        const result = await adminApi.getAiUsage();
        setData(result);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to load AI usage'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAiUsage();
  }, []);

  if (loading) {
    return <p className="text-gray-600">Loading AI usage...</p>;
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">AI Usage</h1>

      {/* Red Alert Banner */}
      {data?.applyInvariantRedAlert && (
        <div className="bg-red-600 text-white px-6 py-4 rounded-lg mb-6">
          <h2 className="text-lg font-bold">
            APPLY INVARIANT VIOLATION DETECTED
          </h2>
          <p className="mt-1">
            {data.applyRunsWithAiCount} APPLY run(s) have aiUsed=true. This
            violates the APPLY invariant (APPLY runs should never use AI).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Usage by Plan */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Usage by Plan
          </h2>
          <div className="space-y-3">
            {Object.entries(data?.usageByPlan || {}).map(([plan, count]) => (
              <div key={plan} className="flex justify-between items-center">
                <span className="text-gray-600 capitalize">{plan}</span>
                <span className="font-medium text-gray-900">{count} runs</span>
              </div>
            ))}
            {Object.keys(data?.usageByPlan || {}).length === 0 && (
              <p className="text-gray-500 text-sm">No usage data</p>
            )}
          </div>
        </div>

        {/* Reuse Effectiveness */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Reuse Effectiveness
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total AI Runs</span>
              <span className="font-medium text-gray-900">
                {data?.reuseEffectiveness.totalAiRuns || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Reused Runs</span>
              <span className="font-medium text-green-600">
                {data?.reuseEffectiveness.reusedRuns || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Reuse Rate</span>
              <span className="font-bold text-green-600">
                {data?.reuseEffectiveness.reuseRate || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Invariant Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            APPLY Invariant
          </h2>
          <div
            className={`text-center p-4 rounded-lg ${
              data?.applyInvariantRedAlert
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            <p className="text-2xl font-bold">
              {data?.applyInvariantRedAlert ? 'VIOLATED' : 'OK'}
            </p>
            <p className="text-sm mt-1">
              {data?.applyRunsWithAiCount || 0} APPLY runs with AI
            </p>
          </div>
        </div>
      </div>

      {/* Top Consumers */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Top Consumers (This Month)
        </h2>
        {(data?.topConsumers || []).length === 0 ? (
          <p className="text-gray-500 text-sm">No consumers this month</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase">
                  AI Runs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.topConsumers.map((consumer, idx) => (
                <tr key={consumer.userId}>
                  <td className="py-2 text-sm">
                    <span className="text-gray-500 mr-2">#{idx + 1}</span>
                    {consumer.email}
                  </td>
                  <td className="py-2 text-sm font-medium">
                    {consumer.aiRunsThisMonth}
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
