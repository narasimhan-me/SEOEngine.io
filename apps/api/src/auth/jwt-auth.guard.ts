import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, run the standard JWT validation
    const result = await super.canActivate(context);
    if (!result) {
      return false;
    }

    // [ADMIN-OPS-1] Hard Read-Only Enforcement for Impersonation
    // If req.user.impersonation?.mode === 'readOnly', block any non-safe HTTP methods
    // across the entire API. This guarantees "read-only impersonation" for all controllers.
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.impersonation?.mode === 'readOnly') {
      const method = request.method?.toUpperCase();
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

      if (!safeMethods.includes(method)) {
        throw new ForbiddenException(
          'Read-only impersonation mode: Only GET, HEAD, and OPTIONS requests are allowed.',
        );
      }
    }

    return true;
  }
}
