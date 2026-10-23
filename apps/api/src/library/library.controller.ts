import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../auth/auth.js';
import {
  LibraryService,
  validateLibraryTab,
} from './library.service.js';

@Controller('api/library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  /**
   * Retrieves videos in the user's library filtered by tab (queue | favorites | history).
   */
  @UseGuards(AuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getLibrary(
    @CurrentUser() user: User,
    @Query('tab') rawTab?: string,
    @Query('limit') limitQuery?: string,
    @Query('status') rawStatus?: string,
  ) {
    const tab = validateLibraryTab(rawTab ?? 'queue');
    const limit = limitQuery ? Number(limitQuery) : undefined;
    const status =
      rawStatus === 'in_progress' || rawStatus === 'completed'
        ? rawStatus
        : 'all';
    return this.libraryService.getLibraryItems(user.id, tab, { limit, status });
  }

  /**
   * Retrieves private notes for the user with video and channel metadata.
   * Supports search, creator filtering, and pagination.
   */
  @UseGuards(AuthGuard)
  @Get('notes')
  @HttpCode(HttpStatus.OK)
  async getNotes(
    @CurrentUser() user: User,
    @Query('search') search?: string,
    @Query('channelId') channelId?: string,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
  ) {
    const limit = limitQuery ? Number(limitQuery) : undefined;
    const page = pageQuery ? Number(pageQuery) : undefined;
    return this.libraryService.getLibraryNotes(user.id, {
      search,
      channelId,
      limit,
      page,
    });
  }

  /**
   * Updates library state for a specific video (e.g. mark watched, toggle queue/favorite).
   */
  @UseGuards(AuthGuard)
  @Patch('videos/:videoId')
  @HttpCode(HttpStatus.OK)
  async updateVideoState(
    @CurrentUser() user: User,
    @Param('videoId') videoId: string,
    @Body() body: unknown,
  ) {
    return this.libraryService.updateVideoState(user.id, videoId, body);
  }

  /**
   * Removes all items from the user's Watch Later / Queue.
   */
  @UseGuards(AuthGuard)
  @Delete('queue')
  @HttpCode(HttpStatus.OK)
  async clearQueue(@CurrentUser() user: User) {
    return this.libraryService.clearQueue(user.id);
  }

  /**
   * Clears the user's watch history.
   */
  @UseGuards(AuthGuard)
  @Delete('history')
  @HttpCode(HttpStatus.OK)
  async clearHistory(@CurrentUser() user: User) {
    return this.libraryService.clearHistory(user.id);
  }
}

