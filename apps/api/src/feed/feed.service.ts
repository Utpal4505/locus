import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  and,
  db,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sources,
  sourceSubscriptions,
  sql,
  topics,
  userPreferences,
  videoLibrary,
  videos,
  videoTaggingStates,
  videoTopics,
} from '@locus/database';

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
      const [userPref] = await db
        .select({ feedMode: userPreferences.feedMode })
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
      feedMode = (userPref?.feedMode as FeedMode) || 'normal';
    }

    const conditions = [
      eq(sources.isActive, true),
      isNotNull(videos.publishedAt),
    ];

    const isAiTaggingEnabled = process.env.AI_VIDEO_TAGGING_ENABLED === 'true';

    // Tag-based only feed mode: requires completed tagging with >= 1 tag (only when AI tagging is enabled)
    if (isAiTaggingEnabled && feedMode === 'tagged_only') {
      conditions.push(
        eq(videoTaggingStates.status, 'completed'),
        sql`EXISTS (SELECT 1 FROM ${videoTopics} WHERE ${videoTopics.videoId} = ${videos.id})`,
      );
    }

    // Filter by topic slugs using ANY-match semantics (only when AI tagging is enabled)
    if (isAiTaggingEnabled && options?.topics && options.topics.length > 0) {
      const cleanTopics = options.topics
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (cleanTopics.length > 0) {
        const topicVideoSubquery = db
          .select({ videoId: videoTopics.videoId })
          .from(videoTopics)
          .innerJoin(topics, eq(videoTopics.topicId, topics.id))
          .where(
            and(
              inArray(topics.slug, cleanTopics),
              eq(topics.isActive, true),
            ),
          );

        conditions.push(inArray(videos.id, topicVideoSubquery));
      }
    }

    const isWatchedTab = options?.status === 'watched';
    const sortTimestamp = isWatchedTab
      ? sql<Date>`COALESCE(${videoLibrary.watchedAt}, ${videoLibrary.lastOpenedAt}, ${videoLibrary.updatedAt}, ${videos.publishedAt})`
      : videos.publishedAt;

    if (options?.status === 'unwatched') {
      conditions.push(
        or(isNull(videoLibrary.isWatched), eq(videoLibrary.isWatched, false))!,
      );
    } else if (isWatchedTab) {
      conditions.push(eq(videoLibrary.isWatched, true));
    }

    if (options?.cursor && options.cursor.trim()) {
      const cursor = decodeFeedCursor(options.cursor.trim());
      if (isWatchedTab) {
        conditions.push(
          or(
            sql`${sortTimestamp} < ${cursor.publishedAt.toISOString()}::timestamptz`,
            and(
              sql`${sortTimestamp} = ${cursor.publishedAt.toISOString()}::timestamptz`,
              lt(videos.id, cursor.id),
            ),
          )!,
        );
      } else {
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
        effectiveTimestamp: sortTimestamp,
        durationSeconds: videos.durationSeconds,
        sourceId: sources.id,
        channelName: sources.name,
        channelThumbnailUrl: sources.imageUrl,
        isWatched: videoLibrary.isWatched,
        isFavorite: videoLibrary.isFavorite,
        isInQueue: videoLibrary.isInQueue,
        progressSeconds: videoLibrary.progressSeconds,
        taggingStatus: videoTaggingStates.status,
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
      .leftJoin(
        videoTaggingStates,
        eq(videos.id, videoTaggingStates.videoId),
      )
      .where(and(...conditions))
      .orderBy(desc(sortTimestamp), desc(videos.id))
      .limit(limit + 1);

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
      const tagRows = await db
        .select({
          videoId: videoTopics.videoId,
          id: topics.id,
          name: topics.name,
          slug: topics.slug,
        })
        .from(videoTopics)
        .innerJoin(topics, eq(videoTopics.topicId, topics.id))
        .where(
          and(
            inArray(videoTopics.videoId, videoIds),
            eq(topics.isActive, true),
          ),
        )
        .orderBy(topics.name);

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
