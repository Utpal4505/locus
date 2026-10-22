import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  and,
  db,
  eq,
  sources,
  videoLibrary,
  videos,
} from '@locus/database';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface VideoDetailLibraryState {
  isWatched: boolean;
  isBookmarked: boolean;
  isInQueue: boolean;
  progressSeconds: number;
  notes?: string | null;
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

    const selectFields: Record<string, unknown> = {
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
    };

    if (userId) {
      selectFields.isWatched = videoLibrary.isWatched;
      selectFields.isBookmarked = videoLibrary.isBookmarked;
      selectFields.isInQueue = videoLibrary.isInQueue;
      selectFields.progressSeconds = videoLibrary.progressSeconds;
      selectFields.notes = videoLibrary.notes;
      selectFields.lastOpenedAt = videoLibrary.lastOpenedAt;
      selectFields.watchedAt = videoLibrary.watchedAt;
    }

    const baseQuery = db
      .select(selectFields as any)
      .from(videos)
      .innerJoin(sources, eq(videos.sourceId, sources.id));

    const finalQuery = userId
      ? baseQuery.leftJoin(
          videoLibrary,
          and(
            eq(videos.id, videoLibrary.videoId),
            eq(videoLibrary.userId, userId),
          ),
        )
      : baseQuery;

    const [row] = await finalQuery.where(identifierCondition).limit(1);

    if (!row) {
      throw new NotFoundException({
        code: 'VIDEO_NOT_FOUND',
        message: `Video with identifier ${idOrYoutubeId} was not found.`,
      });
    }

    // If authenticated, update lastOpenedAt timestamp in background/session
    if (userId) {
      const now = new Date();
      await db
        .insert(videoLibrary)
        .values({
          userId,
          videoId: row.id,
          isWatched: row.isWatched ?? false,
          isBookmarked: row.isBookmarked ?? false,
          isInQueue: row.isInQueue ?? false,
          progressSeconds: row.progressSeconds ?? 0,
          notes: row.notes ?? null,
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
    }

    const library: VideoDetailLibraryState | null = userId
      ? {
          isWatched: Boolean(row.isWatched),
          isBookmarked: Boolean(row.isBookmarked),
          isInQueue: Boolean(row.isInQueue),
          progressSeconds: row.progressSeconds ?? 0,
          notes: row.notes ?? null,
          lastOpenedAt: row.lastOpenedAt ?? new Date(),
          watchedAt: row.watchedAt ?? null,
        }
      : null;

    return {
      id: row.id,
      youtubeVideoId: row.youtubeVideoId,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      url: row.url,
      videoUrl: row.url,
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      durationSeconds: row.durationSeconds,
      sourceId: row.sourceId,
      channelName: row.channelName,
      channelThumbnailUrl: row.channelThumbnailUrl,
      library,
    };
  }
}
