'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { accountApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface AiUsageSummary {
  month: string;
  totalRuns: number;
  aiUsedRuns: number;
  reusedRuns: number;
  runsAvoided: number;
  applyInvariantViolations: number;
  applyInvariantMessage: string;
  reuseMessage: string;
}

/**
 * [SELF-SERVICE-1] AI Usage Page (D4)
 *
 * Visibility only:
 * - Monthly summary
 * - AI-used vs reused
 * - Savings from reuse
 * - Explicit contract reminders:
 *   - "Apply never uses AI"
 *   - "Reuse does not consume quota"
 */
export default function AiUsagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadUsage();
  }, [router]);

  const loadUsage = async () => {
    try {
      setLoading(true);
      const data = await accountApi.getAiUsage();
      setUsage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load AI usage');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Usage</h1>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Usage</h1>
      <p className="text-gray-600 mb-6">
        View your monthly AI usage summary and savings from reuse.
      </p>

      {usage && (
        <>
          {/* Monthly Summary */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {formatMonth(usage.month)} Summary
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {usage.totalRuns}
                </p>
                <p className="text-sm text-gray-500">Total Runs</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-indigo-600">
                  {usage.aiUsedRuns}
                </p>
                <p className="text-sm text-gray-500">AI Used</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {usage.reusedRuns}
                </p>
                <p className="text-sm text-gray-500">Reused</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {usage.runsAvoided}
                </p>
                <p className="text-sm text-gray-500">Runs Saved</p>
              </div>
            </div>
          </div>

          {/* Reuse Effectiveness */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Reuse Effectiveness
            </h2>
            <p className="text-gray-600">{usage.reuseMessage}</p>

            {usage.reusedRuns > 0 && (
              <div className="mt-4">
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 rounded-full h-2"
                      style={{
                        width: `${(usage.reusedRuns / usage.totalRuns) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="ml-3 text-sm text-gray-600">
                    {((usage.reusedRuns / usage.totalRuns) * 100).toFixed(0)}%
                    reuse rate
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Contract Reminders */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              How AI Quota Works
            </h2>

            <div className="space-y-4">
              {/* APPLY Invariant */}
              <div
                className={`p-4 rounded-lg ${usage.applyInvariantViolations === 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {usage.applyInvariantViolations === 0 ? (
                      <svg
                        className="h-5 w-5 text-green-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-red-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3
                      className={`text-sm font-medium ${usage.applyInvariantViolations === 0 ? 'text-green-800' : 'text-red-800'}`}
                    >
                      APPLY Never Uses AI
                    </h3>
                    <p
                      className={`mt-1 text-sm ${usage.applyInvariantViolations === 0 ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {usage.applyInvariantMessage}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reuse Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
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
                    <h3 className="text-sm font-medium text-blue-800">
                      Reuse Does Not Consume Quota
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      When you reuse previously generated content, no AI calls
                      are made and your quota is preserved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
