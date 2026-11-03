import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryRepository } from './library.repository.js';
import type { DrizzleDb } from '../database/index.js';

describe('LibraryRepository', () => {
  let repository: LibraryRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    repository = new LibraryRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('findLibraryVideos', () => {
    it('returns queued videos ordered by updatedAt', async () => {
      const mockRows = [{ id: 'vid-1', title: 'Video 1', isInQueue: true }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockRows),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await repository.findLibraryVideos('usr-1', 'queue');
      expect(res).toEqual(mockRows);
    });

    it('returns history videos with in_progress status filter', async () => {
      const mockRows = [{ id: 'vid-2', title: 'Video 2', progressSeconds: 100 }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockRows),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await repository.findLibraryVideos('usr-1', 'history', {
        status: 'in_progress',
      });
      expect(res).toEqual(mockRows);
    });
  });

  describe('findVideoExists', () => {
    it('returns true when video exists', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'vid-1' }]),
          }),
        }),
      });

      const exists = await repository.findVideoExists('vid-1');
      expect(exists).toBe(true);
    });

    it('returns false when video does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const exists = await repository.findVideoExists('vid-999');
      expect(exists).toBe(false);
    });
  });

  describe('upsertLibraryState', () => {
    it('upserts and returns record', async () => {
      const mockRow = { userId: 'usr-1', videoId: 'vid-1', isWatched: true };
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockRow]),
          }),
        }),
      });

      const res = await repository.upsertLibraryState(
        'usr-1',
        'vid-1',
        { userId: 'usr-1', videoId: 'vid-1' } as any,
        { isWatched: true },
      );
      expect(res).toEqual(mockRow);
    });
  });

  describe('clearQueue and clearHistory', () => {
    it('updates queue items and returns count', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
          }),
        }),
      });

      const count = await repository.clearQueue('usr-1');
      expect(count).toBe(2);
    });

    it('updates history items and returns count', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: '1' }]),
          }),
        }),
      });

      const count = await repository.clearHistory('usr-1');
      expect(count).toBe(1);
    });
  });

  describe('findNoteCreators and findNotesWithCount', () => {
    it('returns note creators', async () => {
      const mockCreators = [{ id: 'src-1', name: 'Channel', count: 3 }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockCreators),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await repository.findNoteCreators('usr-1');
      expect(res).toEqual(mockCreators);
    });

    it('returns notes with total count', async () => {
      const mockRows = [{ id: 'note-1', content: 'note' }];
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([{ count: 1 }]),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue(mockRows),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
        });

      const res = await repository.findNotesWithCount('usr-1', {
        limit: 10,
        offset: 0,
      });
      expect(res.total).toBe(1);
      expect(res.rows).toEqual(mockRows);
    });
  });
});
