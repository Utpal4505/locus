
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { decryptToken } from '../../common/crypto/index.js';
import { YoutubeOAuthService } from './youtube-oauth.service.js';
import {
  YoutubeChannelRepository,
  type SourceRecord,
} from '../repositories/youtube-channel.repository.js';
import { YoutubeIntegrationRepository } from '../repositories/youtube-integration.repository.js';

export interface SubscriptionImportSummary {
  importedCount: number;
  totalAvailable: number;
}

export interface ImportedChannelItem {
  id: string;
  externalId: string;
  name: string;
  url: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  isFollowed: boolean;
}

export interface ChannelListResult {
  channels: ImportedChannelItem[];
  total: number;
}

export interface ChannelFollowResult {
  sourceId: string;
  channelId: string;
  isFollowed: boolean;
}

export interface BulkFollowChannelResult {
  followedCount: number;
  alreadyFollowedCount: number;
  totalRequested: number;
  followedChannelIds: string[];
}

export function validateBulkFollowInput(input: unknown): {
  channelIds: string[];
} {
  if (!input || typeof input !== 'object') {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Request body must be an object.',
    });
  }

  const { channelIds } = input as Record<string, unknown>;

  if (!Array.isArray(channelIds)) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'channelIds must be an array.',
    });
  }

  if (channelIds.length === 0) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'At least one channel ID must be provided.',
    });
  }

  if (channelIds.length > 100) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Cannot follow more than 100 channels in a single batch.',
    });
  }

  const sanitizedIds: string[] = [];
  for (const id of channelIds) {
    if (typeof id !== 'string' || !id.trim()) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Channel identifier cannot be empty.',
      });
    }
    if (id.trim().length > 255) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Channel identifier is too long.',
      });
    }
    sanitizedIds.push(id.trim());
  }

  return { channelIds: sanitizedIds };
}

interface YouTubeSubscriptionSnippet {
  title?: string;
  description?: string;
  resourceId?: {
    kind?: string;
    channelId?: string;
  };
  thumbnails?: {
    default?: { url?: string };
    medium?: { url?: string };
    high?: { url?: string };
  };
}

interface YouTubeSubscriptionItem {
  snippet?: YouTubeSubscriptionSnippet;
}

interface YouTubeSubscriptionsResponse {
  nextPageToken?: string;
  items?: YouTubeSubscriptionItem[];
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ParsedChannelQuery {
  type: 'channel_id' | 'handle' | 'keyword';
  value: string;
}

/**
 * Parses user input to distinguish channel IDs, handles, YouTube URLs, or search keywords.
 */
export function parseChannelInput(rawQuery: string): ParsedChannelQuery {
  const trimmed = rawQuery.trim();

  // 1. YouTube URL with channel ID: /channel/(UC[a-zA-Z0-9_-]{22})
  const channelUrlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/i,
  );
  if (channelUrlMatch?.[1]) {
    return { type: 'channel_id', value: channelUrlMatch[1] };
  }

  // 2. Direct Channel ID (24 characters starting with UC)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return { type: 'channel_id', value: trimmed };
  }

  // 3. YouTube URL with handle: /@([a-zA-Z0-9_.-]+)
  const handleUrlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([a-zA-Z0-9_.-]+)/i,
  );
  if (handleUrlMatch?.[1]) {
    return { type: 'handle', value: handleUrlMatch[1] };
  }

  // 4. Handle starting with @
  if (trimmed.startsWith('@') && trimmed.length > 1) {
    return { type: 'handle', value: trimmed.slice(1).replace(/\/.*$/, '') };
  }

  // 5. YouTube URL with /c/ or /user/
  const customUrlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c|user)\/([a-zA-Z0-9_.-]+)/i,
  );
  if (customUrlMatch?.[1]) {
    return { type: 'keyword', value: customUrlMatch[1] };
  }

  // 6. Generic keyword or channel name
  return { type: 'keyword', value: trimmed };
}

@Injectable()
export class YoutubeChannelService {
  private readonly logger = new Logger(YoutubeChannelService.name);

  constructor(
    private readonly channelRepo: YoutubeChannelRepository,
    private readonly integrationRepo: YoutubeIntegrationRepository,
    @Optional() private readonly oauthService?: YoutubeOAuthService,
  ) {}

  /**
   * Imports the current user's YouTube subscriptions from YouTube Data API v3.
   * Upserts channel metadata into shared `sources` table and binds them to the user's
   * available imported channels collection. Does NOT automatically follow any channel.
   */
  async importSubscriptions(
    userId: string,
  ): Promise<SubscriptionImportSummary> {
    // 1. Retrieve access token (automatically refreshed via refresh token if expired)
    let accessToken: string;
    if (this.oauthService) {
      accessToken = await this.oauthService.getValidAccessToken(userId);
    } else {
      // Fallback direct decryption when oauthService is not injected (e.g. standalone test mocks)
      const integration = await this.integrationRepo.findByUserId(userId);

      if (!integration || integration.status !== 'connected') {
        throw new BadRequestException({
          code: 'YOUTUBE_NOT_CONNECTED',
          message:
            'YouTube account is not connected. Please connect your YouTube account first.',
        });
      }

      try {
        accessToken = decryptToken(integration.encryptedAccessToken);
      } catch (err) {
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

    // 2. Fetch all subscriptions with pagination from YouTube Data API v3
    const extractedChannels: Array<{
      externalId: string;
      name: string;
      url: string;
      description: string | null;
      imageUrl: string | null;
      feedUrl: string;
    }> = [];

    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    const MAX_PAGES = 100; // Safeguard against unbounded pagination (up to 5,000 subscriptions)

    do {
      const url = new URL(
        'https://www.googleapis.com/youtube/v3/subscriptions',
      );
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('mine', 'true');
      url.searchParams.set('maxResults', '50');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });
      } catch (err) {
        this.logger.error(
          `Network error fetching YouTube subscriptions for user ${userId}: ${(err as Error).message}`,
        );
        throw new BadGatewayException({
          code: 'YOUTUBE_API_ERROR',
          message:
            'Failed to communicate with YouTube API. Please check your network connection and try again.',
        });
      }

      // Handle token expiration/rejection (HTTP 401) with automatic token refresh retry
      if (response.status === 401) {
        this.logger.warn(`YouTube token rejected (401) for user ${userId}`);
        if (this.oauthService) {
          try {
            accessToken = await this.oauthService.refreshAccessToken(userId);
            try {
              response = await fetch(url.toString(), {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'application/json',
                },
              });
            } catch (retryErr) {
              this.logger.error(
                `Network error on retry after refresh for user ${userId}: ${(retryErr as Error).message}`,
              );
              throw new BadGatewayException({
                code: 'YOUTUBE_API_ERROR',
                message:
                  'Failed to communicate with YouTube API after token refresh. Please try again.',
              });
            }
          } catch (refreshErr) {
            if (refreshErr instanceof UnauthorizedException) {
              throw refreshErr;
            }
          }
        }

        if (response.status === 401) {
          throw new UnauthorizedException({
            code: 'YOUTUBE_REAUTH_REQUIRED',
            message:
              'Your YouTube authorization has expired or was revoked. Please reconnect your YouTube account.',
          });
        }
      }

      if (response.status === 403) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: {
            errors?: Array<{ reason?: string }>;
            status?: string;
          };
        };
        const reason =
          errorBody?.error?.errors?.[0]?.reason || errorBody?.error?.status;

        if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded') {
          this.logger.warn(`YouTube API quota exceeded for user ${userId}`);
          throw new HttpException(
            {
              code: 'YOUTUBE_API_ERROR',
              message: 'YouTube API quota exceeded. Please try again later.',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        this.logger.warn(
          `YouTube authorization forbidden (403) for user ${userId}: reason=${reason}`,
        );
        throw new UnauthorizedException({
          code: 'YOUTUBE_REAUTH_REQUIRED',
          message:
            'Your YouTube authorization has expired or was revoked. Please reconnect your YouTube account.',
        });
      }

      if (!response.ok) {
        this.logger.error(
          `YouTube subscriptions.list failed with HTTP ${response.status} for user ${userId}`,
        );
        throw new BadGatewayException({
          code: 'YOUTUBE_API_ERROR',
          message:
            'Failed to communicate with YouTube API. Please try again later.',
        });
      }

      const data = (await response.json()) as YouTubeSubscriptionsResponse;

      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          const channelId = item.snippet?.resourceId?.channelId?.trim();
          if (!channelId) {
            continue; // Skip items with incomplete provider metadata safely
          }

          const name = item.snippet?.title?.trim() || 'Untitled Channel';
          const channelUrl = `https://www.youtube.com/channel/${channelId}`;
          const description = item.snippet?.description?.trim() || null;
          const imageUrl =
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            null;
          const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

          extractedChannels.push({
            externalId: channelId,
            name,
            url: channelUrl,
            description,
            imageUrl,
            feedUrl,
          });
        }
      }

      pageToken = data.nextPageToken;
      pageCount++;
    } while (pageToken && pageCount < MAX_PAGES);

    // 4. Upsert channel metadata into shared `sources` table
    await this.channelRepo.upsertYoutubeChannels(extractedChannels);

    // 5. Update user's available imported channels in `user_preferences.feed_preferences`
    const mergedChannelIds = await this.channelRepo.addImportedChannelIds(
      userId,
      extractedChannels.map((c) => c.externalId),
    );

    this.logger.log(
      `User ${userId} imported ${extractedChannels.length} YouTube subscriptions (${mergedChannelIds.length} available).`,
    );

    return {
      importedCount: extractedChannels.length,
      totalAvailable: mergedChannelIds.length,
    };
  }

  /**
   * Lists the current user's imported/available and followed YouTube channels with follow status.
   */
  async listChannels(userId: string): Promise<ChannelListResult> {
    const importedIds = await this.channelRepo.getImportedChannelIds(userId);

    if (importedIds.length === 0) {
      return { channels: [], total: 0 };
    }

    const rows = await this.channelRepo.listImportedChannels(userId, importedIds);

    return {
      channels: rows.map((r) => ({
        id: r.id,
        externalId: r.externalId!,
        name: r.name,
        url: r.url,
        description: r.description,
        thumbnailUrl: r.thumbnailUrl,
        isFollowed: r.isFollowed,
      })),
      total: rows.length,
    };
  }

  /**
   * Searches channels by Name, @handle, YouTube URL, or Channel ID across local database
   * and live YouTube Data API v3. Discovered channels are automatically upserted into `sources`.
   */
  async searchChannels(
    userId: string,
    rawQuery: string,
  ): Promise<ChannelListResult> {
    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return { channels: [], total: 0 };
    }

    const query = rawQuery.trim();
    const parsed = parseChannelInput(query);
    const auth = await this.getSearchAuth(userId);

    const discoveredFromYouTube: Array<{
      externalId: string;
      name: string;
      url: string;
      description: string | null;
      imageUrl: string | null;
      feedUrl: string;
    }> = [];

    // Query live YouTube API if user OAuth or server API key is available
    if (auth.header || auth.keyQueryParam) {
      try {
        const fetchYouTube = async (urlStr: string) => {
          const urlObj = new URL(urlStr);
          if (auth.keyQueryParam) {
            urlObj.searchParams.set('key', auth.keyQueryParam);
          }
          const headers: Record<string, string> = { Accept: 'application/json' };
          if (auth.header?.Authorization) {
            headers.Authorization = auth.header.Authorization;
          }
          const res = await fetch(urlObj.toString(), { headers });
          if (res.ok) {
            return await res.json();
          }
          return null;
        };

        if (parsed.type === 'channel_id') {
          const data = await fetchYouTube(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${encodeURIComponent(parsed.value)}`,
          );
          if (Array.isArray(data?.items)) {
            for (const item of data.items) {
              discoveredFromYouTube.push(this.mapYouTubeChannelItem(item));
            }
          }
        } else if (parsed.type === 'handle') {
          const data = await fetchYouTube(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(parsed.value)}`,
          );
          if (Array.isArray(data?.items) && data.items.length > 0) {
            for (const item of data.items) {
              discoveredFromYouTube.push(this.mapYouTubeChannelItem(item));
            }
          } else {
            // Fallback to keyword search if forHandle returns empty
            const searchData = await fetchYouTube(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.value)}&maxResults=5`,
            );
            if (Array.isArray(searchData?.items)) {
              for (const item of searchData.items) {
                const mapped = this.mapYouTubeSearchItem(item);
                if (mapped) discoveredFromYouTube.push(mapped);
              }
            }
          }
        } else {
          // Keyword search
          const searchData = await fetchYouTube(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.value)}&maxResults=8`,
          );
          if (Array.isArray(searchData?.items)) {
            for (const item of searchData.items) {
              const mapped = this.mapYouTubeSearchItem(item);
              if (mapped) discoveredFromYouTube.push(mapped);
            }
          }
        }
      } catch (err) {
        this.logger.warn(
          `Error querying YouTube API for channel search "${query}": ${(err as Error).message}`,
        );
      }
    }

    // Upsert discovered channels into sources table
    if (discoveredFromYouTube.length > 0) {
      await this.channelRepo.upsertYoutubeChannels(discoveredFromYouTube);
    }

    const rows = await this.channelRepo.searchChannels(
      userId,
      parsed,
      discoveredFromYouTube.map((c) => c.externalId),
    );

    // Ensure all discovered / matching channels are added to the user's available imported collection
    const channelExternalIds = rows
      .map((r) => r.externalId)
      .filter((id): id is string => Boolean(id));
    if (channelExternalIds.length > 0) {
      await this.channelRepo.addImportedChannelIds(userId, channelExternalIds);
    }

    return {
      channels: rows.map((r) => ({
        id: r.id,
        externalId: r.externalId!,
        name: r.name,
        url: r.url,
        description: r.description,
        thumbnailUrl: r.thumbnailUrl,
        isFollowed: r.isFollowed,
      })),
      total: rows.length,
    };
  }

  /**
   * Follows a channel in Locus for the authenticated user.
   * Idempotent: following an already-followed channel succeeds without creating duplicates.
   */
  async followChannel(
    userId: string,
    identifier: string,
  ): Promise<ChannelFollowResult> {
    const channel = await this.resolveAvailableChannel(userId, identifier);

    await this.channelRepo.followChannel(userId, channel.id);

    return {
      sourceId: channel.id,
      channelId: channel.externalId!,
      isFollowed: true,
    };
  }

  /**
   * Unfollows a channel in Locus for the authenticated user.
   * Idempotent: deletes only the current user's `source_subscriptions` row.
   * Never deletes shared `sources` records or videos.
   */
  async unfollowChannel(
    userId: string,
    identifier: string,
  ): Promise<ChannelFollowResult> {
    const channel = await this.resolveChannelByIdentifier(identifier);

    await this.channelRepo.unfollowChannel(userId, channel.id);

    return {
      sourceId: channel.id,
      channelId: channel.externalId!,
      isFollowed: false,
    };
  }

  /**
   * Follows multiple imported channels in bulk for the authenticated user.
   * Idempotent: already-followed channels are preserved and counted.
   * Atomic: fails if any requested channel is invalid, nonexistent, or not imported.
   */
  async bulkFollowChannels(
    userId: string,
    channelIds: string[],
  ): Promise<BulkFollowChannelResult> {
    const validated = validateBulkFollowInput({ channelIds });

    const uniqueIdentifiers: string[] = Array.from(
      new Set(validated.channelIds),
    );

    // 1. Check user imported collection
    const importedIds = await this.channelRepo.getImportedChannelIds(userId);

    if (!Array.isArray(importedIds) || importedIds.length === 0) {
      throw new BadRequestException({
        code: 'CHANNEL_NOT_AVAILABLE',
        message:
          'No imported subscriptions found. Please import channels before following.',
      });
    }

    // 2. Resolve all channels from sources
    const uuids: string[] = uniqueIdentifiers.filter((id) =>
      UUID_REGEX.test(id),
    );
    const externalIds: string[] = uniqueIdentifiers.filter(
      (id) => !UUID_REGEX.test(id),
    );

    const matchingSources = await this.channelRepo.findChannelsByIdentifiers(
      uuids,
      externalIds,
    );

    const sourceById = new Map(matchingSources.map((s) => [s.id, s]));
    const sourceByExternalId = new Map(
      matchingSources
        .filter((s) => Boolean(s.externalId))
        .map((s) => [s.externalId!, s]),
    );

    const missingIdentifiers: string[] = [];
    const resolvedChannels: SourceRecord[] = [];

    for (const id of uniqueIdentifiers) {
      const match = sourceById.get(id) || sourceByExternalId.get(id);
      if (!match) {
        missingIdentifiers.push(id);
      } else {
        resolvedChannels.push(match);
      }
    }

    if (missingIdentifiers.length > 0) {
      throw new NotFoundException({
        code: 'CHANNEL_NOT_FOUND',
        message: `Channel not found: ${missingIdentifiers.join(', ')}`,
      });
    }

    // 3. Verify all resolved channels are in user's imported collection
    const unimportedChannel = resolvedChannels.find(
      (ch) => !ch.externalId || !importedIds.includes(ch.externalId),
    );

    if (unimportedChannel) {
      throw new BadRequestException({
        code: 'CHANNEL_NOT_AVAILABLE',
        message: `Channel "${unimportedChannel.name}" is not in your imported subscriptions. Import it before following.`,
      });
    }

    // 4. Resolve unique source IDs to follow
    const targetSourceIds = Array.from(
      new Set(resolvedChannels.map((ch) => ch.id)),
    );

    const existingSubs = await this.channelRepo.findFollowedSourceIds(
      userId,
      targetSourceIds,
    );

    const existingSourceIdSet = new Set(existingSubs);
    const newSourceIds = targetSourceIds.filter(
      (id) => !existingSourceIdSet.has(id),
    );

    // 5. Insert new subscriptions
    if (newSourceIds.length > 0) {
      await this.channelRepo.insertSubscriptions(userId, newSourceIds);
    }

    return {
      followedCount: newSourceIds.length,
      alreadyFollowedCount: targetSourceIds.length - newSourceIds.length,
      totalRequested: targetSourceIds.length,
      followedChannelIds: newSourceIds,
    };
  }

  /**
   * Resolves a YouTube channel from `sources` and verifies that it is in the user's
   * available/imported collection.
   */
  private async resolveAvailableChannel(userId: string, identifier: string) {
    const channel = await this.resolveChannelByIdentifier(identifier);

    // Verify channel is in user's imported collection
    const importedIds = await this.channelRepo.getImportedChannelIds(userId);

    if (
      !Array.isArray(importedIds) ||
      !channel.externalId ||
      !importedIds.includes(channel.externalId)
    ) {
      throw new BadRequestException({
        code: 'CHANNEL_NOT_AVAILABLE',
        message:
          'This channel is not in your imported subscriptions. Import it before following.',
      });
    }

    return channel;
  }

  /**
   * Resolves authentication for YouTube API search requests:
   * 1. User's OAuth access token if connected.
   * 2. Server YOUTUBE_API_KEY or GOOGLE_API_KEY if configured.
   */
  private async getSearchAuth(userId: string): Promise<{
    header?: { Authorization: string };
    keyQueryParam?: string;
  }> {
    if (this.oauthService) {
      try {
        const token = await this.oauthService.getValidAccessToken(userId);
        if (token) {
          return { header: { Authorization: `Bearer ${token}` } };
        }
      } catch {
        // User not connected or expired, fallback to server API key
      }
    }

    const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey && apiKey.trim()) {
      return { keyQueryParam: apiKey.trim() };
    }

    return {};
  }

  private mapYouTubeChannelItem(item: any): {
    externalId: string;
    name: string;
    url: string;
    description: string | null;
    imageUrl: string | null;
    feedUrl: string;
  } {
    const channelId = item.id?.trim();
    const name = item.snippet?.title?.trim() || 'Untitled Channel';
    const channelUrl = item.snippet?.customUrl
      ? `https://www.youtube.com/${item.snippet.customUrl.startsWith('@') ? item.snippet.customUrl : '@' + item.snippet.customUrl}`
      : `https://www.youtube.com/channel/${channelId}`;
    const description = item.snippet?.description?.trim() || null;
    const imageUrl =
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      null;
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    return {
      externalId: channelId,
      name,
      url: channelUrl,
      description,
      imageUrl,
      feedUrl,
    };
  }

  private mapYouTubeSearchItem(item: any): {
    externalId: string;
    name: string;
    url: string;
    description: string | null;
    imageUrl: string | null;
    feedUrl: string;
  } | null {
    const channelId = item.id?.channelId?.trim();
    if (!channelId) return null;
    const name = item.snippet?.title?.trim() || 'Untitled Channel';
    const channelUrl = `https://www.youtube.com/channel/${channelId}`;
    const description = item.snippet?.description?.trim() || null;
    const imageUrl =
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      null;
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    return {
      externalId: channelId,
      name,
      url: channelUrl,
      description,
      imageUrl,
      feedUrl,
    };
  }

  /**
   * Resolves a channel record from `sources` by UUID or YouTube channel ID.
   */
  private async resolveChannelByIdentifier(identifier: string) {
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid channel identifier.',
      });
    }

    const channel = await this.channelRepo.findChannelByIdentifier(identifier);

    if (!channel) {
      throw new NotFoundException({
        code: 'CHANNEL_NOT_FOUND',
        message: 'Channel not found.',
      });
    }

    return channel;
  }
}
