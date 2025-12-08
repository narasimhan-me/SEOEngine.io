import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { getPlanById, PlanId, PlanLimits, PLANS } from './plans';

export interface EntitlementsSummary {
  plan: PlanId;
  limits: PlanLimits;
  usage: {
    projects: number;
  };
}

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the effective plan for a user
   */
  async getUserPlan(userId: string): Promise<PlanId> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.status !== 'active') {
      return 'free';
    }

    // Validate the plan ID is valid
    const plan = getPlanById(subscription.plan);
    if (!plan) {
      return 'free';
    }

    return plan.id;
  }

  /**
   * Get entitlements summary for a user (plan, limits, usage)
   */
  async getEntitlementsSummary(userId: string): Promise<EntitlementsSummary> {
    const planId = await this.getUserPlan(userId);
    const plan = getPlanById(planId) || PLANS[0]; // Default to free

    const projectCount = await this.prisma.project.count({
      where: { userId },
    });

    return {
      plan: plan.id,
      limits: plan.limits,
      usage: {
        projects: projectCount,
      },
    };
  }

  /**
   * Check if user can create a new project (hard limit enforcement)
   * Throws ForbiddenException if limit reached
   */
  async ensureCanCreateProject(userId: string): Promise<void> {
    const summary = await this.getEntitlementsSummary(userId);

    // -1 means unlimited
    if (summary.limits.projects === -1) {
      return;
    }

    if (summary.usage.projects >= summary.limits.projects) {
      throw new ForbiddenException({
        message: `Project limit reached. Your ${summary.plan} plan allows ${summary.limits.projects} project(s). Please upgrade to create more projects.`,
        error: 'ENTITLEMENTS_LIMIT_REACHED',
        code: 'ENTITLEMENTS_LIMIT_REACHED',
        plan: summary.plan,
        allowed: summary.limits.projects,
        current: summary.usage.projects,
      });
    }
  }
}
