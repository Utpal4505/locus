import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { OptionalAuthGuard } from '../auth/optional-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../auth/auth.js';
import { VideoService } from './video.service.js';

@Controller('api/videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  /**
   * Retrieves full details for a single video.
   * Accessible to authenticated users and unauthenticated guests.
   * Identifier can be either internal UUID or YouTube video ID.
   */
  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getVideo(
    @Param('id') id: string,
    @CurrentUser() user?: User,
  ) {
    return this.videoService.getVideoById(id, user?.id);
  }

  /**
   * Retrieves private notes for the specified video for the authenticated user.
   */
  @UseGuards(AuthGuard)
  @Get(':id/notes')
  @HttpCode(HttpStatus.OK)
  async getNotes(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.videoService.getVideoNotes(id, user.id);
  }

  /**
   * Saves or updates private notes for the specified video for the authenticated user.
   */
  @UseGuards(AuthGuard)
  @Put(':id/notes')
  @HttpCode(HttpStatus.OK)
  async updateNotes(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: unknown,
  ) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request body must be an object.',
      });
    }

    const { content } = body as Record<string, unknown>;
    if (content !== undefined && typeof content !== 'string') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'content must be a string.',
      });
    }

    return this.videoService.upsertVideoNotes(id, user.id, (content as string) ?? '');
  }
}
