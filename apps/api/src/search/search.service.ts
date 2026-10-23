import { Injectable, Logger } from '@nestjs/common';
import {
  and,
  db,
  desc,
  eq,
  ilike,
  or,
  sources,
  sourceSubscriptions,
  sql,
  videoNotes,
  videos,
} from '@locus/database';

export interface GlobalSearchVideoItem {
  id: string;
  youtubeVideoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
}

export interface GlobalSearchNoteItem {
  id: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  snippet: string;
  updatedAt: string;
}

export interface GlobalSearchChannelItem {
  id: string;
  externalId: string | null;
  name: string;
  thumbnailUrl: string | null;
  isFollowed: boolean;
}

export interface GlobalSearchResponse {
  videos: GlobalSearchVideoItem[];
  notes: GlobalSearchNoteItem[];
  channels: GlobalSearchChannelItem[];
}

/**
 * Extracts a concise, clean contextual snippet around the first match of query.
 */
export function extractNoteSnippet(content: string, query: string, maxLength = 120): string {
  if (!content) return '';
  const clean = content.replace(/[#*`_~\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!query || !query.trim()) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '...' : '');
  }

  const lowerContent = clean.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '...' : '');
  }

  const start = Math.max(0, matchIndex - 35);
  const end = Math.min(clean.length, matchIndex + lowerQuery.length + 75);
  let snippet = clean.slice(start, end).trim();

  if (start > 0) snippet = '...' + snippet;
  if (end < clean.length) snippet = snippet + '...';

  return snippet;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  /**
   * Executes unified omni-search across videos, user's private notes, and channels.
   */
  async search(
    query?: string,
    userId?: string,
    limit = 5,
  ): Promise<GlobalSearchResponse> {
    const q = query?.trim();
    if (!q) {
      return { videos: [], notes: [], channels: [] };
    }

    const searchLimit = Math.min(Math.max(limit, 1), 20);

    // 1. Search Videos
    const videoRows = await db
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
      .where(
        and(
          eq(sources.isActive, true),
          or(
            ilike(videos.title, `%${q}%`),
            ilike(sources.name, `%${q}%`),
            sql`to_tsvector('english', coalesce(${videos.title}, '')) @@ plainto_tsquery('english', ${q})`,
          ),
        ),
      )
      .orderBy(desc(videos.publishedAt))
      .limit(searchLimit);

    const mappedVideos: GlobalSearchVideoItem[] = videoRows.map((v) => ({
      id: v.id,
      youtubeVideoId: v.youtubeVideoId,
      title: v.title,
      channelName: v.channelName,
      thumbnailUrl: v.thumbnailUrl,
      durationSeconds: v.durationSeconds,
      publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
    }));

    // 2. Search Personal Notes (scoped to authenticated user)
    let mappedNotes: GlobalSearchNoteItem[] = [];
    if (userId) {
      const noteRows = await db
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
        .where(
          and(
            eq(videoNotes.userId, userId),
            sql`length(trim(${videoNotes.content})) > 0`,
            or(
              ilike(videoNotes.content, `%${q}%`),
              ilike(videos.title, `%${q}%`),
              ilike(sources.name, `%${q}%`),
              sql`to_tsvector('english', coalesce(${videoNotes.content}, '')) @@ plainto_tsquery('english', ${q})`,
            ),
          ),
        )
        .orderBy(desc(videoNotes.updatedAt))
        .limit(searchLimit);

      mappedNotes = noteRows.map((n) => ({
        id: n.id,
        videoId: n.videoId,
        videoTitle: n.videoTitle,
        channelName: n.channelName,
        snippet: extractNoteSnippet(n.content, q),
        updatedAt: n.updatedAt.toISOString(),
      }));
    }

    // 3. Search Channels
    const channelRows = await db
      .select({
        id: sources.id,
        externalId: sources.externalId,
        name: sources.name,
        thumbnailUrl: sources.imageUrl,
        isFollowed: userId
          ? sql<boolean>`${sourceSubscriptions.sourceId} IS NOT NULL`
          : sql<boolean>`false`,
      })
      .from(sources)
      .leftJoin(
        sourceSubscriptions,
        userId
          ? and(
              eq(sourceSubscriptions.sourceId, sources.id),
              eq(sourceSubscriptions.userId, userId),
            )
          : sql`1 = 0`,
      )
      .where(
        and(
          eq(sources.type, 'youtube_channel'),
          eq(sources.isActive, true),
          ilike(sources.name, `%${q}%`),
        ),
      )
      .limit(searchLimit);

    const mappedChannels: GlobalSearchChannelItem[] = channelRows.map((c) => ({
      id: c.id,
      externalId: c.externalId,
      name: c.name,
      thumbnailUrl: c.thumbnailUrl,
      isFollowed: Boolean(c.isFollowed),
    }));

    return {
      videos: mappedVideos,
      notes: mappedNotes,
      channels: mappedChannels,
    };
  }
}

