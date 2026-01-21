import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import {
  ApprovalsListItem,
  ApprovalsListResponse,
  ApprovalsQuery,
  AuditEventListItem,
  AuditEventsListResponse,
  AuditEventsQuery,
  ShareLinkListItem,
  ShareLinksListResponse,
  ShareLinksQuery,
  ShareLinkEventItem,
  ALLOWED_AUDIT_EVENT_TYPES,
  AllowedAuditEventType,
  isAllowedAuditEventType,
  buildPaginationCursor,
  parsePaginationCursor,
  GOVERNANCE_DEFAULT_PAGE_SIZE,
  GOVERNANCE_MAX_PAGE_SIZE,
} from '@engineo/shared';

/**
 * [GOV-AUDIT-VIEWER-1] Governance Viewer Service
 *
 * Read-only service for governance viewer UI.
 * Provides deterministic, cursor-paginated access to:
 * - Approvals (pending + history)
 * - Audit events (with allowlist filtering)
 * - Share links (with status derivation)
 *
 * Access control:
 * - VIEWER, EDITOR, OWNER can all read (view-only)
 * - No mutations exposed here
 */
@Injectable()
export class GovernanceViewerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService
  ) {}

  // ============================================================================
  // Approvals
  // ============================================================================

  /**
   * List approvals with cursor-based pagination.
   * Ordered by requestedAt DESC, id DESC for stable pagination.
   */
  async listApprovals(
    projectId: string,
    userId: string,
    query: ApprovalsQuery
  ): Promise<ApprovalsListResponse> {
    // Verify project access (any role can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const limit = Math.min(
      query.limit ?? GOVERNANCE_DEFAULT_PAGE_SIZE,
      GOVERNANCE_MAX_PAGE_SIZE
    );

    // Build where clause
    const where: any = { projectId };

    // Status filter: pending = PENDING_APPROVAL, history = everything else
    if (query.status === 'pending') {
      where.status = 'PENDING_APPROVAL';
    } else if (query.status === 'history') {
      where.status = { in: ['APPROVED', 'REJECTED'] };
    }

    // Cursor-based pagination
    if (query.cursor) {
      const parsed = parsePaginationCursor(query.cursor);
      if (parsed) {
        where.OR = [
          { requestedAt: { lt: new Date(parsed.timestamp) } },
          {
            requestedAt: new Date(parsed.timestamp),
            id: { lt: parsed.id },
          },
        ];
      }
    }

    // Fetch items + 1 to check hasMore
    const items = await this.prisma.approvalRequest.findMany({
      where,
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;

    // Resolve user display names
    const userIds = new Set<string>();
    for (const item of resultItems) {
      userIds.add(item.requestedByUserId);
      if (item.decidedByUserId) userIds.add(item.decidedByUserId);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

    // Format response
    const formattedItems: ApprovalsListItem[] = resultItems.map((item) => ({
      id: item.id,
      projectId: item.projectId,
      resourceType: item.resourceType as any,
      resourceId: item.resourceId,
      status: item.status as any,
      requestedByUserId: item.requestedByUserId,
      requestedByName: userMap.get(item.requestedByUserId),
      requestedAt: item.requestedAt.toISOString(),
      decidedByUserId: item.decidedByUserId ?? undefined,
      decidedByName: item.decidedByUserId
        ? userMap.get(item.decidedByUserId)
        : undefined,
      decidedAt: item.decidedAt?.toISOString(),
      decisionReason: item.decisionReason ?? undefined,
      consumed: item.consumed,
      consumedAt: item.consumedAt?.toISOString(),
      // Deep-link fields derived from resourceId
      ...this.deriveDeepLinkFields(item.resourceType, item.resourceId),
    }));

    // Build next cursor
    let nextCursor: string | undefined;
    if (hasMore && resultItems.length > 0) {
      const lastItem = resultItems[resultItems.length - 1];
      nextCursor = buildPaginationCursor(lastItem.requestedAt, lastItem.id);
    }

    return {
      items: formattedItems,
      nextCursor,
      hasMore,
    };
  }

  // ============================================================================
  // Audit Events
  // ============================================================================

  /**
   * List audit events with cursor-based pagination.
   * Ordered by createdAt DESC, id DESC for stable pagination.
   * CRITICAL: Only returns events in ALLOWED_AUDIT_EVENT_TYPES.
   */
  async listAuditEvents(
    projectId: string,
    userId: string,
    query: AuditEventsQuery
  ): Promise<AuditEventsListResponse> {
    // Verify project access (any role can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const limit = Math.min(
      query.limit ?? GOVERNANCE_DEFAULT_PAGE_SIZE,
      GOVERNANCE_MAX_PAGE_SIZE
    );

    // Build where clause with STRICT allowlist filtering
    const where: any = {
      projectId,
      // CRITICAL: Always filter by allowlist
      eventType: { in: [...ALLOWED_AUDIT_EVENT_TYPES] },
    };

    // Additional type filter (intersection with allowlist)
    if (query.types && query.types.length > 0) {
      const validTypes = query.types.filter(isAllowedAuditEventType);
      if (validTypes.length > 0) {
        where.eventType = { in: validTypes };
      }
    }

    // Actor filter
    if (query.actor) {
      where.actorUserId = query.actor;
    }

    // Date range filters
    if (query.from) {
      where.createdAt = { ...where.createdAt, gte: new Date(query.from) };
    }
    if (query.to) {
      where.createdAt = { ...where.createdAt, lte: new Date(query.to) };
    }

    // Cursor-based pagination
    if (query.cursor) {
      const parsed = parsePaginationCursor(query.cursor);
      if (parsed) {
        where.OR = [
          { createdAt: { lt: new Date(parsed.timestamp) } },
          {
            createdAt: new Date(parsed.timestamp),
            id: { lt: parsed.id },
          },
        ];
      }
    }

    // Fetch items + 1 to check hasMore
    const items = await this.prisma.governanceAuditEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;

    // Resolve user display names
    const userIds = new Set<string>();
    for (const item of resultItems) {
      userIds.add(item.actorUserId);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

    // Format response - filter again to be extra safe
    const formattedItems: AuditEventListItem[] = resultItems
      .filter((item) => isAllowedAuditEventType(item.eventType))
      .map((item) => ({
        id: item.id,
        projectId: item.projectId,
        actorUserId: item.actorUserId,
        actorName: userMap.get(item.actorUserId),
        eventType: item.eventType as AllowedAuditEventType,
        resourceType: item.resourceType ?? undefined,
        resourceId: item.resourceId ?? undefined,
        targetReference: this.deriveTargetReference(
          item.resourceType,
          item.resourceId
        ),
        scopeSummary: this.deriveScopeSummary(
          item.metadata as Record<string, unknown> | null
        ),
        createdAt: item.createdAt.toISOString(),
        // Sanitized metadata (already sanitized by AuditEventsService, but be defensive)
        metadata: this.sanitizeMetadataForViewer(
          item.metadata as Record<string, unknown> | null
        ),
      }));

    // Build next cursor
    let nextCursor: string | undefined;
    if (hasMore && resultItems.length > 0) {
      const lastItem = resultItems[resultItems.length - 1];
      nextCursor = buildPaginationCursor(lastItem.createdAt, lastItem.id);
    }

    return {
      items: formattedItems,
      nextCursor,
      hasMore,
    };
  }

  // ============================================================================
  // Share Links
  // ============================================================================

  /**
   * List share links with cursor-based pagination.
   * Ordered by createdAt DESC, id DESC for stable pagination.
   * Status is derived deterministically from data.
   * NEVER returns passcode - only passcodeLast4.
   */
  async listShareLinks(
    projectId: string,
    userId: string,
    query: ShareLinksQuery
  ): Promise<ShareLinksListResponse> {
    // Verify project access (any role can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const limit = Math.min(
      query.limit ?? GOVERNANCE_DEFAULT_PAGE_SIZE,
      GOVERNANCE_MAX_PAGE_SIZE
    );

    // Build where clause
    const where: any = { projectId };

    // Status filter
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    // Cursor-based pagination
    if (query.cursor) {
      const parsed = parsePaginationCursor(query.cursor);
      if (parsed) {
        where.OR = [
          { createdAt: { lt: new Date(parsed.timestamp) } },
          {
            createdAt: new Date(parsed.timestamp),
            id: { lt: parsed.id },
          },
        ];
      }
    }

    // Fetch items + 1 to check hasMore
    const items = await this.prisma.geoReportShareLink.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;

    // Resolve user display names
    const userIds = new Set<string>();
    for (const item of resultItems) {
      if (item.createdByUserId) userIds.add(item.createdByUserId);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

    // Get related audit events for event history
    const linkIds = resultItems.map((item) => item.id);
    const auditEvents = await this.prisma.governanceAuditEvent.findMany({
      where: {
        projectId,
        eventType: { in: ['SHARE_LINK_CREATED', 'SHARE_LINK_REVOKED'] },
        resourceId: { in: linkIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group events by link ID
    const eventsByLinkId = new Map<string, any[]>();
    for (const event of auditEvents) {
      const linkId = event.resourceId;
      if (linkId) {
        if (!eventsByLinkId.has(linkId)) {
          eventsByLinkId.set(linkId, []);
        }
        eventsByLinkId.get(linkId)!.push(event);
      }
    }

    // Derive status and format response
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const formattedItems: ShareLinkListItem[] = resultItems.map((item) => {
      // Derive status deterministically
      let status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' = item.status as any;
      if (
        status === 'ACTIVE' &&
        item.expiresAt &&
        new Date(item.expiresAt) < new Date()
      ) {
        status = 'EXPIRED';
      }

      // Build events history
      const events: ShareLinkEventItem[] = [];
      const linkEvents = eventsByLinkId.get(item.id) || [];
      for (const event of linkEvents) {
        let eventType: 'CREATED' | 'REVOKED' | 'EXPIRED';
        if (event.eventType === 'SHARE_LINK_CREATED') {
          eventType = 'CREATED';
        } else if (event.eventType === 'SHARE_LINK_REVOKED') {
          eventType = 'REVOKED';
        } else {
          continue;
        }
        events.push({
          eventType,
          actorUserId: event.actorUserId,
          actorName: userMap.get(event.actorUserId),
          timestamp: event.createdAt.toISOString(),
        });
      }
      // Add expired event if status is EXPIRED but no explicit event
      if (
        status === 'EXPIRED' &&
        !events.some((e) => e.eventType === 'EXPIRED')
      ) {
        events.push({
          eventType: 'EXPIRED',
          timestamp: item.expiresAt!.toISOString(),
        });
      }

      return {
        id: item.id,
        projectId: item.projectId,
        shareToken: item.shareToken,
        shareUrl: `${baseUrl}/share/geo-report/${item.shareToken}`,
        title: item.title,
        status,
        audience: item.audience as any,
        // NEVER return passcode - only last4
        passcodeLast4: item.passcodeLast4,
        passcodeCreatedAt: item.passcodeCreatedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        createdByUserId: item.createdByUserId ?? undefined,
        createdByName: item.createdByUserId
          ? userMap.get(item.createdByUserId)
          : undefined,
        expiresAt: item.expiresAt?.toISOString(),
        revokedAt: item.revokedAt?.toISOString(),
        reportIdentifier: item.projectId, // GEO reports are project-scoped
        events: events.length > 0 ? events : undefined,
      };
    });

    // Build next cursor
    let nextCursor: string | undefined;
    if (hasMore && resultItems.length > 0) {
      const lastItem = resultItems[resultItems.length - 1];
      nextCursor = buildPaginationCursor(lastItem.createdAt, lastItem.id);
    }

    return {
      items: formattedItems,
      nextCursor,
      hasMore,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Derive deep-link fields from resourceType and resourceId.
   * Used for traceability in the approvals list.
   */
  private deriveDeepLinkFields(
    resourceType: string,
    resourceId: string
  ): Partial<ApprovalsListItem> {
    // resourceId format for AUTOMATION_PLAYBOOK_APPLY: {playbookId}:{scopeId}
    // e.g., "missing_seo_title:abc123def456"
    if (resourceType === 'AUTOMATION_PLAYBOOK_APPLY') {
      const parts = resourceId.split(':');
      if (parts.length >= 2) {
        const playbookId = parts[0];
        // Try to extract assetType from scopeId if available
        // This is best-effort - the scopeId may not contain this info
        return {
          playbookId,
          bundleId: `AUTOMATION_RUN:FIX_MISSING_METADATA:${playbookId}:PRODUCTS`,
        };
      }
    }

    // For GEO_FIX_APPLY and ANSWER_BLOCK_SYNC, just return the resourceId as identifier
    return {};
  }

  /**
   * Derive target reference for audit event display.
   */
  private deriveTargetReference(
    resourceType: string | null,
    resourceId: string | null
  ): string | undefined {
    if (!resourceType || !resourceId) return undefined;

    if (resourceType === 'SHARE_LINK') {
      return `Share Link`;
    }

    if (resourceType === 'AUTOMATION_PLAYBOOK_APPLY') {
      const parts = resourceId.split(':');
      if (parts.length >= 1) {
        return `Playbook: ${parts[0]}`;
      }
    }

    if (resourceType === 'GEO_FIX_APPLY') {
      return 'GEO Fix';
    }

    if (resourceType === 'ANSWER_BLOCK_SYNC') {
      return 'Answer Block Sync';
    }

    return resourceType;
  }

  /**
   * Derive scope summary from metadata.
   */
  private deriveScopeSummary(
    metadata: Record<string, unknown> | null
  ): string | undefined {
    if (!metadata) return undefined;

    // Look for scope-related fields
    if (metadata.scopeCount && typeof metadata.scopeCount === 'number') {
      return `${metadata.scopeCount} items`;
    }

    if (metadata.affectedCount && typeof metadata.affectedCount === 'number') {
      return `${metadata.affectedCount} affected`;
    }

    return undefined;
  }

  /**
   * Sanitize metadata for viewer - remove any sensitive fields.
   * This is a defensive measure in addition to AuditEventsService sanitization.
   */
  private sanitizeMetadataForViewer(
    metadata: Record<string, unknown> | null
  ): Record<string, unknown> | undefined {
    if (!metadata) return undefined;

    const forbidden = [
      'password',
      'passcode',
      'token',
      'secret',
      'apiKey',
      'accessToken',
      'refreshToken',
      'hash',
      'passcodeHash',
    ];

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (forbidden.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        continue;
      }
      result[key] = value;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }
}
