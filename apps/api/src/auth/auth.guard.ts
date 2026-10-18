import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { auth, fromNodeHeaders, type Session, type User } from './auth.js';

export interface AuthenticatedRequest extends Request {
  user: User;
  session: Session;
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!sessionData || !sessionData.user) {
      throw new UnauthorizedException(
        'Authentication required to access this resource',
      );
    }

    (request as AuthenticatedRequest).user = sessionData.user;
    (request as AuthenticatedRequest).session = sessionData.session;

    return true;
  }
}
