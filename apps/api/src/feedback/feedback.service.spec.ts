import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service.js';
import { FeedbackRepository } from './feedback.repository.js';
import type { User } from '../auth/auth.js';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockFeedbackRepo: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findManyWithCount: ReturnType<typeof vi.fn>;
    findAllForStats: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const mockUser: User = {
    id: 'usr_test_1',
    email: 'utpal@example.com',
    name: 'Utpal',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleDbRow = {
    id: '11111111-2222-3333-4444-555555555555',
    userId: 'usr_test_1',
    userEmail: 'utpal@example.com',
    userName: 'Utpal',
    type: 'bug' as const,
    title: 'Video player controls freeze on pause',
    description: 'When I pause the video at 02:30, the seek bar becomes completely unresponsive.',
    category: 'playback',
    priority: 'medium' as const,
    status: 'open' as const,
    metadata: {
      url: '/watch/vid-1',
      device: { os: 'Windows 11', browser: 'Chrome 128' },
    },
    adminNotes: null,
    createdAt: new Date('2026-10-25T01:00:00Z'),
    updatedAt: new Date('2026-10-25T01:00:00Z'),
  };

  beforeEach(() => {
    mockFeedbackRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findManyWithCount: vi.fn(),
      findAllForStats: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new FeedbackService(mockFeedbackRepo as unknown as FeedbackRepository);
    vi.restoreAllMocks();
  });

  describe('createFeedback', () => {
    it('creates and returns a bug report with metadata and server context', async () => {
      mockFeedbackRepo.create.mockResolvedValue(sampleDbRow);

      const result = await service.createFeedback(
        {
          type: 'bug',
          title: 'Video player controls freeze on pause',
          description: 'When I pause the video at 02:30, the seek bar becomes completely unresponsive.',
          category: 'playback',
          metadata: { url: '/watch/vid-1' },
        },
        mockUser,
        { ip: '127.0.0.1', userAgent: 'VitestAgent/1.0' },
      );

      expect(mockFeedbackRepo.create).toHaveBeenCalled();
      expect(result.id).toBe(sampleDbRow.id);
      expect(result.type).toBe('bug');
      expect(result.userEmail).toBe('utpal@example.com');
      expect(result.createdAt).toBe('2026-10-25T01:00:00.000Z');
    });

    it('auto-escalates priority to high if title or description mentions crash or fatal', async () => {
      let insertedValues: any = null;
      mockFeedbackRepo.create.mockImplementation((val) => {
        insertedValues = val;
        return Promise.resolve({ ...sampleDbRow, priority: val.priority });
      });

      await service.createFeedback(
        {
          type: 'bug',
          title: 'App fatal crash on sync',
          description: 'Syncing subscriptions throws an unexpected fatal exception that kills the tab.',
        },
        mockUser,
      );

      expect(insertedValues.priority).toBe('high');
    });

    it('throws BadRequestException on validation failure (short title/description)', async () => {
      await expect(
        service.createFeedback({
          type: 'bug',
          title: 'no',
          description: 'short',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAdminFeedback', () => {
    it('returns paginated items and total pages', async () => {
      mockFeedbackRepo.findManyWithCount.mockResolvedValue({
        rows: [sampleDbRow],
        total: 1,
      });

      const result = await service.getAdminFeedback({ page: 1, limit: 10 });
      expect(mockFeedbackRepo.findManyWithCount).toHaveBeenCalledWith(
        { type: undefined, status: undefined, priority: undefined, search: undefined },
        { limit: 10, offset: 0 },
      );
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items[0]!.title).toBe(sampleDbRow.title);
    });
  });

  describe('getFeedbackStats', () => {
    it('aggregates counts for KPI metrics', async () => {
      mockFeedbackRepo.findAllForStats.mockResolvedValue([
        { ...sampleDbRow, type: 'bug', status: 'open', priority: 'medium' },
        { ...sampleDbRow, type: 'bug', status: 'open', priority: 'critical' },
        { ...sampleDbRow, type: 'feature_request', status: 'open', priority: 'low' },
        { ...sampleDbRow, type: 'bug', status: 'in_progress', priority: 'high' },
        { ...sampleDbRow, type: 'bug', status: 'resolved', priority: 'low' },
      ]);

      const stats = await service.getFeedbackStats();
      expect(stats.total).toBe(5);
      expect(stats.openBugs).toBe(2);
      expect(stats.criticalBugs).toBe(1);
      expect(stats.openFeatureRequests).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.resolved).toBe(1);
    });
  });

  describe('updateFeedback', () => {
    it('updates status and adminNotes on an existing feedback ticket', async () => {
      mockFeedbackRepo.findById.mockResolvedValue(sampleDbRow);
      mockFeedbackRepo.update.mockResolvedValue({
        ...sampleDbRow,
        status: 'in_progress',
        adminNotes: 'Investigating player event listener',
      });

      const updated = await service.updateFeedback(sampleDbRow.id, {
        status: 'in_progress',
        adminNotes: 'Investigating player event listener',
      });

      expect(mockFeedbackRepo.findById).toHaveBeenCalledWith(sampleDbRow.id);
      expect(mockFeedbackRepo.update).toHaveBeenCalled();
      expect(updated.status).toBe('in_progress');
      expect(updated.adminNotes).toBe('Investigating player event listener');
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      mockFeedbackRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateFeedback('non-existent-uuid', { status: 'resolved' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFeedback', () => {
    it('deletes ticket when found', async () => {
      mockFeedbackRepo.findById.mockResolvedValue(sampleDbRow);
      mockFeedbackRepo.delete.mockResolvedValue(true);

      const res = await service.deleteFeedback(sampleDbRow.id);
      expect(mockFeedbackRepo.findById).toHaveBeenCalledWith(sampleDbRow.id);
      expect(mockFeedbackRepo.delete).toHaveBeenCalledWith(sampleDbRow.id);
      expect(res.success).toBe(true);
      expect(res.id).toBe(sampleDbRow.id);
    });
  });
});
