'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

/**
 * [ADMIN-OPS-1][D5 Issues Explorer]
 */
interface IssuesSummary {
  summary: {
    missingSeoTitle: number;
    missingSeoDescription: number;
    missingBothSeoFields: number;
  };
  derivedAt: string;
}

export default function AdminIssuesPage() {
  const [data, setData] = useState<IssuesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchIssues() {
      try {
        const result = await adminApi.getIssuesSummary();
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load issues');
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();
  }, []);

  if (loading) {
    return <p className="text-gray-600">Loading issues...</p>;
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Issues</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Global Issues Summary</h2>
        <p className="text-sm text-gray-500 mb-4">
          Derived from existing data. No AI calls or recalculation jobs.
        </p>

        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-red-600">{data?.summary.missingSeoTitle || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Missing SEO Title</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-orange-600">{data?.summary.missingSeoDescription || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Missing SEO Description</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-red-800">{data?.summary.missingBothSeoFields || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Missing Both Fields</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
        Data derived at: {data?.derivedAt ? new Date(data.derivedAt).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
}
