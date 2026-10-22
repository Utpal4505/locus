import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { auth, fromNodeHeaders } from './auth.js';
import type { AuthenticatedRequest } from './auth.guard.js';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      const sessionData = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (sessionData && sessionData.user) {
        (request as AuthenticatedRequest).user = sessionData.user;
        (request as AuthenticatedRequest).session = sessionData.session;
      }
    } catch {
      // Allow unauthenticated guest requests to proceed
    }

    return true;
  }
}

