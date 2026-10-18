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

    return this.feedService.getFeed(user.id, {
      limit,
      cursor: cursorQuery,
    });
  }
}
