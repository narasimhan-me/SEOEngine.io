import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { AuditEventsService } from './audit-events.service';
import type {
  SafetyRailStatus,
  SafetyRailCheckType,
  SafetyRailCheckResult,
  SafetyRailEvaluation,
  SafetyRailBlockReason,
  SafetyRailBlockedError,
} from '@engineo/shared';

/**
 * [EA-44: AUTOMATION-SAFETY-RAILS-1] Automation Safety Rails Service
 *
 * System-level guardrails that wrap all automation execution.
 * Safety rails ensure automation cannot exceed declared boundaries.
 *
 * Trust Contract:
 * - Automation MUST NOT exceed its declared scope under any circumstance.
 * - Safety failures MUST block execution—never degrade to partial execution.
 * - Errors MUST explain why automation was blocked (no silent failures).
 * - No bulk actions beyond declared limits.
 * - No silent auto-apply or background execution.
 *
 * Design System: v1.5
 * EIC Version: 1.5
 */

export interface SafetyRailContext {
  /** Project being operated on */
  projectId: string;
  /** User initiating the automation */
  userId: string;
  /** Automation playbook or rule ID */
  automationId: string;
  /** Declared scope identifier (hash of affected assets) */
  declaredScopeId: string;
  /** Current scope identifier (computed at execution time) */
  currentScopeId: string;
  /** Number of assets in declared scope */
  declaredAssetCount: number;
  /** Asset type being modified */
  assetType: string;
  /** Whether intent was explicitly confirmed (EA-43) */
  intentConfirmed: boolean;
  /** Draft ID if applicable */
  draftId?: string;
}

@Injectable()
export class AutomationSafetyRailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService,
    private readonly roleResolution: RoleResolutionService,
    private readonly auditEvents: AuditEventsService
  ) {}

  /**
   * Evaluate all safety rails for an automation execution attempt.
   * Returns a complete evaluation with pass/fail status for each check.
   *
   * This method performs ALL checks and returns a complete result.
   * Callers should use enforceOrBlock() for automatic enforcement.
   */
  async evaluateSafetyRails(
    context: SafetyRailContext
  ): Promise<SafetyRailEvaluation> {
    const checks: SafetyRailCheckResult[] = [];
    const evaluatedAt = new Date().toISOString();

    // 1. Entitlement Check: User/system has permission for automation
    const entitlementCheck = await this.checkEntitlement(context);
    checks.push(entitlementCheck);

    // 2. Role Permission Check: User role allows apply action
    const roleCheck = await this.checkRolePermission(context);
    checks.push(roleCheck);

    // 3. Scope Boundary Check: Automation stays within declared scope
    const scopeCheck = this.checkScopeBoundary(context);
    checks.push(scopeCheck);

    // 4. Intent Confirmation Check: User explicitly confirmed (EA-43)
    const intentCheck = this.checkIntentConfirmation(context);
    checks.push(intentCheck);

    // 5. Guard Condition Check: Pre-flight conditions satisfied
    const guardCheck = await this.checkGuardConditions(context);
    checks.push(guardCheck);

    // 6. Rate Limit Check: Within execution limits
    const rateCheck = await this.checkRateLimit(context);
    checks.push(rateCheck);

    // Determine overall status: PASSED only if ALL checks passed
    const allPassed = checks.every((check) => check.passed);
    const status: SafetyRailStatus = allPassed ? 'PASSED' : 'BLOCKED';

    return {
      status,
      checks,
      evaluatedAt,
      projectId: context.projectId,
      userId: context.userId,
      automationId: context.automationId,
      declaredScope: {
        scopeId: context.declaredScopeId,
        assetCount: context.declaredAssetCount,
        assetType: context.assetType,
      },
    };
  }

  /**
   * Evaluate safety rails and throw if any check fails.
   * This is the primary enforcement method for automation execution.
   *
   * Guarantees:
   * - If this method returns, ALL safety checks passed
   * - If ANY check fails, throws ForbiddenException with detailed error
   * - Logs blocked attempts to audit trail
   */
  async enforceOrBlock(context: SafetyRailContext): Promise<SafetyRailEvaluation> {
    const evaluation = await this.evaluateSafetyRails(context);

    if (evaluation.status === 'BLOCKED') {
      const failedChecks = evaluation.checks.filter((c) => !c.passed);
      const primaryFailure = failedChecks[0];

      // Map check type to block reason
      const reasonMap: Record<SafetyRailCheckType, SafetyRailBlockReason> = {
        ENTITLEMENT_CHECK: 'ENTITLEMENT_BLOCKED',
        SCOPE_BOUNDARY_CHECK: 'SCOPE_EXCEEDED',
        INTENT_CONFIRMATION: 'INTENT_NOT_CONFIRMED',
        GUARD_CONDITION: 'GUARD_CONDITION_FAILED',
        RATE_LIMIT_CHECK: 'RATE_LIMIT_EXCEEDED',
        ROLE_PERMISSION_CHECK: 'ROLE_PERMISSION_DENIED',
      };

      const reason = reasonMap[primaryFailure.checkType];

      // Log blocked attempt to audit trail
      await this.logBlockedAttempt(context, evaluation);

      const error: SafetyRailBlockedError = {
        code: 'AUTOMATION_SAFETY_BLOCKED',
        reason,
        message: primaryFailure.message,
        failedChecks,
        evaluatedAt: evaluation.evaluatedAt,
      };

      throw new ForbiddenException(error);
    }

    return evaluation;
  }

  /**
   * Check 1: Entitlement verification
   * Ensures user's plan allows automation execution.
   */
  private async checkEntitlement(
    context: SafetyRailContext
  ): Promise<SafetyRailCheckResult> {
    try {
      const canAutoApply =
        await this.entitlementsService.canAutoApplyMetadataAutomations(
          context.userId
        );

      if (!canAutoApply) {
        return {
          checkType: 'ENTITLEMENT_CHECK',
          passed: false,
          message:
            'Your plan does not include automation execution. Upgrade to Pro or Business to unlock this feature.',
          context: { userId: context.userId },
        };
      }

      return {
        checkType: 'ENTITLEMENT_CHECK',
        passed: true,
        message: 'Entitlement check passed.',
      };
    } catch (err) {
      return {
        checkType: 'ENTITLEMENT_CHECK',
        passed: false,
        message: 'Failed to verify entitlements. Please try again.',
        context: { error: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check 2: Role permission verification
   * Ensures user has OWNER role (required for apply actions).
   */
  private async checkRolePermission(
    context: SafetyRailContext
  ): Promise<SafetyRailCheckResult> {
    try {
      const canApply = await this.roleResolution.canApply(
        context.projectId,
        context.userId
      );

      if (!canApply) {
        return {
          checkType: 'ROLE_PERMISSION_CHECK',
          passed: false,
          message:
            'Only project owners can execute automation. Request approval from the project owner.',
          context: { projectId: context.projectId, userId: context.userId },
        };
      }

      return {
        checkType: 'ROLE_PERMISSION_CHECK',
        passed: true,
        message: 'Role permission check passed.',
      };
    } catch (err) {
      return {
        checkType: 'ROLE_PERMISSION_CHECK',
        passed: false,
        message: 'Failed to verify role permissions. Please try again.',
        context: { error: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check 3: Scope boundary verification
   * Ensures automation cannot exceed its declared operational boundary.
   */
  private checkScopeBoundary(
    context: SafetyRailContext
  ): SafetyRailCheckResult {
    // Scope IDs must match exactly
    if (context.declaredScopeId !== context.currentScopeId) {
      return {
        checkType: 'SCOPE_BOUNDARY_CHECK',
        passed: false,
        message:
          'The automation scope has changed since it was configured. Please regenerate the preview to ensure you are applying to the correct assets.',
        context: {
          declaredScopeId: context.declaredScopeId,
          currentScopeId: context.currentScopeId,
        },
      };
    }

    return {
      checkType: 'SCOPE_BOUNDARY_CHECK',
      passed: true,
      message: 'Scope boundary check passed.',
    };
  }

  /**
   * Check 4: Intent confirmation verification (EA-43 integration)
   * Ensures user explicitly confirmed intent before execution.
   */
  private checkIntentConfirmation(
    context: SafetyRailContext
  ): SafetyRailCheckResult {
    if (!context.intentConfirmed) {
      return {
        checkType: 'INTENT_CONFIRMATION',
        passed: false,
        message:
          'Explicit intent confirmation is required before automation can execute. Please confirm your intent to proceed.',
        context: { automationId: context.automationId },
      };
    }

    return {
      checkType: 'INTENT_CONFIRMATION',
      passed: true,
      message: 'Intent confirmation check passed.',
    };
  }

  /**
   * Check 5: Guard conditions verification
   * Ensures pre-flight conditions are satisfied.
   */
  private async checkGuardConditions(
    context: SafetyRailContext
  ): Promise<SafetyRailCheckResult> {
    // If draftId is provided, verify draft exists and is valid
    if (context.draftId) {
      const draft = await this.prisma.automationPlaybookDraft.findUnique({
        where: { id: context.draftId },
        select: {
          id: true,
          projectId: true,
          scopeId: true,
          appliedAt: true,
          expiresAt: true,
          status: true,
        },
      });

      if (!draft) {
        return {
          checkType: 'GUARD_CONDITION',
          passed: false,
          message:
            'The automation draft was not found. Please regenerate the preview.',
          context: { draftId: context.draftId },
        };
      }

      if (draft.projectId !== context.projectId) {
        return {
          checkType: 'GUARD_CONDITION',
          passed: false,
          message:
            'The automation draft does not belong to this project.',
          context: { draftId: context.draftId, projectId: context.projectId },
        };
      }

      if (draft.appliedAt) {
        return {
          checkType: 'GUARD_CONDITION',
          passed: false,
          message:
            'This automation draft has already been applied. Generate a new draft to apply again.',
          context: { draftId: context.draftId, appliedAt: draft.appliedAt },
        };
      }

      if (draft.expiresAt && draft.expiresAt < new Date()) {
        return {
          checkType: 'GUARD_CONDITION',
          passed: false,
          message:
            'The automation draft has expired. Please regenerate the preview.',
          context: { draftId: context.draftId, expiresAt: draft.expiresAt },
        };
      }

      if (draft.scopeId !== context.declaredScopeId) {
        return {
          checkType: 'GUARD_CONDITION',
          passed: false,
          message:
            'The draft scope does not match the declared scope. Please regenerate the preview.',
          context: {
            draftScopeId: draft.scopeId,
            declaredScopeId: context.declaredScopeId,
          },
        };
      }
    }

    return {
      checkType: 'GUARD_CONDITION',
      passed: true,
      message: 'Guard condition check passed.',
    };
  }

  /**
   * Check 6: Rate limit verification
   * Ensures automation is within daily execution limits.
   */
  private async checkRateLimit(
    context: SafetyRailContext
  ): Promise<SafetyRailCheckResult> {
    try {
      // Check daily AI usage for this project
      const { planId, limit } =
        await this.entitlementsService.getAiSuggestionLimit(context.userId);
      const dailyCount = await this.entitlementsService.getDailyAiUsage(
        context.userId,
        context.projectId,
        'automation_apply'
      );

      // -1 means unlimited
      if (limit !== -1 && dailyCount >= limit) {
        return {
          checkType: 'RATE_LIMIT_CHECK',
          passed: false,
          message: `Daily automation limit reached. Your ${planId} plan allows ${limit} executions per day. Try again tomorrow or upgrade your plan.`,
          context: { dailyCount, limit, planId },
        };
      }

      return {
        checkType: 'RATE_LIMIT_CHECK',
        passed: true,
        message: 'Rate limit check passed.',
      };
    } catch (err) {
      return {
        checkType: 'RATE_LIMIT_CHECK',
        passed: false,
        message: 'Failed to verify rate limits. Please try again.',
        context: { error: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  /**
   * Log a blocked automation attempt to the audit trail.
   */
  private async logBlockedAttempt(
    context: SafetyRailContext,
    evaluation: SafetyRailEvaluation
  ): Promise<void> {
    const failedChecks = evaluation.checks.filter((c) => !c.passed);

    await this.auditEvents.writeEvent(
      context.projectId,
      context.userId,
      'APPLY_EXECUTED', // Using existing event type - blocked attempts are logged as failed executions
      'AUTOMATION_SAFETY_RAIL',
      context.automationId,
      {
        status: 'BLOCKED',
        declaredScope: evaluation.declaredScope,
        failedChecks: failedChecks.map((c) => ({
          checkType: c.checkType,
          message: c.message,
        })),
        evaluatedAt: evaluation.evaluatedAt,
      }
    );

    // eslint-disable-next-line no-console
    console.log('[AutomationSafetyRails] execution.blocked', {
      projectId: context.projectId,
      userId: context.userId,
      automationId: context.automationId,
      failedChecks: failedChecks.map((c) => c.checkType),
    });
  }
}
