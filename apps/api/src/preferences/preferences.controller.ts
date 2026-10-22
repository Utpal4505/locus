import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../auth/auth.js';
import { PreferencesService } from './preferences.service.js';

@Controller('api/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  /**
   * Retrieves the current user's preferences.
   */
  @UseGuards(AuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getPreferences(@CurrentUser() user: User) {
    return this.preferencesService.getPreferences(user.id);
  }

  /**
   * Updates one or more preferences for the current user.
   */
  @UseGuards(AuthGuard)
  @Patch()
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() body: unknown,
  ) {
    return this.preferencesService.updatePreferences(user.id, body);
  }
}

