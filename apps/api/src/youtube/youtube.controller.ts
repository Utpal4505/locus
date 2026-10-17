import {
  Controller,
  Get,
  Logger,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { auth, fromNodeHeaders, type User } from "../auth/auth.js";
import { OAuthStateService } from "./oauth-state.service.js";
import { YoutubeOAuthService } from "./youtube-oauth.service.js";

@Controller("api/youtube")
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  constructor(
    private readonly youtubeOAuthService: YoutubeOAuthService,
    private readonly oauthStateService: OAuthStateService,
  ) {}

  /**
   * Initiates the Google OAuth flow for connecting YouTube.
   * Requires a valid Locus user session.
   * Returns `{ url }` by default or redirects directly if `?redirect=true` is requested.
   */
  @UseGuards(AuthGuard)
  @Get("connect")
  async connect(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Query("redirect") shouldRedirect?: string,
  ) {
    try {
      const authUrl = await this.youtubeOAuthService.generateAuthUrl(user.id);
      if (shouldRedirect === "true" || shouldRedirect === "1") {
        return res.redirect(authUrl);
      }
      return res.json({ url: authUrl });
    } catch (err) {
      this.logger.error(`Failed to generate YouTube authorization URL: ${(err as Error).message}`);
      return res.status(503).json({
        statusCode: 503,
        message: "YouTube integration is not configured on this server.",
      });
    }
  }

  /**
   * OAuth callback endpoint invoked by Google upon user authorization.
   * Validates state, consumes it for replay protection, checks user binding,
   * exchanges code for tokens, resolves channel identity, encrypts tokens,
   * persists integration, and redirects to frontend with safe query status.
   */
  @Get("callback")
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("error") error?: string,
  ) {
    const frontendUrl = this.youtubeOAuthService.getFrontendUrl();

    // 1. Handle user cancellation or provider denial
    if (error) {
      this.logger.warn(`Google OAuth callback received error: ${error}`);
      if (state) {
        this.oauthStateService.consumeState(state, "youtube_connect");
      }
      const sanitizedError = error === "access_denied" ? "access_denied" : "oauth_denied";
      return res.redirect(`${frontendUrl}/settings?youtube_error=${sanitizedError}`);
    }

    // 2. Validate presence of code and state
    if (!code || !state) {
      this.logger.warn("Google OAuth callback missing required code or state parameter.");
      return res.redirect(`${frontendUrl}/settings?youtube_error=invalid_request`);
    }

    // 3. Atomically consume and validate state (single-use replay protection)
    const stateRecord = this.oauthStateService.consumeState(state, "youtube_connect");
    if (!stateRecord) {
      this.logger.warn("Google OAuth callback rejected invalid, expired, or replayed state.");
      return res.redirect(`${frontendUrl}/settings?youtube_error=invalid_state`);
    }

    // 4. If an active session cookie is present, ensure it matches the user who initiated OAuth
    try {
      const sessionData = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      }).catch(() => null);

      if (sessionData?.user && sessionData.user.id !== stateRecord.userId) {
        this.logger.warn(
          `User mismatch on OAuth callback: state user ${stateRecord.userId} vs session user ${sessionData.user.id}`,
        );
        return res.redirect(`${frontendUrl}/settings?youtube_error=user_mismatch`);
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
        return res.redirect(`${frontendUrl}/settings?youtube_error=channel_not_found`);
      }

      // 7. Persist encrypted tokens and link channel
      await this.youtubeOAuthService.saveIntegration(
        stateRecord.userId,
        tokens,
        identity.channelId,
      );

      // 8. Safe redirect on success (no credentials or tokens in URL)
      return res.redirect(`${frontendUrl}/settings?youtube=connected`);
    } catch (err) {
      this.logger.error(
        `Failed to complete YouTube integration: ${(err as Error).message}`,
      );
      return res.redirect(`${frontendUrl}/settings?youtube_error=internal_error`);
    }
  }

  /**
   * Retrieves connection status for the authenticated user without exposing tokens.
   */
  @UseGuards(AuthGuard)
  @Get("status")
  async getStatus(@CurrentUser() user: User) {
    return this.youtubeOAuthService.getIntegrationStatus(user.id);
  }
}

