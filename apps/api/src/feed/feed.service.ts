import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FeedRepository } from './feed.repository.js';

export type FeedStatusFilter = 'unwatched' | 'watched' | 'all';
export type FeedMode = 'normal' | 'tagged_only';

export interface FeedCursorPayload {
  publishedAt: string;
  id: string;
}

export interface GetFeedOptions {
  limit?: number;
  cursor?: string;
  status?: FeedStatusFilter;
  feedMode?: FeedMode;
  topics?: string[];
}

export interface FeedItemLibraryState {
  isWatched: boolean;
  isFavorite: boolean;
  isInQueue: boolean;
  progressSeconds: number;
}

export interface TopicTag {
  id: string;
  name: string;
  slug: string;
}

export interface FeedItem {
  id: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  url: string;
  videoUrl: string;
  publishedAt: string;
  durationSeconds: number | null;
  sourceId: string;
  channelName: string;
  channelThumbnailUrl: string | null;
  library: FeedItemLibraryState | null;
  tags: TopicTag[];
  taggingStatus?: 'pending' | 'submitted' | 'completed' | 'failed' | null;
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Encodes a compound cursor (publishedAt timestamp + unique video UUID) as a URL-safe base64 string.
 */
export function encodeFeedCursor(publishedAt: Date, id: string): string {
  const payload: FeedCursorPayload = {
    publishedAt: publishedAt.toISOString(),
    id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

/**
 * Decodes and validates a URL-safe base64 compound cursor.
 * Throws BadRequestException if the cursor is corrupt, malformed, or contains invalid dates/UUIDs.
 */
export function decodeFeedCursor(cursorStr: string): {
  publishedAt: Date;
  id: string;
} {
  try {
    const jsonStr = Buffer.from(cursorStr, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as FeedCursorPayload;

    if (
      !payload ||
      typeof payload.publishedAt !== 'string' ||
      typeof payload.id !== 'string'
    ) {
      throw new Error('Invalid cursor structure');
    }

    const publishedAt = new Date(payload.publishedAt);
    if (isNaN(publishedAt.getTime())) {
      throw new Error('Invalid cursor publication date');
    }

    if (!UUID_REGEX.test(payload.id)) {
      throw new Error('Invalid cursor video UUID');
    }

    return { publishedAt, id: payload.id };
  } catch {
    throw new BadRequestException({
      code: 'INVALID_CURSOR',
      message: 'The provided pagination cursor is invalid or malformed.',
    });
  }
}

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(private readonly feedRepo: FeedRepository) {}

  /**
   * Fetches the chronological main feed for the authenticated user.
   * Returns videos exclusively from channels followed by the user (via source_subscriptions).
   * Supports stable cursor-based pagination and left-joins user-specific library state.
   */
  async getFeed(
    userId: string,
    options?: GetFeedOptions,
  ): Promise<FeedResponse> {
    const rawLimit = options?.limit ?? 20;
    const limit = Math.min(Math.max(1, rawLimit), 50);

    // 1. Resolve feedMode (explicit option overrides saved user preference)
    let feedMode = options?.feedMode;
    if (!feedMode) {
      const savedFeedMode = await this.feedRepo.getUserFeedMode(userId);
      feedMode = savedFeedMode || 'normal';
    }

    const isAiTaggingEnabled = process.env.AI_VIDEO_TAGGING_ENABLED === 'true';
    const isWatchedTab = options?.status === 'watched';

    let cursorPayload: { publishedAt: Date; id: string } | undefined;
    if (options?.cursor && options.cursor.trim()) {
      cursorPayload = decodeFeedCursor(options.cursor.trim());
    }

    const rows = await this.feedRepo.findFeedVideos(userId, {
      limit,
      feedMode,
      isAiTaggingEnabled,
      topics: options?.topics,
      status: options?.status,
      cursor: cursorPayload,
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const lastItem = pageRows[pageRows.length - 1];
      if (lastItem) {
        const cursorTime = isWatchedTab
          ? (lastItem.effectiveTimestamp ?? lastItem.publishedAt)
          : lastItem.publishedAt;
        if (cursorTime) {
          nextCursor = encodeFeedCursor(new Date(cursorTime), lastItem.id);
        }
      }
    }

    // Batch-load tags for the returned page of videos
    const videoIds = pageRows.map((r) => r.id);
    const tagMap = new Map<string, TopicTag[]>();

    if (isAiTaggingEnabled && videoIds.length > 0) {
      const tagRows = await this.feedRepo.findVideoTags(videoIds);

      for (const tr of tagRows) {
        const list = tagMap.get(tr.videoId) || [];
        list.push({ id: tr.id, name: tr.name, slug: tr.slug });
        tagMap.set(tr.videoId, list);
      }
    }

    const items: FeedItem[] = pageRows.map((row) => ({
      id: row.id,
      youtubeVideoId: row.youtubeVideoId,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      url: row.url,
      videoUrl: row.url,
      publishedAt: row.publishedAt!.toISOString(),
      durationSeconds: row.durationSeconds,
      sourceId: row.sourceId,
      channelName: row.channelName,
      channelThumbnailUrl: row.channelThumbnailUrl,
      library:
        row.isWatched !== null && row.isWatched !== undefined
          ? {
              isWatched: Boolean(row.isWatched),
              isFavorite: Boolean(row.isFavorite),
              isInQueue: Boolean(row.isInQueue),
              progressSeconds: Number(row.progressSeconds ?? 0),
            }
          : null,
      tags: isAiTaggingEnabled ? (tagMap.get(row.id) || []) : [],
      taggingStatus: isAiTaggingEnabled ? (row.taggingStatus ?? null) : null,
    }));

    return {
      items,
      nextCursor,
      hasMore,
    };
  }
}
