import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthedRequest, AuthUser } from './jwt-auth.guard';

/** Injects the authenticated user (set by JwtAuthGuard) into a handler param. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.user;
  },
);
