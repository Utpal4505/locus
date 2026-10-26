import { All, Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth, getAvailableAuthProviders } from './auth.js';

@Controller('api/auth')
export class AuthController {
  private readonly handler = toNodeHandler(auth);

  private logRequestAndResponse(req: Request, res: Response): void {
    const path = req.originalUrl || req.url;
    const origin = req.headers.origin;
    const cookies = req.headers.cookie;

    console.log(`[AUTH DEBUG] ${req.method} ${path}`, {
      origin,
      hasCookies: Boolean(cookies),
      cookieNames: cookies
        ? cookies.split(';').map((c) => c.trim().split('=')[0])
        : [],
      hasSessionCookie: cookies?.includes('better-auth.session_token') ?? false,
    });

    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = ((
      name: string,
      value: number | string | readonly string[],
    ) => {
      if (name.toLowerCase() === 'set-cookie') {
        const cookieValues = Array.isArray(value) ? value : [value];
        for (const cv of cookieValues) {
          const cookieStr = String(cv);
          const cookieName = cookieStr.split('=')[0];
          const attrs = cookieStr.includes(';')
            ? cookieStr.substring(cookieStr.indexOf(';'))
            : '';
          console.log(`[AUTH DEBUG] Set-Cookie: ${cookieName}`, {
            attrs: attrs.substring(0, 200),
          });
        }
      }
      return originalSetHeader(name, value);
    }) as typeof res.setHeader;
  }

  @Get('providers')
  getProviders() {
    return getAvailableAuthProviders();
  }

  @All('*splat')
  async handleAll(@Req() req: Request, @Res() res: Response) {
    this.logRequestAndResponse(req, res);
    return this.handler(req, res);
  }

  @All()
  async handleRoot(@Req() req: Request, @Res() res: Response) {
    this.logRequestAndResponse(req, res);
    return this.handler(req, res);
  }
}
