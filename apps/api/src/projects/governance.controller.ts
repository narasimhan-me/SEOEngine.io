import { Controller, Get, Put, Post, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GovernanceService, UpdateGovernancePolicyDto } from './governance.service';
import { ApprovalsService, CreateApprovalRequestDto, ApproveRejectDto } from './approvals.service';
import { AuditEventsService } from './audit-events.service';
import { ApprovalResourceType, ApprovalStatus, GovernanceAuditEventType } from '@prisma/client';

/**
 * [ENTERPRISE-GEO-1] Governance Controller
 *
 * Project-scoped endpoints for:
 * - Governance policy management
 * - Approval workflow
 * - Audit event viewing
 */
@Controller('projects/:projectId/governance')
@UseGuards(JwtAuthGuard)
export class GovernanceController {
  constructor(
    private readonly governanceService: GovernanceService,
    private readonly approvalsService: ApprovalsService,
    private readonly auditEventsService: AuditEventsService,
  ) {}

  // ============================================================================
  // Policy Endpoints
  // ============================================================================

  /**
   * Get governance policy for a project
   * Returns default values if no policy exists
   */
  @Get('policy')
  async getPolicy(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.governanceService.getPolicy(projectId, req.user.id);
  }

  /**
   * Update governance policy for a project
   * Creates policy if it doesn't exist
   */
  @Put('policy')
  async updatePolicy(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() body: UpdateGovernancePolicyDto,
  ) {
    // Get current policy for audit diff
    const oldPolicy = await this.governanceService.getPolicy(projectId, req.user.id);

    // Update policy
    const newPolicy = await this.governanceService.updatePolicy(projectId, req.user.id, body);

    // Log audit event with old/new diff
    await this.auditEventsService.logPolicyChanged(
      projectId,
      req.user.id,
      {
        requireApprovalForApply: oldPolicy.requireApprovalForApply,
        restrictShareLinks: oldPolicy.restrictShareLinks,
        shareLinkExpiryDays: oldPolicy.shareLinkExpiryDays,
        allowedExportAudience: oldPolicy.allowedExportAudience,
        allowCompetitorMentionsInExports: oldPolicy.allowCompetitorMentionsInExports,
      },
      {
        requireApprovalForApply: newPolicy.requireApprovalForApply,
        restrictShareLinks: newPolicy.restrictShareLinks,
        shareLinkExpiryDays: newPolicy.shareLinkExpiryDays,
        allowedExportAudience: newPolicy.allowedExportAudience,
        allowCompetitorMentionsInExports: newPolicy.allowCompetitorMentionsInExports,
      },
    );

    return newPolicy;
  }

  // ============================================================================
  // Approval Endpoints
  // ============================================================================

  /**
   * Create a new approval request
   */
  @Post('approvals')
  async createApprovalRequest(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() body: CreateApprovalRequestDto,
  ) {
    return this.approvalsService.createRequest(projectId, req.user.id, body);
  }

  /**
   * Approve a pending request
   */
  @Post('approvals/:approvalId/approve')
  async approveRequest(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Param('approvalId') approvalId: string,
    @Body() body: ApproveRejectDto,
  ) {
    return this.approvalsService.approve(projectId, approvalId, req.user.id, body);
  }

  /**
   * Reject a pending request
   */
  @Post('approvals/:approvalId/reject')
  async rejectRequest(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Param('approvalId') approvalId: string,
    @Body() body: ApproveRejectDto,
  ) {
    return this.approvalsService.reject(projectId, approvalId, req.user.id, body);
  }

  /**
   * Get approval status for a specific resource
   */
  @Get('approvals')
  async getApprovalStatus(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // If resourceType and resourceId are provided, get specific status
    if (resourceType && resourceId) {
      const approval = await this.approvalsService.getApprovalStatus(
        projectId,
        req.user.id,
        resourceType as ApprovalResourceType,
        resourceId,
      );
      return { approval };
    }

    // Otherwise, list all approvals with optional filters
    return this.approvalsService.listRequests(projectId, req.user.id, {
      resourceType: resourceType as ApprovalResourceType | undefined,
      status: status as ApprovalStatus | undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  // ============================================================================
  // Audit Event Endpoints
  // ============================================================================

  /**
   * List audit events for a project (paged)
   */
  @Get('audit-events')
  async listAuditEvents(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.auditEventsService.listEvents(projectId, req.user.id, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      eventType: eventType as GovernanceAuditEventType | undefined,
    });
  }
}
