
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
import {
  and,
  asc,
  db,
  eq,
  inArray,
  integrations,
  or,
  sources,
  sourceSubscriptions,
  sql,
  userPreferences,
} from '@locus/database';
import { decryptToken } from '../crypto/index.js';
import { YoutubeOAuthService } from './youtube-oauth.service.js';

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

@Injectable()
export class YoutubeChannelService {
  private readonly logger = new Logger(YoutubeChannelService.name);

  constructor(@Optional() private readonly oauthService?: YoutubeOAuthService) {}

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
    for (const ch of extractedChannels) {
      await db
        .insert(sources)
        .values({
          type: 'youtube_channel',
          externalId: ch.externalId,
          name: ch.name,
          url: ch.url,
          description: ch.description,
          imageUrl: ch.imageUrl,
          feedUrl: ch.feedUrl,
          isActive: true,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [sources.type, sources.externalId],
          targetWhere: sql`${sources.externalId} IS NOT NULL`,
          set: {
            name: ch.name,
            url: ch.url,
            description: ch.description,
            imageUrl: ch.imageUrl,
            feedUrl: ch.feedUrl,
            updatedAt: new Date(),
          },
        });
    }

    // 5. Update user's available imported channels in `user_preferences.feed_preferences`
    const [existingPrefs] = await db
      .select({ feedPreferences: userPreferences.feedPreferences })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const currentFeedPrefs =
      (existingPrefs?.feedPreferences as Record<string, unknown>) || {};
    const currentImportedIds = Array.isArray(
      currentFeedPrefs.importedChannelIds,
    )
      ? (currentFeedPrefs.importedChannelIds as string[])
      : [];

    const mergedChannelIds = Array.from(
      new Set([
        ...currentImportedIds,
        ...extractedChannels.map((c) => c.externalId),
      ]),
    );

    await db
      .insert(userPreferences)
      .values({
        userId,
        feedPreferences: {
          ...currentFeedPrefs,
          importedChannelIds: mergedChannelIds,
        },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          feedPreferences: {
            ...currentFeedPrefs,
            importedChannelIds: mergedChannelIds,
          },
          updatedAt: new Date(),
        },
      });

    this.logger.log(
      `User ${userId} imported ${extractedChannels.length} YouTube subscriptions (${mergedChannelIds.length} available).`,
    );

    return {
      importedCount: extractedChannels.length,
      totalAvailable: mergedChannelIds.length,
    };
  }

  /**
   * Lists the current user's imported/available YouTube channels with follow status.
   */
  async listChannels(userId: string): Promise<ChannelListResult> {
    const [existingPrefs] = await db
      .select({ feedPreferences: userPreferences.feedPreferences })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const importedIds = (
      existingPrefs?.feedPreferences as Record<string, unknown>
    )?.importedChannelIds;

    if (!Array.isArray(importedIds) || importedIds.length === 0) {
      return { channels: [], total: 0 };
    }

    const rows = await db
      .select({
        id: sources.id,
        externalId: sources.externalId,
        name: sources.name,
        url: sources.url,
        description: sources.description,
        thumbnailUrl: sources.imageUrl,
        isFollowed:
          sql<boolean>`${sourceSubscriptions.sourceId} IS NOT NULL`.as(
            'is_followed',
          ),
      })
      .from(sources)
      .leftJoin(
        sourceSubscriptions,
        and(
          eq(sourceSubscriptions.sourceId, sources.id),
          eq(sourceSubscriptions.userId, userId),
        ),
      )
      .where(
        and(
          eq(sources.type, 'youtube_channel'),
          inArray(sources.externalId, importedIds as string[]),
          eq(sources.isActive, true),
        ),
      )
      .orderBy(asc(sources.name));

    return {
      channels: rows.map((r) => ({
        id: r.id,
        externalId: r.externalId!,
        name: r.name,
        url: r.url,
        description: r.description,
        thumbnailUrl: r.thumbnailUrl,
        isFollowed: Boolean(r.isFollowed),
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

    await db
      .insert(sourceSubscriptions)
      .values({
        userId,
        sourceId: channel.id,
      })
      .onConflictDoNothing();

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

    await db
      .delete(sourceSubscriptions)
      .where(
        and(
          eq(sourceSubscriptions.userId, userId),
          eq(sourceSubscriptions.sourceId, channel.id),
        ),
      );

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
    const [existingPrefs] = await db
      .select({ feedPreferences: userPreferences.feedPreferences })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const importedIds = (
      existingPrefs?.feedPreferences as Record<string, unknown>
    )?.importedChannelIds;

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

    const idConditions = [];
    if (uuids.length > 0) {
      idConditions.push(inArray(sources.id, uuids));
    }
    if (externalIds.length > 0) {
      idConditions.push(inArray(sources.externalId, externalIds));
    }

    const matchingSources = await db
      .select()
      .from(sources)
      .where(
        and(
          eq(sources.type, 'youtube_channel'),
          eq(sources.isActive, true),
          or(...idConditions),
        ),
      );

    const sourceById = new Map(matchingSources.map((s) => [s.id, s]));
    const sourceByExternalId = new Map(
      matchingSources
        .filter((s) => Boolean(s.externalId))
        .map((s) => [s.externalId!, s]),
    );

    const missingIdentifiers: string[] = [];
    const resolvedChannels: Array<typeof sources.$inferSelect> = [];

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

    const existingSubs = await db
      .select({ sourceId: sourceSubscriptions.sourceId })
      .from(sourceSubscriptions)
      .where(
        and(
          eq(sourceSubscriptions.userId, userId),
          inArray(sourceSubscriptions.sourceId, targetSourceIds),
        ),
      );

    const existingSourceIdSet = new Set(existingSubs.map((s) => s.sourceId));
    const newSourceIds = targetSourceIds.filter(
      (id) => !existingSourceIdSet.has(id),
    );

    // 5. Insert new subscriptions in transaction
    if (newSourceIds.length > 0) {
      const executeInsert = async (executor: any) => {
        await executor
          .insert(sourceSubscriptions)
          .values(
            newSourceIds.map((sourceId) => ({
              userId,
              sourceId,
            })),
          )
          .onConflictDoNothing();
      };

      if (typeof db.transaction === 'function') {
        await db.transaction(async (tx: any) => {
          await executeInsert(tx);
        });
      } else {
        await executeInsert(db);
      }
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
    const [existingPrefs] = await db
      .select({ feedPreferences: userPreferences.feedPreferences })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const importedIds = (
      existingPrefs?.feedPreferences as Record<string, unknown>
    )?.importedChannelIds;

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
   * Resolves a channel record from `sources` by UUID or YouTube channel ID.
   */
  private async resolveChannelByIdentifier(identifier: string) {
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid channel identifier.',
      });
    }

    const trimmed = identifier.trim();
    const isUuid = UUID_REGEX.test(trimmed);

    const [channel] = await db
      .select()
      .from(sources)
      .where(
        and(
          eq(sources.type, 'youtube_channel'),
          isUuid ? eq(sources.id, trimmed) : eq(sources.externalId, trimmed),
        ),
      )
      .limit(1);

    if (!channel) {
      throw new NotFoundException({
        code: 'CHANNEL_NOT_FOUND',
        message: 'Channel not found.',
      });
    }

    return channel;
  }
}
