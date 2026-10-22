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
  ) {
    const tab = validateLibraryTab(rawTab ?? 'queue');
    const limit = limitQuery ? Number(limitQuery) : undefined;
    return this.libraryService.getLibraryItems(user.id, tab, { limit });
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

