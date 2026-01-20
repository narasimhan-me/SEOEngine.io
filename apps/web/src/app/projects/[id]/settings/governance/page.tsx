'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { projectsApi } from '@/lib/api';
import type {
  GovernanceViewerApprovalsResponse,
  GovernanceViewerAuditEventsResponse,
  GovernanceViewerShareLinksResponse,
  GovernanceViewerApprovalItem,
  GovernanceViewerAuditEventItem,
  GovernanceViewerShareLinkItem,
} from '@/lib/api';

/**
 * [GOV-AUDIT-VIEWER-1] Governance Viewer Tab
 */
type GovernanceViewerTab = 'approvals' | 'audit' | 'sharing';

/**
 * [GOV-AUDIT-VIEWER-1] Governance Viewer Page
 *
 * Read-only view of approval requests, audit events, and share links.
 * Three tabs:
 * - Approvals: Pending and history of approval requests
 * - Audit Log: Allowlist-filtered governance events
 * - Sharing & Links: Share link status and history
 */
export default function GovernanceViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Tab state from URL
  const currentTab =
    (searchParams.get('tab') as GovernanceViewerTab) || 'approvals';

  // Approvals state
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [approvalsData, setApprovalsData] =
    useState<GovernanceViewerApprovalsResponse | null>(null);
  const [approvalsStatus, setApprovalsStatus] = useState<'pending' | 'history'>(
    'pending'
  );

  // Audit events state
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditData, setAuditData] =
    useState<GovernanceViewerAuditEventsResponse | null>(null);

  // Share links state
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksData, setLinksData] =
    useState<GovernanceViewerShareLinksResponse | null>(null);
  const [linksStatus, setLinksStatus] = useState<
    'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'all'
  >('all');

  // Selected item for drawer
  const [selectedApproval, setSelectedApproval] =
    useState<GovernanceViewerApprovalItem | null>(null);
  const [selectedAuditEvent, setSelectedAuditEvent] =
    useState<GovernanceViewerAuditEventItem | null>(null);
  const [selectedShareLink, setSelectedShareLink] =
    useState<GovernanceViewerShareLinkItem | null>(null);

  // Fetch approvals
  const fetchApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    setApprovalsError(null);
    try {
      const data = await projectsApi.listViewerApprovals(projectId, {
        status: approvalsStatus,
        limit: 50,
      });
      setApprovalsData(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load approvals';
      setApprovalsError(message);
    } finally {
      setApprovalsLoading(false);
    }
  }, [projectId, approvalsStatus]);

  // Fetch audit events
  const fetchAuditEvents = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const data = await projectsApi.listViewerAuditEvents(projectId, {
        limit: 50,
      });
      setAuditData(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load audit events';
      setAuditError(message);
    } finally {
      setAuditLoading(false);
    }
  }, [projectId]);

  // Fetch share links
  const fetchShareLinks = useCallback(async () => {
    setLinksLoading(true);
    setLinksError(null);
    try {
      const data = await projectsApi.listViewerShareLinks(projectId, {
        status: linksStatus,
        limit: 50,
      });
      setLinksData(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load share links';
      setLinksError(message);
    } finally {
      setLinksLoading(false);
    }
  }, [projectId, linksStatus]);

  // Load data when tab changes
  useEffect(() => {
    if (currentTab === 'approvals') {
      fetchApprovals();
    } else if (currentTab === 'audit') {
      fetchAuditEvents();
    } else if (currentTab === 'sharing') {
      fetchShareLinks();
    }
  }, [currentTab, fetchApprovals, fetchAuditEvents, fetchShareLinks]);

  const handleTabChange = (tab: GovernanceViewerTab) => {
    const newParams = new URLSearchParams();
    newParams.set('tab', tab);
    router.push(
      `/projects/${projectId}/settings/governance?${newParams.toString()}`
    );
  };

  const tabs: { key: GovernanceViewerTab; label: string }[] = [
    { key: 'approvals', label: 'Approvals' },
    { key: 'audit', label: 'Audit Log' },
    { key: 'sharing', label: 'Sharing & Links' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Governance</h1>
        <p className="mt-1 text-sm text-gray-500">
          View approval requests, audit events, and share link activity.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                currentTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Approvals Tab */}
      {currentTab === 'approvals' && (
        <ApprovalsTab
          loading={approvalsLoading}
          error={approvalsError}
          data={approvalsData}
          status={approvalsStatus}
          onStatusChange={setApprovalsStatus}
          onRefresh={fetchApprovals}
          onSelectApproval={setSelectedApproval}
        />
      )}

      {/* Audit Tab */}
      {currentTab === 'audit' && (
        <AuditTab
          loading={auditLoading}
          error={auditError}
          data={auditData}
          onRefresh={fetchAuditEvents}
          onSelectEvent={setSelectedAuditEvent}
        />
      )}

      {/* Sharing Tab */}
      {currentTab === 'sharing' && (
        <SharingTab
          loading={linksLoading}
          error={linksError}
          data={linksData}
          status={linksStatus}
          onStatusChange={setLinksStatus}
          onRefresh={fetchShareLinks}
          onSelectLink={setSelectedShareLink}
        />
      )}

      {/* Approval Detail Drawer */}
      {selectedApproval && (
        <ApprovalDetailDrawer
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
        />
      )}

      {/* Audit Event Detail Drawer */}
      {selectedAuditEvent && (
        <AuditEventDetailDrawer
          event={selectedAuditEvent}
          onClose={() => setSelectedAuditEvent(null)}
        />
      )}

      {/* Share Link Detail Drawer */}
      {selectedShareLink && (
        <ShareLinkDetailDrawer
          link={selectedShareLink}
          onClose={() => setSelectedShareLink(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Approvals Tab Component
// =============================================================================

interface ApprovalsTabProps {
  loading: boolean;
  error: string | null;
  data: GovernanceViewerApprovalsResponse | null;
  status: 'pending' | 'history';
  onStatusChange: (status: 'pending' | 'history') => void;
  onRefresh: () => void;
  onSelectApproval: (approval: GovernanceViewerApprovalItem) => void;
}

function ApprovalsTab({
  loading,
  error,
  data,
  status,
  onStatusChange,
  onRefresh,
  onSelectApproval,
}: ApprovalsTabProps) {
  const items = data?.items || [];

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Show:</span>
        <button
          onClick={() => onStatusChange('pending')}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => onStatusChange('history')}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            status === 'history'
              ? 'bg-gray-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          History
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading approvals...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {status === 'pending'
              ? 'No pending approvals'
              : 'No approval history'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {status === 'pending'
              ? 'Approval requests will appear here when team members request changes.'
              : 'Approved and rejected requests will appear here.'}
          </p>
        </div>
      )}

      {/* Approval list */}
      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Requested By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((approval) => (
                <tr key={approval.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        {formatResourceType(approval.resourceType)}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {approval.resourceId}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {approval.requestedByName || 'Unknown user'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <ApprovalStatusBadge status={approval.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(approval.requestedAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => onSelectApproval(approval)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Audit Tab Component
// =============================================================================

interface AuditTabProps {
  loading: boolean;
  error: string | null;
  data: GovernanceViewerAuditEventsResponse | null;
  onRefresh: () => void;
  onSelectEvent: (event: GovernanceViewerAuditEventItem) => void;
}

function AuditTab({
  loading,
  error,
  data,
  onRefresh,
  onSelectEvent,
}: AuditTabProps) {
  const items = data?.items || [];

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm text-blue-700">
          Showing approval and share link events only. Other event types are
          filtered for security.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading audit events...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No audit events
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Approval and sharing events will appear here as they occur.
          </p>
        </div>
      )}

      {/* Audit event list */}
      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <AuditEventTypeBadge eventType={event.eventType} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {event.actorName || 'System'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {event.resourceType ? (
                      <span className="truncate max-w-xs block">
                        {formatResourceType(event.resourceType)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(event.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => onSelectEvent(event)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sharing Tab Component
// =============================================================================

interface SharingTabProps {
  loading: boolean;
  error: string | null;
  data: GovernanceViewerShareLinksResponse | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'all';
  onStatusChange: (status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'all') => void;
  onRefresh: () => void;
  onSelectLink: (link: GovernanceViewerShareLinkItem) => void;
}

function SharingTab({
  loading,
  error,
  data,
  status,
  onStatusChange,
  onRefresh,
  onSelectLink,
}: SharingTabProps) {
  const items = data?.items || [];

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Show:</span>
        {(['all', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              status === s
                ? s === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : s === 'EXPIRED'
                    ? 'bg-yellow-100 text-yellow-800'
                    : s === 'REVOKED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading share links...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No share links
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Share links created for reports will appear here.
          </p>
        </div>
      )}

      {/* Share link list */}
      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title / Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Audience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Views
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        {link.title || 'Untitled'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {link.reportType}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {link.createdByName || 'Unknown'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <AudienceBadge
                      audience={link.audience}
                      passcodeLast4={link.passcodeLast4}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <ShareLinkStatusBadge status={link.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {link.viewCount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => onSelectLink(link)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Detail Drawers
// =============================================================================

interface ApprovalDetailDrawerProps {
  approval: GovernanceViewerApprovalItem;
  onClose: () => void;
}

function ApprovalDetailDrawer({
  approval,
  onClose,
}: ApprovalDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Drawer panel */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="w-screen max-w-md">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
              {/* Header */}
              <div className="bg-gray-50 px-4 py-6 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Approval Details
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-md bg-gray-50 text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="relative flex-1 px-4 py-6 sm:px-6">
                <dl className="space-y-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <ApprovalStatusBadge status={approval.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Resource Type
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatResourceType(approval.resourceType)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Resource ID
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all">
                      {approval.resourceId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Requested By
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {approval.requestedByName || approval.requestedByUserId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Requested At
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(approval.requestedAt)}
                    </dd>
                  </div>
                  {approval.decidedByUserId && (
                    <>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Decided By
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {approval.decidedByName || approval.decidedByUserId}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Decided At
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {approval.decidedAt
                            ? formatDate(approval.decidedAt)
                            : '-'}
                        </dd>
                      </div>
                    </>
                  )}
                  {approval.decisionReason && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Decision Reason
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {approval.decisionReason}
                      </dd>
                    </div>
                  )}
                  {approval.playbookId && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Playbook ID
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {approval.playbookId}
                      </dd>
                    </div>
                  )}
                  {approval.assetType && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Asset Type
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {approval.assetType}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Consumed
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {approval.consumed ? 'Yes' : 'No'}
                      {approval.consumedAt &&
                        ` (${formatDate(approval.consumedAt)})`}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AuditEventDetailDrawerProps {
  event: GovernanceViewerAuditEventItem;
  onClose: () => void;
}

function AuditEventDetailDrawer({
  event,
  onClose,
}: AuditEventDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Drawer panel */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="w-screen max-w-md">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
              {/* Header */}
              <div className="bg-gray-50 px-4 py-6 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Audit Event Details
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-md bg-gray-50 text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="relative flex-1 px-4 py-6 sm:px-6">
                <dl className="space-y-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Event Type
                    </dt>
                    <dd className="mt-1">
                      <AuditEventTypeBadge eventType={event.eventType} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Actor</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event.actorName || event.actorUserId || 'System'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Time</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(event.createdAt)}
                    </dd>
                  </div>
                  {event.resourceType && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Resource Type
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatResourceType(event.resourceType)}
                      </dd>
                    </div>
                  )}
                  {event.resourceId && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Resource ID
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 break-all">
                        {event.resourceId}
                      </dd>
                    </div>
                  )}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Metadata
                      </dt>
                      <dd className="mt-1">
                        <pre className="rounded-md bg-gray-100 p-3 text-xs text-gray-700 overflow-x-auto">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShareLinkDetailDrawerProps {
  link: GovernanceViewerShareLinkItem;
  onClose: () => void;
}

function ShareLinkDetailDrawer({ link, onClose }: ShareLinkDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Drawer panel */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="w-screen max-w-md">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
              {/* Header */}
              <div className="bg-gray-50 px-4 py-6 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Share Link Details
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-md bg-gray-50 text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="relative flex-1 px-4 py-6 sm:px-6">
                <dl className="space-y-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <ShareLinkStatusBadge status={link.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Title</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {link.title || 'Untitled'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Report Type
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {link.reportType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Audience
                    </dt>
                    <dd className="mt-1">
                      <AudienceBadge
                        audience={link.audience}
                        passcodeLast4={link.passcodeLast4}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Created By
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {link.createdByName || link.createdByUserId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Created At
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(link.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Expires At
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(link.expiresAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      View Count
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {link.viewCount}
                    </dd>
                  </div>
                  {link.lastViewedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Last Viewed
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatDate(link.lastViewedAt)}
                      </dd>
                    </div>
                  )}
                  {link.revokedAt && (
                    <>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Revoked At
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(link.revokedAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Revoked By
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {link.revokedByName ||
                            link.revokedByUserId ||
                            'Unknown'}
                        </dd>
                      </div>
                    </>
                  )}
                  {link.statusHistory && link.statusHistory.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Status History
                      </dt>
                      <dd className="mt-1">
                        <ul className="space-y-2">
                          {link.statusHistory.map((entry, i) => (
                            <li key={i} className="text-sm text-gray-700">
                              <ShareLinkStatusBadge status={entry.status} /> at{' '}
                              {formatDate(entry.changedAt)}
                              {entry.changedByName &&
                                ` by ${entry.changedByName}`}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function ApprovalStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    PENDING_APPROVAL: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Pending',
    },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
  };
  const c = config[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: status,
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

function AuditEventTypeBadge({ eventType }: { eventType: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    APPROVAL_REQUESTED: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Approval Requested',
    },
    APPROVAL_APPROVED: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Approved',
    },
    APPROVAL_REJECTED: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Rejected',
    },
    SHARE_LINK_CREATED: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Link Created',
    },
    SHARE_LINK_REVOKED: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      label: 'Link Revoked',
    },
    SHARE_LINK_EXPIRED: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: 'Link Expired',
    },
  };
  const c = config[eventType] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: eventType,
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

function ShareLinkStatusBadge({
  status,
}: {
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}) {
  const config: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-800' },
    EXPIRED: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    REVOKED: { bg: 'bg-red-100', text: 'text-red-800' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function AudienceBadge({
  audience,
  passcodeLast4,
}: {
  audience: 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY';
  passcodeLast4?: string;
}) {
  const labels: Record<string, string> = {
    ANYONE_WITH_LINK: 'Public',
    PASSCODE: passcodeLast4 ? `Passcode (****${passcodeLast4})` : 'Passcode',
    ORG_ONLY: 'Org Only',
  };
  const colors: Record<string, string> = {
    ANYONE_WITH_LINK: 'bg-blue-100 text-blue-800',
    PASSCODE: 'bg-purple-100 text-purple-800',
    ORG_ONLY: 'bg-gray-100 text-gray-800',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colors[audience]}`}
    >
      {labels[audience]}
    </span>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatResourceType(type: string): string {
  const map: Record<string, string> = {
    AUTOMATION_PLAYBOOK_APPLY: 'Automation Apply',
    GEO_FIX_APPLY: 'GEO Fix Apply',
    ANSWER_BLOCK_SYNC: 'Answer Block Sync',
    GEO_REPORT_SHARE_LINK: 'GEO Report Link',
  };
  return map[type] || type;
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
