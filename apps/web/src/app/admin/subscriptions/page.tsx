'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { adminApi, billingApi } from '@/lib/api';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';

/**
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Migrated to canonical DataTable.
 * Token-only styling; no legacy gray/white table utilities.
 * Preserves in-row <select> behavior; keyboard guard prevents DataTable hijacking.
 */
interface User {
  id: string;
  email: string;
  name: string | null;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminSubscriptionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const [usersData, plansData] = await Promise.all([
        adminApi.getUsers(page),
        billingApi.getPlans(),
      ]);
      setUsers(usersData.users);
      setPagination(usersData.pagination);
      setPlans(plansData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, fetchData]);

  async function handlePlanChange(userId: string, planId: string) {
    setError('');
    setSuccess('');
    setUpdating(userId);

    try {
      await adminApi.updateUserSubscription(userId, planId);
      setSuccess('Subscription updated successfully');
      // Refresh the list
      fetchData(currentPage);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to update subscription'
      );
    } finally {
      setUpdating(null);
    }
  }

  function formatPrice(cents: number): string {
    return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(0)}/mo`;
  }

  function getPlanBadgeColor(plan: string): string {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'pro':
        return 'bg-blue-100 text-blue-800';
      case 'starter':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  function getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-yellow-100 text-yellow-800';
      case 'past_due':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3] Define DataTable columns
  const columns: DataTableColumn<User & DataTableRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        cell: (row) => (
          <div>
            <div className="text-sm font-medium text-foreground">
              {row.name || 'No name'}
            </div>
            <div className="text-sm text-muted-foreground">{row.email}</div>
          </div>
        ),
      },
      {
        key: 'plan',
        header: 'Current Plan',
        cell: (row) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getPlanBadgeColor(
              row.subscription?.plan || 'free'
            )}`}
          >
            {row.subscription?.plan || 'free'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadgeColor(
              row.subscription?.status || 'active'
            )}`}
          >
            {row.subscription?.status || 'active'}
          </span>
        ),
      },
      {
        key: 'periodEnd',
        header: 'Period End',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.subscription?.currentPeriodEnd
              ? new Date(row.subscription.currentPeriodEnd).toLocaleDateString()
              : '—'}
          </span>
        ),
      },
      {
        key: 'changePlan',
        header: 'Change Plan',
        truncate: false,
        cell: (row) => (
          <select
            value={row.subscription?.plan || 'free'}
            onChange={(e) => handlePlanChange(row.id, e.target.value)}
            disabled={updating === row.id}
            className="text-sm border border-border rounded-md shadow-sm bg-background text-foreground focus:ring-primary focus:border-primary disabled:opacity-50"
            data-no-row-keydown
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} ({formatPrice(plan.price)})
              </option>
            ))}
          </select>
        ),
      },
    ],
    [plans, updating]
  );

  if (loading && users.length === 0) {
    return <p className="text-muted-foreground">Loading subscriptions...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Subscription Management
      </h1>

      {/* Status messages */}
      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Plans Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4"
          >
            <h3 className="text-sm font-medium text-muted-foreground">
              {plan.name}
            </h3>
            <p className="text-lg font-semibold text-foreground">
              {formatPrice(plan.price)}
            </p>
          </div>
        ))}
      </div>

      {/* Subscriptions Table - Canonical DataTable */}
      <DataTable columns={columns} rows={users} hideContextAction={true} />

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.pages, p + 1))
              }
              disabled={currentPage === pagination.pages}
              className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
