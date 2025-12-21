import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ApprovalResourceType, ApprovalStatus } from '@prisma/client';
import { AuditEventsService } from './audit-events.service';

/**
 * [ENTERPRISE-GEO-1] Approval Workflow Service
 *
 * Manages approval requests for governed resources:
 * - GEO_FIX_APPLY: Applying GEO fix drafts
 * - ANSWER_BLOCK_SYNC: Syncing answer blocks to Shopify
 *
 * Single-user constraint (v1): Only project owner can approve/reject.
 * Future-ready for multi-user roles (ROLES-2).
 */

export interface ApprovalRequestResponse {
  id: string;
  projectId: string;
  resourceType: string;
  resourceId: string;
  status: string;
  requestedByUserId: string;
  requestedAt: string;
  decidedByUserId: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  consumed: boolean;
  consumedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalRequestDto {
  resourceType: 'GEO_FIX_APPLY' | 'ANSWER_BLOCK_SYNC';
  resourceId: string;
}

export interface ApproveRejectDto {
  reason?: string;
}

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEventsService: AuditEventsService,
  ) {}

  /**
   * Create a new approval request
   */
  async createRequest(
    projectId: string,
    userId: string,
    dto: CreateApprovalRequestDto,
  ): Promise<ApprovalRequestResponse> {
    await this.verifyProjectAccess(projectId, userId);

    // Check for existing pending/approved request for same resource
    const existingRequest = await this.prisma.approvalRequest.findFirst({
      where: {
        projectId,
        resourceType: dto.resourceType as ApprovalResourceType,
        resourceId: dto.resourceId,
        status: { in: ['PENDING_APPROVAL', 'APPROVED'] },
        consumed: false,
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'APPROVED') {
        throw new BadRequestException(
          'An approved request already exists for this resource. Use the existing approval.',
        );
      }
      throw new BadRequestException(
        'A pending request already exists for this resource.',
      );
    }

    const request = await this.prisma.approvalRequest.create({
      data: {
        projectId,
        resourceType: dto.resourceType as ApprovalResourceType,
        resourceId: dto.resourceId,
        status: 'PENDING_APPROVAL',
        requestedByUserId: userId,
      },
    });

    // Log audit event
    await this.auditEventsService.logApprovalRequested(
      projectId,
      userId,
      dto.resourceType,
      dto.resourceId,
      request.id,
    );

    return this.formatResponse(request);
  }

  /**
   * Approve a pending request
   * Only project owner can approve (single-user constraint)
   */
  async approve(
    projectId: string,
    approvalId: string,
    userId: string,
    dto: ApproveRejectDto = {},
  ): Promise<ApprovalRequestResponse> {
    await this.verifyProjectOwner(projectId, userId);

    const request = await this.getRequestOrThrow(projectId, approvalId);

    if (request.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        `Cannot approve request with status: ${request.status}`,
      );
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: 'APPROVED',
        decidedByUserId: userId,
        decidedAt: new Date(),
        decisionReason: dto.reason ?? null,
      },
    });

    // Log audit event
    await this.auditEventsService.logApprovalApproved(
      projectId,
      userId,
      request.resourceType,
      request.resourceId,
      approvalId,
      dto.reason,
    );

    return this.formatResponse(updated);
  }

  /**
   * Reject a pending request
   * Only project owner can reject (single-user constraint)
   */
  async reject(
    projectId: string,
    approvalId: string,
    userId: string,
    dto: ApproveRejectDto = {},
  ): Promise<ApprovalRequestResponse> {
    await this.verifyProjectOwner(projectId, userId);

    const request = await this.getRequestOrThrow(projectId, approvalId);

    if (request.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        `Cannot reject request with status: ${request.status}`,
      );
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: 'REJECTED',
        decidedByUserId: userId,
        decidedAt: new Date(),
        decisionReason: dto.reason ?? null,
      },
    });

    // Log audit event
    await this.auditEventsService.logApprovalRejected(
      projectId,
      userId,
      request.resourceType,
      request.resourceId,
      approvalId,
      dto.reason,
    );

    return this.formatResponse(updated);
  }

  /**
   * Get approval status for a specific resource
   * Returns the most recent approval request
   */
  async getApprovalStatus(
    projectId: string,
    userId: string,
    resourceType: ApprovalResourceType,
    resourceId: string,
  ): Promise<ApprovalRequestResponse | null> {
    await this.verifyProjectAccess(projectId, userId);

    const request = await this.prisma.approvalRequest.findFirst({
      where: {
        projectId,
        resourceType,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return request ? this.formatResponse(request) : null;
  }

  /**
   * List approval requests for a project
   */
  async listRequests(
    projectId: string,
    userId: string,
    options: {
      resourceType?: ApprovalResourceType;
      resourceId?: string;
      status?: ApprovalStatus;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{
    requests: ApprovalRequestResponse[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    await this.verifyProjectAccess(projectId, userId);

    const page = options.page ?? 1;
    const pageSize = Math.min(options.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = { projectId };
    if (options.resourceType) where.resourceType = options.resourceType;
    if (options.resourceId) where.resourceId = options.resourceId;
    if (options.status) where.status = options.status;

    const [requests, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.approvalRequest.count({ where }),
    ]);

    return {
      requests: requests.map((r) => this.formatResponse(r)),
      total,
      page,
      pageSize,
      hasMore: skip + requests.length < total,
    };
  }

  /**
   * Check if a valid (approved, unconsumed) approval exists for a resource
   * Used by gating hooks
   */
  async hasValidApproval(
    projectId: string,
    resourceType: ApprovalResourceType,
    resourceId: string,
  ): Promise<{ valid: boolean; approvalId?: string; status?: string }> {
    const request = await this.prisma.approvalRequest.findFirst({
      where: {
        projectId,
        resourceType,
        resourceId,
        status: 'APPROVED',
        consumed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (request) {
      return { valid: true, approvalId: request.id, status: 'APPROVED' };
    }

    // Check for pending request
    const pendingRequest = await this.prisma.approvalRequest.findFirst({
      where: {
        projectId,
        resourceType,
        resourceId,
        status: 'PENDING_APPROVAL',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (pendingRequest) {
      return { valid: false, approvalId: pendingRequest.id, status: 'PENDING_APPROVAL' };
    }

    return { valid: false };
  }

  /**
   * Mark an approval as consumed (used)
   * Called after successful apply execution
   */
  async markConsumed(approvalId: string): Promise<void> {
    await this.prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        consumed: true,
        consumedAt: new Date(),
      },
    });
  }

  private async getRequestOrThrow(
    projectId: string,
    approvalId: string,
  ): Promise<any> {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: approvalId, projectId },
    });

    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    return request;
  }

  private async verifyProjectAccess(projectId: string, userId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private async verifyProjectOwner(projectId: string, userId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Single-user constraint: only owner can approve/reject
    if (project.userId !== userId) {
      throw new ForbiddenException('Only the project owner can approve or reject requests');
    }
  }

  private formatResponse(request: any): ApprovalRequestResponse {
    return {
      id: request.id,
      projectId: request.projectId,
      resourceType: request.resourceType,
      resourceId: request.resourceId,
      status: request.status,
      requestedByUserId: request.requestedByUserId,
      requestedAt: request.requestedAt.toISOString(),
      decidedByUserId: request.decidedByUserId,
      decidedAt: request.decidedAt?.toISOString() ?? null,
      decisionReason: request.decisionReason,
      consumed: request.consumed,
      consumedAt: request.consumedAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }
}
