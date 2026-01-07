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

// [DRAFT-CLARITY-AND-ACTION-TRUST-1] Filter types
type StatusFilter = 'all' | 'succeeded' | 'skipped' | 'failed';
type InitiatorFilter = 'all' | 'manual' | 'automation';

// [DRAFT-CLARITY-AND-ACTION-TRUST-1] Human-readable skip reason mapping
function getSkipReasonExplanation(
  action: string,
  status: string,
  errorMessage?: string | null
): string | null {
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Check status='skipped' first
  if (status === 'skipped') {
    // Check error message for specific skip reasons (from sync logs)
    if (errorMessage === 'sync_toggle_off') {
      return 'Skipped because Shopify sync is disabled in Project Settings.';
    }
    if (errorMessage === 'plan_not_entitled') {
      return 'Skipped because your plan does not include this feature.';
    }
    if (errorMessage === 'daily_cap_reached') {
      return 'Skipped because the daily sync limit has been reached.';
    }
    // Check action for specific skip reasons (from automation logs)
    if (action === 'skip_plan_free') {
      return 'Skipped because the Free plan does not include Answer Block automation.';
    }
    if (action === 'skip_no_generated_answers') {
      return 'Skipped because there were no AI-generated answers to process.';
    }
    if (action === 'skip_no_action') {
      return 'Skipped because no action was needed (Answer Blocks were already up to date).';
    }
    if (action === 'skip_sync_toggle_off') {
      return 'Skipped because Shopify sync is disabled in Project Settings.';
    }
    if (action.startsWith('skip_')) {
      return `Skipped: ${action.replace('skip_', '').replace(/_/g, ' ')}`;
    }
    return 'Skipped (see details).';
  }
  // Legacy action-based skip detection
  if (action === 'skip_plan_free') {
    return 'Skipped because the Free plan does not include Answer Block automation.';
  }
  if (action === 'skip_no_generated_answers') {
    return 'Skipped because there were no AI-generated answers to process.';
  }
  if (action === 'skip_no_action') {
    return 'Skipped because no action was needed (Answer Blocks were already up to date).';
  }
  if (action === 'skip_sync_toggle_off') {
    return 'Skipped because Shopify sync is disabled in Project Settings.';
  }
  if (action === 'error' && errorMessage) {
    return `Failed: ${errorMessage}`;
  }
  if (status === 'failed' && errorMessage) {
    return `Failed: ${errorMessage}`;
  }
  if (action.startsWith('skip_')) {
    return `Skipped: ${action.replace('skip_', '').replace(/_/g, ' ')}`;
  }
  return null;
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1] Human-readable "what ran" description
function getWhatRanLabel(log: AnswerBlockAutomationLog): string {
  if (log.action === 'generate_missing') {
    return 'Generated missing Answer Blocks';
  }
  if (log.action === 'regenerate_weak') {
    return 'Regenerated weak Answer Blocks';
  }
  if (log.action.startsWith('skip_')) {
    return 'Answer Block automation';
  }
  if (log.action === 'error') {
    return 'Answer Block automation';
  }
  return 'Answer Block automation';
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1] Human-readable "why ran/skipped" description
function getWhyRanLabel(log: AnswerBlockAutomationLog): string {
  const triggerMap: Record<string, string> = {
    manual: 'Manually triggered',
    issue_detected: 'Triggered by issue detection',
    scheduled: 'Scheduled automation',
    product_sync: 'Triggered by product sync',
    answer_block_save: 'Triggered by Answer Block save',
  };
  return triggerMap[log.triggerType] ?? `Trigger: ${log.triggerType}`;
}

// [DRAFT-CLARITY-AND-ACTION-TRUST-1] Human-readable "what was affected"
function getWhatAffectedLabel(log: AnswerBlockAutomationLog): string {
  if (log.status === 'succeeded') {
    if (log.action === 'generate_missing' || log.action === 'regenerate_weak') {
      return 'Answer Blocks in EngineO (synced to Shopify if enabled in Settings)';
    }
  }
  return 'Answer Blocks in EngineO';
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getActionLabel(log: AnswerBlockAutomationLog): string {
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
  // [DRAFT-CLARITY-AND-ACTION-TRUST-1] Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [initiatorFilter, setInitiatorFilter] = useState<InitiatorFilter>('all');

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

  // [DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-1] Apply filters to logs
  const filteredLogs = logs.filter((log) => {
    // Status filter
    if (statusFilter !== 'all') {
      const normalizedStatus = log.status.toLowerCase();
      // [FIXUP-1] Use status='skipped' as primary check, with action fallback
      const isSkipped = normalizedStatus === 'skipped' || log.action.startsWith('skip_');
      if (statusFilter === 'succeeded' && normalizedStatus !== 'succeeded') return false;
      if (statusFilter === 'failed' && normalizedStatus !== 'failed') return false;
      if (statusFilter === 'skipped' && !isSkipped) return false;
    }
    // Initiator filter
    if (initiatorFilter !== 'all') {
      // [FIXUP-1] Treat 'manual' and 'manual_sync' as manual triggers
      const isManual = log.triggerType === 'manual' || log.triggerType === 'manual_sync';
      if (initiatorFilter === 'manual' && !isManual) return false;
      if (initiatorFilter === 'automation' && isManual) return false;
    }
    return true;
  });

  const sortedLogs = filteredLogs.length > 0
    ? [...filteredLogs].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      })
    : [];
  const latestLog = hasLogs ? [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null;

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
            {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Human-readable what/why/affected */}
            <div className="mt-1 text-xs font-medium text-gray-900">
              {getWhatRanLabel(latestLog)}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              {getWhyRanLabel(latestLog)}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              Affected: {getWhatAffectedLabel(latestLog)}
            </div>
            {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Skip/fail explanation */}
            {getSkipReasonExplanation(latestLog.action, latestLog.status, latestLog.errorMessage) && (
              <div
                data-testid="skipped-row-explanation"
                className="mt-1 rounded bg-yellow-50 px-2 py-1 text-[11px] text-yellow-800"
              >
                {getSkipReasonExplanation(latestLog.action, latestLog.status, latestLog.errorMessage)}
              </div>
            )}
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
            <div className="space-y-3 text-xs text-gray-700">
              {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Filters */}
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500">Status:</span>
                  <select
                    data-testid="automation-status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700"
                  >
                    <option value="all">All</option>
                    <option value="succeeded">Succeeded</option>
                    <option value="skipped">Skipped</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500">Initiator:</span>
                  <select
                    data-testid="automation-initiator-filter"
                    value={initiatorFilter}
                    onChange={(e) => setInitiatorFilter(e.target.value as InitiatorFilter)}
                    className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700"
                  >
                    <option value="all">All</option>
                    <option value="manual">Manual</option>
                    <option value="automation">Automation</option>
                  </select>
                </div>
              </div>
              {sortedLogs.length === 0 ? (
                <div className="py-2 text-center text-[11px] text-gray-500">
                  No runs match the current filters.
                </div>
              ) : (
                sortedLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-gray-500">
                        {formatDate(log.createdAt)}
                      </div>
                      {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Human-readable what/why/affected */}
                      <div className="mt-0.5 text-xs font-medium text-gray-900">
                        {getWhatRanLabel(log)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-500">
                        {getWhyRanLabel(log)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-500">
                        Affected: {getWhatAffectedLabel(log)}
                      </div>
                      {/* [DRAFT-CLARITY-AND-ACTION-TRUST-1] Skip/fail explanation */}
                      {getSkipReasonExplanation(log.action, log.status, log.errorMessage) && (
                        <div
                          data-testid="skipped-row-explanation"
                          className="mt-1 rounded bg-yellow-50 px-2 py-1 text-[11px] text-yellow-800"
                        >
                          {getSkipReasonExplanation(log.action, log.status, log.errorMessage)}
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
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
