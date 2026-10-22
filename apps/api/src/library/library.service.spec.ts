import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@locus/database';
import type { User } from '../auth/auth.js';
import {
  LibraryService,
  validateLibraryTab,
  validateUpdateLibraryInput,
} from './library.service.js';
import { LibraryController } from './library.controller.js';

describe('LibraryService & LibraryController', () => {
  let service: LibraryService;
  let controller: LibraryController;

  const mockUser: User = {
    id: 'usr_lib_123',
    email: 'user@example.com',
    name: 'Utpal',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new LibraryService();
    controller = new LibraryController(service);
    vi.restoreAllMocks();
  });

  describe('Validation Functions', () => {
    it('validates library tab values accurately', () => {
      expect(validateLibraryTab('queue')).toBe('queue');
      expect(validateLibraryTab('favorites')).toBe('favorites');
      expect(validateLibraryTab('bookmarks')).toBe('favorites');
      expect(validateLibraryTab('history')).toBe('history');
      expect(() => validateLibraryTab('invalid-tab')).toThrow(
        BadRequestException,
      );
    });

    it('validates update library input accurately', () => {
      const valid = validateUpdateLibraryInput({
        isWatched: true,
        isFavorite: false,
        isInQueue: true,
        progressSeconds: 120,
      });
      expect(valid).toEqual({
        isWatched: true,
        isFavorite: false,
        isInQueue: true,
        progressSeconds: 120,
      });

      expect(() => validateUpdateLibraryInput(null)).toThrow(
        BadRequestException,
      );
      expect(() =>
        validateUpdateLibraryInput({ isWatched: 'true' as any }),
      ).toThrow(BadRequestException);
      expect(() =>
        validateUpdateLibraryInput({ progressSeconds: -10 }),
      ).toThrow(BadRequestException);
    });
  });

  describe('getLibraryItems', () => {
    it('returns queued videos formatted with channel and library state', async () => {
      const mockRows = [
        {
          id: 'vid-1',
          youtubeVideoId: 'yt-1',
          title: 'Queued Video',
          description: 'A great video',
          thumbnailUrl: 'https://thumb/1.jpg',
          url: 'https://youtube.com/watch?v=yt-1',
          publishedAt: new Date('2026-10-20T10:00:00Z'),
          durationSeconds: 360,
          sourceId: 'src-1',
          channelName: 'Channel One',
          channelThumbnailUrl: 'https://thumb/c1.jpg',
          isWatched: false,
          isFavorite: false,
          isInQueue: true,
          progressSeconds: 0,
          watchedAt: null,
          lastOpenedAt: null,
          libraryUpdatedAt: new Date(),
        },
      ];

      vi.spyOn(db, 'select').mockReturnValue({
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
      } as any);

      const result = await service.getLibraryItems('usr_lib_123', 'queue');
      expect(result.tab).toBe('queue');
      expect(result.total).toBe(1);
      expect(result.items[0]?.title).toBe('Queued Video');
      expect(result.items[0]?.library.isInQueue).toBe(true);
    });
  });

  describe('updateVideoState', () => {
    it('throws NotFoundException if video does not exist', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        service.updateVideoState('usr_lib_123', 'vid-999', {
          isWatched: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('upserts library state and auto-removes from queue when marked as watched', async () => {
      // 1. Mock video existence check
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'vid-1' }]),
          }),
        }),
      } as any);

      // 2. Mock upsert
      const mockUpserted = {
        userId: 'usr_lib_123',
        videoId: 'vid-1',
        isWatched: true,
        isFavorite: false,
        isInQueue: false, // Auto-cleared!
        progressSeconds: 0,
        watchedAt: new Date(),
        lastOpenedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpserted]),
          }),
        }),
      } as any);

      const result = await service.updateVideoState('usr_lib_123', 'vid-1', {
        isWatched: true,
      });

      expect(result.videoId).toBe('vid-1');
      expect(result.isWatched).toBe(true);
      expect(result.isInQueue).toBe(false);
      expect(result.watchedAt).toBeDefined();
    });

    it('sets isInQueue when requested', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'vid-1' }]),
          }),
        }),
      } as any);

      const mockUpserted = {
        userId: 'usr_lib_123',
        videoId: 'vid-1',
        isWatched: false,
        isFavorite: false,
        isInQueue: true,
        progressSeconds: 0,
        watchedAt: null,
        lastOpenedAt: null,
        updatedAt: new Date(),
      };

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpserted]),
          }),
        }),
      } as any);

      const result = await service.updateVideoState('usr_lib_123', 'vid-1', {
        isInQueue: true,
      });

      expect(result.isInQueue).toBe(true);
      expect(result.isWatched).toBe(false);
    });
  });

  describe('clearQueue and clearHistory', () => {
    it('clears queue items and returns count', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
          }),
        }),
      } as any);

      const res = await service.clearQueue('usr_lib_123');
      expect(res.clearedCount).toBe(2);
    });

    it('clears history items and returns count', async () => {
      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: '1' }]),
          }),
        }),
      } as any);

      const res = await service.clearHistory('usr_lib_123');
      expect(res.clearedCount).toBe(1);
    });
  });

  describe('LibraryController', () => {
    it('delegates getLibrary to service', async () => {
      const mockResult = {
        items: [],
        total: 0,
        tab: 'queue' as const,
      };

      const spy = vi
        .spyOn(service, 'getLibraryItems')
        .mockResolvedValue(mockResult);

      const result = await controller.getLibrary(mockUser, 'queue', '20');
      expect(spy).toHaveBeenCalledWith(mockUser.id, 'queue', {
        limit: 20,
        status: 'all',
      });
      expect(result).toEqual(mockResult);
    });

    it('delegates getLibrary with history status filter to service', async () => {
      const mockResult = {
        items: [],
        total: 0,
        tab: 'history' as const,
      };

      const spy = vi
        .spyOn(service, 'getLibraryItems')
        .mockResolvedValue(mockResult);

      const result = await controller.getLibrary(
        mockUser,
        'history',
        '50',
        'in_progress',
      );
      expect(spy).toHaveBeenCalledWith(mockUser.id, 'history', {
        limit: 50,
        status: 'in_progress',
      });
      expect(result).toEqual(mockResult);
    });

    it('delegates updateVideoState to service', async () => {
      const mockResult = {
        videoId: 'vid-1',
        isWatched: true,
        isFavorite: false,
        isInQueue: false,
        progressSeconds: 0,
      };

      const spy = vi
        .spyOn(service, 'updateVideoState')
        .mockResolvedValue(mockResult);

      const payload = { isWatched: true };
      const result = await controller.updateVideoState(
        mockUser,
        'vid-1',
        payload,
      );
      expect(spy).toHaveBeenCalledWith(mockUser.id, 'vid-1', payload);
      expect(result).toEqual(mockResult);
    });

    it('delegates clearQueue and clearHistory to service', async () => {
      const qSpy = vi
        .spyOn(service, 'clearQueue')
        .mockResolvedValue({ clearedCount: 5 });
      const hSpy = vi
        .spyOn(service, 'clearHistory')
        .mockResolvedValue({ clearedCount: 10 });

      const qRes = await controller.clearQueue(mockUser);
      expect(qSpy).toHaveBeenCalledWith(mockUser.id);
      expect(qRes).toEqual({ clearedCount: 5 });

      const hRes = await controller.clearHistory(mockUser);
      expect(hSpy).toHaveBeenCalledWith(mockUser.id);
      expect(hRes).toEqual({ clearedCount: 10 });
    });
  });
});

