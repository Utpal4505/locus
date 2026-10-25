import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppService } from './app.service.js';
import { AuthGuard } from './auth/auth.guard.js';
import { CurrentUser } from './auth/current-user.decorator.js';
import type { User } from './auth/auth.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ): string | void {
    const error = req?.query?.error as string | undefined;
    if (error && res) {
      const frontendUrl =
        process.env.FRONTEND_URL?.split(',')[0]?.trim().replace(/\/+$/, '') ||
        'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(error)}`,
      );
    }
    return this.appService.getHello();
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return {
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
      },
    };
  }
}
