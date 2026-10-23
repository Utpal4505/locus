import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@locus/database';
import {
  extractNoteSnippet,
  SearchService,
} from './search.service.js';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new SearchService();
  });

  describe('extractNoteSnippet', () => {
    it('returns empty string for empty or null content', () => {
      expect(extractNoteSnippet('', 'test')).toBe('');
      expect(extractNoteSnippet(null as any, 'test')).toBe('');
    });

    it('returns beginning of content when query is empty', () => {
      const content = 'This is a long piece of note text explaining architecture concepts in depth.';
      const snippet = extractNoteSnippet(content, '', 30);
      expect(snippet).toBe('This is a long piece of note t...');
    });

    it('extracts text centered around the keyword match and strips markdown', () => {
      const content =
        '# Introduction\nIn this section, we study **state machines** and their event loop dynamics in Node.js.';
      const snippet = extractNoteSnippet(content, 'state machines');
      expect(snippet).toContain('state machines');
      expect(snippet).not.toContain('**');
      expect(snippet).not.toContain('#');
    });

    it('adds leading and trailing ellipses when match is in the middle of long text', () => {
      const before = 'A'.repeat(80);
      const after = 'B'.repeat(120);
      const content = `${before} KEYWORD ${after}`;
      const snippet = extractNoteSnippet(content, 'KEYWORD');

      expect(snippet.startsWith('...')).toBe(true);
      expect(snippet.endsWith('...')).toBe(true);
      expect(snippet).toContain('KEYWORD');
    });
  });

  describe('search query execution', () => {
    it('returns empty result set immediately if query is empty or whitespace', async () => {
      const res1 = await service.search('');
      const res2 = await service.search('   ');
      const res3 = await service.search(undefined);

      expect(res1).toEqual({ videos: [], notes: [], channels: [] });
      expect(res2).toEqual({ videos: [], notes: [], channels: [] });
      expect(res3).toEqual({ videos: [], notes: [], channels: [] });
    });

    it('executes video, notes, and channels search queries with userId', async () => {
      const mockPublishedAt = new Date('2026-10-20T12:00:00Z');
      const mockUpdatedAt = new Date('2026-10-22T14:30:00Z');

      const selectSpy = vi.spyOn(db, 'select');

      // 1. Videos query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce([
                  {
                    id: '00000000-0000-0000-0000-000000000001',
                    youtubeVideoId: 'yt-123',
                    title: 'TypeScript Performance Guide',
                    channelName: 'Jack Herrington',
                    thumbnailUrl: 'https://img.youtube.com/vi/yt-123/hqdefault.jpg',
                    durationSeconds: 1240,
                    publishedAt: mockPublishedAt,
                  },
                ]),
              }),
            }),
          }),
        }),
      } as any);

      // 2. Notes query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            innerJoin: vi.fn().mockReturnValueOnce({
              where: vi.fn().mockReturnValueOnce({
                orderBy: vi.fn().mockReturnValueOnce({
                  limit: vi.fn().mockResolvedValueOnce([
                    {
                      id: '00000000-0000-0000-0000-000000000002',
                      videoId: '00000000-0000-0000-0000-000000000001',
                      videoTitle: 'TypeScript Performance Guide',
                      channelName: 'Jack Herrington',
                      content: 'Important rule: always benchmark TypeScript compilation with tsc --extendedDiagnostics',
                      updatedAt: mockUpdatedAt,
                    },
                  ]),
                }),
              }),
            }),
          }),
        }),
      } as any);

      // 3. Channels query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          leftJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([
                {
                  id: '00000000-0000-0000-0000-000000000003',
                  externalId: 'UC_jack',
                  name: 'Jack Herrington',
                  thumbnailUrl: 'https://channel/avatar.jpg',
                  isFollowed: true,
                },
              ]),
            }),
          }),
        }),
      } as any);

      const result = await service.search('TypeScript', 'usr_test_123', 5);

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].title).toBe('TypeScript Performance Guide');
      expect(result.videos[0].publishedAt).toBe(mockPublishedAt.toISOString());

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].snippet).toContain('TypeScript');
      expect(result.notes[0].updatedAt).toBe(mockUpdatedAt.toISOString());

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].name).toBe('Jack Herrington');
      expect(result.channels[0].isFollowed).toBe(true);
    });

    it('omits notes search when userId is not provided', async () => {
      const selectSpy = vi.spyOn(db, 'select');

      // 1. Videos query
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce([]),
              }),
            }),
          }),
        }),
      } as any);

      // 2. Channels query (notes query is skipped because no userId)
      selectSpy.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          leftJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([]),
            }),
          }),
        }),
      } as any);

      const result = await service.search('React', undefined, 5);

      expect(result.videos).toEqual([]);
      expect(result.notes).toEqual([]);
      expect(result.channels).toEqual([]);
      // Ensure only 2 queries were executed (videos & channels, not notes)
      expect(selectSpy).toHaveBeenCalledTimes(2);
    });
  });
});

