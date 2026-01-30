'use client';

import { useEffect, useState, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';

/**
 * [EA-48] Automation Oversight Page
 * Read-only admin view for automation governance:
 * - Automation run history with playbook details
 * - Automation scopes and boundaries
 * - Automation limits and thresholds
 *
 * Trust Contract: All views are strictly read-only with no mutation actions.
 */

type TabId = 'runs' | 'scopes' | 'limits';

interface AutomationRun {
  id: string;
  projectId: string;
  projectName: string;
  projectDomain: string;
  ownerEmail: string;
  playbookId: string;
  runType: string;
  status: string;
  aiUsed: boolean;
  reused: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  scopeId: string | null;
  createdAt: string;
  createdBy: { id: string; email: string; name: string | null } | null;
}

interface AutomationScope {
  draftId: string;
  projectId: string;
  projectName: string;
  projectDomain: string;
  playbookId: string;
  scopeId: string;
  rulesHash: string | null;
  assetType: string | null;
  status: string;
  boundaries: { affectedTotal: number; draftGenerated: number };
  applied: boolean;
  appliedAt: string | null;
  expired: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface AutomationLimits {
  planLimits: Record<string, { aiRunsPerMonth: number; maxExecutionsPerDay: number }>;
  currentMonthUsage: Array<{
    plan: string;
    userCount: number;
    totalRuns: number;
    aiRuns: number;
    limit: number;
  }>;
  quotaResetsThisMonth: number;
  usersNearLimit: Array<{
    userId: string;
    email: string;
    plan: string;
    aiRuns: number;
    limit: number;
    percentUsed: number;
  }>;
  evaluatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AutomationOversightPage() {
  const [activeTab, setActiveTab] = useState<TabId>('runs');
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [scopes, setScopes] = useState<AutomationScope[]>([]);
  const [limits, setLimits] = useState<AutomationLimits | null>(null);
  const [runsPagination, setRunsPagination] = useState<Pagination | null>(null);
  const [scopesPagination, setScopesPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    runType: '',
    status: '',
    playbookId: '',
  });

  useEffect(() => {
    if (activeTab === 'runs') {
      fetchRuns();
    } else if (activeTab === 'scopes') {
      fetchScopes();
    } else if (activeTab === 'limits') {
      fetchLimits();
    }
  }, [activeTab, currentPage, filters]);

  async function fetchRuns() {
    setLoading(true);
    try {
      const data = await adminApi.getAutomationRuns({
        page: currentPage,
        limit: 20,
        runType: filters.runType || undefined,
        status: filters.status || undefined,
        playbookId: filters.playbookId || undefined,
      });
      setRuns(data.runs);
      setRunsPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load automation runs');
    } finally {
      setLoading(false);
    }
  }

  async function fetchScopes() {
    setLoading(true);
    try {
      const data = await adminApi.getAutomationScopes({
        page: currentPage,
        limit: 20,
      });
      setScopes(data.scopes);
      setScopesPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load automation scopes');
    } finally {
      setLoading(false);
    }
  }

  async function fetchLimits() {
    setLoading(true);
    try {
      const data = await adminApi.getAutomationLimits();
      setLimits(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load automation limits');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Runs table columns
  const runsColumns: DataTableColumn<AutomationRun & DataTableRow>[] = useMemo(
    () => [
      {
        key: 'project',
        header: 'Project',
        cell: (row) => (
          <div>
            <div className="text-sm font-medium text-foreground">{row.projectName}</div>
            <div className="text-xs text-muted-foreground">{row.ownerEmail}</div>
          </div>
        ),
      },
      {
        key: 'playbook',
        header: 'Playbook',
        cell: (row) => (
          <span className="text-sm text-foreground">{row.playbookId}</span>
        ),
      },
      {
        key: 'runType',
        header: 'Run Type',
        cell: (row) => (
          <span className="text-sm text-foreground">{row.runType}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => (
          <span
            className={`inline-flex px-2 py-1 text-xs rounded-full ${
              row.status === 'SUCCEEDED'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : row.status === 'FAILED'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  : row.status === 'RUNNING'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-muted text-muted-foreground'
            }`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: 'aiUsed',
        header: 'AI Used',
        cell: (row) =>
          row.aiUsed ? (
            <span className="text-sm text-orange-600 dark:text-orange-400">Yes</span>
          ) : (
            <span className="text-sm text-muted-foreground">No</span>
          ),
      },
      {
        key: 'created',
        header: 'Created',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
        ),
      },
    ],
    []
  );

  // Scopes table columns
  const scopesColumns: DataTableColumn<AutomationScope & DataTableRow>[] = useMemo(
    () => [
      {
        key: 'project',
        header: 'Project',
        cell: (row) => (
          <div>
            <div className="text-sm font-medium text-foreground">{row.projectName}</div>
            <div className="text-xs text-muted-foreground">{row.projectDomain}</div>
          </div>
        ),
      },
      {
        key: 'playbook',
        header: 'Playbook',
        cell: (row) => (
          <span className="text-sm text-foreground">{row.playbookId}</span>
        ),
      },
      {
        key: 'assetType',
        header: 'Asset Type',
        cell: (row) => (
          <span className="text-sm text-foreground">{row.assetType || '-'}</span>
        ),
      },
      {
        key: 'boundaries',
        header: 'Scope Boundary',
        cell: (row) => (
          <div>
            <div className="text-sm text-foreground">
              {row.boundaries.draftGenerated} / {row.boundaries.affectedTotal} assets
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => (
          <span
            className={`inline-flex px-2 py-1 text-xs rounded-full ${
              row.applied
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : row.expired
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
          >
            {row.applied ? 'Applied' : row.expired ? 'Expired' : row.status}
          </span>
        ),
      },
      {
        key: 'created',
        header: 'Created',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
        ),
      },
    ],
    []
  );

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Automation Oversight</h1>
      <p className="text-muted-foreground mb-6">
        Read-only view of automation governance: runs, scopes, and limits.
      </p>

      {/* Read-only notice */}
      <div className="mb-6 rounded-md border border-purple-300 bg-purple-50 px-4 py-3 dark:border-purple-700 dark:bg-purple-950">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-purple-600 dark:text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            Read-Only View
          </span>
        </div>
        <p className="mt-1 text-sm text-purple-600 dark:text-purple-400">
          This dashboard provides visibility into automation operations. No actions can be
          performed from this view.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6">
        {(['runs', 'scopes', 'limits'] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {tab === 'runs' && 'Run History'}
            {tab === 'scopes' && 'Scopes'}
            {tab === 'limits' && 'Limits'}
          </button>
        ))}
      </div>

      {/* Runs Tab */}
      {activeTab === 'runs' && (
        <>
          {/* Filters */}
          <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4 mb-6 flex gap-4">
            <select
              value={filters.runType}
              onChange={(e) => setFilters({ ...filters, runType: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
              data-no-row-keydown
            >
              <option value="">All Run Types</option>
              <option value="PREVIEW_GENERATE">Preview Generate</option>
              <option value="DRAFT_GENERATE">Draft Generate</option>
              <option value="APPLY">Apply</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
              data-no-row-keydown
            >
              <option value="">All Statuses</option>
              <option value="QUEUED">Queued</option>
              <option value="RUNNING">Running</option>
              <option value="SUCCEEDED">Succeeded</option>
              <option value="FAILED">Failed</option>
              <option value="STALE">Stale</option>
            </select>
            <select
              value={filters.playbookId}
              onChange={(e) => setFilters({ ...filters, playbookId: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
              data-no-row-keydown
            >
              <option value="">All Playbooks</option>
              <option value="missing_seo_title">Missing SEO Title</option>
              <option value="missing_seo_description">Missing SEO Description</option>
            </select>
          </div>

          {loading && runs.length === 0 ? (
            <p className="text-muted-foreground">Loading automation runs...</p>
          ) : (
            <>
              <DataTable columns={runsColumns} rows={runs} hideContextAction={true} />
              {runsPagination && runsPagination.pages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Page {runsPagination.page} of {runsPagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 hover:bg-muted"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(runsPagination.pages, p + 1))}
                      disabled={currentPage === runsPagination.pages}
                      className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 hover:bg-muted"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Scopes Tab */}
      {activeTab === 'scopes' && (
        <>
          {loading && scopes.length === 0 ? (
            <p className="text-muted-foreground">Loading automation scopes...</p>
          ) : (
            <>
              <DataTable columns={scopesColumns} rows={scopes} hideContextAction={true} />
              {scopesPagination && scopesPagination.pages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Page {scopesPagination.page} of {scopesPagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 hover:bg-muted"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(scopesPagination.pages, p + 1))}
                      disabled={currentPage === scopesPagination.pages}
                      className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 hover:bg-muted"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Limits Tab */}
      {activeTab === 'limits' && (
        <>
          {loading && !limits ? (
            <p className="text-muted-foreground">Loading automation limits...</p>
          ) : limits ? (
            <div className="space-y-6">
              {/* Plan Limits Reference */}
              <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Plan Limits</h3>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(limits.planLimits).map(([plan, config]) => (
                    <div key={plan} className="rounded-md border border-border p-3">
                      <div className="text-sm font-medium text-foreground capitalize">{plan}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {config.aiRunsPerMonth === -1
                          ? 'Unlimited'
                          : `${config.aiRunsPerMonth} AI runs/month`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {config.maxExecutionsPerDay === -1
                          ? 'Unlimited'
                          : `${config.maxExecutionsPerDay}/day`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Month Usage */}
              <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Current Month Usage by Plan
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium text-foreground">Plan</th>
                        <th className="text-left py-2 px-3 font-medium text-foreground">Users</th>
                        <th className="text-left py-2 px-3 font-medium text-foreground">
                          Total Runs
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-foreground">AI Runs</th>
                        <th className="text-left py-2 px-3 font-medium text-foreground">Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {limits.currentMonthUsage.map((usage) => (
                        <tr key={usage.plan} className="border-b border-border">
                          <td className="py-2 px-3 text-foreground capitalize">{usage.plan}</td>
                          <td className="py-2 px-3 text-muted-foreground">{usage.userCount}</td>
                          <td className="py-2 px-3 text-muted-foreground">{usage.totalRuns}</td>
                          <td className="py-2 px-3 text-muted-foreground">{usage.aiRuns}</td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {usage.limit === -1 ? 'Unlimited' : usage.limit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Users Near Limit */}
              <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Users Near Quota Limit ({limits.usersNearLimit.length})
                </h3>
                {limits.usersNearLimit.length === 0 ? (
                  <p className="text-muted-foreground">No users near their quota limit.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium text-foreground">Email</th>
                          <th className="text-left py-2 px-3 font-medium text-foreground">Plan</th>
                          <th className="text-left py-2 px-3 font-medium text-foreground">
                            AI Runs
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-foreground">Limit</th>
                          <th className="text-left py-2 px-3 font-medium text-foreground">Usage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {limits.usersNearLimit.map((user) => (
                          <tr key={user.userId} className="border-b border-border">
                            <td className="py-2 px-3 text-foreground">{user.email}</td>
                            <td className="py-2 px-3 text-muted-foreground capitalize">
                              {user.plan}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{user.aiRuns}</td>
                            <td className="py-2 px-3 text-muted-foreground">{user.limit}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      user.percentUsed >= 90
                                        ? 'bg-red-500'
                                        : user.percentUsed >= 80
                                          ? 'bg-orange-500'
                                          : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(user.percentUsed, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-12">
                                  {user.percentUsed}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quota Resets */}
              <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Quota Resets This Month</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Number of admin-initiated quota resets
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {limits.quotaResetsThisMonth}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Last evaluated: {formatDate(limits.evaluatedAt)}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
