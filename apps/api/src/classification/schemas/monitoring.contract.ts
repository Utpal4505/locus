export interface TopicItemResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface TopicsListResponse {
  topics: TopicItemResponse[];
}

export interface ClassificationMetrics {
  totalVideosClassified: number;
  statusBreakdown: {
    pending: number;
    submitted: number;
    completed: number;
    failed: number;
  };
  videosWithZeroTags: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  estimatedCostInr: number;
  averageCostPerVideoUsd: number;
  averageCostPerVideoInr: number;
  successRatePercent: number;
  retryRatePercent: number;
  costByDate: Array<{
    date: string;
    costUsd: number;
    costInr: number;
    tokens: number;
    videoCount: number;
  }>;
  recentBatches: Array<{
    id: string;
    openaiBatchId: string | null;
    status: string;
    requestCount: number;
    successCount: number;
    failureCount: number;
    submittedAt: string | null;
    completedAt: string | null;
    totalCostUsd: number;
  }>;
  failureReasons: Array<{
    reason: string;
    count: number;
  }>;
  promptVersionDistribution: Record<string, number>;
}

export interface RetryFailedVideosRequest {
  videoIds?: string[];
}

