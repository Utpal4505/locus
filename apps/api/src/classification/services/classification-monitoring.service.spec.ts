import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClassificationMonitoringService } from "./classification-monitoring.service.js";
import { ClassificationMonitoringRepository } from "../repositories/classification-monitoring.repository.js";

describe("ClassificationMonitoringService", () => {
  let service: ClassificationMonitoringService;
  let mockMonitoringRepo: {
    getStatusCounts: ReturnType<typeof vi.fn>;
    getVideosWithZeroTagsCount: ReturnType<typeof vi.fn>;
    getTokenAndCostTotals: ReturnType<typeof vi.fn>;
    getRetriedCount: ReturnType<typeof vi.fn>;
    getCostByDate: ReturnType<typeof vi.fn>;
    getRecentBatches: ReturnType<typeof vi.fn>;
    getFailureReasons: ReturnType<typeof vi.fn>;
    getPromptVersionDistribution: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockMonitoringRepo = {
      getStatusCounts: vi.fn(),
      getVideosWithZeroTagsCount: vi.fn(),
      getTokenAndCostTotals: vi.fn(),
      getRetriedCount: vi.fn(),
      getCostByDate: vi.fn(),
      getRecentBatches: vi.fn(),
      getFailureReasons: vi.fn(),
      getPromptVersionDistribution: vi.fn(),
    };
    service = new ClassificationMonitoringService(
      mockMonitoringRepo as unknown as ClassificationMonitoringRepository,
    );
    vi.restoreAllMocks();
  });

  it("aggregates status breakdown, token totals, financial costs, and recent batches", async () => {
    mockMonitoringRepo.getStatusCounts.mockResolvedValue([
      { status: "completed", count: 10 },
      { status: "pending", count: 2 },
      { status: "failed", count: 1 },
    ]);
    mockMonitoringRepo.getVideosWithZeroTagsCount.mockResolvedValue(2);
    mockMonitoringRepo.getTokenAndCostTotals.mockResolvedValue({
      inputTokens: 10000,
      outputTokens: 2000,
      totalCostUsd: "0.022500",
      totalCostInr: "1.9350",
    });
    mockMonitoringRepo.getRetriedCount.mockResolvedValue(3);
    mockMonitoringRepo.getCostByDate.mockResolvedValue([
      {
        date: "2026-10-24",
        costUsd: "0.022500",
        costInr: "1.9350",
        tokens: 12000,
        videoCount: 10,
      },
    ]);
    mockMonitoringRepo.getRecentBatches.mockResolvedValue([
      {
        id: "batch-1",
        openaiBatchId: "batch_openai_1",
        status: "completed",
        requestCount: 10,
        successCount: 9,
        failureCount: 1,
        submittedAt: new Date("2026-10-24T06:00:00Z"),
        completedAt: new Date("2026-10-24T06:30:00Z"),
        totalCostUsd: "0.022500",
      },
    ]);
    mockMonitoringRepo.getFailureReasons.mockResolvedValue([
      { reason: "MODEL_ERROR", count: 1 },
    ]);
    mockMonitoringRepo.getPromptVersionDistribution.mockResolvedValue([
      { version: "v1.0.0", count: 10 },
    ]);

    const metrics = await service.getMetrics();

    expect(metrics.totalVideosClassified).toBe(10);
    expect(metrics.statusBreakdown.completed).toBe(10);
    expect(metrics.statusBreakdown.pending).toBe(2);
    expect(metrics.statusBreakdown.failed).toBe(1);
    expect(metrics.videosWithZeroTags).toBe(2);
    expect(metrics.totalTokens).toBe(12000);
    expect(metrics.totalCostUsd).toBe(0.0225);
    expect(metrics.estimatedCostInr).toBe(1.935);
    expect(metrics.retryRatePercent).toBeGreaterThan(0);
    expect(metrics.costByDate).toHaveLength(1);
    expect(metrics.recentBatches).toHaveLength(1);
    expect(metrics.failureReasons).toEqual([{ reason: "MODEL_ERROR", count: 1 }]);
    expect(metrics.promptVersionDistribution).toEqual({ "v1.0.0": 10 });
  });
});
