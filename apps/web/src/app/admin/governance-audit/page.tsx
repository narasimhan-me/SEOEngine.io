'use client';

import { useEffect, useState, useMemo } from 'react';
import { adminApi, GovernanceAuditEvent } from '@/lib/api';
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from '@/components/tables/DataTable';

/**
 * [ENTERPRISE-GEO-1][D9 Governance Audit]
 * [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4] Migrated to canonical DataTable.
 * Read-only access to governance audit events for internal admins.
 */

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminGovernanceAuditPage() {
  const [events, setEvents] = useState<GovernanceAuditEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ eventType: '', projectId: '' });

  useEffect(() => {
    fetchEvents();
  }, [currentPage, filters]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const data = await adminApi.getGovernanceAuditEvents({
        page: currentPage,
        limit: 50,
        eventType: filters.eventType || undefined,
        projectId: filters.projectId || undefined,
      });
      setEvents(data.events);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load governance audit events'
      );
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

  function formatEventType(eventType: string): string {
    return eventType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getEventTypeBadgeColor(eventType: string): string {
    switch (eventType) {
      case 'POLICY_CHANGED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVAL_REQUESTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVAL_APPROVED':
        return 'bg-green-100 text-green-800';
      case 'APPROVAL_REJECTED':
        return 'bg-red-100 text-red-800';
      case 'SHARE_LINK_CREATED':
        return 'bg-purple-100 text-purple-800';
      case 'SHARE_LINK_REVOKED':
        return 'bg-orange-100 text-orange-800';
      case 'APPLY_EXECUTED':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // [TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4] Define DataTable columns
  const columns: DataTableColumn<GovernanceAuditEvent & DataTableRow>[] =
    useMemo(
      () => [
        {
          key: 'time',
          header: 'Time',
          cell: (row) => (
            <span className="text-sm text-muted-foreground">
              {formatDate(row.createdAt)}
            </span>
          ),
        },
        {
          key: 'eventType',
          header: 'Event Type',
          cell: (row) => (
            <span
              className={`inline-flex px-2 py-1 text-xs rounded-full ${getEventTypeBadgeColor(row.eventType)}`}
            >
              {formatEventType(row.eventType)}
            </span>
          ),
        },
        {
          key: 'actor',
          header: 'Actor',
          cell: (row) =>
            row.actorEmail ? (
              <span className="text-sm text-foreground">{row.actorEmail}</span>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                System
              </span>
            ),
        },
        {
          key: 'project',
          header: 'Project',
          cell: (row) => (
            <span className="text-sm text-muted-foreground">
              {row.projectName || row.projectId.slice(0, 8)}
            </span>
          ),
        },
        {
          key: 'resource',
          header: 'Resource',
          cell: (row) =>
            row.resourceType ? (
              <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                {row.resourceType}
                {row.resourceId && `: ${row.resourceId.slice(0, 8)}...`}
              </span>
            ) : (
              <span className="text-muted-foreground">-</span>
            ),
        },
        {
          key: 'details',
          header: 'Details',
          truncate: true,
          cell: (row) =>
            row.metadata ? (
              <span
                title={JSON.stringify(row.metadata, null, 2)}
                className="cursor-help text-sm text-muted-foreground"
              >
                {JSON.stringify(row.metadata).slice(0, 50)}
                {JSON.stringify(row.metadata).length > 50 && '...'}
              </span>
            ) : (
              <span className="text-muted-foreground">-</span>
            ),
        },
      ],
      []
    );

  if (loading && events.length === 0) {
    return (
      <p className="text-muted-foreground">Loading governance audit events...</p>
    );
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
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Governance Audit
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        [ENTERPRISE-GEO-1] Immutable audit records of governance actions (policy
        changes, approvals, share links).
      </p>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] p-4 mb-6 flex flex-wrap gap-4">
        <select
          value={filters.eventType}
          onChange={(e) => {
            setFilters({ ...filters, eventType: e.target.value });
            setCurrentPage(1);
          }}
          className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          data-no-row-keydown
        >
          <option value="">All Event Types</option>
          <option value="POLICY_CHANGED">Policy Changed</option>
          <option value="APPROVAL_REQUESTED">Approval Requested</option>
          <option value="APPROVAL_APPROVED">Approval Approved</option>
          <option value="APPROVAL_REJECTED">Approval Rejected</option>
          <option value="SHARE_LINK_CREATED">Share Link Created</option>
          <option value="SHARE_LINK_REVOKED">Share Link Revoked</option>
          <option value="APPLY_EXECUTED">Apply Executed</option>
        </select>
        <input
          type="text"
          placeholder="Project ID (optional)"
          value={filters.projectId}
          onChange={(e) => {
            setFilters({ ...filters, projectId: e.target.value });
            setCurrentPage(1);
          }}
          className="border border-border rounded-md px-3 py-2 text-sm w-64 bg-background text-foreground"
          data-no-row-keydown
        />
      </div>

      {/* Empty state outside DataTable */}
      {events.length === 0 ? (
        <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] px-6 py-8 text-center text-muted-foreground">
          No governance audit events found.
        </div>
      ) : (
        <DataTable columns={columns} rows={events} hideContextAction={true} />
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages} ({pagination.total}{' '}
            total)
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
