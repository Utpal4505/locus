import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import {
  and,
  db,
  eq,
  integrations,
  sources,
  sourceSubscriptions,
  videos,
  videoTaggingStates,
} from '@locus/database';
import { decryptToken } from '../crypto/index.js';
import { YoutubeOAuthService } from './youtube-oauth.service.js';

export interface VideoSyncSummary {
  channelsProcessed: number;
  videosSynced: number;
  itemsSkipped: number;
  limitReached: boolean;
}

export interface VideoSyncOptions {
  maxResultsPerChannel?: number;
}

const DEFAULT_MAX_VIDEOS_PER_CHANNEL = 50;

/**
 * Parses an ISO 8601 duration string (e.g. "PT15M33S", "PT1H2M10S", "P1DT2H") into seconds.
 * Returns null if string is missing, invalid, or cannot be parsed.
 */
export function parseIsoDuration(durationStr?: string | null): number | null {
  if (!durationStr || typeof durationStr !== 'string') return null;
  const match = durationStr.match(
    /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!match) return null;
  const weeks = parseInt(match[1] || '0', 10);
  const days = parseInt(match[2] || '0', 10);
  const hours = parseInt(match[3] || '0', 10);
  const minutes = parseInt(match[4] || '0', 10);
  const seconds = parseInt(match[5] || '0', 10);
  const totalSeconds =
    weeks * 604800 + days * 86400 + hours * 3600 + minutes * 60 + seconds;
  return totalSeconds >= 0 ? totalSeconds : null;
}

@Injectable()
export class YoutubeVideoService {
  private readonly logger = new Logger(YoutubeVideoService.name);

  constructor(@Optional() private readonly oauthService?: YoutubeOAuthService) {}

  /**
   * Safely executes an HTTP fetch call against the YouTube API with exponential backoff
   * retry for temporary network errors (DNS drops, socket resets) and 5xx server errors.
   */
  private async safeFetch(
    url: string,
    options: RequestInit,
    userId: string,
    maxRetries = process.env.NODE_ENV === 'test' ? 0 : 2,
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        // If temporary 5xx server error and we have retries left, wait and retry
        if (response.status >= 500 && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          this.logger.warn(
            `Temporary YouTube API HTTP ${response.status} for user ${userId}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        return response;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          this.logger.warn(
            `Network failure communicating with YouTube API for user ${userId}: ${(err as Error).message}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    this.logger.error(
      `Network error communicating with YouTube API for user ${userId}: ${(lastError as Error)?.message}`,
    );
    throw new BadGatewayException({
      code: 'YOUTUBE_API_ERROR',
      message:
        'Failed to communicate with YouTube API. Please check your network connection and try again.',
    });
  }

  /**
   * Ingests recent videos from the authenticated user's followed YouTube channels.
   * Resolves uploads playlists via YouTube Data API v3, enriches video metadata,
   * sorts videos by actual publication timestamps, and upserts into the shared `videos` table.
   *
   * User-specific library state (`video_library`) is never modified or automatically created.
   */
  async syncFollowedChannelVideos(
    userId: string,
    options?: VideoSyncOptions,
  ): Promise<VideoSyncSummary> {
    const maxResultsPerChannel =
      options?.maxResultsPerChannel && options.maxResultsPerChannel > 0
        ? Math.min(options.maxResultsPerChannel, 100)
        : DEFAULT_MAX_VIDEOS_PER_CHANNEL;

    // 1. Retrieve and decrypt the user's YouTube access token
    const accessToken = await this.getValidAccessToken(userId);

    // 2. Query user's followed YouTube channels from source_subscriptions joined to sources
    const followedChannels = await db
      .select({
        id: sources.id,
        externalId: sources.externalId,
        name: sources.name,
      })
      .from(sourceSubscriptions)
      .innerJoin(sources, eq(sourceSubscriptions.sourceId, sources.id))
      .where(
        and(
          eq(sourceSubscriptions.userId, userId),
          eq(sources.type, 'youtube_channel'),
          eq(sources.isActive, true),
        ),
      );

    if (followedChannels.length === 0) {
      this.logger.log(
        `User ${userId} has no followed YouTube channels to sync.`,
      );
      return {
        channelsProcessed: 0,
        videosSynced: 0,
        itemsSkipped: 0,
        limitReached: false,
      };
    }

    // 3. Resolve uploads playlists for all followed channels via channels.list
    const validChannelExternalIds = followedChannels
      .map((c) => c.externalId)
      .filter((id): id is string => Boolean(id && id.trim()));

    const uploadsPlaylistMap = await this.resolveUploadPlaylists(
      validChannelExternalIds,
      accessToken,
      userId,
    );

    let totalVideosSynced = 0;
    let totalItemsSkipped = 0;
    let anyChannelHitLimit = false;
    let channelsProcessedCount = 0;

    // 4. Ingest videos per channel with partial-failure isolation
    for (const channel of followedChannels) {
      if (!channel.externalId) {
        totalItemsSkipped++;
        continue;
      }

      const uploadsPlaylistId = uploadsPlaylistMap.get(channel.externalId);
      if (!uploadsPlaylistId) {
        this.logger.warn(
          `Could not determine uploads playlist for channel ${channel.name} (${channel.externalId}). Skipping channel.`,
        );
        totalItemsSkipped++;
        continue;
      }

      try {
        const channelResult = await this.syncChannelVideos(
          channel.id,
          uploadsPlaylistId,
          accessToken,
          userId,
          maxResultsPerChannel,
        );

        totalVideosSynced += channelResult.syncedCount;
        totalItemsSkipped += channelResult.skippedCount;
        if (channelResult.limitReached) {
          anyChannelHitLimit = true;
        }
        channelsProcessedCount++;

        // Update channel lastFetchedAt timestamp
        await db
          .update(sources)
          .set({ lastFetchedAt: new Date(), updatedAt: new Date() })
          .where(eq(sources.id, channel.id));
      } catch (err) {
        // Provider auth and quota errors must terminate the entire sync operation immediately
        if (
          err instanceof UnauthorizedException ||
          (err instanceof HttpException &&
            err.getStatus() === HttpStatus.TOO_MANY_REQUESTS)
        ) {
          throw err;
        }

        // Isolated per-channel failure: log warning and continue with remaining channels
        this.logger.warn(
          `Failed to sync videos for channel ${channel.name} (${channel.externalId}): ${(err as Error).message}`,
        );
        totalItemsSkipped++;
      }
    }

    this.logger.log(
      `User ${userId} video sync completed: ${channelsProcessedCount}/${followedChannels.length} channels processed, ${totalVideosSynced} videos upserted, ${totalItemsSkipped} items skipped.`,
    );

    return {
      channelsProcessed: channelsProcessedCount,
      videosSynced: totalVideosSynced,
      itemsSkipped: totalItemsSkipped,
      limitReached: anyChannelHitLimit,
    };
  }

  /**
   * Fetches playlist items for a channel's uploads playlist, enriches them via videos.list,
   * sorts them by publication timestamp, and upserts them into the shared `videos` table.
   */
  private async syncChannelVideos(
    sourceId: string,
    uploadsPlaylistId: string,
    accessToken: string,
    userId: string,
    limit: number,
  ): Promise<{
    syncedCount: number;
    skippedCount: number;
    limitReached: boolean;
  }> {
    let pageToken: string | undefined = undefined;
    let limitReached = false;
    let skippedCount = 0;

    const rawPlaylistItems: Array<{
      videoId: string;
      title: string;
      description: string | null;
      thumbnailUrl: string | null;
      publishedAt: Date | null;
    }> = [];

    // 1. Fetch playlist items up to the limit
    do {
      const pageSize = Math.min(50, limit - rawPlaylistItems.length);
      const url = new URL(
        'https://www.googleapis.com/youtube/v3/playlistItems',
      );
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('playlistId', uploadsPlaylistId);
      url.searchParams.set('maxResults', String(pageSize));
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await this.safeFetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }, userId);

      await this.checkAuthOrQuotaError(response, userId);

      if (!response.ok) {
        throw new Error(
          `YouTube playlistItems.list failed for playlist ${uploadsPlaylistId}: HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        nextPageToken?: string;
        items?: Array<{
          snippet?: {
            title?: string;
            description?: string;
            publishedAt?: string;
            thumbnails?: {
              high?: { url?: string };
              medium?: { url?: string };
              default?: { url?: string };
            };
            resourceId?: {
              videoId?: string;
            };
          };
          contentDetails?: {
            videoId?: string;
            videoPublishedAt?: string;
          };
        }>;
      };

      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          const videoId =
            item.contentDetails?.videoId?.trim() ||
            item.snippet?.resourceId?.videoId?.trim();
          const title = item.snippet?.title?.trim();

          // Safely skip invalid, incomplete, or private/deleted playlist items
          if (
            !videoId ||
            !title ||
            title === 'Private video' ||
            title === 'Deleted video'
          ) {
            skippedCount++;
            continue;
          }

          const description = item.snippet?.description?.trim() || null;
          const rawDate =
            item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
          const publishedAt = rawDate ? new Date(rawDate) : null;
          const thumb =
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            null;

          rawPlaylistItems.push({
            videoId,
            title,
            description,
            thumbnailUrl: thumb,
            publishedAt,
          });

          if (rawPlaylistItems.length >= limit) {
            break;
          }
        }
      }

      if (data.nextPageToken && rawPlaylistItems.length >= limit) {
        limitReached = true;
      }

      pageToken = data.nextPageToken;
    } while (pageToken && rawPlaylistItems.length < limit);

    if (rawPlaylistItems.length === 0) {
      return { syncedCount: 0, skippedCount, limitReached };
    }

    // 2. Enrich video metadata (durations and high-res thumbnails) via videos.list in chunks of 50
    const videoIds = rawPlaylistItems.map((v) => v.videoId);
    const enrichmentMap = new Map<
      string,
      {
        durationSeconds: number | null;
        thumbnailUrl: string | null;
        title?: string;
        description?: string | null;
        publishedAt?: Date | null;
      }
    >();

    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'contentDetails,snippet');
      url.searchParams.set('id', chunk.join(','));

      const res = await this.safeFetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }, userId);

      await this.checkAuthOrQuotaError(res, userId);

      if (res.ok) {
        const data = (await res.json()) as {
          items?: Array<{
            id?: string;
            snippet?: {
              title?: string;
              description?: string;
              publishedAt?: string;
              thumbnails?: {
                maxres?: { url?: string };
                standard?: { url?: string };
                high?: { url?: string };
                medium?: { url?: string };
                default?: { url?: string };
              };
            };
            contentDetails?: {
              duration?: string;
            };
          }>;
        };

        if (Array.isArray(data.items)) {
          for (const item of data.items) {
            if (!item.id) continue;
            const durationSeconds = parseIsoDuration(
              item.contentDetails?.duration,
            );
            const thumb =
              item.snippet?.thumbnails?.maxres?.url ||
              item.snippet?.thumbnails?.standard?.url ||
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              item.snippet?.thumbnails?.default?.url ||
              null;
            const rawDate = item.snippet?.publishedAt;
            const publishedAt = rawDate ? new Date(rawDate) : null;

            enrichmentMap.set(item.id, {
              durationSeconds,
              thumbnailUrl: thumb,
              title: item.snippet?.title?.trim(),
              description: item.snippet?.description?.trim() ?? null,
              publishedAt,
            });
          }
        }
      }
    }

    // 3. Assemble and sort videos by actual publication timestamp descending
    const assembledVideos = rawPlaylistItems.map((item) => {
      const enriched = enrichmentMap.get(item.videoId);
      return {
        youtubeVideoId: item.videoId,
        sourceId,
        title: enriched?.title || item.title,
        description: enriched?.description ?? item.description,
        thumbnailUrl: enriched?.thumbnailUrl || item.thumbnailUrl,
        durationSeconds: enriched?.durationSeconds ?? null,
        publishedAt: enriched?.publishedAt || item.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
      };
    });

    assembledVideos.sort((a, b) => {
      const tA = a.publishedAt ? a.publishedAt.getTime() : 0;
      const tB = b.publishedAt ? b.publishedAt.getTime() : 0;
      return tB - tA;
    });

    // 4. Upsert into shared `videos` table and initialize pending tagging state
    for (const v of assembledVideos) {
      const upsertQuery = db
        .insert(videos)
        .values({
          youtubeVideoId: v.youtubeVideoId,
          sourceId: v.sourceId,
          title: v.title,
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          durationSeconds: v.durationSeconds,
          publishedAt: v.publishedAt,
          url: v.url,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: videos.youtubeVideoId,
          set: {
            sourceId: v.sourceId,
            title: v.title,
            description: v.description,
            thumbnailUrl: v.thumbnailUrl,
            durationSeconds: v.durationSeconds,
            publishedAt: v.publishedAt,
            url: v.url,
            updatedAt: new Date(),
          },
        });

      let insertedId: string | undefined;
      if (
        upsertQuery &&
        typeof (upsertQuery as any).returning === 'function'
      ) {
        const rows = await (upsertQuery as any).returning({ id: videos.id });
        insertedId = rows?.[0]?.id;
      } else {
        await upsertQuery;
      }

      if (insertedId && process.env.AI_VIDEO_TAGGING_ENABLED === 'true') {
        // Initialize tagging state as pending if not already present
        await db
          .insert(videoTaggingStates)
          .values({
            videoId: insertedId,
            status: 'pending',
            attemptCount: 0,
          })
          .onConflictDoNothing();
      }
    }

    return {
      syncedCount: assembledVideos.length,
      skippedCount,
      limitReached,
    };
  }

  /**
   * Resolves the uploads playlist ID for each YouTube channel via `channels.list`.
   * Falls back safely to replacing the "UC" prefix with "UU" for standard YouTube channels.
   */
  private async resolveUploadPlaylists(
    channelExternalIds: string[],
    accessToken: string,
    userId: string,
  ): Promise<Map<string, string>> {
    const uploadsMap = new Map<string, string>();
    if (channelExternalIds.length === 0) return uploadsMap;

    for (let i = 0; i < channelExternalIds.length; i += 50) {
      const chunk = channelExternalIds.slice(i, i + 50);
      const url = new URL('https://www.googleapis.com/youtube/v3/channels');
      url.searchParams.set('part', 'contentDetails');
      url.searchParams.set('id', chunk.join(','));

      const response = await this.safeFetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }, userId);

      await this.checkAuthOrQuotaError(response, userId);

      if (response.ok) {
        const data = (await response.json()) as {
          items?: Array<{
            id?: string;
            contentDetails?: {
              relatedPlaylists?: {
                uploads?: string;
              };
            };
          }>;
        };

        if (Array.isArray(data.items)) {
          for (const item of data.items) {
            if (item.id && item.contentDetails?.relatedPlaylists?.uploads) {
              uploadsMap.set(
                item.id,
                item.contentDetails.relatedPlaylists.uploads,
              );
            }
          }
        }
      }
    }

    // Safe fallback for standard YouTube channels: UC... -> UU...
    for (const id of channelExternalIds) {
      if (!uploadsMap.has(id) && id.startsWith('UC')) {
        uploadsMap.set(id, 'UU' + id.slice(2));
      }
    }

    return uploadsMap;
  }

  /**
   * Checks for authentication rejection or quota exhaustion from YouTube API response.
   */
  private async checkAuthOrQuotaError(response: Response, userId: string) {
    if (response.status === 401) {
      this.logger.warn(`YouTube token rejected (401) for user ${userId}`);
      throw new UnauthorizedException({
        code: 'YOUTUBE_REAUTH_REQUIRED',
        message:
          'Your YouTube authorization has expired or was revoked. Please reconnect your YouTube account.',
      });
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

    if (response.status >= 500) {
      this.logger.error(
        `YouTube API server error HTTP ${response.status} for user ${userId}`,
      );
      throw new BadGatewayException({
        code: 'YOUTUBE_API_ERROR',
        message:
          'Failed to communicate with YouTube API. Please try again later.',
      });
    }
  }

  /**
   * Retrieves and decrypts the user's active YouTube access token.
   * Proactively refreshes the token if expired or expiring soon.
   */
  private async getValidAccessToken(userId: string): Promise<string> {
    if (this.oauthService) {
      return await this.oauthService.getValidAccessToken(userId);
    }

    const [integration] = await db
      .select({
        status: integrations.status,
        encryptedAccessToken: integrations.encryptedAccessToken,
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

    try {
      return decryptToken(integration.encryptedAccessToken);
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
}
