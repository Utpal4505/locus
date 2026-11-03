import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchRepository } from './search.repository.js';
import type { DrizzleDb } from '../database/index.js';

describe('SearchRepository', () => {
  let repository: SearchRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
    };
    repository = new SearchRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('hasConnectedYouTubeIntegration', () => {
    it('returns true when connected integration exists', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'int-1' }]),
          }),
        }),
      });

      const res = await repository.hasConnectedYouTubeIntegration('usr-1');
      expect(res).toBe(true);
    });

    it('returns false when no connected integration exists', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const res = await repository.hasConnectedYouTubeIntegration('usr-1');
      expect(res).toBe(false);
    });
  });

  describe('searchVideos', () => {
    it('queries videos joined with sources and subscriptions', async () => {
      const mockVideos = [{ id: 'vid-1', title: 'React Guide' }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockVideos),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await repository.searchVideos('usr-1', 'React', 5);
      expect(res).toEqual(mockVideos);
    });
  });

  describe('searchNotes', () => {
    it('queries notes joined with videos, sources, and subscriptions', async () => {
      const mockNotes = [{ id: 'note-1', content: 'React notes' }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue(mockNotes),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await repository.searchNotes('usr-1', 'React', 5);
      expect(res).toEqual(mockNotes);
    });
  });

  describe('searchChannels', () => {
    it('queries channels followed by user matching query', async () => {
      const mockChannels = [{ id: 'src-1', name: 'Channel 1' }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockChannels),
            }),
          }),
        }),
      });

      const res = await repository.searchChannels('usr-1', 'Channel', 5);
      expect(res).toEqual(mockChannels);
    });
  });
});

