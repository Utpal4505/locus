import { beforeEach, describe, expect, it, vi } from 'vitest';
import { YoutubeSyncManagerService } from './youtube-sync-manager.service.js';
import type { YoutubeVideoService } from './youtube-video.service.js';
import type { YoutubeSyncRepository } from '../repositories/youtube-sync.repository.js';
import type { YoutubeIntegrationRepository } from '../repositories/youtube-integration.repository.js';

describe('YoutubeSyncManagerService', () => {
  let service: YoutubeSyncManagerService;
  let mockVideoService: YoutubeVideoService;
  let mockSyncRepo: Record<keyof YoutubeSyncRepository, any>;
  let mockIntegrationRepo: Record<keyof YoutubeIntegrationRepository, any>;

  const mockUserId = 'usr_sync_test';

  beforeEach(() => {
    vi.restoreAllMocks();

    mockVideoService = {
      syncFollowedChannelVideos: vi.fn().mockResolvedValue({
        channelsProcessed: 3,
        videosSynced: 12,
        itemsSkipped: 1,
        limitReached: false,
      }),
    } as unknown as YoutubeVideoService;

    mockSyncRepo = {
      findLatestRun: vi.fn(),
      findLatestSucceededRun: vi.fn(),
      createRun: vi.fn().mockResolvedValue('run-default'),
      updateRunSuccess: vi.fn().mockResolvedValue(undefined),
      updateRunFailure: vi.fn().mockResolvedValue(undefined),
    };

    mockIntegrationRepo = {
      findByUserId: vi.fn(),
      saveIntegration: vi.fn(),
      updateStatus: vi.fn(),
      updateRefreshedToken: vi.fn(),
      findAllConnectedUsers: vi.fn().mockResolvedValue([]),
    };

    service = new YoutubeSyncManagerService(
      mockVideoService,
      mockSyncRepo as unknown as YoutubeSyncRepository,
      mockIntegrationRepo as unknown as YoutubeIntegrationRepository,
    );
  });

  describe('on_open 2-hour cooldown quota protection', () => {
    it('skips sync and makes zero YouTube API calls if last sync was under 2 hours ago', async () => {
      const recentSyncTime = new Date(Date.now() - 45 * 60 * 1000); // 45m ago (< 120m)
      mockSyncRepo.findLatestSucceededRun.mockResolvedValueOnce({
        completedAt: recentSyncTime,
      });

      const result = await service.syncUser(mockUserId, {
        trigger: 'on_open',
        force: false,
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('COOLDOWN');
      expect(result.lastSyncedAt).toBe(recentSyncTime.toISOString());
      expect(mockVideoService.syncFollowedChannelVideos).not.toHaveBeenCalled();
    });

    it('triggers sync when last sync was over 2 hours ago', async () => {
      const oldSyncTime = new Date(Date.now() - 150 * 60 * 1000); // 2.5 hours ago (> 120m)
      mockSyncRepo.findLatestSucceededRun.mockResolvedValueOnce({
        completedAt: oldSyncTime,
      });
      mockSyncRepo.createRun.mockResolvedValueOnce('run-123');

      const result = await service.syncUser(mockUserId, {
        trigger: 'on_open',
        force: false,
      });

      expect(result.skipped).toBe(false);
      expect(result.videosSynced).toBe(12);
      expect(mockVideoService.syncFollowedChannelVideos).toHaveBeenCalledWith(
        mockUserId,
        { maxResultsPerChannel: 15 },
      );
      expect(mockSyncRepo.updateRunSuccess).toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({
          itemsFound: 3,
          itemsCreated: 12,
        }),
      );
    });

    it('bypasses cooldown when force is true', async () => {
      mockSyncRepo.createRun.mockResolvedValueOnce('run-force');

      const result = await service.syncUser(mockUserId, {
        trigger: 'manual',
        force: true,
      });

      expect(result.skipped).toBe(false);
      expect(mockVideoService.syncFollowedChannelVideos).toHaveBeenCalledWith(
        mockUserId,
        { maxResultsPerChannel: 50 },
      );
      expect(mockSyncRepo.updateRunSuccess).toHaveBeenCalledWith(
        'run-force',
        expect.anything(),
      );
    });
  });

  describe('concurrency and overlapping jobs protection', () => {
    it('deduplicates overlapping sync calls and returns the same in-progress promise', async () => {
      let resolveVideoSync: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolveVideoSync = resolve;
      });

      (mockVideoService.syncFollowedChannelVideos as any).mockImplementationOnce(
        () => delayedPromise,
      );

      mockSyncRepo.createRun.mockResolvedValue('run-dedup');

      // Call 1 starts the job
      const call1Promise = service.syncUser(mockUserId, { trigger: 'manual' });

      // Call 2 starts while Call 1 is still in flight
      const call2Promise = service.syncUser(mockUserId, { trigger: 'manual' });

      // Resolve the background video sync
      resolveVideoSync!({
        channelsProcessed: 2,
        videosSynced: 5,
        itemsSkipped: 0,
        limitReached: false,
      });

      const [res1, res2] = await Promise.all([call1Promise, call2Promise]);

      expect(res1).toEqual(res2);
      expect(mockVideoService.syncFollowedChannelVideos).toHaveBeenCalledTimes(1);
    });
  });

  describe('failure handling and telemetry persistence', () => {
    it('records failed status and error summary into sync_runs on exception', async () => {
      (mockVideoService.syncFollowedChannelVideos as any).mockRejectedValueOnce(
        new Error('YouTube API Network Timeout'),
      );

      mockSyncRepo.createRun.mockResolvedValueOnce('run-fail-1');

      await expect(
        service.syncUser(mockUserId, { trigger: 'manual' }),
      ).rejects.toThrow('YouTube API Network Timeout');

      expect(mockSyncRepo.updateRunFailure).toHaveBeenCalledWith(
        'run-fail-1',
        'YouTube API Network Timeout',
      );
    });
  });

  describe('getSyncStatus', () => {
    it('returns idle status when no sync has occurred', async () => {
      mockSyncRepo.findLatestRun.mockResolvedValueOnce(null);
      mockSyncRepo.findLatestSucceededRun.mockResolvedValueOnce(null);

      const status = await service.getSyncStatus(mockUserId);
      expect(status).toEqual({
        isSyncing: false,
        lastSyncedAt: null,
        lastStatus: 'idle',
        lastError: null,
        channelsProcessed: 0,
        videosSynced: 0,
        trigger: undefined,
      });
    });

    it('returns succeeded status and formatted timestamps', async () => {
      const completedAt = new Date('2026-10-23T18:00:00Z');

      mockSyncRepo.findLatestRun.mockResolvedValueOnce({
        id: 'run-ok',
        status: 'succeeded',
        trigger: 'on_open',
        startedAt: new Date('2026-10-23T17:59:00Z'),
        completedAt,
        itemsFound: 4,
        itemsCreated: 15,
        errorSummary: null,
      });

      mockSyncRepo.findLatestSucceededRun.mockResolvedValueOnce({ completedAt });

      const status = await service.getSyncStatus(mockUserId);
      expect(status).toEqual({
        isSyncing: false,
        lastSyncedAt: completedAt.toISOString(),
        lastStatus: 'succeeded',
        lastError: null,
        channelsProcessed: 4,
        videosSynced: 15,
        trigger: 'on_open',
      });
    });

    it('returns failed status and error message on failed sync run', async () => {
      const yesterday = new Date(Date.now() - 24 * 3600 * 1000);

      mockSyncRepo.findLatestRun.mockResolvedValueOnce({
        id: 'run-err',
        status: 'failed',
        trigger: 'manual',
        startedAt: new Date(),
        completedAt: new Date(),
        itemsFound: 0,
        itemsCreated: 0,
        errorSummary: 'YouTube quota exceeded',
      });

      mockSyncRepo.findLatestSucceededRun.mockResolvedValueOnce({
        completedAt: yesterday,
      });

      const status = await service.getSyncStatus(mockUserId);
      expect(status).toEqual({
        isSyncing: false,
        lastSyncedAt: yesterday.toISOString(),
        lastStatus: 'failed',
        lastError: 'YouTube quota exceeded',
        channelsProcessed: 0,
        videosSynced: 0,
        trigger: 'manual',
      });
    });
  });

  describe('runScheduledSync', () => {
    it('iterates through connected users and triggers sync for those past the 2-hour threshold', async () => {
      mockIntegrationRepo.findAllConnectedUsers.mockResolvedValueOnce([
        { userId: 'user_stale' },
        { userId: 'user_fresh' },
      ]);

      // user_stale: last sync 3 hours ago (> 2h)
      mockSyncRepo.findLatestSucceededRun.mockResolvedValueOnce({
        completedAt: new Date(Date.now() - 3 * 3600 * 1000),
      });
      mockSyncRepo.createRun.mockResolvedValueOnce('sched-run-1');

      // user_fresh: last sync 30m ago (< 2h)
      mockSyncRepo.findLatestSucceededRun.mockResolvedValueOnce({
        completedAt: new Date(Date.now() - 30 * 60 * 1000),
      });

      const result = await service.runScheduledSync();

      expect(result.totalUsersProcessed).toBe(1);
      expect(result.totalErrors).toBe(0);
      expect(mockVideoService.syncFollowedChannelVideos).toHaveBeenCalledWith(
        'user_stale',
        { maxResultsPerChannel: 15 },
      );
      expect(mockVideoService.syncFollowedChannelVideos).not.toHaveBeenCalledWith(
        'user_fresh',
        expect.anything(),
      );
    });
  });
});
