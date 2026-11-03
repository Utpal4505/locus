import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { User } from '../auth/auth.js';
import { VideoService } from './video.service.js';
import { VideoController } from './video.controller.js';
import { VideoRepository } from './video.repository.js';

describe('VideoService & VideoController', () => {
  let service: VideoService;
  let controller: VideoController;
  let mockVideoRepo: {
    findVideoWithLibrary: ReturnType<typeof vi.fn>;
    findVideoWithSource: ReturnType<typeof vi.fn>;
    touchLastOpenedAt: ReturnType<typeof vi.fn>;
    findVideoId: ReturnType<typeof vi.fn>;
    findNote: ReturnType<typeof vi.fn>;
    upsertNote: ReturnType<typeof vi.fn>;
  };

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
    mockVideoRepo = {
      findVideoWithLibrary: vi.fn(),
      findVideoWithSource: vi.fn(),
      touchLastOpenedAt: vi.fn().mockResolvedValue(undefined),
      findVideoId: vi.fn(),
      findNote: vi.fn(),
      upsertNote: vi.fn(),
    };
    service = new VideoService(mockVideoRepo as unknown as VideoRepository);
    controller = new VideoController(service);
    vi.restoreAllMocks();
  });

  describe('getVideoById', () => {
    it('throws NotFoundException when video does not exist', async () => {
      mockVideoRepo.findVideoWithSource.mockResolvedValue(null);

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

      mockVideoRepo.findVideoWithSource.mockResolvedValue(mockDbRow);

      const result = await service.getVideoById(sampleYoutubeId, undefined);

      expect(mockVideoRepo.findVideoWithSource).toHaveBeenCalledWith({
        isUuid: false,
        identifier: sampleYoutubeId,
      });
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
        isFavorite: false,
        isInQueue: false,
        progressSeconds: 195,
        lastOpenedAt: new Date(),
        watchedAt: new Date(),
      };

      mockVideoRepo.findVideoWithLibrary.mockResolvedValue(mockDbRow);

      const result = await service.getVideoById(sampleVideoId, mockUser.id);

      expect(mockVideoRepo.findVideoWithLibrary).toHaveBeenCalledWith(
        { isUuid: true, identifier: sampleVideoId },
        mockUser.id,
      );
      expect(result.id).toBe(sampleVideoId);
      expect(result.library).not.toBeNull();
      expect(result.library?.isWatched).toBe(true);
      expect(result.library?.progressSeconds).toBe(195);
    });
  });

  describe('getVideoNotes & upsertVideoNotes', () => {
    it('returns empty notes string if no notes exist yet', async () => {
      mockVideoRepo.findVideoId.mockResolvedValue(sampleVideoId);
      mockVideoRepo.findNote.mockResolvedValue(null);

      const res = await service.getVideoNotes(sampleVideoId, mockUser.id);
      expect(res.videoId).toBe(sampleVideoId);
      expect(res.content).toBe('');
      expect(res.updatedAt).toBeNull();
    });

    it('returns existing notes content when found', async () => {
      const now = new Date();
      mockVideoRepo.findVideoId.mockResolvedValue(sampleVideoId);
      mockVideoRepo.findNote.mockResolvedValue({
        videoId: sampleVideoId,
        content: 'My technical notes',
        updatedAt: now,
      });

      const res = await service.getVideoNotes(sampleVideoId, mockUser.id);
      expect(res.videoId).toBe(sampleVideoId);
      expect(res.content).toBe('My technical notes');
      expect(res.updatedAt).toEqual(now);
    });

    it('upserts notes content successfully', async () => {
      const now = new Date();
      mockVideoRepo.findVideoId.mockResolvedValue(sampleVideoId);
      mockVideoRepo.upsertNote.mockResolvedValue({
        videoId: sampleVideoId,
        content: 'Updated notes',
        updatedAt: now,
      });

      const res = await service.upsertVideoNotes(
        sampleVideoId,
        mockUser.id,
        'Updated notes',
      );
      expect(mockVideoRepo.upsertNote).toHaveBeenCalledWith(
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
