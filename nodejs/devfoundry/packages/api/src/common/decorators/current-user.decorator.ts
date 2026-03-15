import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../modules/auth/entities/user.entity.js';

/** Extracts the authenticated user from the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<{ user: User }>();
    return request.user;
  },
);
