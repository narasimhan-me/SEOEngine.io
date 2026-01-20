'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';

/**
 * [ADMIN-OPS-1][D4 Run Detail]
 */
interface RunDetail {
  id: string;
  projectId: string;
  playbookId: string;
  runType: string;
  status: string;
  aiUsed: boolean;
  reused: boolean;
  reusedFromRunId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  resultRef: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  project: { name: string; domain: string };
  createdBy: { id: string; email: string };
}

export default function AdminRunDetailPage() {
  const params = useParams();
  const runId = params.id as string;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryLoading, setRetryLoading] = useState(false);

  useEffect(() => {
    fetchRun();
  }, [runId]);

  async function fetchRun() {
    try {
      const data = await adminApi.getRun(runId);
      setRun(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load run');
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry() {
    if (!confirm('Retry this run? This action will be logged.')) {
      return;
    }
    setRetryLoading(true);
    try {
      await adminApi.retryRun(runId);
      alert('Run queued for retry');
      fetchRun();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retry run');
    } finally {
      setRetryLoading(false);
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
    return <p className="text-gray-600">Loading run...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!run) {
    return <p className="text-gray-600">Run not found</p>;
  }

  const canRetry =
    ['FAILED', 'STALE'].includes(run.status) &&
    run.runType === 'PREVIEW_GENERATE';

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/runs"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          &larr; Back to Runs
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Run Detail</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Run ID</p>
            <p className="font-mono text-sm">{run.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-flex px-2 py-1 text-xs rounded-full ${
                run.status === 'SUCCEEDED'
                  ? 'bg-green-100 text-green-800'
                  : run.status === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {run.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Project</p>
            <p className="font-medium">{run.project.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Run Type</p>
            <p className="font-medium">{run.runType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">AI Used</p>
            <p className={run.aiUsed ? 'text-orange-600 font-medium' : ''}>
              {run.aiUsed ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Reused</p>
            <p className={run.reused ? 'text-green-600 font-medium' : ''}>
              {run.reused ? 'Yes' : 'No'}
            </p>
          </div>
          {run.reusedFromRunId && (
            <div>
              <p className="text-sm text-gray-500">Reused From</p>
              <p className="font-mono text-sm">{run.reusedFromRunId}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="font-medium">{run.createdBy.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p>{formatDate(run.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Updated At</p>
            <p>{formatDate(run.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Error Details */}
      {run.errorCode || run.errorMessage ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-red-900 mb-2">
            Error Details
          </h2>
          {run.errorCode && (
            <p className="text-sm">
              <span className="font-medium">Code:</span> {run.errorCode}
            </p>
          )}
          {run.errorMessage && (
            <p className="text-sm mt-1">
              <span className="font-medium">Message:</span> {run.errorMessage}
            </p>
          )}
        </div>
      ) : null}

      {/* Metadata (redacted) */}
      {run.meta && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Metadata (Redacted)
          </h2>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(run.meta, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      {canRetry && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
          <button
            onClick={handleRetry}
            disabled={retryLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {retryLoading ? 'Retrying...' : 'Retry Run'}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            This action will be logged.
          </p>
        </div>
      )}
    </div>
  );
}
