import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@locus/database";
import { BatchOrchestratorService } from "../services/batch-orchestrator.service.js";
import { ClassificationService } from "../services/classification.service.js";
import { TopicService } from "../services/topic.service.js";
import type { IOpenAiBatchClient } from "../clients/openai-batch.client.js";

describe("BatchOrchestratorService", () => {
  let service: BatchOrchestratorService;
  let mockOpenAiClient: IOpenAiBatchClient;
  let classificationService: ClassificationService;
  let topicService: TopicService;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockOpenAiClient = {
      uploadBatchInputFile: vi.fn().mockResolvedValue("file_input_123"),
      createBatch: vi.fn().mockResolvedValue({
        id: "batch_openai_123",
        status: "validating",
      } as any),
      retrieveBatch: vi.fn().mockResolvedValue({
        id: "batch_openai_123",
        status: "completed",
        output_file_id: "file_output_123",
      } as any),
      getBatchOutputFileContent: vi.fn().mockResolvedValue(""),
      cancelBatch: vi.fn().mockResolvedValue({
        id: "batch_openai_123",
        status: "cancelled",
      } as any),
    };

    classificationService = new ClassificationService();
    topicService = new TopicService();

    // Mock topicService.getTopicMapBySlug
    vi.spyOn(topicService, "getTopicMapBySlug").mockResolvedValue(
      new Map([
        ["ai", "00000000-0000-0000-0000-000000000001"],
        ["backend", "00000000-0000-0000-0000-000000000002"],
        ["db", "00000000-0000-0000-0000-000000000003"],
      ]),
    );

    service = new BatchOrchestratorService(
      mockOpenAiClient as any,
      classificationService,
      topicService,
    );
  });

  describe("createAndSubmitBatch", () => {
    it("returns submitted false if no pending videos are available", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await service.createAndSubmitBatch();
      expect(result.submitted).toBe(false);
      expect(result.videoCount).toBe(0);
      expect(mockOpenAiClient.uploadBatchInputFile).not.toHaveBeenCalled();
    });

    it("collects pending videos, creates batch record, updates video state and submits to OpenAI", async () => {
      const mockPendingVideos = [
        {
          id: "vid-1",
          title: "Introduction to AI",
          description: "Overview of LLMs",
          attemptCount: 0,
        },
      ];

      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockPendingVideos),
      } as any);

      vi.spyOn(db, "insert").mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "batch-local-uuid-1" }]),
        }),
      } as any);

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.createAndSubmitBatch();

      expect(result.submitted).toBe(true);
      expect(result.batchId).toBe("batch-local-uuid-1");
      expect(result.openaiBatchId).toBe("batch_openai_123");
      expect(result.videoCount).toBe(1);
      expect(mockOpenAiClient.uploadBatchInputFile).toHaveBeenCalled();
      expect(mockOpenAiClient.createBatch).toHaveBeenCalledWith(
        "file_input_123",
        { localBatchId: "batch-local-uuid-1" },
      );
    });
  });

  describe("pollAndProcessBatches", () => {
    it("returns zero counts when there are no active batches", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      } as any);

      const summary = await service.pollAndProcessBatches();
      expect(summary.batchesPolled).toBe(0);
      expect(summary.completedBatches).toBe(0);
    });

    it("processes completed batch output, saves tags and records usage idempotently", async () => {
      vi.spyOn(db, "select").mockImplementation((fields?: any) => {
        if (fields && "status" in fields) {
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([
              {
                id: "batch-local-uuid-1",
                openaiBatchId: "batch_openai_123",
                status: "submitted",
              },
            ]),
          } as any;
        }

        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        } as any;
      });

      const outputLine = JSON.stringify({
        custom_id: "vid-1",
        response: {
          status_code: 200,
          body: {
            usage: {
              prompt_tokens: 150,
              completion_tokens: 20,
              total_tokens: 170,
            },
            choices: [
              {
                message: {
                  content: JSON.stringify({ topic_ids: ["ai", "backend"] }),
                },
              },
            ],
          },
        },
      });

      vi.spyOn(mockOpenAiClient, "getBatchOutputFileContent").mockResolvedValue(
        outputLine,
      );

      // Spy on db.transaction to execute callback immediately
      vi.spyOn(db, "transaction").mockImplementation(async (cb: any) => {
        const txMock = {
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue([]),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return cb(txMock);
      });

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const summary = await service.pollAndProcessBatches();

      expect(summary.completedBatches).toBe(1);
      expect(summary.videosProcessed).toBe(1);
      expect(mockOpenAiClient.getBatchOutputFileContent).toHaveBeenCalledWith(
        "file_output_123",
      );
    });
  });

  describe("backfillVideos & retryFailedVideos", () => {
    it("backfill queues unclassified videos as pending", async () => {
      vi.spyOn(db, "select").mockReturnValue({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: "vid-unclassified-1" }]),
      } as any);

      const insertValuesSpy = vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      });
      vi.spyOn(db, "insert").mockReturnValue({
        values: insertValuesSpy,
      } as any);

      const result = await service.backfillVideos(10);
      expect(result.queuedCount).toBe(1);
      expect(insertValuesSpy).toHaveBeenCalledWith([
        { videoId: "vid-unclassified-1", status: "pending", attemptCount: 0 },
      ]);
    });

    it("retryFailedVideos resets failed videos to pending with attemptCount 0", async () => {
      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "vid-failed-1" }]),
          }),
        }),
      } as any);

      const result = await service.retryFailedVideos();
      expect(result.retriedCount).toBe(1);
    });
  });
});
