import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoRepository } from './video.repository.js';
import type { DrizzleDb } from '../database/index.js';

describe('VideoRepository', () => {
  let repository: VideoRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
    };
    repository = new VideoRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('findVideoWithLibrary', () => {
    it('returns joined video with library when found', async () => {
      const mockRow = { id: 'vid-1', title: 'Video 1', isWatched: true };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockRow]),
              }),
            }),
          }),
        }),
      });

      const res = await repository.findVideoWithLibrary(
        { isUuid: true, identifier: 'vid-1' },
        'usr-1',
      );
      expect(res).toEqual(mockRow);
    });

    it('returns null when not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const res = await repository.findVideoWithLibrary(
        { isUuid: false, identifier: 'yt-123' },
        'usr-1',
      );
      expect(res).toBeNull();
    });
  });

  describe('findVideoWithSource', () => {
    it('returns video with source details', async () => {
      const mockRow = { id: 'vid-1', title: 'Video 1' };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockRow]),
            }),
          }),
        }),
      });

      const res = await repository.findVideoWithSource({
        isUuid: true,
        identifier: 'vid-1',
      });
      expect(res).toEqual(mockRow);
    });
  });

  describe('touchLastOpenedAt', () => {
    it('upserts lastOpenedAt on conflict', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue([]),
        }),
      });

      await repository.touchLastOpenedAt('usr-1', 'vid-1', { isWatched: false });
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('findVideoId', () => {
    it('returns id if found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'vid-1' }]),
          }),
        }),
      });

      const res = await repository.findVideoId({
        isUuid: false,
        identifier: 'yt-1',
      });
      expect(res).toBe('vid-1');
    });
  });

  describe('findNote and upsertNote', () => {
    it('returns note if found', async () => {
      const mockNote = { videoId: 'vid-1', content: 'note', updatedAt: new Date() };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockNote]),
          }),
        }),
      });

      const res = await repository.findNote('vid-1', 'usr-1');
      expect(res).toEqual(mockNote);
    });

    it('upserts and returns note', async () => {
      const mockNote = { videoId: 'vid-1', content: 'new note', updatedAt: new Date() };
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockNote]),
          }),
        }),
      });

      const res = await repository.upsertNote('vid-1', 'usr-1', 'new note');
      expect(res).toEqual(mockNote);
    });
  });
});

