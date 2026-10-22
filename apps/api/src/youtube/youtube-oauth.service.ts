import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  BadGatewayException,
} from '@nestjs/common';
import { and, db, eq, integrations, type Integration } from '@locus/database';
import { encryptToken, decryptToken } from '../crypto/index.js';
import { OAuthStateService } from './oauth-state.service.js';
import {
  resolveYoutubeOAuthConfig,
  type YoutubeOAuthConfig,
} from './youtube.config.js';

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface YouTubeChannelIdentity {
  channelId: string;
  title?: string;
}

export interface IntegrationStatusResponse {
  connected: boolean;
  status?: string | null;
  externalAccountId?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string | null;
}

@Injectable()
export class YoutubeOAuthService {
  private readonly logger = new Logger(YoutubeOAuthService.name);

  constructor(private readonly oauthStateService: OAuthStateService) {}

  /**
   * Resolves YouTube OAuth configuration or throws if missing.
   */
  getConfig(): YoutubeOAuthConfig {
    const config = resolveYoutubeOAuthConfig();
    if (!config) {
      throw new Error(
        'YouTube OAuth is not configured on this server. Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in the environment.',
      );
    }
    return config;
  }

  /**
   * Returns frontend URL for client redirects.
   */
  getFrontendUrl(): string {
    const config = resolveYoutubeOAuthConfig();
    return (
      config?.frontendUrl ?? process.env.FRONTEND_URL ?? 'http://localhost:3000'
    );
  }

  /**
   * Generates Google authorization URL requesting youtube.readonly scope
   * with offline access and prompt=consent to ensure refresh tokens are issued.
   */
  async generateAuthUrl(userId: string): Promise<string> {
    const config = this.getConfig();
    const state = this.oauthStateService.generateState(
      userId,
      'youtube_connect',
    );

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set(
      'scope',
      'https://www.googleapis.com/auth/youtube.readonly',
    );
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    url.searchParams.set('include_granted_scopes', 'true');

    return url.toString();
  }

  /**
   * Exchanges authorization code for Google access and refresh tokens.
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const config = this.getConfig();

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      this.logger.error(
        `Google token exchange failed with HTTP status ${response.status}`,
      );
      throw new Error('Failed to exchange authorization code with Google.');
    }

    const data = (await response.json()) as GoogleTokenResponse;
    if (!data.access_token) {
      throw new Error(
        'Google token exchange response did not contain an access token.',
      );
    }

    return data;
  }

  /**
   * Resolves the authenticated user's YouTube channel identity using the YouTube Data API.
   * Returns null if the user does not have an active YouTube channel.
   */
  async resolveChannelIdentity(
    accessToken: string,
  ): Promise<YouTubeChannelIdentity | null> {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      this.logger.error(
        `Failed to resolve YouTube channel identity: HTTP ${response.status}`,
      );
      throw new Error('Failed to query YouTube channels API.');
    }

    const data = (await response.json()) as {
      items?: Array<{ id: string; snippet?: { title?: string } }>;
    };

    if (!data.items || data.items.length === 0 || !data.items[0]?.id) {
      return null;
    }

    const channel = data.items[0];
    return {
      channelId: channel.id,
      title: channel.snippet?.title,
    };
  }

  /**
   * Encrypts tokens and persists the integration record in the database.
   * Reconnection preserves an existing refresh token if Google does not return a new one.
   */
  async saveIntegration(
    userId: string,
    tokens: GoogleTokenResponse,
    externalAccountId: string,
  ): Promise<Integration> {
    const encryptedAccessToken = encryptToken(tokens.access_token);

    let encryptedRefreshToken: string | null = null;
    if (tokens.refresh_token) {
      encryptedRefreshToken = encryptToken(tokens.refresh_token);
    } else {
      // Reconnection: Check for an existing refresh token and preserve it
      const existing = await db
        .select({ encryptedRefreshToken: integrations.encryptedRefreshToken })
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.provider, 'youtube'),
          ),
        )
        .limit(1);

      if (existing.length > 0 && existing[0]?.encryptedRefreshToken) {
        encryptedRefreshToken = existing[0].encryptedRefreshToken;
      }
    }

    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    const scopes =
      tokens.scope || 'https://www.googleapis.com/auth/youtube.readonly';

    const [saved] = await db
      .insert(integrations)
      .values({
        userId,
        provider: 'youtube',
        externalAccountId,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scopes,
        status: 'connected',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [integrations.userId, integrations.provider],
        set: {
          externalAccountId,
          encryptedAccessToken,
          ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
          tokenExpiresAt,
          scopes,
          status: 'connected',
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!saved) {
      throw new Error('Failed to persist YouTube integration record.');
    }

    this.logger.log(
      `Successfully connected YouTube integration for user ${userId}`,
    );
    return saved;
  }

  /**
   * Retrieves connection status for the authenticated user without exposing sensitive tokens.
   */
  async getIntegrationStatus(
    userId: string,
  ): Promise<IntegrationStatusResponse> {
    const rows = await db
      .select({
        status: integrations.status,
        externalAccountId: integrations.externalAccountId,
        tokenExpiresAt: integrations.tokenExpiresAt,
        scopes: integrations.scopes,
      })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'youtube'),
        ),
      )
      .limit(1);

    if (rows.length === 0 || !rows[0]) {
      return { connected: false };
    }

    const item = rows[0];
    return {
      connected: item.status === 'connected',
      status: item.status,
      externalAccountId: item.externalAccountId,
      tokenExpiresAt: item.tokenExpiresAt,
      scopes: item.scopes,
    };
  }

  /**
   * Refreshes an expired Google access token using the stored encrypted refresh token.
   * Updates the integration record with the new access token and expiration time.
   * Throws UnauthorizedException('YOUTUBE_REAUTH_REQUIRED') if the refresh token is missing or revoked.
   */
  async refreshAccessToken(userId: string): Promise<string> {
    const [integration] = await db
      .select({
        status: integrations.status,
        encryptedRefreshToken: integrations.encryptedRefreshToken,
      })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'youtube'),
        ),
      )
      .limit(1);

    if (!integration || !integration.encryptedRefreshToken) {
      throw new UnauthorizedException({
        code: 'YOUTUBE_REAUTH_REQUIRED',
        message:
          'Your YouTube authorization has expired or was revoked. Please reconnect your YouTube account.',
      });
    }

    let refreshToken: string;
    try {
      refreshToken = decryptToken(integration.encryptedRefreshToken);
    } catch {
      throw new UnauthorizedException({
        code: 'YOUTUBE_REAUTH_REQUIRED',
        message:
          'Your YouTube authorization has expired or is invalid. Please reconnect your YouTube account.',
      });
    }

    const config = this.getConfig();

    let response: Response;
    try {
      response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
    } catch (err) {
      this.logger.error(
        `Network error during Google token refresh for user ${userId}: ${(err as Error).message}`,
      );
      throw new BadGatewayException({
        code: 'YOUTUBE_API_ERROR',
        message:
          'Failed to connect to Google authentication service. Please check your network and try again.',
      });
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      this.logger.warn(
        `Google token refresh rejected (HTTP ${response.status}) for user ${userId}: ${JSON.stringify(errorBody)}`,
      );

      // If Google rejects the refresh token, mark integration as error/reauth required
      await db
        .update(integrations)
        .set({ status: 'error', updatedAt: new Date() })
        .where(
          and(
            eq(integrations.userId, userId),
            eq(integrations.provider, 'youtube'),
          ),
        );

      throw new UnauthorizedException({
        code: 'YOUTUBE_REAUTH_REQUIRED',
        message:
          'Your YouTube authorization has expired or was revoked. Please reconnect your YouTube account.',
      });
    }

    const data = (await response.json()) as GoogleTokenResponse;
    if (!data.access_token) {
      throw new Error(
        'Google token refresh response did not contain an access token.',
      );
    }

    const encryptedAccessToken = encryptToken(data.access_token);
    const tokenExpiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : new Date(Date.now() + 3600 * 1000);

    const updatePayload: Record<string, unknown> = {
      encryptedAccessToken,
      tokenExpiresAt,
      status: 'connected',
      updatedAt: new Date(),
    };

    if (data.refresh_token) {
      updatePayload.encryptedRefreshToken = encryptToken(data.refresh_token);
    }

    await db
      .update(integrations)
      .set(updatePayload)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'youtube'),
        ),
      );

    this.logger.log(
      `Successfully refreshed YouTube access token for user ${userId}`,
    );
    return data.access_token;
  }

  /**
   * Retrieves a valid, decrypted YouTube access token for the user.
   * If the access token has expired (or is within 5 minutes of expiring),
   * it automatically uses the refresh token to obtain a fresh access token.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const [integration] = await db
      .select({
        status: integrations.status,
        encryptedAccessToken: integrations.encryptedAccessToken,
        encryptedRefreshToken: integrations.encryptedRefreshToken,
        tokenExpiresAt: integrations.tokenExpiresAt,
      })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'youtube'),
        ),
      )
      .limit(1);

    if (!integration || integration.status !== 'connected') {
      throw new BadRequestException({
        code: 'YOUTUBE_NOT_CONNECTED',
        message:
          'YouTube account is not connected. Please connect your YouTube account first.',
      });
    }

    // Check if token is expired or expires within 5 minutes (300,000 ms)
    const isExpiringSoon =
      Boolean(integration.tokenExpiresAt) &&
      (integration.tokenExpiresAt as Date).getTime() - Date.now() < 300_000;

    if (isExpiringSoon && integration.encryptedRefreshToken) {
      this.logger.log(
        `YouTube access token for user ${userId} is expired or expiring soon. Refreshing automatically...`,
      );
      try {
        return await this.refreshAccessToken(userId);
      } catch (err) {
        if (err instanceof UnauthorizedException) {
          throw err;
        }
        this.logger.warn(
          `Automatic token refresh failed: ${(err as Error).message}. Attempting existing access token.`,
        );
      }
    }

    try {
      return decryptToken(integration.encryptedAccessToken);
    } catch (err) {
      // If decrypting existing token fails but refresh token is available, try refreshing
      if (integration.encryptedRefreshToken) {
        this.logger.warn(
          `Decryption of current access token failed for user ${userId}. Attempting refresh token fallback.`,
        );
        return await this.refreshAccessToken(userId);
      }
      this.logger.error(
        `Failed to decrypt access token for user ${userId}: ${(err as Error).message}`,
      );
      throw new UnauthorizedException({
        code: 'YOUTUBE_REAUTH_REQUIRED',
        message:
          'Your YouTube authorization has expired or is invalid. Please reconnect your YouTube account.',
      });
    }
  }
}
