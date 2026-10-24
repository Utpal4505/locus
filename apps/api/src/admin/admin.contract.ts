import { z } from 'zod';

export const adminMetricsResponseSchema = z.object({
  users: z.object({
    totalUsers: z.number().int().nonnegative(),
    newUsersToday: z.number().int().nonnegative(),
    newUsersThisWeek: z.number().int().nonnegative(),
    activeUsers24h: z.number().int().nonnegative(),
    activeUsers30m: z.number().int().nonnegative(),
    emailVerifiedCount: z.number().int().nonnegative(),
    onboardingCompletedCount: z.number().int().nonnegative(),
    youtubeConnectedCount: z.number().int().nonnegative(),
    youtubeRevokedCount: z.number().int().nonnegative(),
  }),
  sync: z.object({
    totalRuns24h: z.number().int().nonnegative(),
    succeededRuns24h: z.number().int().nonnegative(),
    failedRuns24h: z.number().int().nonnegative(),
    partialRuns24h: z.number().int().nonnegative(),
    videosIngestedToday: z.number().int().nonnegative(),
    triggerBreakdown: z.object({
      scheduled: z.number().int().nonnegative(),
      manual: z.number().int().nonnegative(),
      on_open: z.number().int().nonnegative(),
    }),
    staleChannelsCount: z.number().int().nonnegative(),
  }),
  aiClassification: z.object({
    totalVideosClassified: z.number().int().nonnegative(),
    pendingCount: z.number().int().nonnegative(),
    submittedCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    totalCostUsd: z.number().nonnegative(),
    estimatedCostInr: z.number().nonnegative(),
    costTodayUsd: z.number().nonnegative(),
    costTodayInr: z.number().nonnegative(),
    averageCostPerVideoUsd: z.number().nonnegative(),
  }),
  storage: z.object({
    totalVideos: z.number().int().nonnegative(),
    totalSources: z.number().int().nonnegative(),
    totalLibraryItems: z.number().int().nonnegative(),
    totalNotes: z.number().int().nonnegative(),
    totalFeedbacks: z.number().int().nonnegative(),
    openBugs: z.number().int().nonnegative(),
  }),
  system: z.object({
    uptimeSeconds: z.number().nonnegative(),
    nodeVersion: z.string(),
    environment: z.string(),
    timestamp: z.string(),
  }),
});

export type AdminMetricsResponse = z.infer<typeof adminMetricsResponseSchema>;

