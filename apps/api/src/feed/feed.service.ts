import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  and,
  db,
  desc,
  eq,
  isNotNull,
  lt,
  or,
  sources,
  sourceSubscriptions,
  videoLibrary,
  videos,
} from '@locus/database';

export interface FeedCursorPayload {
  publishedAt: string;
  id: string;
}

export interface GetFeedOptions {
  limit?: number;
  cursor?: string;
}

export interface FeedItemLibraryState {
  isWatched: boolean;
  isBookmarked: boolean;
  isInQueue: boolean;
  progressSeconds: number;
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

    const conditions = [
      eq(sources.isActive, true),
      isNotNull(videos.publishedAt),
    ];

    if (options?.cursor && options.cursor.trim()) {
      const cursor = decodeFeedCursor(options.cursor.trim());
      conditions.push(
        or(
          lt(videos.publishedAt, cursor.publishedAt),
          and(
            eq(videos.publishedAt, cursor.publishedAt),
            lt(videos.id, cursor.id),
          ),
        )!,
      );
    }

    // Query limit + 1 to reliably detect whether another page exists
    const rows = await db
      .select({
        id: videos.id,
        youtubeVideoId: videos.youtubeVideoId,
        title: videos.title,
        description: videos.description,
        thumbnailUrl: videos.thumbnailUrl,
        url: videos.url,
        publishedAt: videos.publishedAt,
        durationSeconds: videos.durationSeconds,
        sourceId: sources.id,
        channelName: sources.name,
        channelThumbnailUrl: sources.imageUrl,
        isWatched: videoLibrary.isWatched,
        isBookmarked: videoLibrary.isBookmarked,
        isInQueue: videoLibrary.isInQueue,
        progressSeconds: videoLibrary.progressSeconds,
      })
      .from(videos)
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .innerJoin(
        sourceSubscriptions,
        and(
          eq(sources.id, sourceSubscriptions.sourceId),
          eq(sourceSubscriptions.userId, userId),
        ),
      )
      .leftJoin(
        videoLibrary,
        and(
          eq(videos.id, videoLibrary.videoId),
          eq(videoLibrary.userId, userId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(videos.publishedAt), desc(videos.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const lastItem = pageRows[pageRows.length - 1];
      if (lastItem && lastItem.publishedAt) {
        nextCursor = encodeFeedCursor(lastItem.publishedAt, lastItem.id);
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
              isBookmarked: Boolean(row.isBookmarked),
              isInQueue: Boolean(row.isInQueue),
              progressSeconds: Number(row.progressSeconds ?? 0),
            }
          : null,
    }));

    return {
      items,
      nextCursor,
      hasMore,
    };
  }
}
