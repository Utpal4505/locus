import { Inject, Injectable } from '@nestjs/common';
import {
  and,
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
import { DRIZZLE_DB, type DrizzleDb } from '../database/index.js';

export interface FeedVideoRow {
  id: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  url: string;
  publishedAt: Date | null;
  effectiveTimestamp: Date | null;
  durationSeconds: number | null;
  sourceId: string;
  channelName: string;
  channelThumbnailUrl: string | null;
  isWatched: boolean | null;
  isFavorite: boolean | null;
  isInQueue: boolean | null;
  progressSeconds: number | null;
  taggingStatus: 'pending' | 'submitted' | 'completed' | 'failed' | null;
}

export interface VideoTagRow {
  videoId: string;
  id: string;
  name: string;
  slug: string;
}

export interface FeedQueryOptions {
  limit: number;
  feedMode: 'normal' | 'tagged_only';
  isAiTaggingEnabled: boolean;
  topics?: string[];
  status?: 'unwatched' | 'watched' | 'all';
  cursor?: {
    publishedAt: Date;
    id: string;
  };
}

@Injectable()
export class FeedRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getUserFeedMode(userId: string): Promise<'normal' | 'tagged_only' | null> {
    const [userPref] = await this.db
      .select({ feedMode: userPreferences.feedMode })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return (userPref?.feedMode as 'normal' | 'tagged_only') ?? null;
  }

  async findFeedVideos(
    userId: string,
    options: FeedQueryOptions,
  ): Promise<FeedVideoRow[]> {
    const conditions = [
      eq(sources.isActive, true),
      isNotNull(videos.publishedAt),
    ];

    if (options.isAiTaggingEnabled && options.feedMode === 'tagged_only') {
      conditions.push(
        eq(videoTaggingStates.status, 'completed'),
        sql`EXISTS (SELECT 1 FROM ${videoTopics} WHERE ${videoTopics.videoId} = ${videos.id})`,
      );
    }

    if (options.isAiTaggingEnabled && options.topics && options.topics.length > 0) {
      const cleanTopics = options.topics
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (cleanTopics.length > 0) {
        const topicVideoSubquery = this.db
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

    const isWatchedTab = options.status === 'watched';
    const sortTimestamp = isWatchedTab
      ? sql<Date>`COALESCE(${videoLibrary.watchedAt}, ${videoLibrary.lastOpenedAt}, ${videoLibrary.updatedAt}, ${videos.publishedAt})`
      : videos.publishedAt;

    if (options.status === 'unwatched') {
      conditions.push(
        or(isNull(videoLibrary.isWatched), eq(videoLibrary.isWatched, false))!,
      );
    } else if (isWatchedTab) {
      conditions.push(eq(videoLibrary.isWatched, true));
    }

    if (options.cursor) {
      if (isWatchedTab) {
        conditions.push(
          or(
            sql`${sortTimestamp} < ${options.cursor.publishedAt.toISOString()}::timestamptz`,
            and(
              sql`${sortTimestamp} = ${options.cursor.publishedAt.toISOString()}::timestamptz`,
              lt(videos.id, options.cursor.id),
            ),
          )!,
        );
      } else {
        conditions.push(
          or(
            lt(videos.publishedAt, options.cursor.publishedAt),
            and(
              eq(videos.publishedAt, options.cursor.publishedAt),
              lt(videos.id, options.cursor.id),
            ),
          )!,
        );
      }
    }

    const rows = await this.db
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
      .limit(options.limit + 1);

    return rows;
  }

  async findVideoTags(videoIds: string[]): Promise<VideoTagRow[]> {
    if (videoIds.length === 0) return [];

    return this.db
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
  }
}

