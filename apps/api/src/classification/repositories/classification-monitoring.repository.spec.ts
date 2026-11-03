import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClassificationMonitoringRepository } from "./classification-monitoring.repository.js";
import type { DrizzleDb } from "../../database/index.js";

describe("ClassificationMonitoringRepository", () => {
  let repository: ClassificationMonitoringRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
    };
    repository = new ClassificationMonitoringRepository(mockDb as unknown as DrizzleDb);
    vi.restoreAllMocks();
  });

  describe("getStatusCounts", () => {
    it("returns status breakdown", async () => {
      const mockRows = [{ status: "completed", count: 5 }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue(mockRows),
        }),
      });

      const res = await repository.getStatusCounts();
      expect(res).toEqual(mockRows);
    });
  });

  describe("getVideosWithZeroTagsCount", () => {
    it("returns zero tags count", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

      const res = await repository.getVideosWithZeroTagsCount();
      expect(res).toBe(2);
    });
  });

  describe("getTokenAndCostTotals", () => {
    it("returns token and cost totals", async () => {
      const mockTotals = {
        inputTokens: 100,
        outputTokens: 50,
        totalCostUsd: "0.01",
        totalCostInr: "0.85",
      };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue([mockTotals]),
      });

      const res = await repository.getTokenAndCostTotals();
      expect(res).toEqual(mockTotals);
    });
  });

  describe("getRetriedCount", () => {
    it("returns count of retried tagging rows", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      const count = await repository.getRetriedCount();
      expect(count).toBe(3);
    });
  });

  describe("getCostByDate", () => {
    it("returns cost grouped by day", async () => {
      const mockRows = [{ date: "2026-10-24", costUsd: "0.01" }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockRows),
            }),
          }),
        }),
      });

      const res = await repository.getCostByDate(30);
      expect(res).toEqual(mockRows);
    });
  });

  describe("getRecentBatches", () => {
    it("returns recent batches ordered by createdAt desc", async () => {
      const mockBatches = [{ id: "batch-1", status: "completed" }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockBatches),
          }),
        }),
      });

      const res = await repository.getRecentBatches(20);
      expect(res).toEqual(mockBatches);
    });
  });

  describe("getFailureReasons", () => {
    it("returns failure reasons grouped by message", async () => {
      const mockReasons = [{ reason: "TIMEOUT", count: 2 }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockReasons),
            }),
          }),
        }),
      });

      const res = await repository.getFailureReasons(10);
      expect(res).toEqual(mockReasons);
    });
  });

  describe("getPromptVersionDistribution", () => {
    it("returns prompt versions grouped by version", async () => {
      const mockVersions = [{ version: "v1.0.0", count: 10 }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue(mockVersions),
        }),
      });

      const res = await repository.getPromptVersionDistribution();
      expect(res).toEqual(mockVersions);
    });
  });
});

