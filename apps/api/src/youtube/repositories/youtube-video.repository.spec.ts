import { beforeEach, describe, expect, it, vi } from 'vitest';
import { YoutubeVideoRepository } from './youtube-video.repository.js';
import type { DrizzleDb } from '../../database/index.js';

describe('YoutubeVideoRepository', () => {
  let repository: YoutubeVideoRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
    };

    repository = new YoutubeVideoRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('upsertVideo', () => {
    it('inserts or updates video record and returns inserted id', async () => {
      const mockQuery = {
        values: vi.fn().mockReturnValueOnce({
          onConflictDoUpdate: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([{ id: 'vid_123' }]),
          }),
        }),
      };
      mockDb.insert.mockReturnValueOnce(mockQuery);

      const payload = {
        youtubeVideoId: 'yt_abc',
        sourceId: 'src_1',
        title: 'Video Title',
        description: 'Video Description',
        thumbnailUrl: 'https://thumb.jpg',
        durationSeconds: 120,
        publishedAt: new Date(),
        url: 'https://youtube.com/watch?v=yt_abc',
      };

      const result = await repository.upsertVideo(payload, false);
      expect(result).toBe('vid_123');
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('initializes tagging state if ai tagging is enabled and insertedId is present', async () => {
      const mockQuery = {
        values: vi.fn().mockReturnValueOnce({
          onConflictDoUpdate: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([{ id: 'vid_123' }]),
          }),
        }),
      };
      mockDb.insert
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValueOnce({
            onConflictDoNothing: vi.fn().mockResolvedValueOnce([]),
          }),
        });

      const payload = {
        youtubeVideoId: 'yt_abc',
        sourceId: 'src_1',
        title: 'Video Title',
        description: 'Video Description',
        thumbnailUrl: 'https://thumb.jpg',
        durationSeconds: 120,
        publishedAt: new Date(),
        url: 'https://youtube.com/watch?v=yt_abc',
      };

      const result = await repository.upsertVideo(payload, true);
      expect(result).toBe('vid_123');
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });
  });
});

