import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * [ADMIN-OPS-1] Internal admin role types.
 */
export type InternalAdminRole =
  | 'SUPPORT_AGENT'
  | 'OPS_ADMIN'
  | 'MANAGEMENT_CEO';

/**
 * [ADMIN-OPS-1] Admin capability levels for endpoint enforcement.
 * - read: SUPPORT_AGENT, OPS_ADMIN, MANAGEMENT_CEO (all can read)
 * - support_action: SUPPORT_AGENT, OPS_ADMIN (explicit + logged actions)
 * - ops_action: OPS_ADMIN only (ops-only actions like plan overrides, quota resets)
 * - ceo_read_only: MANAGEMENT_CEO is strictly read-only (no POST/PUT/PATCH/DELETE)
 */
export type AdminCapability = 'read' | 'support_action' | 'ops_action';

/**
 * Decorator to specify required admin capabilities for an endpoint.
 * Usage: @RequireAdminCapability('ops_action')
 */
export const ADMIN_CAPABILITY_KEY = 'admin_capability';
export const RequireAdminCapability = (capability: AdminCapability) =>
  SetMetadata(ADMIN_CAPABILITY_KEY, capability);

/**
 * Roles that can perform each capability level.
 */
const CAPABILITY_ROLES: Record<AdminCapability, readonly InternalAdminRole[]> =
  {
    read: ['SUPPORT_AGENT', 'OPS_ADMIN', 'MANAGEMENT_CEO'],
    support_action: ['SUPPORT_AGENT', 'OPS_ADMIN'],
    ops_action: ['OPS_ADMIN'],
  };

/**
 * [ADMIN-OPS-1] Guard that enforces internal admin capabilities by endpoint.
 *
 * Read endpoints: SUPPORT_AGENT, OPS_ADMIN, MANAGEMENT_CEO
 * Support actions (explicit + logged): SUPPORT_AGENT, OPS_ADMIN
 * Ops-only actions (explicit + logged): OPS_ADMIN
 * CEO is strictly read-only (no POST/PUT/PATCH/DELETE admin actions).
 */
@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User must exist and have an adminRole
    if (!user || !user.adminRole) {
      throw new ForbiddenException('Internal admin role required');
    }

    const adminRole = user.adminRole as InternalAdminRole;

    // Get the required capability from metadata, default to 'read'
    const requiredCapability =
      this.reflector.getAllAndOverride<AdminCapability>(ADMIN_CAPABILITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'read';

    // Check if user's role has the required capability
    const allowedRoles = CAPABILITY_ROLES[requiredCapability];
    if (!allowedRoles.includes(adminRole)) {
      throw new ForbiddenException(
        `Insufficient admin privileges. Required capability: ${requiredCapability}`
      );
    }

    // CEO is strictly read-only: block any non-safe HTTP methods
    if (adminRole === 'MANAGEMENT_CEO') {
      const method = request.method?.toUpperCase();
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
      if (!safeMethods.includes(method)) {
        throw new ForbiddenException(
          'MANAGEMENT_CEO role is read-only. Cannot perform write operations.'
        );
      }
    }

    return true;
  }
}
