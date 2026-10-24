import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../auth/auth.js';
import { FeedService } from './feed.service.js';

@Controller('api/feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * Retrieves the main chronological feed for the authenticated user.
   * Only includes videos from channels followed by the user, ordered newest first.
   */
  @UseGuards(AuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getFeed(
    @CurrentUser() user: User,
    @Query('limit') limitQuery?: string,
    @Query('cursor') cursorQuery?: string,
    @Query('status') statusQuery?: string,
    @Query('feedMode') feedModeQuery?: string,
    @Query('topics') topicsQuery?: string,
  ) {
    let limit = 20;

    if (limitQuery !== undefined) {
      const parsedLimit = Number(limitQuery);
      if (
        isNaN(parsedLimit) ||
        !Number.isInteger(parsedLimit) ||
        parsedLimit < 1 ||
        parsedLimit > 50
      ) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Limit must be an integer between 1 and 50.',
        });
      }
      limit = parsedLimit;
    }

    let status: 'unwatched' | 'watched' | 'all' | undefined = undefined;
    if (statusQuery !== undefined && statusQuery.trim()) {
      const trimmed = statusQuery.trim().toLowerCase();
      if (
        trimmed !== 'unwatched' &&
        trimmed !== 'watched' &&
        trimmed !== 'all'
      ) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Status must be one of: unwatched, watched, all.',
        });
      }
      status = trimmed as 'unwatched' | 'watched' | 'all';
    }

    let feedMode: 'normal' | 'tagged_only' | undefined = undefined;
    if (feedModeQuery !== undefined && feedModeQuery.trim()) {
      const trimmedMode = feedModeQuery.trim().toLowerCase();
      if (trimmedMode !== 'normal' && trimmedMode !== 'tagged_only') {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'feedMode must be one of: normal, tagged_only.',
        });
      }
      feedMode = trimmedMode as 'normal' | 'tagged_only';
    }

    let topicsList: string[] | undefined = undefined;
    if (topicsQuery !== undefined && topicsQuery.trim()) {
      topicsList = topicsQuery
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    }

    return this.feedService.getFeed(user.id, {
      limit,
      cursor: cursorQuery,
      status,
      feedMode,
      topics: topicsList,
    });
  }
}
