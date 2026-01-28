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
    return <p className="text-muted-foreground">Loading overview...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Overview</h1>

      {/* [EA-29] Primary Stats Grid - semantic token styling */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Total Users
          </h3>
          <p className="text-3xl font-bold text-foreground">
            {overview?.totalUsers || 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Active Users (7d)
          </h3>
          <p className="text-3xl font-bold text-foreground">
            {overview?.activeUsers || 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Shopify Projects
          </h3>
          <p className="text-3xl font-bold text-foreground">
            {overview?.shopifyConnectedProjects || 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Quota Pressure
          </h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {overview?.quotaPressure.usersNearLimit || 0}
          </p>
          <p className="text-xs text-muted-foreground">users near limit</p>
        </div>
      </div>

      {/* [EA-29] AI Usage and Error Rates - semantic token styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6 shadow-sm">
          <h3 className="text-lg font-medium text-foreground mb-4">AI Usage</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Today</span>
              <span className="font-medium text-foreground">
                {overview?.aiUsage.today || 0} runs
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">This Month</span>
              <span className="font-medium text-foreground">
                {overview?.aiUsage.month || 0} runs
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Reuse Rate</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {overview?.aiUsage.reuseRate || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6 shadow-sm">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Error Rates
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Failed Runs (month)</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {overview?.errorRates.failedRunsThisMonth || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Shopify Failures (7d)</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {overview?.errorRates.shopifyFailuresLast7Days || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-6 shadow-sm">
          <h3 className="text-lg font-medium text-foreground mb-4">
            DEO Health Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(overview?.deoHealthDistribution || {}).map(
              ([bucket, count]) => (
                <div key={bucket} className="flex justify-between items-center">
                  <span className="text-muted-foreground capitalize">
                    {bucket.replace('_', ' ')}
                  </span>
                  <span className="font-medium text-foreground">{count}</span>
                </div>
              )
            )}
            {Object.keys(overview?.deoHealthDistribution || {}).length ===
              0 && <p className="text-sm text-muted-foreground">No data available</p>}
          </div>
        </div>
      </div>

      {/* [EA-29] Note about read-only administrative context */}
      <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">Read-only visibility:</strong>{' '}
        This administrative view does not trigger AI work, background jobs, or any user-visible actions.
        Admin activity is not reflected in user logs or notifications.
      </div>
    </div>
  );
}
