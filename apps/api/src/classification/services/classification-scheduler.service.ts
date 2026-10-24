import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { BatchOrchestratorService } from "./batch-orchestrator.service.js";

export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
export const FIVE_MINUTES_MS = 5 * 60 * 1000;

@Injectable()
export class ClassificationSchedulerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ClassificationSchedulerService.name);
  private submitTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private isSubmitting = false;
  private isPolling = false;

  constructor(private readonly orchestrator: BatchOrchestratorService) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    if (process.env.AI_VIDEO_TAGGING_ENABLED !== "true") {
      this.logger.log(
        "AI video classification is disabled (AI_VIDEO_TAGGING_ENABLED !== 'true'). Background batch timers are inactive.",
      );
      return;
    }

    this.logger.log(
      "Initializing AI video classification batch submission and polling timers...",
    );

    // Initial check after 30 seconds
    setTimeout(() => {
      this.runBatchCycle();
    }, 30000);

    // Submission schedule: every 15 minutes
    this.submitTimer = setInterval(() => {
      this.triggerSubmission();
    }, FIFTEEN_MINUTES_MS);

    // Polling schedule: every 5 minutes
    this.pollTimer = setInterval(() => {
      this.triggerPolling();
    }, FIVE_MINUTES_MS);
  }

  onApplicationShutdown() {
    if (this.submitTimer) {
      clearInterval(this.submitTimer);
      this.submitTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.logger.log("AI video classification background timers stopped.");
  }

  /**
   * Safely triggers batch creation and submission with in-memory concurrency protection.
   */
  async triggerSubmission() {
    if (this.isSubmitting) {
      this.logger.log("Batch submission is already running. Skipping trigger.");
      return;
    }

    this.isSubmitting = true;
    try {
      await this.orchestrator.createAndSubmitBatch();
    } catch (err) {
      this.logger.error(
        `Scheduled batch submission encountered an error: ${(err as Error).message}`,
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Safely polls active batches with in-memory concurrency protection.
   */
  async triggerPolling() {
    if (this.isPolling) {
      this.logger.log("Batch polling is already running. Skipping trigger.");
      return;
    }

    this.isPolling = true;
    try {
      await this.orchestrator.pollAndProcessBatches();
    } catch (err) {
      this.logger.error(
        `Scheduled batch polling encountered an error: ${(err as Error).message}`,
      );
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Runs a complete submission and polling cycle sequentially.
   */
  async runBatchCycle() {
    await this.triggerPolling();
    await this.triggerSubmission();
  }
}

