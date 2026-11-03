import { Injectable, Logger } from '@nestjs/common';
import { SearchRepository } from './search.repository.js';

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
  const clean = content.replace(/[#*`_~[\]]/g, ' ').replace(/\s+/g, ' ').trim();
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

  constructor(private readonly searchRepo: SearchRepository) {}

  /**
   * Executes unified omni-search across videos, user's private notes, and channels.
   */
  async search(
    query?: string,
    userId?: string,
    limit = 5,
  ): Promise<GlobalSearchResponse> {
    const q = query?.trim();
    if (!q || !userId) {
      return { videos: [], notes: [], channels: [] };
    }

    // Check if the user has an active, connected YouTube integration
    const isConnected = await this.searchRepo.hasConnectedYouTubeIntegration(userId);
    if (!isConnected) {
      return { videos: [], notes: [], channels: [] };
    }

    const searchLimit = Math.min(Math.max(limit, 1), 20);

    // 1. Search Videos (strictly from channels followed by user on Locus)
    const videoRows = await this.searchRepo.searchVideos(userId, q, searchLimit);
    const mappedVideos: GlobalSearchVideoItem[] = videoRows.map((v) => ({
      id: v.id,
      youtubeVideoId: v.youtubeVideoId,
      title: v.title,
      channelName: v.channelName,
      thumbnailUrl: v.thumbnailUrl,
      durationSeconds: v.durationSeconds,
      publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
    }));

    // 2. Search Personal Notes (scoped to authenticated user and followed channels)
    const noteRows = await this.searchRepo.searchNotes(userId, q, searchLimit);
    const mappedNotes: GlobalSearchNoteItem[] = noteRows.map((n) => ({
      id: n.id,
      videoId: n.videoId,
      videoTitle: n.videoTitle,
      channelName: n.channelName,
      snippet: extractNoteSnippet(n.content, q),
      updatedAt: n.updatedAt.toISOString(),
    }));

    // 3. Search Channels (strictly channels followed by user on Locus)
    const channelRows = await this.searchRepo.searchChannels(userId, q, searchLimit);
    const mappedChannels: GlobalSearchChannelItem[] = channelRows.map((c) => ({
      id: c.id,
      externalId: c.externalId,
      name: c.name,
      thumbnailUrl: c.thumbnailUrl,
      isFollowed: true,
    }));

    return {
      videos: mappedVideos,
      notes: mappedNotes,
      channels: mappedChannels,
    };
  }
}
