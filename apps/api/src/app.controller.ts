import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service.js';
import { AuthGuard } from './auth/auth.guard.js';
import { CurrentUser } from './auth/current-user.decorator.js';
import type { User } from './auth/auth.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
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

