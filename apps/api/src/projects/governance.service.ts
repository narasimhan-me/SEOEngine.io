import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShareLinkAudience } from '@prisma/client';

/**
 * [ENTERPRISE-GEO-1] Governance Policy Service
 *
 * Manages project-scoped governance policies including:
 * - Approval requirements for apply actions
 * - Share link restrictions (passcode, expiry)
 * - Export content controls (competitor mentions, PII scrubbing)
 */

export interface GovernancePolicyResponse {
  projectId: string;
  requireApprovalForApply: boolean;
  restrictShareLinks: boolean;
  shareLinkExpiryDays: number;
  allowedExportAudience: 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY';
  allowCompetitorMentionsInExports: boolean;
  allowPIIInExports: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateGovernancePolicyDto {
  requireApprovalForApply?: boolean;
  restrictShareLinks?: boolean;
  shareLinkExpiryDays?: number;
  allowedExportAudience?: 'ANYONE_WITH_LINK' | 'PASSCODE' | 'ORG_ONLY';
  allowCompetitorMentionsInExports?: boolean;
  // Note: allowPIIInExports is intentionally NOT updatable - always false
}

// Default policy values for projects without explicit policy
const DEFAULT_POLICY: Omit<GovernancePolicyResponse, 'projectId' | 'createdAt' | 'updatedAt'> = {
  requireApprovalForApply: false,
  restrictShareLinks: false,
  shareLinkExpiryDays: 14,
  allowedExportAudience: 'ANYONE_WITH_LINK',
  allowCompetitorMentionsInExports: false,
  allowPIIInExports: false, // Always false, never updatable
};

@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get governance policy for a project
   * Returns default values if no policy exists
   */
  async getPolicy(projectId: string, userId: string): Promise<GovernancePolicyResponse> {
    await this.verifyProjectAccess(projectId, userId);

    const policy = await this.prisma.projectGovernancePolicy.findUnique({
      where: { projectId },
    });

    if (!policy) {
      // Return defaults with current timestamps
      const now = new Date().toISOString();
      return {
        projectId,
        ...DEFAULT_POLICY,
        createdAt: now,
        updatedAt: now,
      };
    }

    return this.formatPolicyResponse(policy);
  }

  /**
   * Update governance policy for a project
   * Creates policy if it doesn't exist
   */
  async updatePolicy(
    projectId: string,
    userId: string,
    updates: UpdateGovernancePolicyDto,
  ): Promise<GovernancePolicyResponse> {
    await this.verifyProjectAccess(projectId, userId);

    // Get current policy for audit diff
    const currentPolicy = await this.prisma.projectGovernancePolicy.findUnique({
      where: { projectId },
    });

    // Validate shareLinkExpiryDays (max 14, min 1)
    if (updates.shareLinkExpiryDays !== undefined) {
      updates.shareLinkExpiryDays = Math.max(1, Math.min(14, updates.shareLinkExpiryDays));
    }

    // If restrictShareLinks is being enabled, cap expiry to 7 days
    if (updates.restrictShareLinks === true) {
      if (updates.shareLinkExpiryDays === undefined || updates.shareLinkExpiryDays > 7) {
        updates.shareLinkExpiryDays = 7;
      }
    }

    // Convert audience string to enum if provided
    const audienceEnum = updates.allowedExportAudience
      ? (updates.allowedExportAudience as ShareLinkAudience)
      : undefined;

    const policy = await this.prisma.projectGovernancePolicy.upsert({
      where: { projectId },
      create: {
        projectId,
        requireApprovalForApply: updates.requireApprovalForApply ?? DEFAULT_POLICY.requireApprovalForApply,
        restrictShareLinks: updates.restrictShareLinks ?? DEFAULT_POLICY.restrictShareLinks,
        shareLinkExpiryDays: updates.shareLinkExpiryDays ?? DEFAULT_POLICY.shareLinkExpiryDays,
        allowedExportAudience: audienceEnum ?? (DEFAULT_POLICY.allowedExportAudience as ShareLinkAudience),
        allowCompetitorMentionsInExports: updates.allowCompetitorMentionsInExports ?? DEFAULT_POLICY.allowCompetitorMentionsInExports,
        allowPIIInExports: false, // Always false, never updatable
      },
      update: {
        ...(updates.requireApprovalForApply !== undefined && { requireApprovalForApply: updates.requireApprovalForApply }),
        ...(updates.restrictShareLinks !== undefined && { restrictShareLinks: updates.restrictShareLinks }),
        ...(updates.shareLinkExpiryDays !== undefined && { shareLinkExpiryDays: updates.shareLinkExpiryDays }),
        ...(audienceEnum !== undefined && { allowedExportAudience: audienceEnum }),
        ...(updates.allowCompetitorMentionsInExports !== undefined && { allowCompetitorMentionsInExports: updates.allowCompetitorMentionsInExports }),
        // allowPIIInExports intentionally omitted - never updatable
      },
    });

    return this.formatPolicyResponse(policy);
  }

  /**
   * Check if approval is required for apply actions
   * Used by gating hooks in geo.controller and automation.service
   */
  async isApprovalRequired(projectId: string): Promise<boolean> {
    const policy = await this.prisma.projectGovernancePolicy.findUnique({
      where: { projectId },
      select: { requireApprovalForApply: true },
    });

    return policy?.requireApprovalForApply ?? false;
  }

  /**
   * Get effective share link settings for a project
   * Enforces restrictShareLinks constraints
   */
  async getShareLinkSettings(projectId: string): Promise<{
    audience: ShareLinkAudience;
    expiryDays: number;
    restricted: boolean;
  }> {
    const policy = await this.prisma.projectGovernancePolicy.findUnique({
      where: { projectId },
      select: {
        restrictShareLinks: true,
        shareLinkExpiryDays: true,
        allowedExportAudience: true,
      },
    });

    if (!policy) {
      return {
        audience: 'ANYONE_WITH_LINK',
        expiryDays: 14,
        restricted: false,
      };
    }

    // If restricted, force passcode and cap expiry
    if (policy.restrictShareLinks) {
      return {
        audience: 'PASSCODE',
        expiryDays: Math.min(7, policy.shareLinkExpiryDays),
        restricted: true,
      };
    }

    return {
      audience: policy.allowedExportAudience,
      expiryDays: policy.shareLinkExpiryDays,
      restricted: false,
    };
  }

  /**
   * Get export content control settings
   * Used for server-side redaction
   */
  async getExportControlSettings(projectId: string): Promise<{
    allowCompetitorMentions: boolean;
    allowPII: boolean;
  }> {
    const policy = await this.prisma.projectGovernancePolicy.findUnique({
      where: { projectId },
      select: {
        allowCompetitorMentionsInExports: true,
        allowPIIInExports: true,
      },
    });

    return {
      allowCompetitorMentions: policy?.allowCompetitorMentionsInExports ?? false,
      allowPII: policy?.allowPIIInExports ?? false, // Always false in v1
    };
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

  private formatPolicyResponse(policy: any): GovernancePolicyResponse {
    return {
      projectId: policy.projectId,
      requireApprovalForApply: policy.requireApprovalForApply,
      restrictShareLinks: policy.restrictShareLinks,
      shareLinkExpiryDays: policy.shareLinkExpiryDays,
      allowedExportAudience: policy.allowedExportAudience,
      allowCompetitorMentionsInExports: policy.allowCompetitorMentionsInExports,
      allowPIIInExports: policy.allowPIIInExports,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }
}
