import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { VideoRepository } from './video.repository.js';

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

  constructor(private readonly videoRepo: VideoRepository) {}

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
    const condition = { isUuid, identifier: idOrYoutubeId };

    if (userId) {
      const row = await this.videoRepo.findVideoWithLibrary(condition, userId);

      if (!row) {
        throw new NotFoundException({
          code: 'VIDEO_NOT_FOUND',
          message: `Video with identifier ${idOrYoutubeId} was not found.`,
        });
      }

      const now = new Date();
      this.videoRepo
        .touchLastOpenedAt(
          userId,
          row.id,
          {
            isWatched: row.isWatched,
            isFavorite: row.isFavorite,
            isInQueue: row.isInQueue,
            progressSeconds: row.progressSeconds,
          },
          now,
        )
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to update lastOpenedAt for user ${userId} on video ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
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
      const row = await this.videoRepo.findVideoWithSource(condition);

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
    const videoId = await this.videoRepo.findVideoId({
      isUuid,
      identifier: idOrYoutubeId,
    });

    if (!videoId) {
      throw new NotFoundException({
        code: 'VIDEO_NOT_FOUND',
        message: `Video with identifier ${idOrYoutubeId} was not found.`,
      });
    }

    const note = await this.videoRepo.findNote(videoId, userId);

    return {
      videoId,
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
    const videoId = await this.videoRepo.findVideoId({
      isUuid,
      identifier: idOrYoutubeId,
    });

    if (!videoId) {
      throw new NotFoundException({
        code: 'VIDEO_NOT_FOUND',
        message: `Video with identifier ${idOrYoutubeId} was not found.`,
      });
    }

    const upserted = await this.videoRepo.upsertNote(
      videoId,
      userId,
      content,
    );

    return {
      videoId: upserted.videoId,
      content: upserted.content,
      updatedAt: upserted.updatedAt,
    };
  }
}
