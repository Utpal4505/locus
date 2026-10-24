import { z } from "zod";

export const classificationMetricsSchema = z.object({
  totalVideosClassified: z.number().int(),
  statusBreakdown: z.object({
    pending: z.number().int(),
    submitted: z.number().int(),
    completed: z.number().int(),
    failed: z.number().int(),
  }),
  videosWithZeroTags: z.number().int(),
  totalInputTokens: z.number().int(),
  totalOutputTokens: z.number().int(),
  totalTokens: z.number().int(),
  totalCostUsd: z.number(),
  estimatedCostInr: z.number(),
  averageCostPerVideoUsd: z.number(),
  averageCostPerVideoInr: z.number(),
  successRatePercent: z.number(),
  retryRatePercent: z.number(),
  costByDate: z.array(
    z.object({
      date: z.string(),
      costUsd: z.number(),
      costInr: z.number(),
      tokens: z.number().int(),
      videoCount: z.number().int(),
    }),
  ),
  recentBatches: z.array(
    z.object({
      id: z.string(),
      openaiBatchId: z.string().nullable(),
      status: z.string(),
      requestCount: z.number().int(),
      successCount: z.number().int(),
      failureCount: z.number().int(),
      submittedAt: z.string().nullable(),
      completedAt: z.string().nullable(),
      totalCostUsd: z.number(),
    }),
  ),
  failureReasons: z.array(
    z.object({
      reason: z.string(),
      count: z.number().int(),
    }),
  ),
  promptVersionDistribution: z.record(z.string(), z.number().int()),
});
export type ClassificationMetrics = z.infer<typeof classificationMetricsSchema>;

export const retryFailedVideosRequestSchema = z.object({
  videoIds: z.array(z.string().uuid()).optional(),
});
export type RetryFailedVideosRequest = z.infer<
  typeof retryFailedVideosRequestSchema
>;

