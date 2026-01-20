import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GovernanceAuditEventType, Prisma } from '@prisma/client';
import { RoleResolutionService } from '../common/role-resolution.service';

/**
 * [ENTERPRISE-GEO-1] Governance Audit Events Service
 * [ROLES-3] Updated with ProjectMember-aware access enforcement
 *
 * Append-only audit log for governance actions.
 * All writes are immutable - no update/delete operations.
 *
 * Supports:
 * - Policy changes
 * - Approval workflow events
 * - Apply executions
 * - Share link operations
 *
 * [ROLES-3] Access control:
 * - listEvents: Any ProjectMember can view (read-only)
 * - writeEvent: Internal only (no direct user access check needed)
 */

export interface AuditEventResponse {
  id: string;
  projectId: string;
  actorUserId: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditEventListResponse {
  events: AuditEventResponse[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Keys that should never be logged in metadata
const FORBIDDEN_METADATA_KEYS = [
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

@Injectable()
export class AuditEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService
  ) {}

  /**
   * Write an audit event (append-only)
   * Automatically sanitizes metadata to prevent secret leakage
   */
  async writeEvent(
    projectId: string,
    actorUserId: string,
    eventType: GovernanceAuditEventType,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditEventResponse> {
    // Sanitize metadata to prevent accidental secret storage
    const sanitizedMetadata = metadata
      ? (this.sanitizeMetadata(metadata) as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    const event = await this.prisma.governanceAuditEvent.create({
      data: {
        projectId,
        actorUserId,
        eventType,
        resourceType: resourceType ?? null,
        resourceId: resourceId ?? null,
        metadata: sanitizedMetadata,
      },
    });

    return this.formatEventResponse(event);
  }

  /**
   * List audit events for a project (paged)
   * Customer-visible audit log
   * [ROLES-3] Any ProjectMember can view (read-only)
   */
  async listEvents(
    projectId: string,
    userId: string,
    options: {
      page?: number;
      pageSize?: number;
      eventType?: GovernanceAuditEventType;
    } = {}
  ): Promise<AuditEventListResponse> {
    // [ROLES-3] Verify membership (any role can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    const page = options.page ?? 1;
    const pageSize = Math.min(options.pageSize ?? 20, 100); // Max 100 per page
    const skip = (page - 1) * pageSize;

    const where: any = { projectId };
    if (options.eventType) {
      where.eventType = options.eventType;
    }

    const [events, total] = await Promise.all([
      this.prisma.governanceAuditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.governanceAuditEvent.count({ where }),
    ]);

    return {
      events: events.map((e) => this.formatEventResponse(e)),
      total,
      page,
      pageSize,
      hasMore: skip + events.length < total,
    };
  }

  /**
   * Convenience methods for specific event types
   */

  async logPolicyChanged(
    projectId: string,
    actorUserId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ): Promise<AuditEventResponse> {
    return this.writeEvent(
      projectId,
      actorUserId,
      'POLICY_CHANGED',
      'POLICY',
      projectId,
      { oldValues, newValues }
    );
  }

  async logApprovalRequested(
    projectId: string,
    actorUserId: string,
    resourceType: string,
    resourceId: string,
    approvalId: string
  ): Promise<AuditEventResponse> {
    return this.writeEvent(
      projectId,
      actorUserId,
      'APPROVAL_REQUESTED',
      resourceType,
      resourceId,
      { approvalId }
    );
  }

  async logApprovalApproved(
    projectId: string,
    actorUserId: string,
    resourceType: string,
    resourceId: string,
    approvalId: string,
    reason?: string
  ): Promise<AuditEventResponse> {
    return this.writeEvent(
      projectId,
      actorUserId,
      'APPROVAL_APPROVED',
      resourceType,
      resourceId,
      { approvalId, reason }
    );
  }

  async logApprovalRejected(
    projectId: string,
    actorUserId: string,
    resourceType: string,
    resourceId: string,
    approvalId: string,
    reason?: string
  ): Promise<AuditEventResponse> {
    return this.writeEvent(
      projectId,
      actorUserId,
      'APPROVAL_REJECTED',
      resourceType,
      resourceId,
      { approvalId, reason }
    );
  }

  async logApplyExecuted(
    projectId: string,
    actorUserId: string,
    resourceType: string,
    resourceId: string,
    additionalMetadata?: Record<string, unknown>
  ): Promise<AuditEventResponse> {
    return this.writeEvent(
      projectId,
      actorUserId,
      'APPLY_EXECUTED',
      resourceType,
      resourceId,
      additionalMetadata
    );
  }

  async logShareLinkCreated(
    projectId: string,
    actorUserId: string,
    linkId: string,
    audience: string,
    expiryDays: number,
    passcodeLast4?: string
  ): Promise<AuditEventResponse> {
    return this.writeEvent(
      projectId,
      actorUserId,
      'SHARE_LINK_CREATED',
      'SHARE_LINK',
      linkId,
      {
        audience,
        expiryDays,
        // Only store last4 hint, never the actual passcode
        ...(passcodeLast4 && { passcodeLast4 }),
      }
    );
  }

  async logShareLinkRevoked(
    projectId: string,
    actorUserId: string,
    linkId: string
  ): Promise<AuditEventResponse> {
    return this.writeEvent(
      projectId,
      actorUserId,
      'SHARE_LINK_REVOKED',
      'SHARE_LINK',
      linkId
    );
  }

  /**
   * Sanitize metadata to remove any potential secrets
   */
  private sanitizeMetadata(
    metadata: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Skip forbidden keys
      if (
        FORBIDDEN_METADATA_KEYS.some((forbidden) =>
          key.toLowerCase().includes(forbidden.toLowerCase())
        )
      ) {
        continue;
      }

      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(
          value as Record<string, unknown>
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private formatEventResponse(event: any): AuditEventResponse {
    return {
      id: event.id,
      projectId: event.projectId,
      actorUserId: event.actorUserId,
      eventType: event.eventType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      metadata: event.metadata as Record<string, unknown> | null,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
