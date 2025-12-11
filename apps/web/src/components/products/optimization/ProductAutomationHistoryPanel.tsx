'use client';

import { useCallback, useEffect, useState } from 'react';
import { productsApi, ApiError } from '@/lib/api';

interface AnswerBlockAutomationLog {
  id: string;
  createdAt: string;
  triggerType: string;
  action: string;
  status: string;
  planId: string;
  modelUsed?: string | null;
  errorMessage?: string | null;
}

interface ProductAutomationHistoryPanelProps {
  productId: string;
}

function formatDate(value: string) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let classes =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ';
  if (normalized === 'succeeded') {
    classes += 'bg-green-100 text-green-800';
  } else if (normalized === 'failed') {
    classes += 'bg-red-100 text-red-800';
  } else {
    classes += 'bg-gray-100 text-gray-700';
  }
  const label =
    normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return <span className={classes}>{label}</span>;
}

function getActionLabel(log: AnswerBlockAutomationLog): string {
  if (log.action === 'generate_missing') {
    return 'Generated Answer Blocks';
  }
  if (log.action === 'regenerate_weak') {
    return 'Regenerated weak Answer Blocks';
  }
  if (log.action === 'skip_plan_free') {
    return 'Skipped (Free plan)';
  }
  if (log.action === 'skip_no_generated_answers') {
    return 'Skipped (no generated answers)';
  }
  if (log.action === 'skip_no_action') {
    return 'Skipped (no action needed)';
  }
  if (log.action === 'error') {
    return 'Automation error';
  }
  return log.action;
}

export function ProductAutomationHistoryPanel({
  productId,
}: ProductAutomationHistoryPanelProps) {
  const [logs, setLogs] = useState<AnswerBlockAutomationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await productsApi.getAnswerBlockAutomationLogs(productId);
      const items: AnswerBlockAutomationLog[] = Array.isArray(data?.logs)
        ? data.logs
        : [];
      setLogs(items);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error loading automation logs', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to load automation history. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const hasLogs = logs.length > 0;
  const sortedLogs = hasLogs
    ? [...logs].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      })
    : [];
  const latestLog = hasLogs ? sortedLogs[0] : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6M7 8h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">
            Automation History (Answer Blocks)
          </h3>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <svg
            className="mr-1 h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-6">
          <svg
            className="h-5 w-5 animate-spin text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">Loading automation history...</p>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="py-4 text-xs text-gray-500">
          No Answer Block automation runs have been recorded for this product yet.
          When automations run, they will appear here with status and timestamps.
        </div>
      )}

      {!loading && !error && logs.length > 0 && latestLog && (
        <div className="space-y-3 text-xs text-gray-700">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium text-gray-900">
                Last automation
              </div>
              <StatusBadge status={latestLog.status} />
            </div>
            <div className="text-[11px] text-gray-500">
              {formatDate(latestLog.createdAt)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-gray-900">
              {getActionLabel(latestLog)}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              Trigger:{' '}
              <span className="font-mono">{latestLog.triggerType}</span> · Plan:{' '}
              <span className="font-mono">{latestLog.planId}</span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
            >
              {expanded
                ? 'Hide full history'
                : `View full history (${logs.length})`}
              <svg
                className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {expanded && (
            <div className="space-y-2 text-xs text-gray-700">
              {sortedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-gray-500">
                      {formatDate(log.createdAt)}
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-gray-900">
                      {getActionLabel(log)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      Trigger:{' '}
                      <span className="font-mono">{log.triggerType}</span> · Plan:{' '}
                      <span className="font-mono">{log.planId}</span>
                    </div>
                    {log.errorMessage && (
                      <div className="mt-1 flex items-start gap-1 text-[11px] text-red-600">
                        <svg
                          className="mt-0.5 h-3 w-3 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0z"
                          />
                        </svg>
                        <span className="line-clamp-2">
                          {log.errorMessage}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex flex-col items-end gap-1">
                    <StatusBadge status={log.status} />
                    {log.modelUsed && (
                      <span className="text-[10px] text-gray-400">
                        Model: {log.modelUsed}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
