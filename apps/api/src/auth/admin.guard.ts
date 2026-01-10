import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * [ADMIN-OPS-1] Internal admin roles that grant access to admin endpoints.
 * These are internal-only, not customer-facing.
 */
const INTERNAL_ADMIN_ROLES = ['SUPPORT_AGENT', 'OPS_ADMIN', 'MANAGEMENT_CEO'] as const;

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // [ADMIN-OPS-1] Tightened from "role === ADMIN" to:
    // role === ADMIN AND adminRole is one of the internal roles.
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    // Return 403 for: role === ADMIN but adminRole missing
    // (prevents ambiguous "admin but not internal" states)
    if (!user.adminRole || !INTERNAL_ADMIN_ROLES.includes(user.adminRole)) {
      throw new ForbiddenException('Internal admin role required');
    }

    return true;
  }
}
