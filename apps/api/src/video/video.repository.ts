import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  eq,
  sources,
  videoLibrary,
  videoNotes,
  videos,
} from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../database/index.js';

export interface VideoWithSourceRecord {
  id: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  url: string;
  publishedAt: Date | string | null;
  durationSeconds: number | null;
  sourceId: string;
  channelName: string;
  channelThumbnailUrl: string | null;
}

export interface VideoWithLibraryRecord extends VideoWithSourceRecord {
  isWatched: boolean | null;
  isFavorite: boolean | null;
  isInQueue: boolean | null;
  progressSeconds: number | null;
  lastOpenedAt: Date | string | null;
  watchedAt: Date | string | null;
}

export interface VideoNoteRecord {
  videoId: string;
  content: string;
  updatedAt: Date | string | null;
}

@Injectable()
export class VideoRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findVideoWithLibrary(
    condition: { isUuid: boolean; identifier: string },
    userId: string,
  ): Promise<VideoWithLibraryRecord | null> {
    const identifierCondition = condition.isUuid
      ? eq(videos.id, condition.identifier)
      : eq(videos.youtubeVideoId, condition.identifier);

    const [row] = await this.db
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
        isFavorite: videoLibrary.isFavorite,
        isInQueue: videoLibrary.isInQueue,
        progressSeconds: videoLibrary.progressSeconds,
        lastOpenedAt: videoLibrary.lastOpenedAt,
        watchedAt: videoLibrary.watchedAt,
      })
      .from(videos)
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .leftJoin(
        videoLibrary,
        and(
          eq(videos.id, videoLibrary.videoId),
          eq(videoLibrary.userId, userId),
        ),
      )
      .where(identifierCondition)
      .limit(1);

    return row ?? null;
  }

  async findVideoWithSource(
    condition: { isUuid: boolean; identifier: string },
  ): Promise<VideoWithSourceRecord | null> {
    const identifierCondition = condition.isUuid
      ? eq(videos.id, condition.identifier)
      : eq(videos.youtubeVideoId, condition.identifier);

    const [row] = await this.db
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
      })
      .from(videos)
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .where(identifierCondition)
      .limit(1);

    return row ?? null;
  }

  async touchLastOpenedAt(
    userId: string,
    videoId: string,
    libraryState: {
      isWatched?: boolean | null;
      isFavorite?: boolean | null;
      isInQueue?: boolean | null;
      progressSeconds?: number | null;
    },
    now = new Date(),
  ): Promise<void> {
    await this.db
      .insert(videoLibrary)
      .values({
        userId,
        videoId,
        isWatched: libraryState.isWatched ?? false,
        isFavorite: libraryState.isFavorite ?? false,
        isInQueue: libraryState.isInQueue ?? false,
        progressSeconds: libraryState.progressSeconds ?? 0,
        lastOpenedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [videoLibrary.userId, videoLibrary.videoId],
        set: {
          lastOpenedAt: now,
          updatedAt: now,
        },
      });
  }

  async findVideoId(
    condition: { isUuid: boolean; identifier: string },
  ): Promise<string | null> {
    const identifierCondition = condition.isUuid
      ? eq(videos.id, condition.identifier)
      : eq(videos.youtubeVideoId, condition.identifier);

    const [video] = await this.db
      .select({ id: videos.id })
      .from(videos)
      .where(identifierCondition)
      .limit(1);

    return video?.id ?? null;
  }

  async findNote(
    videoId: string,
    userId: string,
  ): Promise<VideoNoteRecord | null> {
    const [note] = await this.db
      .select({
        videoId: videoNotes.videoId,
        content: videoNotes.content,
        updatedAt: videoNotes.updatedAt,
      })
      .from(videoNotes)
      .where(
        and(
          eq(videoNotes.videoId, videoId),
          eq(videoNotes.userId, userId),
        ),
      )
      .limit(1);

    return note ?? null;
  }

  async upsertNote(
    videoId: string,
    userId: string,
    content: string,
    now = new Date(),
  ): Promise<VideoNoteRecord> {
    const [upserted] = await this.db
      .insert(videoNotes)
      .values({
        userId,
        videoId,
        content: content ?? '',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [videoNotes.userId, videoNotes.videoId],
        set: {
          content: content ?? '',
          updatedAt: now,
        },
      })
      .returning();

    return {
      videoId: upserted.videoId,
      content: upserted.content,
      updatedAt: upserted.updatedAt,
    };
  }
}

