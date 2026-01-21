'use client';

import { useEffect, useState } from 'react';
import { adminApi, GovernanceAuditEvent } from '@/lib/api';

/**
 * [ENTERPRISE-GEO-1][D9 Governance Audit]
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

  if (loading && events.length === 0) {
    return <p className="text-gray-600">Loading governance audit events...</p>;
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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Governance Audit
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        [ENTERPRISE-GEO-1] Immutable audit records of governance actions (policy
        changes, approvals, share links).
      </p>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 flex flex-wrap gap-4">
        <select
          value={filters.eventType}
          onChange={(e) => {
            setFilters({ ...filters, eventType: e.target.value });
            setCurrentPage(1);
          }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
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
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
        />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Event Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No governance audit events found.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(event.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${getEventTypeBadgeColor(event.eventType)}`}
                    >
                      {formatEventType(event.eventType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {event.actorEmail || (
                      <span className="text-gray-400 italic">System</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.projectName || event.projectId.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.resourceType ? (
                      <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                        {event.resourceType}
                        {event.resourceId &&
                          `: ${event.resourceId.slice(0, 8)}...`}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {event.metadata ? (
                      <span
                        title={JSON.stringify(event.metadata, null, 2)}
                        className="cursor-help"
                      >
                        {JSON.stringify(event.metadata).slice(0, 50)}
                        {JSON.stringify(event.metadata).length > 50 && '...'}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages} ({pagination.total}{' '}
            total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.pages, p + 1))
              }
              disabled={currentPage === pagination.pages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
