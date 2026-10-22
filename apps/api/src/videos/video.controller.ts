import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
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
}
