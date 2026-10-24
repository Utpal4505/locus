import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/auth.guard.js";
import { AdminGuard } from "../../auth/admin.guard.js";
import { ClassificationMonitoringService } from "../services/classification-monitoring.service.js";
import { BatchOrchestratorService } from "../services/batch-orchestrator.service.js";
import type {
  ClassificationMetrics,
  RetryFailedVideosRequest,
} from "../schemas/monitoring.contract.js";

@Controller("api/admin/classification")
export class ClassificationMonitoringController {
  constructor(
    private readonly monitoringService: ClassificationMonitoringService,
    private readonly orchestratorService: BatchOrchestratorService,
  ) {}

  private ensureFeatureEnabled() {
    if (process.env.AI_VIDEO_TAGGING_ENABLED !== "true") {
      throw new NotFoundException("AI Video Tagging feature is currently disabled.");
    }
  }

  /**
   * Retrieves operational health, token consumption, and cost telemetry.
   */
  @UseGuards(AuthGuard, AdminGuard)
  @Get("metrics")
  @HttpCode(HttpStatus.OK)
  async getMetrics(): Promise<ClassificationMetrics> {
    this.ensureFeatureEnabled();
    return this.monitoringService.getMetrics();
  }

  /**
   * Manually triggers retries for failed video classifications.
   */
  @UseGuards(AuthGuard, AdminGuard)
  @Post("retry-failed")
  @HttpCode(HttpStatus.OK)
  async retryFailed(
    @Body() body?: RetryFailedVideosRequest,
  ): Promise<{ retriedCount: number }> {
    this.ensureFeatureEnabled();
    return this.orchestratorService.retryFailedVideos(body?.videoIds);
  }

  /**
   * Manually queues unclassified existing videos for backfill.
   */
  @UseGuards(AuthGuard, AdminGuard)
  @Post("backfill")
  @HttpCode(HttpStatus.OK)
  async backfill(
    @Body("limit") limit?: number,
  ): Promise<{ queuedCount: number }> {
    this.ensureFeatureEnabled();
    const parsedLimit = limit && limit > 0 ? Math.min(limit, 1000) : 500;
    return this.orchestratorService.backfillVideos(parsedLimit);
  }
}

