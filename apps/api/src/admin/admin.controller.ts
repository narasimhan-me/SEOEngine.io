import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import {
  AdminRolesGuard,
  RequireAdminCapability,
} from '../auth/admin-roles.guard';

/**
 * [ADMIN-OPS-1] Admin Controller
 * All endpoints guarded by JwtAuthGuard + AdminGuard + AdminRolesGuard.
 * Implements the ADMIN-OPS-1 control plane for Support, Ops Admin, and Management/CEO.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard, AdminRolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ===========================================================================
  // [D1] Overview (read-only)
  // ===========================================================================

  /**
   * GET /admin/overview - Executive snapshot dashboard
   */
  @Get('overview')
  @RequireAdminCapability('read')
  async getOverview() {
    return this.adminService.getOverview();
  }

  /**
   * Get admin dashboard statistics (legacy endpoint, kept for compatibility)
   */
  @Get('stats')
  @RequireAdminCapability('read')
  async getStats() {
    return this.adminService.getStats();
  }

  // ===========================================================================
  // [D2] Users (read-only + safe actions)
  // ===========================================================================

  /**
   * GET /admin/users - List all users with expanded details
   */
  @Get('users')
  @RequireAdminCapability('read')
  async getUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  /**
   * GET /admin/users/:id - Admin context user detail
   */
  @Get('users/:id')
  @RequireAdminCapability('read')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  /**
   * POST /admin/users/:id/impersonate - Start read-only impersonation
   * SUPPORT_AGENT + OPS_ADMIN only; MUST write AdminAuditLog
   */
  @Post('users/:id/impersonate')
  @RequireAdminCapability('support_action')
  async impersonateUser(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any
  ) {
    return this.adminService.impersonateUser(id, req.user, body.reason);
  }

  /**
   * PUT /admin/users/:id/subscription - Override user subscription (plan)
   * OPS_ADMIN only; MUST write AdminAuditLog
   */
  @Put('users/:id/subscription')
  @RequireAdminCapability('ops_action')
  async updateUserSubscription(
    @Param('id') id: string,
    @Body() body: { planId: string },
    @Req() req: any
  ) {
    return this.adminService.updateUserSubscription(id, body.planId, req.user);
  }

  /**
   * POST /admin/users/:id/quota-reset - Reset AI quota for user
   * OPS_ADMIN only; MUST write AdminAuditLog
   */
  @Post('users/:id/quota-reset')
  @RequireAdminCapability('ops_action')
  async resetUserQuota(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any
  ) {
    return this.adminService.resetUserQuota(id, req.user, body.reason);
  }

  /**
   * PUT /admin/users/:id/admin-role - Assign internal admin role
   * OPS_ADMIN only; MUST write AdminAuditLog
   */
  @Put('users/:id/admin-role')
  @RequireAdminCapability('ops_action')
  async updateAdminRole(
    @Param('id') id: string,
    @Body()
    body: {
      adminRole: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null;
    },
    @Req() req: any
  ) {
    return this.adminService.updateAdminRole(id, body.adminRole, req.user);
  }

  /**
   * Update user role (legacy endpoint)
   */
  @Put('users/:id/role')
  @RequireAdminCapability('ops_action')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: 'USER' | 'ADMIN' },
    @Req() req: any
  ) {
    return this.adminService.updateUserRole(id, body.role, req.user);
  }

  // ===========================================================================
  // [D3] Projects (read-only + safe actions)
  // ===========================================================================

  /**
   * GET /admin/projects - List all projects with admin details
   */
  @Get('projects')
  @RequireAdminCapability('read')
  async getProjects(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.adminService.getProjects(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  /**
   * POST /admin/projects/:id/resync - Trigger safe resync (no AI side effects)
   * SUPPORT_AGENT + OPS_ADMIN only; MUST write AdminAuditLog
   */
  @Post('projects/:id/resync')
  @RequireAdminCapability('support_action')
  async resyncProject(@Param('id') id: string, @Req() req: any) {
    return this.adminService.resyncProject(id, req.user);
  }

  // ===========================================================================
  // [D4] Runs (read-only + safe retry)
  // ===========================================================================

  /**
   * GET /admin/runs - List runs with filters
   */
  @Get('runs')
  @RequireAdminCapability('read')
  async getRuns(
    @Query('projectId') projectId?: string,
    @Query('runType') runType?: string,
    @Query('status') status?: string,
    @Query('aiUsed') aiUsed?: string,
    @Query('reused') reused?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.adminService.getRuns({
      projectId,
      runType,
      status,
      aiUsed: aiUsed === 'true' ? true : aiUsed === 'false' ? false : undefined,
      reused: reused === 'true' ? true : reused === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * GET /admin/runs/:id - Run detail (redacted inputs)
   */
  @Get('runs/:id')
  @RequireAdminCapability('read')
  async getRun(@Param('id') id: string) {
    return this.adminService.getRun(id);
  }

  /**
   * POST /admin/runs/:id/retry - Retry a failed run (safe runs only)
   * SUPPORT_AGENT + OPS_ADMIN only; MUST write AdminAuditLog
   */
  @Post('runs/:id/retry')
  @RequireAdminCapability('support_action')
  async retryRun(@Param('id') id: string, @Req() req: any) {
    return this.adminService.retryRun(id, req.user);
  }

  // ===========================================================================
  // [D5] Issues (read-only)
  // ===========================================================================

  /**
   * GET /admin/issues/summary - Global issues summary (derived, no AI calls)
   */
  @Get('issues/summary')
  @RequireAdminCapability('read')
  async getIssuesSummary() {
    return this.adminService.getIssuesSummary();
  }

  // ===========================================================================
  // [D6] AI Usage (read-only + red alert)
  // ===========================================================================

  /**
   * GET /admin/ai-usage - AI usage metrics with APPLY invariant check
   */
  @Get('ai-usage')
  @RequireAdminCapability('read')
  async getAiUsage() {
    return this.adminService.getAiUsage();
  }

  // ===========================================================================
  // [D7] System Health (read-only)
  // ===========================================================================

  /**
   * GET /admin/system-health - Queue health + failure signals
   */
  @Get('system-health')
  @RequireAdminCapability('read')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  // ===========================================================================
  // [D8] Audit Log (read-only, mandatory)
  // ===========================================================================

  /**
   * GET /admin/audit-log - Search/filter immutable audit records
   */
  @Get('audit-log')
  @RequireAdminCapability('read')
  async getAuditLog(
    @Query('actorId') actorId?: string,
    @Query('targetUserId') targetUserId?: string,
    @Query('targetProjectId') targetProjectId?: string,
    @Query('actionType') actionType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.adminService.getAuditLog({
      actorId,
      targetUserId,
      targetProjectId,
      actionType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  // ===========================================================================
  // [D9] Governance Audit Events (ENTERPRISE-GEO-1)
  // ===========================================================================

  /**
   * GET /admin/governance-audit-events - Read-only access to governance audit events
   * [ENTERPRISE-GEO-1] Internal visibility for governance-related actions.
   */
  @Get('governance-audit-events')
  @RequireAdminCapability('read')
  async getGovernanceAuditEvents(
    @Query('projectId') projectId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('eventType') eventType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.adminService.getGovernanceAuditEvents({
      projectId,
      actorUserId,
      eventType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}
