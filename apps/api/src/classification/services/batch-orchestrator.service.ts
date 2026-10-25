import { Injectable, Logger } from "@nestjs/common";
import {
  and,
  db,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  sql,
  videos,
  videoTopics,
  videoTaggingStates,
  classificationBatches,
  classificationBatchItems,
  classificationUsage,
} from "@locus/database";
import { OpenAiBatchClient } from "../clients/openai-batch.client.js";
import {
  ClassificationService,
  CLASSIFICATION_PROMPT_VERSION,
  CLASSIFICATION_SCHEMA_VERSION,
  DEFAULT_AI_MODEL,
} from "./classification.service.js";
import { TopicService } from "./topic.service.js";

export const MAX_RETRY_ATTEMPTS = 3;
export const DEFAULT_BATCH_SIZE = 500;

export interface BatchRunResult {
  submitted: boolean;
  batchId?: string;
  openaiBatchId?: string;
  videoCount: number;
  reason?: string;
}

export interface PollingSummary {
  batchesPolled: number;
  completedBatches: number;
  failedBatches: number;
  videosProcessed: number;
}

@Injectable()
export class BatchOrchestratorService {
  private readonly logger = new Logger(BatchOrchestratorService.name);

  constructor(
    private readonly openAiClient: OpenAiBatchClient,
    private readonly classificationService: ClassificationService,
    private readonly topicService: TopicService,
  ) {}

  /**
   * Helper to retrieve model token pricing per million (Batch API 50% discount included).
   */
  private getPricing() {
    const inputPer1M = Number(process.env.AI_INPUT_COST_PER_1M || "1.25");
    const outputPer1M = Number(process.env.AI_OUTPUT_COST_PER_1M || "5.00");
    const usdToInr = Number(process.env.USD_TO_INR_EXCHANGE_RATE || "86.0");

    return {
      inputCostPerToken: inputPer1M / 1_000_000,
      outputCostPerToken: outputPer1M / 1_000_000,
      usdToInrRate: usdToInr,
    };
  }

  /**
   * Collects eligible pending videos and submits them as a single OpenAI batch.
   */
  async createAndSubmitBatch(limit = DEFAULT_BATCH_SIZE): Promise<BatchRunResult> {
    const now = new Date();

    // 1. Query pending videos eligible for classification
    const pendingVideos = await db
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        attemptCount: videoTaggingStates.attemptCount,
      })
      .from(videoTaggingStates)
      .innerJoin(videos, eq(videoTaggingStates.videoId, videos.id))
      .where(
        and(
          eq(videoTaggingStates.status, "pending"),
          lt(videoTaggingStates.attemptCount, MAX_RETRY_ATTEMPTS),
          sql`(${videoTaggingStates.lastAttemptedAt} IS NULL OR ${videoTaggingStates.lastAttemptedAt} <= ${now})`,
        ),
      )
      .orderBy(desc(videos.publishedAt))
      .limit(limit);

    if (pendingVideos.length === 0) {
      return {
        submitted: false,
        videoCount: 0,
        reason: "NO_PENDING_VIDEOS",
      };
    }

    this.logger.log(
      `Preparing classification batch for ${pendingVideos.length} pending video(s)...`,
    );

    // 2. Generate JSONL lines for each video
    const model = process.env.AI_TAGGING_MODEL || DEFAULT_AI_MODEL;
    const jsonlLines = pendingVideos
      .map((v) =>
        JSON.stringify(
          this.classificationService.buildBatchRequestLine(v, model),
        ),
      )
      .join("\n");

    // 3. Persist local classification_batches and classification_batch_items
    const [batchRecord] = await db
      .insert(classificationBatches)
      .values({
        status: "created",
        requestCount: pendingVideos.length,
      })
      .returning({ id: classificationBatches.id });

    if (!batchRecord) {
      throw new Error("Failed to create classification_batches record.");
    }

    const localBatchId = batchRecord.id;

    // Link batch items
    const batchItemValues = pendingVideos.map((v) => ({
      batchId: localBatchId,
      videoId: v.id,
      customId: v.id,
      status: "submitted",
    }));

    await db.insert(classificationBatchItems).values(batchItemValues);

    // Transition videos to 'submitted'
    const videoIds = pendingVideos.map((v) => v.id);
    await db
      .update(videoTaggingStates)
      .set({
        status: "submitted",
        attemptCount: sql`${videoTaggingStates.attemptCount} + 1`,
        lastAttemptedAt: now,
        modelId: model,
        promptVersion: CLASSIFICATION_PROMPT_VERSION,
        schemaVersion: CLASSIFICATION_SCHEMA_VERSION,
        updatedAt: now,
      })
      .where(inArray(videoTaggingStates.videoId, videoIds));

    // 4. Upload input file to OpenAI and submit batch
    try {
      const inputFileId =
        await this.openAiClient.uploadBatchInputFile(jsonlLines);

      const openAiBatch = await this.openAiClient.createBatch(inputFileId, {
        localBatchId,
      });

      // Update local batch record
      await db
        .update(classificationBatches)
        .set({
          openaiBatchId: openAiBatch.id,
          openaiInputFileId: inputFileId,
          status: "submitted",
          submittedAt: now,
          updatedAt: now,
        })
        .where(eq(classificationBatches.id, localBatchId));

      this.logger.log(
        `Batch ${localBatchId} submitted successfully to OpenAI. Provider Batch ID: ${openAiBatch.id}`,
      );

      return {
        submitted: true,
        batchId: localBatchId,
        openaiBatchId: openAiBatch.id,
        videoCount: pendingVideos.length,
      };
    } catch (err) {
      const errorMsg = (err as Error).message || "Batch submission failed";
      this.logger.error(
        `Failed to submit batch ${localBatchId} to OpenAI: ${errorMsg}`,
      );

      // Rollback batch status and reset videos to pending
      await db
        .update(classificationBatches)
        .set({
          status: "failed",
          errorMessage: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(classificationBatches.id, localBatchId));

      await db
        .update(videoTaggingStates)
        .set({
          status: "pending",
          lastErrorCode: "SUBMISSION_FAILED",
          lastErrorMessage: errorMsg,
          updatedAt: new Date(),
        })
        .where(inArray(videoTaggingStates.videoId, videoIds));

      throw err;
    }
  }

  /**
   * Polls all outstanding submitted/in_progress batches and processes results for completed batches.
   */
  async pollAndProcessBatches(): Promise<PollingSummary> {
    const activeBatches = await db
      .select({
        id: classificationBatches.id,
        openaiBatchId: classificationBatches.openaiBatchId,
        status: classificationBatches.status,
      })
      .from(classificationBatches)
      .where(
        inArray(classificationBatches.status, ["submitted", "in_progress"]),
      );

    if (activeBatches.length === 0) {
      return {
        batchesPolled: 0,
        completedBatches: 0,
        failedBatches: 0,
        videosProcessed: 0,
      };
    }

    this.logger.log(
      `Polling status for ${activeBatches.length} active classification batch(es)...`,
    );

    let completedBatchesCount = 0;
    let failedBatchesCount = 0;
    let totalVideosProcessedCount = 0;

    for (const batch of activeBatches) {
      if (!batch.openaiBatchId) continue;

      try {
        const providerBatch = await this.openAiClient.retrieveBatch(
          batch.openaiBatchId,
        );

        await db
          .update(classificationBatches)
          .set({
            lastPolledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(classificationBatches.id, batch.id));

        if (providerBatch.status === "in_progress") {
          await db
            .update(classificationBatches)
            .set({ status: "in_progress", updatedAt: new Date() })
            .where(eq(classificationBatches.id, batch.id));
        } else if (providerBatch.status === "completed") {
          const processed = await this.processCompletedBatch(
            batch.id,
            providerBatch.output_file_id ?? null,
            providerBatch.error_file_id ?? null,
          );
          completedBatchesCount++;
          totalVideosProcessedCount += processed;
        } else if (
          providerBatch.status === "failed" ||
          providerBatch.status === "expired" ||
          providerBatch.status === "cancelled"
        ) {
          await this.handleBatchFailure(
            batch.id,
            providerBatch.status,
            `OpenAI batch terminated with status ${providerBatch.status}`,
          );
          failedBatchesCount++;
        }
      } catch (err) {
        this.logger.warn(
          `Failed to poll batch ${batch.id} (${batch.openaiBatchId}): ${(err as Error).message}`,
        );
      }
    }

    return {
      batchesPolled: activeBatches.length,
      completedBatches: completedBatchesCount,
      failedBatches: failedBatchesCount,
      videosProcessed: totalVideosProcessedCount,
    };
  }

  /**
   * Ingests the output results of a completed OpenAI batch, updates video tags,
   * records token usage and costs, and transitions video states.
   */
  private async processCompletedBatch(
    batchId: string,
    outputFileId: string | null,
    errorFileId: string | null,
  ): Promise<number> {
    if (!outputFileId) {
      this.logger.warn(
        `Batch ${batchId} marked completed but has no output_file_id.`,
      );
      await this.handleBatchFailure(
        batchId,
        "failed",
        "Completed batch has missing output_file_id.",
      );
      return 0;
    }

    this.logger.log(
      `Processing results for batch ${batchId} (output file: ${outputFileId})...`,
    );

    const outputContent =
      await this.openAiClient.getBatchOutputFileContent(outputFileId);
    const lines = outputContent.split("\n").filter((l) => l.trim().length > 0);

    const topicMap = await this.topicService.getTopicMapBySlug();
    const activeSlugs = new Set(topicMap.keys());
    const pricing = this.getPricing();
    const now = new Date();

    let batchInputTokens = 0;
    let batchOutputTokens = 0;
    let batchTotalCostUsd = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const line of lines) {
      let record: {
        custom_id: string;
        response?: {
          status_code?: number;
          body?: {
            usage?: {
              prompt_tokens?: number;
              completion_tokens?: number;
              total_tokens?: number;
            };
            choices?: Array<{
              message?: {
                content?: string;
              };
            }>;
          };
        };
        error?: { message?: string; code?: string };
      };

      try {
        record = JSON.parse(line);
      } catch {
        failureCount++;
        continue;
      }

      const videoId = record.custom_id;
      if (!videoId) continue;

      // 1. Idempotency Check: Skip if usage has already been recorded for this batch/video
      const [existingUsage] = await db
        .select({ id: classificationUsage.id })
        .from(classificationUsage)
        .where(
          and(
            eq(classificationUsage.batchId, batchId),
            eq(classificationUsage.videoId, videoId),
          ),
        )
        .limit(1);

      if (existingUsage) {
        // Already processed line, skip to prevent double counting
        successCount++;
        continue;
      }

      const usage = record.response?.body?.usage;
      const inputTokens = usage?.prompt_tokens ?? 0;
      const outputTokens = usage?.completion_tokens ?? 0;
      const costUsd =
        inputTokens * pricing.inputCostPerToken +
        outputTokens * pricing.outputCostPerToken;
      const costInr = costUsd * pricing.usdToInrRate;

      batchInputTokens += inputTokens;
      batchOutputTokens += outputTokens;
      batchTotalCostUsd += costUsd;

      const rawContent = record.response?.body?.choices?.[0]?.message?.content;
      const statusCode = record.response?.status_code ?? 0;

      // Check if response is successful
      if (statusCode === 200 && rawContent) {
        try {
          // Validate Structured Output against active vocabulary
          const validatedSlugs =
            this.classificationService.validateResponseContent(
              rawContent,
              activeSlugs,
            );

          // Database transaction: assign tags and complete state
          await db.transaction(async (tx: any) => {
            // Remove any existing tags for this video to ensure idempotency
            await tx
              .delete(videoTopics)
              .where(eq(videoTopics.videoId, videoId));

            // Insert new tags
            if (validatedSlugs.length > 0) {
              const topicAssignments = validatedSlugs
                .map((slug) => {
                  const topicId = topicMap.get(slug);
                  return topicId ? { videoId, topicId } : null;
                })
                .filter(
                  (a): a is { videoId: string; topicId: string } => a !== null,
                );

              if (topicAssignments.length > 0) {
                await tx.insert(videoTopics).values(topicAssignments);
              }
            }

            // Persist per-video usage audit record
            await tx.insert(classificationUsage).values({
              videoId,
              batchId,
              modelId: process.env.AI_TAGGING_MODEL || DEFAULT_AI_MODEL,
              promptVersion: CLASSIFICATION_PROMPT_VERSION,
              schemaVersion: CLASSIFICATION_SCHEMA_VERSION,
              inputTokens,
              outputTokens,
              costUsd: costUsd.toFixed(6),
              costInr: costInr.toFixed(4),
              usdToInrRate: pricing.usdToInrRate.toFixed(4),
              isCostEstimated: true,
              status: "completed",
              selectedTopicIds: validatedSlugs,
              createdAt: now,
            });

            // Transition video tagging state to completed
            await tx
              .update(videoTaggingStates)
              .set({
                status: "completed",
                completedAt: now,
                updatedAt: now,
              })
              .where(eq(videoTaggingStates.videoId, videoId));

            // Mark batch item completed
            await tx
              .update(classificationBatchItems)
              .set({ status: "completed" })
              .where(
                and(
                  eq(classificationBatchItems.batchId, batchId),
                  eq(classificationBatchItems.videoId, videoId),
                ),
              );
          });

          successCount++;
        } catch (err) {
          // Validation error for this specific video
          await this.handleVideoClassificationFailure(
            batchId,
            videoId,
            "VALIDATION_ERROR",
            (err as Error).message,
            inputTokens,
            outputTokens,
            costUsd,
            costInr,
            pricing.usdToInrRate,
          );
          failureCount++;
        }
      } else {
        // HTTP or model error for this video
        const errorMsg =
          record.error?.message || `HTTP ${statusCode} model error`;
        const errorCode = record.error?.code || "MODEL_ERROR";

        await this.handleVideoClassificationFailure(
          batchId,
          videoId,
          errorCode,
          errorMsg,
          inputTokens,
          outputTokens,
          costUsd,
          costInr,
          pricing.usdToInrRate,
        );
        failureCount++;
      }
    }

    const estimatedCostInr = batchTotalCostUsd * pricing.usdToInrRate;

    // Update batch record status to completed
    await db
      .update(classificationBatches)
      .set({
        status: "completed",
        openaiOutputFileId: outputFileId,
        openaiErrorFileId: errorFileId,
        successCount,
        failureCount,
        inputTokens: batchInputTokens,
        outputTokens: batchOutputTokens,
        totalCostUsd: batchTotalCostUsd.toFixed(6),
        estimatedCostInr: estimatedCostInr.toFixed(4),
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(classificationBatches.id, batchId));

    this.logger.log(
      `Batch ${batchId} processing completed: ${successCount} succeeded, ${failureCount} failed. Cost: $${batchTotalCostUsd.toFixed(4)} (₹${estimatedCostInr.toFixed(2)})`,
    );

    return successCount;
  }

  /**
   * Handles failure for a single video item in a batch, recording paid tokens
   * and applying bounded retries.
   */
  private async handleVideoClassificationFailure(
    batchId: string,
    videoId: string,
    errorCode: string,
    errorMessage: string,
    inputTokens: number,
    outputTokens: number,
    costUsd: number,
    costInr: number,
    usdToInrRate: number,
  ) {
    const now = new Date();

    // 1. Persist failure audit in classification_usage so expenditure is recorded
    await db
      .insert(classificationUsage)
      .values({
        videoId,
        batchId,
        modelId: process.env.AI_TAGGING_MODEL || DEFAULT_AI_MODEL,
        promptVersion: CLASSIFICATION_PROMPT_VERSION,
        schemaVersion: CLASSIFICATION_SCHEMA_VERSION,
        inputTokens,
        outputTokens,
        costUsd: costUsd.toFixed(6),
        costInr: costInr.toFixed(4),
        usdToInrRate: usdToInrRate.toFixed(4),
        isCostEstimated: true,
        status: "failed",
        errorCode,
        errorMessage,
        createdAt: now,
      })
      .catch(() => {});

    // 2. Read current attempt count
    const [state] = await db
      .select({ attemptCount: videoTaggingStates.attemptCount })
      .from(videoTaggingStates)
      .where(eq(videoTaggingStates.videoId, videoId));

    const attempts = state?.attemptCount ?? 1;

    // 3. Mark batch item failed
    await db
      .update(classificationBatchItems)
      .set({ status: "failed" })
      .where(
        and(
          eq(classificationBatchItems.batchId, batchId),
          eq(classificationBatchItems.videoId, videoId),
        ),
      );

    if (attempts >= MAX_RETRY_ATTEMPTS) {
      // Retries exhausted: mark terminal failure
      await db
        .update(videoTaggingStates)
        .set({
          status: "failed",
          lastErrorCode: errorCode,
          lastErrorMessage: errorMessage,
          updatedAt: now,
        })
        .where(eq(videoTaggingStates.videoId, videoId));
    } else {
      // Exponential backoff delay (15m * 2^attempts)
      const delayMs = Math.min(15 * 60 * 1000 * Math.pow(2, attempts), 2 * 60 * 60 * 1000);
      const nextAttemptAt = new Date(Date.now() + delayMs);

      await db
        .update(videoTaggingStates)
        .set({
          status: "pending",
          lastErrorCode: errorCode,
          lastErrorMessage: errorMessage,
          lastAttemptedAt: nextAttemptAt,
          updatedAt: now,
        })
        .where(eq(videoTaggingStates.videoId, videoId));
    }
  }

  /**
   * Handles batch-level expiration, cancellation, or provider failures.
   * Ensures associated videos are never stranded in 'submitted' state.
   */
  private async handleBatchFailure(
    batchId: string,
    terminalStatus: "failed" | "expired" | "cancelled",
    errorMessage: string,
  ) {
    const now = new Date();
    this.logger.warn(`Handling terminal batch failure for ${batchId}: ${errorMessage}`);

    await db
      .update(classificationBatches)
      .set({
        status: terminalStatus,
        errorMessage,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(classificationBatches.id, batchId));

    // Find all items associated with this batch
    const items = await db
      .select({
        videoId: classificationBatchItems.videoId,
        status: classificationBatchItems.status,
      })
      .from(classificationBatchItems)
      .where(eq(classificationBatchItems.batchId, batchId));

    for (const item of items) {
      if (item.status === "completed") continue;

      const [state] = await db
        .select({ attemptCount: videoTaggingStates.attemptCount })
        .from(videoTaggingStates)
        .where(eq(videoTaggingStates.videoId, item.videoId));

      const attempts = state?.attemptCount ?? 1;

      if (attempts >= MAX_RETRY_ATTEMPTS) {
        await db
          .update(videoTaggingStates)
          .set({
            status: "failed",
            lastErrorCode: "BATCH_FAILURE",
            lastErrorMessage: errorMessage,
            updatedAt: now,
          })
          .where(eq(videoTaggingStates.videoId, item.videoId));
      } else {
        await db
          .update(videoTaggingStates)
          .set({
            status: "pending",
            lastErrorCode: "BATCH_FAILURE",
            lastErrorMessage: errorMessage,
            lastAttemptedAt: now,
            updatedAt: now,
          })
          .where(eq(videoTaggingStates.videoId, item.videoId));
      }
    }
  }

  /**
   * Finds existing videos without tagging records and queues them as pending for backfill.
   */
  async backfillVideos(limit = DEFAULT_BATCH_SIZE): Promise<{ queuedCount: number }> {
    const unclassifiedVideos = await db
      .select({ id: videos.id })
      .from(videos)
      .leftJoin(videoTaggingStates, eq(videos.id, videoTaggingStates.videoId))
      .where(isNull(videoTaggingStates.videoId))
      .limit(limit);

    if (unclassifiedVideos.length === 0) {
      return { queuedCount: 0 };
    }

    const values = unclassifiedVideos.map((v) => ({
      videoId: v.id,
      status: "pending" as const,
      attemptCount: 0,
    }));

    await db.insert(videoTaggingStates).values(values).onConflictDoNothing();

    this.logger.log(`Backfill queued ${unclassifiedVideos.length} video(s) for classification.`);
    return { queuedCount: unclassifiedVideos.length };
  }

  /**
   * Resets failed videos to pending to allow controlled manual retry.
   */
  async retryFailedVideos(videoIds?: string[]): Promise<{ retriedCount: number }> {
    const conditions = [eq(videoTaggingStates.status, "failed")];
    if (videoIds && videoIds.length > 0) {
      conditions.push(inArray(videoTaggingStates.videoId, videoIds));
    }

    const result = await db
      .update(videoTaggingStates)
      .set({
        status: "pending",
        attemptCount: 0,
        lastAttemptedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning({ id: videoTaggingStates.videoId });

    this.logger.log(`Reset ${result.length} failed video(s) for retry.`);
    return { retriedCount: result.length };
  }
}

