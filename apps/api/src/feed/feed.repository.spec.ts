import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedRepository } from './feed.repository.js';
import type { DrizzleDb } from '../database/index.js';

describe('FeedRepository', () => {
  let repository: FeedRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
    };
    repository = new FeedRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('getUserFeedMode', () => {
    it('returns saved feedMode when present', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ feedMode: 'tagged_only' }]),
          }),
        }),
      });

      const mode = await repository.getUserFeedMode('usr-1');
      expect(mode).toBe('tagged_only');
    });

    it('returns null when preferences record absent', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mode = await repository.getUserFeedMode('usr-1');
      expect(mode).toBeNull();
    });
  });

  describe('findFeedVideos', () => {
    it('queries feed videos with joins and limit', async () => {
      const mockRows = [{ id: 'vid-1', title: 'Video 1' }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue(mockRows),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const rows = await repository.findFeedVideos('usr-1', {
        limit: 10,
        feedMode: 'normal',
        isAiTaggingEnabled: false,
      });

      expect(rows).toEqual(mockRows);
    });
  });

  describe('findVideoTags', () => {
    it('returns empty array when videoIds is empty', async () => {
      const tags = await repository.findVideoTags([]);
      expect(tags).toEqual([]);
    });

    it('returns tags joined from videoTopics and topics', async () => {
      const mockTags = [{ videoId: 'vid-1', id: 'top-1', name: 'AI', slug: 'ai' }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockTags),
            }),
          }),
        }),
      });

      const tags = await repository.findVideoTags(['vid-1']);
      expect(tags).toEqual(mockTags);
    });
  });
});

