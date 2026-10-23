import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../auth/auth.js';
import { SearchService } from './search.service.js';

@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Consolidated omni-search endpoint across videos, user's private notes, and channels.
   * Accessible to authenticated and unauthenticated users; user notes are automatically
   * included if an active session is provided.
   */
  @UseGuards(OptionalAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query?: string,
    @Query('limit') limitQuery?: string,
    @CurrentUser() user?: User,
  ) {
    const rawLimit = limitQuery ? parseInt(limitQuery, 10) : 5;
    const limit = isNaN(rawLimit) ? 5 : rawLimit;

    return this.searchService.search(query, user?.id, limit);
  }
}

