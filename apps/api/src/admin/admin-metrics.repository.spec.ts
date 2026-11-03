import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminMetricsRepository } from './admin-metrics.repository.js';
import type { DrizzleDb } from '../database/index.js';

describe('AdminMetricsRepository', () => {
  let repository: AdminMetricsRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
    };
    repository = new AdminMetricsRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe('getUserAndSessionData', () => {
    it('queries users, sessions, integrations, and onboarding count', async () => {
      mockDb.select.mockImplementation((fields?: any) => {
        if (fields && 'count' in fields) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 3 }]),
            }),
          };
        }
        return {
          from: vi.fn().mockResolvedValue([{ id: '1' }]),
        };
      });

      const res = await repository.getUserAndSessionData();
      expect(res.allUsers).toHaveLength(1);
      expect(res.allSessions).toHaveLength(1);
      expect(res.allIntegrations).toHaveLength(1);
      expect(res.onboardingCompletedCount).toBe(3);
    });
  });

  describe('getRecentSyncRuns', () => {
    it('queries sync runs created since threshold', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
        }),
      });

      const res = await repository.getRecentSyncRuns(new Date());
      expect(res).toHaveLength(1);
    });
  });

  describe('getStaleChannelsCount', () => {
    it('returns count of stale sources', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 4 }]),
        }),
      });

      const count = await repository.getStaleChannelsCount(new Date());
      expect(count).toBe(4);
    });
  });

  describe('getClassificationData', () => {
    it('queries videoTaggingStates and classificationBatches', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue([{ id: 'item-1' }]),
      });

      const res = await repository.getClassificationData();
      expect(res.taggingStates).toHaveLength(1);
      expect(res.batches).toHaveLength(1);
    });
  });

  describe('getStorageCounts', () => {
    it('queries counts for all entities', async () => {
      mockDb.select.mockImplementation((fields?: any) => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
          then: (cb: any) => cb([{ count: 2 }]),
        }),
      }));

      const res = await repository.getStorageCounts();
      expect(res.totalVideos).toBe(2);
      expect(res.totalSources).toBe(2);
      expect(res.totalLibraryItems).toBe(2);
      expect(res.totalNotes).toBe(2);
      expect(res.totalFeedbacks).toBe(2);
      expect(res.openBugs).toBe(2);
    });
  });
});

