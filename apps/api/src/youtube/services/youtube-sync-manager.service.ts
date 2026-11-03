import { Injectable, Logger } from '@nestjs/common';
import { YoutubeVideoService } from './youtube-video.service.js';
import { YoutubeSyncRepository } from '../repositories/youtube-sync.repository.js';
import { YoutubeIntegrationRepository } from '../repositories/youtube-integration.repository.js';

export const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 120 minutes

export type SyncTrigger = 'manual' | 'scheduled' | 'on_open';
export type SyncStatusState = 'idle' | 'syncing' | 'succeeded' | 'failed';

export interface SyncStatusResponse {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastStatus: SyncStatusState;
  lastError?: string | null;
  channelsProcessed?: number;
  videosSynced?: number;
  trigger?: SyncTrigger;
}

export interface VideoSyncRequest {
  trigger?: SyncTrigger;
  force?: boolean;
  maxResultsPerChannel?: number;
}

export interface VideoSyncResponse {
  channelsProcessed: number;
  videosSynced: number;
  itemsSkipped: number;
  limitReached: boolean;
  skipped?: boolean;
  reason?: string;
  lastSyncedAt?: string | null;
}

@Injectable()
export class YoutubeSyncManagerService {
  private readonly logger = new Logger(YoutubeSyncManagerService.name);
  private readonly activeSyncJobs = new Map<string, Promise<VideoSyncResponse>>();

  constructor(
    private readonly videoService: YoutubeVideoService,
    private readonly syncRepo: YoutubeSyncRepository,
    private readonly integrationRepo: YoutubeIntegrationRepository,
  ) {}

  /**
   * Retrieves the current sync status for the specified user, including whether a job is
   * currently running, the timestamp of the last successful sync, and failure summaries.
   */
  async getSyncStatus(userId: string): Promise<SyncStatusResponse> {
    const isSyncing = this.activeSyncJobs.has(userId);

    // 1. Most recent sync run record
    const latestRun = await this.syncRepo.findLatestRun(userId);

    // 2. Most recent succeeded run record (for accurate lastSyncedAt)
    const latestSucceeded = await this.syncRepo.findLatestSucceededRun(userId);

    let lastStatus: 'idle' | 'syncing' | 'succeeded' | 'failed' = 'idle';

    if (isSyncing) {
      lastStatus = 'syncing';
    } else if (latestRun?.status === 'running') {
      // If DB marked running but no local job in memory, treat as failed if older than 10 mins (stale process)
      const isStale =
        latestRun.startedAt &&
        Date.now() - latestRun.startedAt.getTime() > 10 * 60 * 1000;
      lastStatus = isStale ? 'failed' : 'syncing';
    } else if (latestRun?.status === 'failed') {
      lastStatus = 'failed';
    } else if (latestRun?.status === 'succeeded') {
      lastStatus = 'succeeded';
    }

    return {
      isSyncing: lastStatus === 'syncing',
      lastSyncedAt: latestSucceeded?.completedAt
        ? latestSucceeded.completedAt.toISOString()
        : null,
      lastStatus,
      lastError:
        lastStatus === 'failed'
          ? latestRun?.errorSummary || 'Sync failed'
          : null,
      channelsProcessed: latestRun?.itemsFound ?? 0,
      videosSynced: latestRun?.itemsCreated ?? 0,
      trigger: (latestRun?.trigger as any) ?? undefined,
    };
  }

  /**
   * Synchronizes videos for a specific user with comprehensive quota protection:
   * - Prevents duplicate and overlapping executions (in-memory job deduplication).
   * - On app open, skips execution if last successful sync was under 2 hours ago.
   * - Persists audit telemetry to the `sync_runs` table.
   */
  async syncUser(
    userId: string,
    options?: VideoSyncRequest,
  ): Promise<VideoSyncResponse> {
    // 1. Quota & Concurrency Protection: Return in-progress job if already active
    const existingJob = this.activeSyncJobs.get(userId);
    if (existingJob) {
      this.logger.log(
        `Sync already in progress for user ${userId}. Returning existing execution promise.`,
      );
      return existingJob;
    }

    const trigger = options?.trigger ?? 'manual';
    const force = Boolean(options?.force);

    // 2. Construct tracked execution promise and immediately lock activeSyncJobs synchronously
    const jobPromise = (async (): Promise<VideoSyncResponse> => {
      // 2a. 2-Hour Cooldown Protection: On opening Locus, skip if last successful sync is < 2h old
      if (trigger === 'on_open' && !force) {
        const lastSync = await this.syncRepo.findLatestSucceededRun(userId);

        if (lastSync?.completedAt) {
          const elapsedMs = Date.now() - lastSync.completedAt.getTime();
          if (elapsedMs < TWO_HOURS_MS) {
            const minutesAgo = Math.round(elapsedMs / 60000);
            this.logger.log(
              `User ${userId} on_open sync skipped: last successful sync was ${minutesAgo}m ago (< 120m cooldown).`,
            );
            return {
              channelsProcessed: 0,
              videosSynced: 0,
              itemsSkipped: 0,
              limitReached: false,
              skipped: true,
              reason: 'COOLDOWN',
              lastSyncedAt: lastSync.completedAt.toISOString(),
            };
          }
        }
      }

      // 2b. Create initial sync_runs tracking record
      const runId = await this.syncRepo.createRun(userId, trigger);

      // 2c. Execute video ingestion
      try {
        const maxResults =
          options?.maxResultsPerChannel ??
          (trigger === 'scheduled' || trigger === 'on_open' ? 15 : 50);

        const summary = await this.videoService.syncFollowedChannelVideos(
          userId,
          { maxResultsPerChannel: maxResults },
        );

        const completedAt = new Date();

        if (runId) {
          await this.syncRepo.updateRunSuccess(runId, {
            completedAt,
            itemsFound: summary.channelsProcessed,
            itemsCreated: summary.videosSynced,
          });
        }

        return {
          ...summary,
          skipped: false,
          lastSyncedAt: completedAt.toISOString(),
        };
      } catch (err) {
        const errorMessage = (err as Error).message || 'Sync failed';
        if (runId) {
          await this.syncRepo.updateRunFailure(runId, errorMessage);
        }
        throw err;
      }
    })();

    // Synchronously set in-memory lock BEFORE any async ticks
    this.activeSyncJobs.set(userId, jobPromise);

    try {
      return await jobPromise;
    } finally {
      this.activeSyncJobs.delete(userId);
    }
  }

  /**
   * Executes scheduled synchronization across all eligible connected YouTube users.
   * Runs every 2 hours via YoutubeSyncSchedulerService.
   */
  async runScheduledSync(): Promise<{ totalUsersProcessed: number; totalErrors: number }> {
    this.logger.log('Starting scheduled 2-hour server-side YouTube video sync...');

    let totalUsersProcessed = 0;
    let totalErrors = 0;

    try {
      const activeIntegrations = await this.integrationRepo.findAllConnectedUsers();

      this.logger.log(
        `Scheduled sync: evaluating ${activeIntegrations.length} connected user(s).`,
      );

      for (const integration of activeIntegrations) {
        try {
          // Check last successful sync time
          const lastSync = await this.syncRepo.findLatestSucceededRun(integration.userId);

          if (lastSync?.completedAt) {
            const elapsedMs = Date.now() - lastSync.completedAt.getTime();
            if (elapsedMs < TWO_HOURS_MS) {
              continue; // Fresh sync already completed recently
            }
          }

          this.logger.log(
            `Scheduled sync: executing for user ${integration.userId}...`,
          );
          await this.syncUser(integration.userId, {
            trigger: 'scheduled',
            force: false,
            maxResultsPerChannel: 15,
          });
          totalUsersProcessed++;
        } catch (userErr) {
          totalErrors++;
          this.logger.warn(
            `Scheduled sync error for user ${integration.userId}: ${(userErr as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Scheduled sync cycle failed: ${(err as Error).message}`,
      );
    }

    this.logger.log(
      `Scheduled sync completed: ${totalUsersProcessed} user(s) processed, ${totalErrors} error(s).`,
    );

    return { totalUsersProcessed, totalErrors };
  }
}
