import { Injectable, Logger } from '@nestjs/common';
import { ClassificationMonitoringRepository } from '../repositories/classification-monitoring.repository.js';
import type { ClassificationMetrics } from '../schemas/monitoring.contract.js';

@Injectable()
export class ClassificationMonitoringService {
  private readonly logger = new Logger(ClassificationMonitoringService.name);

  constructor(
    private readonly monitoringRepo: ClassificationMonitoringRepository,
  ) {}

  /**
   * Aggregates complete pipeline health, token consumption, and financial expenditure telemetry.
   */
  async getMetrics(): Promise<ClassificationMetrics> {
    // 1. Status breakdown
    const statusCounts = await this.monitoringRepo.getStatusCounts();

    const breakdown = {
      pending: 0,
      submitted: 0,
      completed: 0,
      failed: 0,
    };

    for (const sc of statusCounts) {
      if (sc.status in breakdown) {
        breakdown[sc.status as keyof typeof breakdown] = Number(sc.count);
      }
    }

    const totalVideosClassified = breakdown.completed;

    // 2. Videos classified with zero tags
    const videosWithZeroTags = await this.monitoringRepo.getVideosWithZeroTagsCount();

    // 3. Aggregate token counts and total expenditure from classification_usage
    const totalsRow = await this.monitoringRepo.getTokenAndCostTotals();

    const totalInputTokens = Number(totalsRow?.inputTokens ?? 0);
    const totalOutputTokens = Number(totalsRow?.outputTokens ?? 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalCostUsd = parseFloat(totalsRow?.totalCostUsd || '0');
    const estimatedCostInr = parseFloat(totalsRow?.totalCostInr || '0');

    // 4. Averages, success rate, and retry rate
    const averageCostPerVideoUsd =
      totalVideosClassified > 0 ? totalCostUsd / totalVideosClassified : 0;
    const averageCostPerVideoInr =
      totalVideosClassified > 0 ? estimatedCostInr / totalVideosClassified : 0;

    const totalFinished = breakdown.completed + breakdown.failed;
    const successRatePercent =
      totalFinished > 0 ? (breakdown.completed / totalFinished) * 100 : 100;

    const retriedCount = await this.monitoringRepo.getRetriedCount();

    const totalAll =
      breakdown.pending +
      breakdown.submitted +
      breakdown.completed +
      breakdown.failed;
    const retryRatePercent =
      totalAll > 0 ? (retriedCount / totalAll) * 100 : 0;

    // 5. Cost by date (last 30 days)
    const costByDateRows = await this.monitoringRepo.getCostByDate(30);

    const costByDate = costByDateRows.map((r) => ({
      date: r.date,
      costUsd: parseFloat(r.costUsd || '0'),
      costInr: parseFloat(r.costInr || '0'),
      tokens: Number(r.tokens || 0),
      videoCount: Number(r.videoCount || 0),
    }));

    // 6. Recent batches
    const recentBatchRows = await this.monitoringRepo.getRecentBatches(20);

    const recentBatches = recentBatchRows.map((b) => ({
      id: b.id,
      openaiBatchId: b.openaiBatchId,
      status: b.status,
      requestCount: b.requestCount,
      successCount: b.successCount,
      failureCount: b.failureCount,
      submittedAt: b.submittedAt ? b.submittedAt.toISOString() : null,
      completedAt: b.completedAt ? b.completedAt.toISOString() : null,
      totalCostUsd: parseFloat(b.totalCostUsd || '0'),
    }));

    // 7. Failure reasons distribution
    const failureReasonRows = await this.monitoringRepo.getFailureReasons(10);

    const failureReasons = failureReasonRows.map((fr) => ({
      reason: fr.reason,
      count: Number(fr.count || 0),
    }));

    // 8. Prompt version distribution
    const promptDistRows = await this.monitoringRepo.getPromptVersionDistribution();

    const promptVersionDistribution: Record<string, number> = {};
    for (const pd of promptDistRows) {
      promptVersionDistribution[pd.version] = Number(pd.count);
    }

    return {
      totalVideosClassified,
      statusBreakdown: breakdown,
      videosWithZeroTags,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCostUsd,
      estimatedCostInr,
      averageCostPerVideoUsd,
      averageCostPerVideoInr,
      successRatePercent,
      retryRatePercent,
      costByDate,
      recentBatches,
      failureReasons,
      promptVersionDistribution,
    };
  }
}
