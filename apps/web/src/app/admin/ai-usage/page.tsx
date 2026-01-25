'use client';

import { useEffect, useState, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';

/**
 * [ADMIN-OPS-1][D6 AI Usage Console]
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Migrated to canonical DataTable.
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

/** Row type for DataTable */
interface ConsumerRow extends DataTableRow {
  id: string;
  rank: number;
  email: string;
  aiRunsThisMonth: number;
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

  // Transform top consumers for DataTable
  const consumerRows: ConsumerRow[] = useMemo(
    () =>
      (data?.topConsumers || []).map((consumer, idx) => ({
        id: consumer.userId,
        rank: idx + 1,
        email: consumer.email,
        aiRunsThisMonth: consumer.aiRunsThisMonth,
      })),
    [data?.topConsumers]
  );

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Define DataTable columns
  const columns: DataTableColumn<ConsumerRow>[] = useMemo(
    () => [
      {
        key: 'email',
        header: 'Email',
        cell: (row) => (
          <span className="text-sm text-foreground">
            <span className="text-muted-foreground mr-2">#{row.rank}</span>
            {row.email}
          </span>
        ),
      },
      {
        key: 'aiRuns',
        header: 'AI Runs',
        cell: (row) => (
          <span className="text-sm font-medium text-foreground">
            {row.aiRunsThisMonth}
          </span>
        ),
      },
    ],
    []
  );

  if (loading) {
    return <p className="text-muted-foreground">Loading AI usage...</p>;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">AI Usage</h1>

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
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">
            Usage by Plan
          </h2>
          <div className="space-y-3">
            {Object.entries(data?.usageByPlan || {}).map(([plan, count]) => (
              <div key={plan} className="flex justify-between items-center">
                <span className="text-muted-foreground capitalize">{plan}</span>
                <span className="font-medium text-foreground">
                  {count} runs
                </span>
              </div>
            ))}
            {Object.keys(data?.usageByPlan || {}).length === 0 && (
              <p className="text-muted-foreground text-sm">No usage data</p>
            )}
          </div>
        </div>

        {/* Reuse Effectiveness */}
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">
            Reuse Effectiveness
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total AI Runs</span>
              <span className="font-medium text-foreground">
                {data?.reuseEffectiveness.totalAiRuns || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Reused Runs</span>
              <span className="font-medium text-green-600">
                {data?.reuseEffectiveness.reusedRuns || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Reuse Rate</span>
              <span className="font-bold text-green-600">
                {data?.reuseEffectiveness.reuseRate || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Invariant Status */}
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">
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
      <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6">
        <h2 className="text-lg font-medium text-foreground mb-4">
          Top Consumers (This Month)
        </h2>
        {consumerRows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No consumers this month
          </p>
        ) : (
          <DataTable
            columns={columns}
            rows={consumerRows}
            hideContextAction={true}
            density="dense"
          />
        )}
      </div>
    </div>
  );
}
