import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  db,
  desc,
  eq,
  gt,
  isNotNull,
  or,
  sql,
  sources,
  videoLibrary,
  videoNotes,
  videos,
} from '@locus/database';

export type LibraryTab = 'queue' | 'favorites' | 'history' | 'notes';

export interface LibraryNotesQuery {
  search?: string;
  channelId?: string;
  limit?: number;
  page?: number;
}

export interface LibraryNoteItem {
  id: string;
  videoId: string;
  youtubeVideoId: string;
  videoTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  url: string;
  channelId: string;
  channelName: string;
  channelThumbnailUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryNotesListResult {
  items: LibraryNoteItem[];
  total: number;
  creators: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}

export interface UpdateLibraryStateInput {
  isWatched?: boolean;
  isFavorite?: boolean;
  isBookmarked?: boolean;
  isInQueue?: boolean;
  progressSeconds?: number;
  lastOpened?: boolean;
}

export interface LibraryItem {
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
  library: {
    isWatched: boolean;
    isFavorite: boolean;
    isInQueue: boolean;
    progressSeconds: number;
  };
  watchedAt?: string | Date | null;
  lastOpenedAt?: string | Date | null;
  libraryUpdatedAt?: string | Date;
}

export interface LibraryListResult {
  items: LibraryItem[];
  total: number;
  tab: LibraryTab;
}

export interface UpdateLibraryStateResult {
  videoId: string;
  isWatched: boolean;
  isFavorite: boolean;
  isInQueue: boolean;
  progressSeconds: number;
  watchedAt?: string | Date | null;
  lastOpenedAt?: string | Date | null;
}

export function validateUpdateLibraryInput(
  input: unknown,
): UpdateLibraryStateInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Request body must be an object.',
    });
  }

  const data = input as Record<string, unknown>;
  const result: UpdateLibraryStateInput = {};

  if (data.isWatched !== undefined) {
    if (typeof data.isWatched !== 'boolean') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid isWatched. Expected a boolean.',
      });
    }
    result.isWatched = data.isWatched;
  }

  const favoriteVal = data.isFavorite !== undefined ? data.isFavorite : data.isBookmarked;
  if (favoriteVal !== undefined) {
    if (typeof favoriteVal !== 'boolean') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid isFavorite. Expected a boolean.',
      });
    }
    result.isFavorite = favoriteVal;
  }

  if (data.isInQueue !== undefined) {
    if (typeof data.isInQueue !== 'boolean') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid isInQueue. Expected a boolean.',
      });
    }
    result.isInQueue = data.isInQueue;
  }

  if (data.progressSeconds !== undefined) {
    if (
      typeof data.progressSeconds !== 'number' ||
      !Number.isInteger(data.progressSeconds) ||
      data.progressSeconds < 0
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid progressSeconds. Expected a non-negative integer.',
      });
    }
    result.progressSeconds = data.progressSeconds;
  }

  if (data.lastOpened !== undefined) {
    if (typeof data.lastOpened !== 'boolean') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid lastOpened. Expected a boolean.',
      });
    }
    result.lastOpened = data.lastOpened;
  }

  return result;
}

export function validateLibraryTab(tab: unknown): LibraryTab {
  if (tab === 'bookmarks') {
    return 'favorites';
  }
  if (tab !== 'queue' && tab !== 'favorites' && tab !== 'history' && tab !== 'notes') {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message:
        'Invalid library tab. Expected "queue", "favorites", "history", or "notes".',
    });
  }
  return tab;
}

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  /**
   * Fetches videos in the user's library corresponding to the specified tab.
   */
  async getLibraryItems(
    userId: string,
    tab: LibraryTab,
    options?: { limit?: number; status?: 'all' | 'in_progress' | 'completed' },
  ): Promise<LibraryListResult> {
    const rawLimit = options?.limit ?? 50;
    const limit = Math.min(Math.max(1, rawLimit), 100);
    const status = options?.status ?? 'all';

    let condition;
    let orderExpression;

    if (tab === 'queue') {
      condition = and(
        eq(videoLibrary.userId, userId),
        eq(videoLibrary.isInQueue, true),
      );
      orderExpression = desc(videoLibrary.updatedAt);
    } else if (tab === 'favorites') {
      condition = and(
        eq(videoLibrary.userId, userId),
        eq(videoLibrary.isFavorite, true),
      );
      orderExpression = desc(videoLibrary.updatedAt);
    } else {
      // History tab includes any video played/opened on Locus or marked watched
      const historyBaseCondition = or(
        isNotNull(videoLibrary.lastOpenedAt),
        gt(videoLibrary.progressSeconds, 0),
        eq(videoLibrary.isWatched, true),
      );

      if (status === 'in_progress') {
        condition = and(
          eq(videoLibrary.userId, userId),
          gt(videoLibrary.progressSeconds, 0),
          eq(videoLibrary.isWatched, false),
        );
      } else if (status === 'completed') {
        condition = and(
          eq(videoLibrary.userId, userId),
          eq(videoLibrary.isWatched, true),
        );
      } else {
        condition = and(eq(videoLibrary.userId, userId), historyBaseCondition);
      }

      orderExpression = desc(
        sql`COALESCE(${videoLibrary.lastOpenedAt}, ${videoLibrary.watchedAt}, ${videoLibrary.updatedAt})`,
      );
    }

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
        isFavorite: videoLibrary.isFavorite,
        isInQueue: videoLibrary.isInQueue,
        progressSeconds: videoLibrary.progressSeconds,
        watchedAt: videoLibrary.watchedAt,
        lastOpenedAt: videoLibrary.lastOpenedAt,
        libraryUpdatedAt: videoLibrary.updatedAt,
      })
      .from(videoLibrary)
      .innerJoin(videos, eq(videoLibrary.videoId, videos.id))
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .where(condition)
      .orderBy(orderExpression)
      .limit(limit);

    const items: LibraryItem[] = rows.map((row) => ({
      id: row.id,
      youtubeVideoId: row.youtubeVideoId,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      url: row.url,
      videoUrl: row.url,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : '',
      durationSeconds: row.durationSeconds,
      sourceId: row.sourceId,
      channelName: row.channelName,
      channelThumbnailUrl: row.channelThumbnailUrl,
      library: {
        isWatched: row.isWatched,
        isFavorite: row.isFavorite,
        isInQueue: row.isInQueue,
        progressSeconds: row.progressSeconds,
      },
      watchedAt: row.watchedAt,
      lastOpenedAt: row.lastOpenedAt,
      libraryUpdatedAt: row.libraryUpdatedAt,
    }));

    return {
      items,
      total: items.length,
      tab,
    };
  }

  /**
   * Updates or inserts a video library record for the authenticated user.
   * If a video is marked as watched, automatically removes it from the queue
   * while retaining its watched timestamp in History.
   */
  async updateVideoState(
    userId: string,
    videoId: string,
    rawInput: unknown,
  ): Promise<UpdateLibraryStateResult> {
    const input = validateUpdateLibraryInput(rawInput);

    // Verify video existence
    const [video] = await db
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video) {
      throw new NotFoundException({
        code: 'VIDEO_NOT_FOUND',
        message: `Video with ID ${videoId} was not found.`,
      });
    }

    const now = new Date();
    const updatePayload: Record<string, unknown> = {
      updatedAt: now,
    };

    if (input.isWatched !== undefined) {
      updatePayload.isWatched = input.isWatched;
      updatePayload.watchedAt = input.isWatched ? now : null;
      if (input.isWatched) {
        updatePayload.lastOpenedAt = now;
      }
    }

    // Queue completion rule:
    // If completed/marked watched, automatically remove from Watch Later / Queue
    if (input.isWatched === true) {
      updatePayload.isInQueue = false;
    } else if (input.isInQueue !== undefined) {
      updatePayload.isInQueue = input.isInQueue;
    }

    if (input.isFavorite !== undefined) {
      updatePayload.isFavorite = input.isFavorite;
    }

    if (input.progressSeconds !== undefined) {
      updatePayload.progressSeconds = input.progressSeconds;
      updatePayload.lastOpenedAt = now;
    }

    if (input.lastOpened === true) {
      updatePayload.lastOpenedAt = now;
    }

    const [upserted] = await db
      .insert(videoLibrary)
      .values({
        userId,
        videoId,
        isWatched: (updatePayload.isWatched as boolean) ?? false,
        watchedAt: (updatePayload.watchedAt as Date) ?? null,
        isFavorite: (updatePayload.isFavorite as boolean) ?? false,
        isInQueue: (updatePayload.isInQueue as boolean) ?? false,
        progressSeconds: (updatePayload.progressSeconds as number) ?? 0,
        lastOpenedAt: (updatePayload.lastOpenedAt as Date) ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [videoLibrary.userId, videoLibrary.videoId],
        set: updatePayload,
      })
      .returning();

    this.logger.log(
      `Updated library state for user ${userId} on video ${videoId} (watched: ${upserted.isWatched}, queue: ${upserted.isInQueue}, favorite: ${upserted.isFavorite})`,
    );

    return {
      videoId: upserted.videoId,
      isWatched: upserted.isWatched,
      isFavorite: upserted.isFavorite,
      isInQueue: upserted.isInQueue,
      progressSeconds: upserted.progressSeconds,
      watchedAt: upserted.watchedAt,
      lastOpenedAt: upserted.lastOpenedAt,
    };
  }

  /**
   * Clears all items currently in the user's Watch Later / Queue.
   */
  async clearQueue(userId: string): Promise<{ clearedCount: number }> {
    const result = await db
      .update(videoLibrary)
      .set({ isInQueue: false, updatedAt: new Date() })
      .where(
        and(
          eq(videoLibrary.userId, userId),
          eq(videoLibrary.isInQueue, true),
        ),
      )
      .returning({ id: videoLibrary.id });

    this.logger.log(`Cleared ${result.length} queued videos for user ${userId}`);
    return { clearedCount: result.length };
  }

  /**
   * Clears watch history for the user (sets isWatched to false and resets watchedAt).
   */
  async clearHistory(userId: string): Promise<{ clearedCount: number }> {
    const result = await db
      .update(videoLibrary)
      .set({
        isWatched: false,
        watchedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(videoLibrary.userId, userId),
          eq(videoLibrary.isWatched, true),
        ),
      )
      .returning({ id: videoLibrary.id });

    this.logger.log(
      `Cleared watch history (${result.length} videos) for user ${userId}`,
    );
    return { clearedCount: result.length };
  }

  /**
   * Retrieves private notes for the authenticated user with video and channel metadata.
   * Supports hybrid full-text & technical token search and creator filtering.
   */
  async getLibraryNotes(
    userId: string,
    query: LibraryNotesQuery = {},
  ): Promise<LibraryNotesListResult> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const page = Math.max(query.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const baseConditions = [
      eq(videoNotes.userId, userId),
      sql`length(trim(${videoNotes.content})) > 0`,
    ];

    if (query.channelId) {
      baseConditions.push(eq(sources.id, query.channelId));
    }

    const search = query.search?.trim();
    if (search) {
      baseConditions.push(
        or(
          // Full-text prose search (English dictionary)
          sql`to_tsvector('english', coalesce(${videoNotes.content}, '') || ' ' || coalesce(${videos.title}, '') || ' ' || coalesce(${sources.name}, '')) @@ plainto_tsquery('english', ${search})`,
          // Substring ILIKE fallback for exact code symbols (useActionState, C++, camelCase)
          sql`${videoNotes.content} ILIKE ${'%' + search + '%'}`,
          sql`${videos.title} ILIKE ${'%' + search + '%'}`,
          sql`${sources.name} ILIKE ${'%' + search + '%'}`,
        )!,
      );
    }

    // 1. Fetch distinct creators who have notes for this user (for creator filter dropdown)
    const creators = await db
      .select({
        id: sources.id,
        name: sources.name,
        count: sql<number>`count(${videoNotes.id})::int`,
      })
      .from(videoNotes)
      .innerJoin(videos, eq(videoNotes.videoId, videos.id))
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .where(
        and(
          eq(videoNotes.userId, userId),
          sql`length(trim(${videoNotes.content})) > 0`,
        ),
      )
      .groupBy(sources.id, sources.name)
      .orderBy(desc(sql`count(${videoNotes.id})`));

    // 2. Fetch total count of matching notes
    const [countRow] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(videoNotes)
      .innerJoin(videos, eq(videoNotes.videoId, videos.id))
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .where(and(...baseConditions));

    const total = countRow?.count ?? 0;

    // 3. Fetch paginated note rows
    const rows = await db
      .select({
        id: videoNotes.id,
        videoId: videos.id,
        youtubeVideoId: videos.youtubeVideoId,
        videoTitle: videos.title,
        thumbnailUrl: videos.thumbnailUrl,
        durationSeconds: videos.durationSeconds,
        url: videos.url,
        channelId: sources.id,
        channelName: sources.name,
        channelThumbnailUrl: sources.imageUrl,
        content: videoNotes.content,
        createdAt: videoNotes.createdAt,
        updatedAt: videoNotes.updatedAt,
      })
      .from(videoNotes)
      .innerJoin(videos, eq(videoNotes.videoId, videos.id))
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .where(and(...baseConditions))
      .orderBy(desc(videoNotes.updatedAt))
      .limit(limit)
      .offset(offset);

    const items: LibraryNoteItem[] = rows.map((row) => ({
      id: row.id,
      videoId: row.videoId,
      youtubeVideoId: row.youtubeVideoId,
      videoTitle: row.videoTitle,
      thumbnailUrl: row.thumbnailUrl,
      durationSeconds: row.durationSeconds,
      url: row.url,
      channelId: row.channelId,
      channelName: row.channelName,
      channelThumbnailUrl: row.channelThumbnailUrl,
      content: row.content,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt),
    }));

    return {
      items,
      total,
      creators,
    };
  }
}

