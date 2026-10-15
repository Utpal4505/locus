import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "./auth.guard.js";
import type { Session, User } from "./auth.js";

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);

export const CurrentSession = createParamDecorator(
  (data: keyof Session | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = request.session;
    return data && session ? session[data] : session;
  },
);

