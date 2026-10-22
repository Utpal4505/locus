import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  and,
  db,
  eq,
  sources,
  videoLibrary,
  videoNotes,
  videos,
} from '@locus/database';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface VideoDetailLibraryState {
  isWatched: boolean;
  isFavorite: boolean;
  isInQueue: boolean;
  progressSeconds: number;
  lastOpenedAt?: string | Date | null;
  watchedAt?: string | Date | null;
}

export interface VideoDetailResult {
  id: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  url: string;
  videoUrl: string;
  publishedAt: string | null;
  durationSeconds: number | null;
  sourceId: string;
  channelName: string;
  channelThumbnailUrl: string | null;
  library: VideoDetailLibraryState | null;
}

export interface VideoNoteResult {
  videoId: string;
  content: string;
  updatedAt: string | Date | null;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  /**
   * Retrieves full video details by either internal UUID or YouTube video ID.
   * If userId is provided, returns personal library state and updates lastOpenedAt.
   * If unauthenticated guest, returns library as null for complete privacy.
   */
  async getVideoById(
    idOrYoutubeId: string,
    userId?: string,
  ): Promise<VideoDetailResult> {
    const isUuid = UUID_REGEX.test(idOrYoutubeId);
    const identifierCondition = isUuid
      ? eq(videos.id, idOrYoutubeId)
      : eq(videos.youtubeVideoId, idOrYoutubeId);

    if (userId) {
      const [row] = await db
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

      if (!row) {
        throw new NotFoundException({
          code: 'VIDEO_NOT_FOUND',
          message: `Video with identifier ${idOrYoutubeId} was not found.`,
        });
      }

      const now = new Date();
      await db
        .insert(videoLibrary)
        .values({
          userId,
          videoId: row.id,
          isWatched: row.isWatched ?? false,
          isFavorite: row.isFavorite ?? false,
          isInQueue: row.isInQueue ?? false,
          progressSeconds: row.progressSeconds ?? 0,
          lastOpenedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [videoLibrary.userId, videoLibrary.videoId],
          set: {
            lastOpenedAt: now,
            updatedAt: now,
          },
        })
        .catch((err) => {
          this.logger.warn(
            `Failed to update lastOpenedAt for user ${userId} on video ${row.id}: ${err.message}`,
          );
        });

      return {
        id: row.id,
        youtubeVideoId: row.youtubeVideoId,
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        url: row.url,
        videoUrl: row.url,
        publishedAt: row.publishedAt
          ? new Date(row.publishedAt).toISOString()
          : null,
        durationSeconds: row.durationSeconds,
        sourceId: row.sourceId,
        channelName: row.channelName,
        channelThumbnailUrl: row.channelThumbnailUrl,
        library: {
          isWatched: Boolean(row.isWatched),
          isFavorite: Boolean(row.isFavorite),
          isInQueue: Boolean(row.isInQueue),
          progressSeconds: row.progressSeconds ?? 0,
          lastOpenedAt: row.lastOpenedAt ?? now,
          watchedAt: row.watchedAt ?? null,
        },
      };
    } else {
      const [row] = await db
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

      if (!row) {
        throw new NotFoundException({
          code: 'VIDEO_NOT_FOUND',
          message: `Video with identifier ${idOrYoutubeId} was not found.`,
        });
      }

      return {
        id: row.id,
        youtubeVideoId: row.youtubeVideoId,
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        url: row.url,
        videoUrl: row.url,
        publishedAt: row.publishedAt
          ? new Date(row.publishedAt).toISOString()
          : null,
        durationSeconds: row.durationSeconds,
        sourceId: row.sourceId,
        channelName: row.channelName,
        channelThumbnailUrl: row.channelThumbnailUrl,
        library: null,
      };
    }
  }

  /**
   * Retrieves private notes for a video for the authenticated user.
   */
  async getVideoNotes(
    idOrYoutubeId: string,
    userId: string,
  ): Promise<VideoNoteResult> {
    const isUuid = UUID_REGEX.test(idOrYoutubeId);
    const identifierCondition = isUuid
      ? eq(videos.id, idOrYoutubeId)
      : eq(videos.youtubeVideoId, idOrYoutubeId);

    const [video] = await db
      .select({ id: videos.id })
      .from(videos)
      .where(identifierCondition)
      .limit(1);

    if (!video) {
      throw new NotFoundException({
        code: 'VIDEO_NOT_FOUND',
        message: `Video with identifier ${idOrYoutubeId} was not found.`,
      });
    }

    const [note] = await db
      .select({
        videoId: videoNotes.videoId,
        content: videoNotes.content,
        updatedAt: videoNotes.updatedAt,
      })
      .from(videoNotes)
      .where(
        and(
          eq(videoNotes.videoId, video.id),
          eq(videoNotes.userId, userId),
        ),
      )
      .limit(1);

    return {
      videoId: video.id,
      content: note?.content ?? '',
      updatedAt: note?.updatedAt ?? null,
    };
  }

  /**
   * Saves or updates private notes for a video for the authenticated user.
   */
  async upsertVideoNotes(
    idOrYoutubeId: string,
    userId: string,
    content: string,
  ): Promise<VideoNoteResult> {
    const isUuid = UUID_REGEX.test(idOrYoutubeId);
    const identifierCondition = isUuid
      ? eq(videos.id, idOrYoutubeId)
      : eq(videos.youtubeVideoId, idOrYoutubeId);

    const [video] = await db
      .select({ id: videos.id })
      .from(videos)
      .where(identifierCondition)
      .limit(1);

    if (!video) {
      throw new NotFoundException({
        code: 'VIDEO_NOT_FOUND',
        message: `Video with identifier ${idOrYoutubeId} was not found.`,
      });
    }

    const now = new Date();
    const [upserted] = await db
      .insert(videoNotes)
      .values({
        userId,
        videoId: video.id,
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
