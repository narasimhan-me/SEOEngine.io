/**
 * GOV-AUDIT-VIEWER-1: Governance Audit & Approvals Viewer Types
 *
 * Read-only DTOs and query types for the Governance viewer UI.
 * These types define the contract between the API and frontend for
 * displaying approvals, audit events, and share links.
 */

// =============================================================================
// Approval Types
// =============================================================================

/**
 * Approval status filter for list queries.
 */
export type ApprovalStatusFilter = 'pending' | 'history';

/**
 * Approval status values.
 */
export type ApprovalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

/**
 * Resource types that can require approval.
 */
export type ApprovalResourceType =
  | 'GEO_FIX_APPLY'
  | 'ANSWER_BLOCK_SYNC'
  | 'AUTOMATION_PLAYBOOK_APPLY';

/**
 * Query parameters for approvals list endpoint.
 */
export interface ApprovalsQuery {
  status?: ApprovalStatusFilter;
  cursor?: string;
  limit?: number;
}

/**
 * Approval list item for display in the governance viewer.
 */
export interface ApprovalsListItem {
  id: string;
  projectId: string;
  resourceType: ApprovalResourceType;
  resourceId: string;
  status: ApprovalStatus;
  requestedByUserId: string;
  requestedByName?: string; // Resolved display name
  requestedAt: string;
  decidedByUserId?: string;
  decidedByName?: string; // Resolved display name
  decidedAt?: string;
  decisionReason?: string;
  consumed: boolean;
  consumedAt?: string;
  // Deep-link fields for traceability
  bundleId?: string; // Work Queue bundleId when available
  playbookId?: string; // For Playbooks deep-linking
  assetType?: string; // PRODUCTS | PAGES | COLLECTIONS
  scopePreview?: string[]; // First N items in scope
  scopeCount?: number; // Total items in scope
}

/**
 * Response for approvals list endpoint.
 */
export interface ApprovalsListResponse {
  items: ApprovalsListItem[];
  nextCursor?: string;
  hasMore: boolean;
}

// =============================================================================
// Audit Event Types
// =============================================================================

/**
 * Allowed audit event types for the governance viewer.
 * This is the authoritative allowlist - any event type not in this list
 * MUST be filtered out server-side before returning to clients.
 */
export const ALLOWED_AUDIT_EVENT_TYPES = [
  'APPROVAL_REQUESTED',
  'APPROVAL_APPROVED',
  'APPROVAL_REJECTED',
  'SHARE_LINK_CREATED',
  'SHARE_LINK_REVOKED',
  'SHARE_LINK_EXPIRED',
] as const;

export type AllowedAuditEventType = (typeof ALLOWED_AUDIT_EVENT_TYPES)[number];

/**
 * Labels for audit event types.
 */
export const AUDIT_EVENT_TYPE_LABELS: Record<AllowedAuditEventType, string> = {
  APPROVAL_REQUESTED: 'Approval Requested',
  APPROVAL_APPROVED: 'Approval Granted',
  APPROVAL_REJECTED: 'Approval Rejected',
  SHARE_LINK_CREATED: 'Share Link Created',
  SHARE_LINK_REVOKED: 'Share Link Revoked',
  SHARE_LINK_EXPIRED: 'Share Link Expired',
};

/**
 * Query parameters for audit events list endpoint.
 */
export interface AuditEventsQuery {
  types?: AllowedAuditEventType[];
  actor?: string; // Filter by actorUserId
  from?: string; // ISO timestamp
  to?: string; // ISO timestamp
  cursor?: string;
  limit?: number;
}

/**
 * Audit event list item for display in the governance viewer.
 */
export interface AuditEventListItem {
  id: string;
  projectId: string;
  actorUserId: string;
  actorName?: string; // Resolved display name
  eventType: AllowedAuditEventType;
  resourceType?: string;
  resourceId?: string;
  targetReference?: string; // Human-readable target description
  scopeSummary?: string; // Minimal scope summary for display
  createdAt: string;
  // Sanitized metadata (no secrets, passwords, tokens)
  metadata?: Record<string, unknown>;
}

/**
 * Response for audit events list endpoint.
 */
export interface AuditEventsListResponse {
  items: AuditEventListItem[];
  nextCursor?: string;
  hasMore: boolean;
}

// =============================================================================
// Share Link Types
// =============================================================================

/**
 * Share link status filter for list queries.
 */
export type ShareLinkStatusFilter = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'all';

/**
 * Share link status values.
 */
export type ShareLinkStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

/**
 * Share link audience types.
 */
export type ShareLinkAudience = 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY';

/**
 * Query parameters for share links list endpoint.
 */
export interface ShareLinksQuery {
  status?: ShareLinkStatusFilter;
  cursor?: string;
  limit?: number;
}

/**
 * Share link list item for display in the governance viewer.
 * NOTE: passcode is NEVER returned - shown-once rule is locked.
 */
export interface ShareLinkListItem {
  id: string;
  projectId: string;
  shareToken: string;
  shareUrl: string;
  title: string | null;
  status: ShareLinkStatus;
  audience: ShareLinkAudience;
  // Passcode info (last 4 only, never full passcode)
  passcodeLast4?: string | null;
  passcodeCreatedAt?: string | null;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string; // Resolved display name
  expiresAt?: string;
  revokedAt?: string;
  // Associated report/export identifier for deep-linking
  reportIdentifier?: string;
  // Events history for drawer (create/revoke/expire)
  events?: ShareLinkEventItem[];
}

/**
 * Share link event for the detail drawer.
 */
export interface ShareLinkEventItem {
  eventType: 'CREATED' | 'REVOKED' | 'EXPIRED';
  actorUserId?: string;
  actorName?: string;
  timestamp: string;
}

/**
 * Response for share links list endpoint.
 */
export interface ShareLinksListResponse {
  items: ShareLinkListItem[];
  nextCursor?: string;
  hasMore: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an event type is in the allowed list.
 * Server-side code MUST use this to filter out forbidden event types.
 */
export function isAllowedAuditEventType(eventType: string): eventType is AllowedAuditEventType {
  return ALLOWED_AUDIT_EVENT_TYPES.includes(eventType as AllowedAuditEventType);
}

/**
 * Get label for an audit event type.
 */
export function getAuditEventTypeLabel(eventType: AllowedAuditEventType): string {
  return AUDIT_EVENT_TYPE_LABELS[eventType] || eventType;
}

/**
 * Build a deterministic cursor from timestamp and ID for stable pagination.
 * Format: `{timestamp}:{id}` for timestamp DESC, id DESC ordering.
 */
export function buildPaginationCursor(timestamp: string | Date, id: string): string {
  const ts = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
  return `${ts}:${id}`;
}

/**
 * Parse a pagination cursor into timestamp and ID.
 * Returns null if cursor is invalid.
 */
export function parsePaginationCursor(cursor: string): { timestamp: string; id: string } | null {
  const colonIndex = cursor.lastIndexOf(':');
  if (colonIndex === -1) return null;
  const timestamp = cursor.slice(0, colonIndex);
  const id = cursor.slice(colonIndex + 1);
  if (!timestamp || !id) return null;
  return { timestamp, id };
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default page size for governance lists.
 */
export const GOVERNANCE_DEFAULT_PAGE_SIZE = 20;

/**
 * Maximum page size for governance lists.
 */
export const GOVERNANCE_MAX_PAGE_SIZE = 100;
