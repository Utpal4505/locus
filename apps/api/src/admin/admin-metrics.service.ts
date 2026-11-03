import { Injectable, Logger } from '@nestjs/common';
import { AdminMetricsRepository } from './admin-metrics.repository.js';
import type { AdminMetricsResponse } from './admin.contract.js';

@Injectable()
export class AdminMetricsService {
  private readonly logger = new Logger(AdminMetricsService.name);

  constructor(private readonly metricsRepo: AdminMetricsRepository) {}

  async getMetrics(): Promise<AdminMetricsResponse> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // 1. User & Session Telemetry
    const { allUsers, allSessions, allIntegrations, onboardingCompletedCount } =
      await this.metricsRepo.getUserAndSessionData();

    let newUsersToday = 0;
    let newUsersThisWeek = 0;
    let emailVerifiedCount = 0;

    for (const u of allUsers) {
      if (u.createdAt >= startOfToday) newUsersToday++;
      if (u.createdAt >= sevenDaysAgo) newUsersThisWeek++;
      if (u.emailVerified) emailVerifiedCount++;
    }

    // Distinct active users based on recent session activity
    const active24hSet = new Set<string>();
    const active30mSet = new Set<string>();

    for (const s of allSessions) {
      if (s.updatedAt >= twentyFourHoursAgo) active24hSet.add(s.userId);
      if (s.updatedAt >= thirtyMinutesAgo) active30mSet.add(s.userId);
    }

    let youtubeConnectedCount = 0;
    let youtubeRevokedCount = 0;

    for (const integ of allIntegrations) {
      if (integ.provider === 'youtube') {
        if (integ.status === 'connected') {
          youtubeConnectedCount++;
        } else {
          youtubeRevokedCount++;
        }
      }
    }

    // 2. Sync Ingestion Telemetry
    const [recentSyncRuns, staleChannelsCount] = await Promise.all([
      this.metricsRepo.getRecentSyncRuns(twentyFourHoursAgo),
      this.metricsRepo.getStaleChannelsCount(twentyFourHoursAgo),
    ]);

    let succeededRuns24h = 0;
    let failedRuns24h = 0;
    let partialRuns24h = 0;
    let videosIngestedToday = 0;
    const triggerBreakdown = { scheduled: 0, manual: 0, on_open: 0 };

    for (const run of recentSyncRuns) {
      if (run.status === 'succeeded') succeededRuns24h++;
      else if (run.status === 'failed') failedRuns24h++;
      else if (run.status === 'partial') partialRuns24h++;

      if (run.trigger === 'scheduled') triggerBreakdown.scheduled++;
      else if (run.trigger === 'manual') triggerBreakdown.manual++;
      else if (run.trigger === 'on_open') triggerBreakdown.on_open++;

      if (run.createdAt >= startOfToday) {
        videosIngestedToday += run.itemsCreated || 0;
      }
    }

    // 3. AI Classification Pipeline & Costs
    const { taggingStates, batches } = await this.metricsRepo.getClassificationData();

    let totalVideosClassified = 0;
    let pendingCount = 0;
    let submittedCount = 0;
    let failedCount = 0;

    for (const state of taggingStates) {
      if (state.status === 'completed') totalVideosClassified++;
      else if (state.status === 'pending') pendingCount++;
      else if (state.status === 'submitted') submittedCount++;
      else if (state.status === 'failed') failedCount++;
    }

    let totalCostUsd = 0;
    let estimatedCostInr = 0;
    let costTodayUsd = 0;
    let costTodayInr = 0;

    for (const batch of batches) {
      const bUsd = parseFloat(batch.totalCostUsd || '0') || 0;
      const bInr = parseFloat(batch.estimatedCostInr || '0') || 0;

      totalCostUsd += bUsd;
      estimatedCostInr += bInr;

      if (batch.createdAt >= startOfToday) {
        costTodayUsd += bUsd;
        costTodayInr += bInr;
      }
    }

    const averageCostPerVideoUsd =
      totalVideosClassified > 0 ? totalCostUsd / totalVideosClassified : 0;

    // 4. Platform Storage & Inventory Counts
    const storageCounts = await this.metricsRepo.getStorageCounts();

    return {
      users: {
        totalUsers: allUsers.length,
        newUsersToday,
        newUsersThisWeek,
        activeUsers24h: active24hSet.size,
        activeUsers30m: active30mSet.size,
        emailVerifiedCount,
        onboardingCompletedCount,
        youtubeConnectedCount,
        youtubeRevokedCount,
      },
      sync: {
        totalRuns24h: recentSyncRuns.length,
        succeededRuns24h,
        failedRuns24h,
        partialRuns24h,
        videosIngestedToday,
        triggerBreakdown,
        staleChannelsCount,
      },
      aiClassification: {
        totalVideosClassified,
        pendingCount,
        submittedCount,
        failedCount,
        totalCostUsd: Number(totalCostUsd.toFixed(4)),
        estimatedCostInr: Number(estimatedCostInr.toFixed(2)),
        costTodayUsd: Number(costTodayUsd.toFixed(4)),
        costTodayInr: Number(costTodayInr.toFixed(2)),
        averageCostPerVideoUsd: Number(averageCostPerVideoUsd.toFixed(5)),
      },
      storage: {
        totalVideos: storageCounts.totalVideos,
        totalSources: storageCounts.totalSources,
        totalLibraryItems: storageCounts.totalLibraryItems,
        totalNotes: storageCounts.totalNotes,
        totalFeedbacks: storageCounts.totalFeedbacks,
        openBugs: storageCounts.openBugs,
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        timestamp: now.toISOString(),
      },
    };
  }
}
