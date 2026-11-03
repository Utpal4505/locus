import { Inject, Injectable } from '@nestjs/common';
import {
  and,
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
import { DRIZZLE_DB, type DrizzleDb } from '../database/index.js';

export type VideoLibraryRecord = typeof videoLibrary.$inferSelect;
export type InsertVideoLibraryRecord = typeof videoLibrary.$inferInsert;

export interface LibraryVideoRow {
  id: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  url: string;
  publishedAt: Date | null;
  durationSeconds: number | null;
  sourceId: string;
  channelName: string;
  channelThumbnailUrl: string | null;
  isWatched: boolean;
  isFavorite: boolean;
  isInQueue: boolean;
  progressSeconds: number;
  watchedAt: Date | null;
  lastOpenedAt: Date | null;
  libraryUpdatedAt: Date;
}

export interface LibraryNoteRow {
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

@Injectable()
export class LibraryRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findLibraryVideos(
    userId: string,
    tab: 'queue' | 'favorites' | 'history' | 'notes',
    options?: { limit?: number; status?: 'all' | 'in_progress' | 'completed' },
  ): Promise<LibraryVideoRow[]> {
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

    const rows = await this.db
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

    return rows;
  }

  async findVideoExists(videoId: string): Promise<boolean> {
    const [video] = await this.db
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    return Boolean(video);
  }

  async upsertLibraryState(
    userId: string,
    videoId: string,
    initialValues: InsertVideoLibraryRecord,
    updatePayload: Record<string, unknown>,
  ): Promise<VideoLibraryRecord> {
    const [upserted] = await this.db
      .insert(videoLibrary)
      .values(initialValues)
      .onConflictDoUpdate({
        target: [videoLibrary.userId, videoLibrary.videoId],
        set: updatePayload,
      })
      .returning();

    return upserted;
  }

  async clearQueue(userId: string): Promise<number> {
    const result = await this.db
      .update(videoLibrary)
      .set({ isInQueue: false, updatedAt: new Date() })
      .where(
        and(
          eq(videoLibrary.userId, userId),
          eq(videoLibrary.isInQueue, true),
        ),
      )
      .returning({ id: videoLibrary.id });

    return result.length;
  }

  async clearHistory(userId: string): Promise<number> {
    const result = await this.db
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

    return result.length;
  }

  async findNoteCreators(
    userId: string,
  ): Promise<Array<{ id: string; name: string; count: number }>> {
    const creators = await this.db
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

    return creators;
  }

  async findNotesWithCount(
    userId: string,
    query: {
      channelId?: string;
      search?: string;
      limit: number;
      offset: number;
    },
  ): Promise<{ rows: LibraryNoteRow[]; total: number }> {
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
          sql`to_tsvector('english', coalesce(${videoNotes.content}, '') || ' ' || coalesce(${videos.title}, '') || ' ' || coalesce(${sources.name}, '')) @@ plainto_tsquery('english', ${search})`,
          sql`${videoNotes.content} ILIKE ${'%' + search + '%'}`,
          sql`${videos.title} ILIKE ${'%' + search + '%'}`,
          sql`${sources.name} ILIKE ${'%' + search + '%'}`,
        )!,
      );
    }

    const [countRow] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(videoNotes)
      .innerJoin(videos, eq(videoNotes.videoId, videos.id))
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .where(and(...baseConditions));

    const total = countRow?.count ?? 0;

    const rows = await this.db
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
      .limit(query.limit)
      .offset(query.offset);

    return { rows, total };
  }
}

