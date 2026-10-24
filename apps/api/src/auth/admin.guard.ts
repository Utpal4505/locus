import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { auth, fromNodeHeaders, type User } from './auth.js';
import type { AuthenticatedRequest } from './auth.guard.js';

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    let user: User | undefined = (request as AuthenticatedRequest).user;

    if (!user) {
      try {
        const sessionData = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (sessionData && sessionData.user) {
          user = sessionData.user;
          (request as AuthenticatedRequest).user = sessionData.user;
          (request as AuthenticatedRequest).session = sessionData.session;
        }
      } catch {
        // Session resolution failure
      }
    }

    if (!user || !user.email) {
      // 404 disguises the route from unauthenticated/unauthorized users
      throw new NotFoundException('Resource not found');
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isAuthorized = adminEmails.includes(user.email.toLowerCase());

    if (!isAuthorized) {
      // Return 404 instead of 403 so non-admin users don't even know admin endpoints exist
      throw new NotFoundException('Resource not found');
    }

    return true;
  }
}

