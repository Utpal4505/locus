import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@locus/database";
import { ClassificationMonitoringService } from "../services/classification-monitoring.service.js";

describe("ClassificationMonitoringService", () => {
  let service: ClassificationMonitoringService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new ClassificationMonitoringService();
  });

  it("aggregates status breakdown, token totals, financial costs, and recent batches", async () => {
    // 1. Status breakdown
    vi.spyOn(db, "select")
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { status: "completed", count: 10 },
          { status: "pending", count: 2 },
          { status: "failed", count: 1 },
        ]),
      } as any)
      // 2. Zero tags count
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      } as any)
      // 3. Totals
      .mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([
          {
            inputTokens: 10000,
            outputTokens: 2000,
            totalCostUsd: "0.022500",
            totalCostInr: "1.9350",
          },
        ]),
      } as any)
      // 4. Retried count
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      } as any)
      // 5. Cost by date
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            date: "2026-10-24",
            costUsd: "0.022500",
            costInr: "1.9350",
            tokens: 12000,
            videoCount: 10,
          },
        ]),
      } as any)
      // 6. Recent batches
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
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
        ]),
      } as any)
      // 7. Failure reasons
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { reason: "MODEL_ERROR", count: 1 },
        ]),
      } as any)
      // 8. Prompt version distribution
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { version: "v1.0.0", count: 10 },
        ]),
      } as any);

    const metrics = await service.getMetrics();

    expect(metrics.totalVideosClassified).toBe(10);
    expect(metrics.statusBreakdown.completed).toBe(10);
    expect(metrics.statusBreakdown.pending).toBe(2);
    expect(metrics.statusBreakdown.failed).toBe(1);
    expect(metrics.videosWithZeroTags).toBe(2);
    expect(metrics.totalInputTokens).toBe(10000);
    expect(metrics.totalOutputTokens).toBe(2000);
    expect(metrics.totalTokens).toBe(12000);
    expect(metrics.totalCostUsd).toBeCloseTo(0.0225, 4);
    expect(metrics.estimatedCostInr).toBeCloseTo(1.935, 3);
    expect(metrics.averageCostPerVideoUsd).toBeCloseTo(0.00225, 5);
    expect(metrics.recentBatches.length).toBe(1);
    expect(metrics.costByDate.length).toBe(1);
    expect(metrics.promptVersionDistribution["v1.0.0"]).toBe(10);
  });
});

