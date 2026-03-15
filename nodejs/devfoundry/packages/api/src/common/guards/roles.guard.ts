import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../modules/auth/entities/user.entity.js';

export const ROLES_KEY = 'roles';

/**
 * Guard that checks if the authenticated user has the required role.
 * Use with the @Roles() decorator.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Returns `true` if the route has no `@Roles()` metadata, or if the
   * authenticated user's role is included in the required roles list.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;

    if (!user) return false;
    return requiredRoles.includes(user.role);
  }
}
