import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { OptionalAuthGuard } from '../auth/optional-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '../auth/auth.js';
import { FeedbackService } from './feedback.service.js';

@Controller('api')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Submits a bug report or feature request with client telemetry context.
   * Accessible by both authenticated users and guests.
   */
  @UseGuards(OptionalAuthGuard)
  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  async createFeedback(
    @Body() body: unknown,
    @CurrentUser() user?: User,
    @Req() req?: Request,
  ) {
    const rawIp = req?.headers['x-forwarded-for'] || req?.socket.remoteAddress || req?.ip;
    const ip = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0]?.trim() : undefined);
    const userAgent = req?.headers['user-agent'];

    return this.feedbackService.createFeedback(body, user, { ip, userAgent });
  }

  /**
   * Retrieves paginated feedback tickets with search and status filtering.
   * Strictly restricted to administrators via AdminGuard.
   */
  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/feedback')
  @HttpCode(HttpStatus.OK)
  async getAdminFeedback(@Query() query: unknown) {
    return this.feedbackService.getAdminFeedback(query);
  }

  /**
   * Retrieves KPI counter statistics across all feedback tickets.
   * Strictly restricted to administrators via AdminGuard.
   */
  @UseGuards(AuthGuard, AdminGuard)
  @Get('admin/feedback/stats')
  @HttpCode(HttpStatus.OK)
  async getFeedbackStats() {
    return this.feedbackService.getFeedbackStats();
  }

  /**
   * Updates ticket triage status, priority, or private notes.
   * Strictly restricted to administrators via AdminGuard.
   */
  @UseGuards(AuthGuard, AdminGuard)
  @Patch('admin/feedback/:id')
  @HttpCode(HttpStatus.OK)
  async updateFeedback(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.feedbackService.updateFeedback(id, body);
  }

  /**
   * Permanently deletes a feedback ticket.
   * Strictly restricted to administrators via AdminGuard.
   */
  @UseGuards(AuthGuard, AdminGuard)
  @Delete('admin/feedback/:id')
  @HttpCode(HttpStatus.OK)
  async deleteFeedback(@Param('id') id: string) {
    return this.feedbackService.deleteFeedback(id);
  }
}

