import { Injectable, Logger } from '@nestjs/common';
import { and, db, eq, integrations, type Integration } from '@locus/database';
import { encryptToken } from '../crypto/index.js';
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
}
