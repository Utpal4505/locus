import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  ilike,
  integrations,
  or,
  sources,
  sourceSubscriptions,
  sql,
  videoNotes,
  videos,
} from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../database/index.js';

export interface SearchVideoRow {
  id: string;
  youtubeVideoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  publishedAt: Date | null;
}

export interface SearchNoteRow {
  id: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  content: string;
  updatedAt: Date;
}

export interface SearchChannelRow {
  id: string;
  externalId: string | null;
  name: string;
  thumbnailUrl: string | null;
  isFollowed: boolean;
}

@Injectable()
export class SearchRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async hasConnectedYouTubeIntegration(userId: string): Promise<boolean> {
    const [integration] = await this.db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'youtube'),
          eq(integrations.status, 'connected'),
        ),
      )
      .limit(1);

    return Boolean(integration);
  }

  async searchVideos(
    userId: string,
    query: string,
    limit: number,
  ): Promise<SearchVideoRow[]> {
    return this.db
      .select({
        id: videos.id,
        youtubeVideoId: videos.youtubeVideoId,
        title: videos.title,
        channelName: sources.name,
        thumbnailUrl: videos.thumbnailUrl,
        durationSeconds: videos.durationSeconds,
        publishedAt: videos.publishedAt,
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
      .where(
        and(
          eq(sources.isActive, true),
          or(
            ilike(videos.title, `%${query}%`),
            ilike(sources.name, `%${query}%`),
            sql`to_tsvector('english', coalesce(${videos.title}, '')) @@ plainto_tsquery('english', ${query})`,
          ),
        ),
      )
      .orderBy(desc(videos.publishedAt))
      .limit(limit);
  }

  async searchNotes(
    userId: string,
    query: string,
    limit: number,
  ): Promise<SearchNoteRow[]> {
    return this.db
      .select({
        id: videoNotes.id,
        videoId: videoNotes.videoId,
        videoTitle: videos.title,
        channelName: sources.name,
        content: videoNotes.content,
        updatedAt: videoNotes.updatedAt,
      })
      .from(videoNotes)
      .innerJoin(videos, eq(videoNotes.videoId, videos.id))
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .innerJoin(
        sourceSubscriptions,
        and(
          eq(sources.id, sourceSubscriptions.sourceId),
          eq(sourceSubscriptions.userId, userId),
        ),
      )
      .where(
        and(
          eq(videoNotes.userId, userId),
          sql`length(trim(${videoNotes.content})) > 0`,
          or(
            ilike(videoNotes.content, `%${query}%`),
            ilike(videos.title, `%${query}%`),
            ilike(sources.name, `%${query}%`),
            sql`to_tsvector('english', coalesce(${videoNotes.content}, '')) @@ plainto_tsquery('english', ${query})`,
          ),
        ),
      )
      .orderBy(desc(videoNotes.updatedAt))
      .limit(limit);
  }

  async searchChannels(
    userId: string,
    query: string,
    limit: number,
  ): Promise<SearchChannelRow[]> {
    return this.db
      .select({
        id: sources.id,
        externalId: sources.externalId,
        name: sources.name,
        thumbnailUrl: sources.imageUrl,
        isFollowed: sql<boolean>`true`,
      })
      .from(sources)
      .innerJoin(
        sourceSubscriptions,
        and(
          eq(sources.id, sourceSubscriptions.sourceId),
          eq(sourceSubscriptions.userId, userId),
        ),
      )
      .where(
        and(
          eq(sources.type, 'youtube_channel'),
          eq(sources.isActive, true),
          ilike(sources.name, `%${query}%`),
        ),
      )
      .limit(limit);
  }
}

