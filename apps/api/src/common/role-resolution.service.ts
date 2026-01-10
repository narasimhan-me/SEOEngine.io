import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CustomerAccountRole, ProjectMemberRole } from '@prisma/client';

/**
 * [ROLES-2 → ROLES-3] Role Resolution Service
 * [ROLES-3 FIXUP-2] Strict matrix enforcement
 *
 * Resolves the effective project role for a user.
 *
 * ROLES-3 FIXUP-2 resolution rules:
 * - Multi-user projects: ProjectMember role is authoritative; ignore User.accountRole
 * - Single-user projects: Preserve ROLES-2 emulation (User.accountRole can override)
 * - Legacy fallback: Project.userId ownership for backward compatibility
 *
 * This helper provides a centralized place to determine user capabilities
 * for role-based access control across the application.
 */

export type EffectiveProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface RoleCapabilities {
  /** Can view project data and previews */
  canView: boolean;
  /** Can generate drafts (OWNER/EDITOR only) */
  canGenerateDrafts: boolean;
  /** Can request approvals (EDITOR only, OWNER allowed for single-user backward compat) */
  canRequestApproval: boolean;
  /** Can approve/reject approval requests (OWNER only) */
  canApprove: boolean;
  /** Can execute apply actions (OWNER only in ROLES-3) */
  canApply: boolean;
  /** Can modify project settings (OWNER only) */
  canModifySettings: boolean;
  /** Can manage project members (OWNER only) */
  canManageMembers: boolean;
  /** Can export/view reports (all roles) */
  canExport: boolean;
}

@Injectable()
export class RoleResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the effective project role for a user.
   *
   * [ROLES-3 FIXUP-2] Resolution rules:
   * 1. Check ProjectMember table for explicit membership role
   * 2. For multi-user projects: ProjectMember role is authoritative (no accountRole override)
   * 3. For single-user projects: Allow User.accountRole emulation (ROLES-2 compat)
   * 4. Legacy fallback: Project.userId ownership check
   *
   * Returns null if user has no access to the project.
   */
  async resolveEffectiveRole(
    projectId: string,
    userId: string,
  ): Promise<EffectiveProjectRole | null> {
    // [ROLES-3] First, check ProjectMember table for explicit membership
    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
      select: { role: true },
    });

    if (membership) {
      // [ROLES-3 FIXUP-2] Check if this is a multi-user project
      const memberCount = await this.prisma.projectMember.count({
        where: { projectId },
      });

      // Multi-user projects: ProjectMember role is authoritative; no accountRole override
      if (memberCount > 1) {
        return membership.role as EffectiveProjectRole;
      }

      // Single-user project: Check for accountRole emulation (ROLES-2 compat)
      // Only allow emulation if user is OWNER in ProjectMember table
      if (membership.role === 'OWNER') {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { accountRole: true },
        });
        if (user?.accountRole) {
          return user.accountRole as EffectiveProjectRole;
        }
      }

      return membership.role as EffectiveProjectRole;
    }

    // [ROLES-2 Legacy fallback] Check if user is the project owner for backward compatibility
    // This handles projects created before ROLES-3 migration that may not have ProjectMember records
    const [project, user] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { accountRole: true },
      }),
    ]);

    // No project or user is not the legacy owner → no access
    if (!project || project.userId !== userId) {
      return null;
    }

    // Legacy single-user emulation: Use accountRole if set to simulate VIEWER/EDITOR
    // Default to OWNER for backwards compatibility
    if (user?.accountRole) {
      return user.accountRole as EffectiveProjectRole;
    }

    return 'OWNER';
  }

  /**
   * Check if user has any access to the project.
   * Returns true if user is a member or legacy owner.
   */
  async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const role = await this.resolveEffectiveRole(projectId, userId);
    return role !== null;
  }

  /**
   * Assert user has project access (view level).
   * Throws ForbiddenException if no access.
   */
  async assertProjectAccess(projectId: string, userId: string): Promise<void> {
    const hasAccess = await this.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  /**
   * Assert user has OWNER role for the project.
   * Used for apply, approve, manage members, modify settings.
   */
  async assertOwnerRole(projectId: string, userId: string): Promise<void> {
    const role = await this.resolveEffectiveRole(projectId, userId);
    if (role !== 'OWNER') {
      throw new ForbiddenException('Owner role is required for this action');
    }
  }

  /**
   * Assert user can request approval.
   * [ROLES-3 FIXUP-2] Strict matrix:
   * - Multi-user: EDITOR-only (OWNER must apply directly)
   * - Single-user: OWNER allowed (ROLES-2 backward compat)
   * - VIEWER: blocked always
   */
  async assertCanRequestApproval(projectId: string, userId: string): Promise<void> {
    const role = await this.resolveEffectiveRole(projectId, userId);
    if (!role || role === 'VIEWER') {
      throw new ForbiddenException('Editor or Owner role is required to request approval');
    }

    // [ROLES-3 FIXUP-2] In multi-user projects, only EDITOR can request
    const isMultiUser = await this.isMultiUserProject(projectId);
    if (isMultiUser && role === 'OWNER') {
      throw new ForbiddenException(
        'Owners cannot request approvals in multi-user projects. Apply directly instead.',
      );
    }
  }

  /**
   * Assert user can generate drafts (EDITOR or OWNER).
   * [ROLES-3] VIEWER role cannot generate drafts.
   */
  async assertCanGenerateDrafts(projectId: string, userId: string): Promise<void> {
    const role = await this.resolveEffectiveRole(projectId, userId);
    if (!role || role === 'VIEWER') {
      throw new ForbiddenException('Editor or Owner role is required to generate drafts');
    }
  }

  /**
   * Get capabilities for a given effective role.
   * This is a pure function - no database access needed.
   *
   * ROLES-3 capability matrix:
   * - View data: OWNER/EDITOR/VIEWER
   * - Generate drafts: OWNER/EDITOR only
   * - Apply changes: OWNER only
   * - Approve actions: OWNER only
   * - Request approval: EDITOR only (OWNER allowed for single-user backward compat)
   * - Export (view-only): OWNER/EDITOR/VIEWER
   * - Manage members: OWNER only
   */
  getCapabilities(role: EffectiveProjectRole | null): RoleCapabilities {
    if (!role) {
      return {
        canView: false,
        canGenerateDrafts: false,
        canRequestApproval: false,
        canApprove: false,
        canApply: false,
        canModifySettings: false,
        canManageMembers: false,
        canExport: false,
      };
    }

    switch (role) {
      case 'OWNER':
        return {
          canView: true,
          canGenerateDrafts: true,
          canRequestApproval: true, // OWNER can also request for single-user backward compat
          canApprove: true,
          canApply: true,
          canModifySettings: true,
          canManageMembers: true,
          canExport: true,
        };
      case 'EDITOR':
        return {
          canView: true,
          canGenerateDrafts: true,
          canRequestApproval: true,
          canApprove: false,
          canApply: false, // [ROLES-3] EDITOR cannot apply; must request approval
          canModifySettings: false,
          canManageMembers: false,
          canExport: true,
        };
      case 'VIEWER':
        return {
          canView: true,
          canGenerateDrafts: false,
          canRequestApproval: false,
          canApprove: false,
          canApply: false,
          canModifySettings: false,
          canManageMembers: false,
          canExport: true, // View-only export allowed
        };
    }
  }

  /**
   * Check if a user can perform apply actions on a project.
   * [ROLES-3] Only OWNER can apply.
   */
  async canApply(projectId: string, userId: string): Promise<boolean> {
    const role = await this.resolveEffectiveRole(projectId, userId);
    return this.getCapabilities(role).canApply;
  }

  /**
   * Check if a user can approve requests on a project.
   * Only OWNER can approve.
   */
  async canApprove(projectId: string, userId: string): Promise<boolean> {
    const role = await this.resolveEffectiveRole(projectId, userId);
    return this.getCapabilities(role).canApprove;
  }

  /**
   * Check if a user can generate drafts on a project.
   * OWNER and EDITOR can generate drafts.
   */
  async canGenerateDrafts(projectId: string, userId: string): Promise<boolean> {
    const role = await this.resolveEffectiveRole(projectId, userId);
    return this.getCapabilities(role).canGenerateDrafts;
  }

  /**
   * Check if a user can manage members on a project.
   * Only OWNER can manage members.
   */
  async canManageMembers(projectId: string, userId: string): Promise<boolean> {
    const role = await this.resolveEffectiveRole(projectId, userId);
    return this.getCapabilities(role).canManageMembers;
  }

  /**
   * Check if a project has multiple members (is a multi-user project).
   * Used to determine if auto-apply should be blocked.
   */
  async isMultiUserProject(projectId: string): Promise<boolean> {
    const memberCount = await this.prisma.projectMember.count({
      where: { projectId },
    });
    return memberCount > 1;
  }

  /**
   * Get role display label for UI.
   */
  getRoleDisplayLabel(role: EffectiveProjectRole): string {
    switch (role) {
      case 'OWNER':
        return 'Project Owner';
      case 'EDITOR':
        return 'Editor';
      case 'VIEWER':
        return 'Viewer';
    }
  }
}
