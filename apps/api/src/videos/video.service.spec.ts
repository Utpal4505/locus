import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@locus/database';
import type { User } from '../auth/auth.js';
import { VideoService } from './video.service.js';
import { VideoController } from './video.controller.js';

describe('VideoService & VideoController', () => {
  let service: VideoService;
  let controller: VideoController;

  const mockUser: User = {
    id: 'usr_test_123',
    email: 'user@example.com',
    name: 'Test User',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleVideoId = '11111111-1111-1111-1111-111111111111';
  const sampleYoutubeId = 'dQw4w9WgXcQ';

  beforeEach(() => {
    service = new VideoService();
    controller = new VideoController(service);
    vi.restoreAllMocks();
  });

  describe('getVideoById', () => {
    it('throws NotFoundException when video does not exist', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      await expect(
        service.getVideoById(sampleVideoId, undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns video details with null library for unauthenticated guest', async () => {
      const mockDbRow = {
        id: sampleVideoId,
        youtubeVideoId: sampleYoutubeId,
        title: 'Sample Video Title',
        description: 'Sample description text',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        publishedAt: new Date('2026-10-18T10:00:00Z'),
        durationSeconds: 212,
        sourceId: '22222222-2222-2222-2222-222222222222',
        channelName: 'Rick Astley',
        channelThumbnailUrl: 'https://example.com/rick.jpg',
      };

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockDbRow]),
            }),
          }),
        }),
      } as any);

      const result = await service.getVideoById(sampleYoutubeId, undefined);

      expect(result.id).toBe(sampleVideoId);
      expect(result.youtubeVideoId).toBe(sampleYoutubeId);
      expect(result.title).toBe('Sample Video Title');
      expect(result.channelName).toBe('Rick Astley');
      expect(result.library).toBeNull();
    });

    it('returns video details with library state for authenticated user', async () => {
      const mockDbRow = {
        id: sampleVideoId,
        youtubeVideoId: sampleYoutubeId,
        title: 'Sample Video Title',
        description: 'Sample description text',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        publishedAt: new Date('2026-10-18T10:00:00Z'),
        durationSeconds: 212,
        sourceId: '22222222-2222-2222-2222-222222222222',
        channelName: 'Rick Astley',
        channelThumbnailUrl: 'https://example.com/rick.jpg',
        isWatched: true,
        isBookmarked: false,
        isInQueue: false,
        progressSeconds: 195,
        lastOpenedAt: new Date(),
        watchedAt: new Date(),
      };

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockDbRow]),
              }),
            }),
          }),
        }),
      } as any);

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.getVideoById(sampleVideoId, mockUser.id);

      expect(result.id).toBe(sampleVideoId);
      expect(result.library).not.toBeNull();
      expect(result.library?.isWatched).toBe(true);
      expect(result.library?.progressSeconds).toBe(195);
    });
  });

  describe('getVideoNotes & upsertVideoNotes', () => {
    it('returns empty notes string if no notes exist yet', async () => {
      // First select: finds video
      // Second select: finds no notes
      let callCount = 0;
      vi.spyOn(db, 'select').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: sampleVideoId }]),
              }),
            }),
          } as any;
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any;
      });

      const res = await service.getVideoNotes(sampleVideoId, mockUser.id);
      expect(res.videoId).toBe(sampleVideoId);
      expect(res.content).toBe('');
      expect(res.updatedAt).toBeNull();
    });

    it('returns existing notes content when found', async () => {
      const now = new Date();
      let callCount = 0;
      vi.spyOn(db, 'select').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: sampleVideoId }]),
              }),
            }),
          } as any;
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { videoId: sampleVideoId, content: 'My technical notes', updatedAt: now },
              ]),
            }),
          }),
        } as any;
      });

      const res = await service.getVideoNotes(sampleVideoId, mockUser.id);
      expect(res.videoId).toBe(sampleVideoId);
      expect(res.content).toBe('My technical notes');
      expect(res.updatedAt).toEqual(now);
    });

    it('upserts notes content successfully', async () => {
      const now = new Date();
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: sampleVideoId }]),
          }),
        }),
      } as any);

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { videoId: sampleVideoId, content: 'Updated notes', updatedAt: now },
            ]),
          }),
        }),
      } as any);

      const res = await service.upsertVideoNotes(
        sampleVideoId,
        mockUser.id,
        'Updated notes',
      );
      expect(res.videoId).toBe(sampleVideoId);
      expect(res.content).toBe('Updated notes');
      expect(res.updatedAt).toEqual(now);
    });
  });

  describe('VideoController', () => {
    it('delegates to VideoService with user ID if authenticated', async () => {
      const spy = vi.spyOn(service, 'getVideoById').mockResolvedValueOnce({
        id: sampleVideoId,
        youtubeVideoId: sampleYoutubeId,
        title: 'Test',
        description: null,
        thumbnailUrl: null,
        url: 'https://youtube.com',
        videoUrl: 'https://youtube.com',
        publishedAt: null,
        durationSeconds: 100,
        sourceId: 'src_1',
        channelName: 'Channel',
        channelThumbnailUrl: null,
        library: null,
      });

      const res = await controller.getVideo(sampleVideoId, mockUser);

      expect(spy).toHaveBeenCalledWith(sampleVideoId, mockUser.id);
      expect(res.id).toBe(sampleVideoId);
    });

    it('delegates to VideoService with undefined if user is guest', async () => {
      const spy = vi.spyOn(service, 'getVideoById').mockResolvedValueOnce({
        id: sampleVideoId,
        youtubeVideoId: sampleYoutubeId,
        title: 'Test',
        description: null,
        thumbnailUrl: null,
        url: 'https://youtube.com',
        videoUrl: 'https://youtube.com',
        publishedAt: null,
        durationSeconds: 100,
        sourceId: 'src_1',
        channelName: 'Channel',
        channelThumbnailUrl: null,
        library: null,
      });

      const res = await controller.getVideo(sampleVideoId, undefined);

      expect(spy).toHaveBeenCalledWith(sampleVideoId, undefined);
      expect(res.id).toBe(sampleVideoId);
    });

    it('delegates getNotes to VideoService for authenticated user', async () => {
      const spy = vi.spyOn(service, 'getVideoNotes').mockResolvedValueOnce({
        videoId: sampleVideoId,
        content: 'Notes here',
        updatedAt: new Date(),
      });

      const res = await controller.getNotes(sampleVideoId, mockUser);
      expect(spy).toHaveBeenCalledWith(sampleVideoId, mockUser.id);
      expect(res.content).toBe('Notes here');
    });

    it('delegates updateNotes to VideoService and validates content', async () => {
      const spy = vi.spyOn(service, 'upsertVideoNotes').mockResolvedValueOnce({
        videoId: sampleVideoId,
        content: 'New content',
        updatedAt: new Date(),
      });

      const res = await controller.updateNotes(sampleVideoId, mockUser, {
        content: 'New content',
      });
      expect(spy).toHaveBeenCalledWith(sampleVideoId, mockUser.id, 'New content');
      expect(res.content).toBe('New content');
    });

    it('throws BadRequestException for invalid updateNotes body', async () => {
      await expect(
        controller.updateNotes(sampleVideoId, mockUser, null),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.updateNotes(sampleVideoId, mockUser, { content: 12345 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
