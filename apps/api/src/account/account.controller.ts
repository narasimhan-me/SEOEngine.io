import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AccountService,
  UpdateProfileDto,
  UpdatePreferencesDto,
} from './account.service';

/**
 * [SELF-SERVICE-1] Account Controller
 *
 * Customer-facing endpoints for self-service account management.
 * All endpoints are authenticated. No AI side effects.
 *
 * Endpoints:
 * - GET  /account/profile
 * - PUT  /account/profile
 * - GET  /account/preferences
 * - PUT  /account/preferences
 * - GET  /account/ai-usage
 * - GET  /account/stores
 * - POST /account/stores/:projectId/disconnect
 * - GET  /account/sessions
 * - POST /account/sessions/sign-out-all
 */
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * [SELF-SERVICE-1] Validate that the request is not read-only impersonation.
   * Read-only impersonation cannot mutate account data.
   */
  private validateNotReadOnlyImpersonation(user: any): void {
    if (user.impersonation?.mode === 'readOnly') {
      throw new ForbiddenException('Impersonation mode is read-only');
    }
  }

  // ==========================================================================
  // Profile
  // ==========================================================================

  /**
   * GET /account/profile
   * Returns profile data: name, email (read-only), avatar, timezone, locale, org name, accountRole.
   */
  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.accountService.getProfile(req.user.id);
  }

  /**
   * PUT /account/profile
   * Update allowed profile fields. Email is NOT editable.
   * Writes UserAccountAuditLog.
   */
  @Put('profile')
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    this.validateNotReadOnlyImpersonation(req.user);
    return this.accountService.updateProfile(req.user.id, dto);
  }

  // ==========================================================================
  // Preferences
  // ==========================================================================

  /**
   * GET /account/preferences
   * Returns user preferences (notification toggles, default behaviors).
   */
  @Get('preferences')
  async getPreferences(@Request() req: any) {
    return this.accountService.getPreferences(req.user.id);
  }

  /**
   * PUT /account/preferences
   * Update preferences. VIEWER cannot update.
   * Writes UserAccountAuditLog.
   */
  @Put('preferences')
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferencesDto
  ) {
    this.validateNotReadOnlyImpersonation(req.user);
    return this.accountService.updatePreferences(
      req.user.id,
      dto,
      req.user.accountRole
    );
  }

  // ==========================================================================
  // AI Usage
  // ==========================================================================

  /**
   * GET /account/ai-usage
   * Monthly summary: AI runs vs reused, savings from reuse.
   * Explicitly surfaces the invariant "APPLY never uses AI".
   * No controls - visibility only.
   */
  @Get('ai-usage')
  async getAiUsage(@Request() req: any) {
    return this.accountService.getAiUsageSummary(req.user.id);
  }

  // ==========================================================================
  // Connected Stores
  // ==========================================================================

  /**
   * GET /account/stores
   * Returns connected Shopify stores derived from Projects + Integrations.
   */
  @Get('stores')
  async getConnectedStores(@Request() req: any) {
    return this.accountService.getConnectedStores(req.user.id);
  }

  /**
   * POST /account/stores/:projectId/disconnect
   * Disconnect a Shopify store from the project.
   * OWNER only. Writes UserAccountAuditLog.
   * Does NOT trigger AI work.
   */
  @Post('stores/:projectId/disconnect')
  async disconnectStore(
    @Request() req: any,
    @Param('projectId') projectId: string
  ) {
    this.validateNotReadOnlyImpersonation(req.user);
    return this.accountService.disconnectStore(
      req.user.id,
      projectId,
      req.user.accountRole
    );
  }

  // ==========================================================================
  // Sessions
  // ==========================================================================

  /**
   * GET /account/sessions
   * Returns list of active sessions for the authenticated user.
   */
  @Get('sessions')
  async getActiveSessions(@Request() req: any) {
    // Pass session ID if available in the request (from JWT payload)
    const currentSessionId = req.user.sessionId;
    return this.accountService.getActiveSessions(req.user.id, currentSessionId);
  }

  /**
   * POST /account/sessions/sign-out-all
   * Invalidate all sessions for the user.
   * Sets tokenInvalidBefore, revokes all sessions, writes UserAccountAuditLog.
   */
  @Post('sessions/sign-out-all')
  async signOutAllSessions(@Request() req: any) {
    this.validateNotReadOnlyImpersonation(req.user);
    return this.accountService.signOutAllSessions(req.user.id);
  }
}
