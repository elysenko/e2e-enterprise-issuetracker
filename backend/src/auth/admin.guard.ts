import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthedRequest } from './jwt-auth.guard';

/**
 * Requires the caller to be an ADMIN. Must run after JwtAuthGuard so
 * `req.user` is populated.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin privileges required');
    }
    return true;
  }
}
