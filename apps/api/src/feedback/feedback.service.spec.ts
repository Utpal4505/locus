import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@locus/database';
import { FeedbackService } from './feedback.service.js';
import type { User } from '../auth/auth.js';

describe('FeedbackService', () => {
  let service: FeedbackService;

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
    service = new FeedbackService();
    vi.restoreAllMocks();
  });

  describe('createFeedback', () => {
    it('creates and returns a bug report with metadata and server context', async () => {
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([sampleDbRow]),
        }),
      } as any);

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

      expect(result.id).toBe(sampleDbRow.id);
      expect(result.type).toBe('bug');
      expect(result.userEmail).toBe('utpal@example.com');
      expect(result.createdAt).toBe('2026-10-25T01:00:00.000Z');
    });

    it('auto-escalates priority to high if title or description mentions crash or fatal', async () => {
      let insertedValues: any = null;
      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockImplementation((val) => {
          insertedValues = val;
          return {
            returning: vi.fn().mockResolvedValue([{ ...sampleDbRow, priority: val.priority }]),
          };
        }),
      } as any);

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
      vi.spyOn(db, 'select').mockImplementation((fields?: any) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            }),
          } as any;
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([sampleDbRow]),
                }),
              }),
            }),
          }),
        } as any;
      });

      const result = await service.getAdminFeedback({ page: 1, limit: 10 });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items[0]!.title).toBe(sampleDbRow.title);
    });
  });

  describe('getFeedbackStats', () => {
    it('aggregates counts for KPI metrics', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockResolvedValue([
          { ...sampleDbRow, type: 'bug', status: 'open', priority: 'medium' },
          { ...sampleDbRow, type: 'bug', status: 'open', priority: 'critical' },
          { ...sampleDbRow, type: 'feature_request', status: 'open', priority: 'low' },
          { ...sampleDbRow, type: 'bug', status: 'in_progress', priority: 'high' },
          { ...sampleDbRow, type: 'bug', status: 'resolved', priority: 'low' },
        ]),
      } as any);

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
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([sampleDbRow]),
          }),
        }),
      } as any);

      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...sampleDbRow,
                status: 'in_progress',
                adminNotes: 'Investigating player event listener',
              },
            ]),
          }),
        }),
      } as any);

      const updated = await service.updateFeedback(sampleDbRow.id, {
        status: 'in_progress',
        adminNotes: 'Investigating player event listener',
      });

      expect(updated.status).toBe('in_progress');
      expect(updated.adminNotes).toBe('Investigating player event listener');
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        service.updateFeedback('non-existent-uuid', { status: 'resolved' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFeedback', () => {
    it('deletes ticket when found', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([sampleDbRow]),
          }),
        }),
      } as any);

      vi.spyOn(db, 'delete').mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      } as any);

      const res = await service.deleteFeedback(sampleDbRow.id);
      expect(res.success).toBe(true);
      expect(res.id).toBe(sampleDbRow.id);
    });
  });
});

