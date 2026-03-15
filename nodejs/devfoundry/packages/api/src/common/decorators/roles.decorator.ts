import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/roles.guard.js';

/** Restricts an endpoint to users with the specified roles. */
export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
