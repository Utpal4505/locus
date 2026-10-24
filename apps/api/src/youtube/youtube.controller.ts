import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { auth, fromNodeHeaders, type User } from '../auth/auth.js';
import { OAuthStateService } from './oauth-state.service.js';
import {
  validateBulkFollowInput,
  YoutubeChannelService,
} from './youtube-channel.service.js';
import { YoutubeOAuthService } from './youtube-oauth.service.js';
import { YoutubeVideoService } from './youtube-video.service.js';
import { YoutubeSyncManagerService } from './youtube-sync-manager.service.js';

@Controller('api/youtube')
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  constructor(
    private readonly youtubeOAuthService: YoutubeOAuthService,
    private readonly oauthStateService: OAuthStateService,
    private readonly youtubeChannelService: YoutubeChannelService,
    private readonly youtubeVideoService: YoutubeVideoService,
    @Optional() private readonly youtubeSyncManager?: YoutubeSyncManagerService,
  ) {}

  /**
   * Initiates the Google OAuth flow for connecting YouTube.
   * Requires a valid Locus user session.
   * Returns `{ url }` by default or redirects directly if `?redirect=true` is requested.
   */
  @UseGuards(AuthGuard)
  @Get('connect')
  async connect(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Query('redirect') shouldRedirect?: string,
    @Query('returnPath') returnPath?: string,
  ) {
    try {
      const authUrl = await this.youtubeOAuthService.generateAuthUrl(
        user.id,
        returnPath || '/settings',
      );
      if (shouldRedirect === 'true' || shouldRedirect === '1') {
        return res.redirect(authUrl);
      }
      return res.json({ url: authUrl });
    } catch (err) {
      this.logger.error(
        `Failed to generate YouTube authorization URL: ${(err as Error).message}`,
      );
      return res.status(503).json({
        statusCode: 503,
        code: 'YOUTUBE_NOT_CONFIGURED',
        message: 'YouTube integration is not configured on this server.',
      });
    }
  }

  /**
   * OAuth callback endpoint invoked by Google upon user authorization.
   * Validates state, consumes it for replay protection, checks user binding,
   * exchanges code for tokens, resolves channel identity, encrypts tokens,
   * persists integration, and redirects to frontend with safe query status.
   */
  @Get('callback')
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    const frontendUrl = this.youtubeOAuthService.getFrontendUrl();
    let targetPath = '/settings';

    // 1. Handle user cancellation or provider denial
    if (error) {
      this.logger.warn(`Google OAuth callback received error: ${error}`);
      if (state) {
        const stateRecord = this.oauthStateService.consumeState(state, 'youtube_connect');
        if (stateRecord?.returnPath) {
          targetPath = stateRecord.returnPath;
        }
      }
      const sanitizedError =
        error === 'access_denied' ? 'access_denied' : 'oauth_denied';
      return res.redirect(
        `${frontendUrl}${targetPath}?youtube_error=${sanitizedError}`,
      );
    }

    // 2. Validate presence of code and state
    if (!code || !state) {
      this.logger.warn(
        'Google OAuth callback missing required code or state parameter.',
      );
      return res.redirect(
        `${frontendUrl}/settings?youtube_error=invalid_request`,
      );
    }

    // 3. Atomically consume and validate state (single-use replay protection)
    const stateRecord = this.oauthStateService.consumeState(
      state,
      'youtube_connect',
    );
    if (!stateRecord) {
      this.logger.warn(
        'Google OAuth callback rejected invalid, expired, or replayed state.',
      );
      return res.redirect(
        `${frontendUrl}/settings?youtube_error=invalid_state`,
      );
    }

    if (stateRecord.returnPath) {
      targetPath = stateRecord.returnPath;
    }

    // 4. If an active session cookie is present, ensure it matches the user who initiated OAuth
    try {
      const sessionData = await auth.api
        .getSession({
          headers: fromNodeHeaders(req.headers),
        })
        .catch(() => null);

      if (sessionData?.user && sessionData.user.id !== stateRecord.userId) {
        this.logger.warn(
          `User mismatch on OAuth callback: state user ${stateRecord.userId} vs session user ${sessionData.user.id}`,
        );
        return res.redirect(
          `${frontendUrl}${targetPath}?youtube_error=user_mismatch`,
        );
      }
    } catch {
      // In case session parsing errors, proceed with stateRecord.userId binding
    }

    try {
      // 5. Exchange code for tokens
      const tokens = await this.youtubeOAuthService.exchangeCodeForTokens(code);

      // 6. Resolve YouTube channel identity
      const identity = await this.youtubeOAuthService.resolveChannelIdentity(
        tokens.access_token,
      );

      if (!identity || !identity.channelId) {
        this.logger.warn(
          `Google account for user ${stateRecord.userId} has no active YouTube channel.`,
        );
        return res.redirect(
          `${frontendUrl}${targetPath}?youtube_error=channel_not_found`,
        );
      }

      // 7. Persist encrypted tokens and link channel
      await this.youtubeOAuthService.saveIntegration(
        stateRecord.userId,
        tokens,
        identity.channelId,
      );

      // 8. Safe redirect on success (no credentials or tokens in URL)
      return res.redirect(`${frontendUrl}${targetPath}?youtube=connected`);
    } catch (err) {
      this.logger.error(
        `Failed to complete YouTube integration: ${(err as Error).message}`,
      );
      return res.redirect(
        `${frontendUrl}${targetPath}?youtube_error=internal_error`,
      );
    }
  }

  /**
   * Retrieves connection status for the authenticated user without exposing tokens.
   */
  @UseGuards(AuthGuard)
  @Get('status')
  async getStatus(@CurrentUser() user: User) {
    return this.youtubeOAuthService.getIntegrationStatus(user.id);
  }

  /**
   * Imports the authenticated user's YouTube subscriptions into Locus.
   * Upserts channel metadata into shared `sources` and associates them with user's available imported channels.
   * Does NOT automatically follow any channel.
   */
  @UseGuards(AuthGuard)
  @Post('subscriptions/import')
  @HttpCode(HttpStatus.OK)
  async importSubscriptions(@CurrentUser() user: User) {
    return this.youtubeChannelService.importSubscriptions(user.id);
  }

  /**
   * Lists the authenticated user's imported/available channels with their follow status.
   */
  @UseGuards(AuthGuard)
  @Get('channels')
  async listChannels(@CurrentUser() user: User) {
    return this.youtubeChannelService.listChannels(user.id);
  }

  /**
   * Follows multiple imported channels in bulk for the authenticated user in a single request.
   * Idempotent: already-followed channels do not produce errors or duplicates.
   */
  @UseGuards(AuthGuard)
  @Post('channels/bulk-follow')
  @HttpCode(HttpStatus.OK)
  async bulkFollowChannels(
    @CurrentUser() user: User,
    @Body() body: unknown,
  ) {
    const validated = validateBulkFollowInput(body);

    return this.youtubeChannelService.bulkFollowChannels(
      user.id,
      validated.channelIds,
    );
  }

  /**
   * Follows an imported channel for the authenticated user.
   * Accepts either Locus source UUID or YouTube channel ID.
   */
  @UseGuards(AuthGuard)
  @Post('channels/:id/follow')
  @HttpCode(HttpStatus.OK)
  async followChannel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.youtubeChannelService.followChannel(user.id, id);
  }

  /**
   * Unfollows a channel for the authenticated user (POST alias).
   * Accepts either Locus source UUID or YouTube channel ID.
   */
  @UseGuards(AuthGuard)
  @Post('channels/:id/unfollow')
  @HttpCode(HttpStatus.OK)
  async unfollowChannelPost(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.youtubeChannelService.unfollowChannel(user.id, id);
  }

  /**
   * Unfollows a channel for the authenticated user (DELETE standard REST).
   * Accepts either Locus source UUID or YouTube channel ID.
   */
  @UseGuards(AuthGuard)
  @Delete('channels/:id/follow')
  @HttpCode(HttpStatus.OK)
  async unfollowChannelDelete(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.youtubeChannelService.unfollowChannel(user.id, id);
  }

  /**
   * Retrieves the current video synchronization status for the authenticated user:
   * whether sync is currently running, timestamp of last successful sync, failure summaries,
   * and items processed.
   */
  @UseGuards(AuthGuard)
  @Get('sync/status')
  async getSyncStatus(@CurrentUser() user: User) {
    if (this.youtubeSyncManager) {
      return this.youtubeSyncManager.getSyncStatus(user.id);
    }
    return {
      isSyncing: false,
      lastSyncedAt: null,
      lastStatus: 'idle',
    };
  }

  /**
   * Synchronizes recent videos from all followed channels for the authenticated user.
   * Resolves uploads playlists, enriches video metadata, sorts by publication date,
   * and upserts into the shared `videos` table.
   *
   * Features:
   * - 2-hour cooldown protection for on_open triggers (no unnecessary YouTube calls).
   * - Deduplication: prevents duplicate and overlapping concurrent sync executions.
   * - Exponential backoff retry on temporary network and 5xx failures.
   * - Full audit logging in sync_runs table.
   */
  @UseGuards(AuthGuard)
  @Post('videos/sync')
  @HttpCode(HttpStatus.OK)
  async syncVideos(
    @CurrentUser() user: User,
    @Query('maxResultsPerChannel') maxResultsPerChannelQuery?: string,
    @Body('maxResultsPerChannel') maxResultsPerChannelBody?: number,
    @Query('trigger') triggerQuery?: 'manual' | 'scheduled' | 'on_open',
    @Query('force') forceQuery?: string,
    @Body('trigger') triggerBody?: 'manual' | 'scheduled' | 'on_open',
    @Body('force') forceBody?: boolean,
  ) {
    const rawLimit =
      maxResultsPerChannelBody ??
      (maxResultsPerChannelQuery
        ? parseInt(maxResultsPerChannelQuery, 10)
        : undefined);

    const trigger = triggerBody ?? triggerQuery ?? 'manual';
    const force =
      forceBody ??
      (forceQuery === 'true' || forceQuery === '1' ? true : false);

    if (this.youtubeSyncManager) {
      return this.youtubeSyncManager.syncUser(user.id, {
        maxResultsPerChannel:
          rawLimit && !isNaN(rawLimit) ? rawLimit : undefined,
        trigger,
        force,
      });
    }

    return this.youtubeVideoService.syncFollowedChannelVideos(user.id, {
      maxResultsPerChannel: rawLimit && !isNaN(rawLimit) ? rawLimit : undefined,
    });
  }
}
