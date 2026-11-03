import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminMetricsService } from './admin-metrics.service.js';
import { AdminMetricsController } from './admin-metrics.controller.js';
import { AdminMetricsRepository } from './admin-metrics.repository.js';

describe('AdminMetricsService & AdminMetricsController', () => {
  let service: AdminMetricsService;
  let controller: AdminMetricsController;
  let mockMetricsRepo: {
    getUserAndSessionData: ReturnType<typeof vi.fn>;
    getRecentSyncRuns: ReturnType<typeof vi.fn>;
    getStaleChannelsCount: ReturnType<typeof vi.fn>;
    getClassificationData: ReturnType<typeof vi.fn>;
    getStorageCounts: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockMetricsRepo = {
      getUserAndSessionData: vi.fn(),
      getRecentSyncRuns: vi.fn(),
      getStaleChannelsCount: vi.fn(),
      getClassificationData: vi.fn(),
      getStorageCounts: vi.fn(),
    };
    service = new AdminMetricsService(mockMetricsRepo as unknown as AdminMetricsRepository);
    controller = new AdminMetricsController(service);
    vi.restoreAllMocks();
  });

  it('aggregates user, sync, classification, and storage telemetry', async () => {
    const now = new Date();

    mockMetricsRepo.getUserAndSessionData.mockResolvedValue({
      allUsers: [{ id: 'usr-1', createdAt: now, emailVerified: true }],
      allSessions: [{ userId: 'usr-1', updatedAt: now }],
      allIntegrations: [{ provider: 'youtube', status: 'connected' }],
      onboardingCompletedCount: 5,
    });

    mockMetricsRepo.getRecentSyncRuns.mockResolvedValue([
      {
        id: 'run-1',
        status: 'succeeded',
        trigger: 'scheduled',
        itemsCreated: 3,
        createdAt: now,
      },
    ]);

    mockMetricsRepo.getStaleChannelsCount.mockResolvedValue(2);

    mockMetricsRepo.getClassificationData.mockResolvedValue({
      taggingStates: [{ status: 'completed' }],
      batches: [
        {
          totalCostUsd: '0.0030',
          estimatedCostInr: '0.25',
          createdAt: now,
        },
      ],
    });

    mockMetricsRepo.getStorageCounts.mockResolvedValue({
      totalVideos: 10,
      totalSources: 5,
      totalLibraryItems: 3,
      totalNotes: 2,
      totalFeedbacks: 1,
      openBugs: 1,
    });

    const metrics = await controller.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.users.totalUsers).toBe(1);
    expect(metrics.users.emailVerifiedCount).toBe(1);
    expect(metrics.users.youtubeConnectedCount).toBe(1);
    expect(metrics.sync.totalRuns24h).toBe(1);
    expect(metrics.sync.succeededRuns24h).toBe(1);
    expect(metrics.aiClassification.totalVideosClassified).toBe(1);
    expect(metrics.storage.totalVideos).toBe(10);
    expect(metrics.system).toBeDefined();
    expect(metrics.system.nodeVersion).toBe(process.version);
  });
});
