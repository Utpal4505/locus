import { Injectable, Logger } from '@nestjs/common';
import {
  and,
  db,
  desc,
  eq,
  sql,
  videoTaggingStates,
  classificationBatches,
  classificationUsage,
} from '@locus/database';
import type { ClassificationMetrics } from '../schemas/monitoring.contract.js';

@Injectable()
export class ClassificationMonitoringService {
  private readonly logger = new Logger(ClassificationMonitoringService.name);

  /**
   * Aggregates complete pipeline health, token consumption, and financial expenditure telemetry.
   */
  async getMetrics(): Promise<ClassificationMetrics> {
    // 1. Status breakdown
    const statusCounts = await db
      .select({
        status: videoTaggingStates.status,
        count: sql<number>`count(*)::int`,
      })
      .from(videoTaggingStates)
      .groupBy(videoTaggingStates.status);

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
    const [zeroTagsRow] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(classificationUsage)
      .where(
        and(
          eq(classificationUsage.status, 'completed'),
          sql`jsonb_array_length(${classificationUsage.selectedTopicIds}) = 0`,
        ),
      );

    const videosWithZeroTags = Number(zeroTagsRow?.count ?? 0);

    // 3. Aggregate token counts and total expenditure from classification_usage
    const [totalsRow] = await db
      .select({
        inputTokens: sql<number>`coalesce(sum(${classificationUsage.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${classificationUsage.outputTokens}), 0)::int`,
        totalCostUsd: sql<string>`coalesce(sum(${classificationUsage.costUsd}), 0)::text`,
        totalCostInr: sql<string>`coalesce(sum(${classificationUsage.costInr}), 0)::text`,
      })
      .from(classificationUsage);

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

    const [retriedRow] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(videoTaggingStates)
      .where(sql`${videoTaggingStates.attemptCount} > 1`);

    const totalAll =
      breakdown.pending +
      breakdown.submitted +
      breakdown.completed +
      breakdown.failed;
    const retryRatePercent =
      totalAll > 0 ? (Number(retriedRow?.count ?? 0) / totalAll) * 100 : 0;

    // 5. Cost by date (last 30 days)
    const costByDateRows = await db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${classificationUsage.createdAt}), 'YYYY-MM-DD')`,
        costUsd: sql<string>`sum(${classificationUsage.costUsd})::text`,
        costInr: sql<string>`sum(${classificationUsage.costInr})::text`,
        tokens: sql<number>`sum(${classificationUsage.inputTokens} + ${classificationUsage.outputTokens})::int`,
        videoCount: sql<number>`count(*)::int`,
      })
      .from(classificationUsage)
      .groupBy(sql`date_trunc('day', ${classificationUsage.createdAt})`)
      .orderBy(sql`date_trunc('day', ${classificationUsage.createdAt}) desc`)
      .limit(30);

    const costByDate = costByDateRows.map((r) => ({
      date: r.date,
      costUsd: parseFloat(r.costUsd || '0'),
      costInr: parseFloat(r.costInr || '0'),
      tokens: Number(r.tokens || 0),
      videoCount: Number(r.videoCount || 0),
    }));

    // 6. Recent batches
    const recentBatchRows = await db
      .select({
        id: classificationBatches.id,
        openaiBatchId: classificationBatches.openaiBatchId,
        status: classificationBatches.status,
        requestCount: classificationBatches.requestCount,
        successCount: classificationBatches.successCount,
        failureCount: classificationBatches.failureCount,
        submittedAt: classificationBatches.submittedAt,
        completedAt: classificationBatches.completedAt,
        totalCostUsd: classificationBatches.totalCostUsd,
      })
      .from(classificationBatches)
      .orderBy(desc(classificationBatches.createdAt))
      .limit(20);

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
    const failureReasonRows = await db
      .select({
        reason: sql<string>`coalesce(${videoTaggingStates.lastErrorMessage}, ${videoTaggingStates.lastErrorCode}, 'Unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(videoTaggingStates)
      .where(eq(videoTaggingStates.status, 'failed'))
      .groupBy(
        sql`coalesce(${videoTaggingStates.lastErrorMessage}, ${videoTaggingStates.lastErrorCode}, 'Unknown')`,
      )
      .limit(10);

    const failureReasons = failureReasonRows.map((fr) => ({
      reason: fr.reason,
      count: Number(fr.count || 0),
    }));

    // 8. Prompt version distribution
    const promptDistRows = await db
      .select({
        version: sql<string>`coalesce(${classificationUsage.promptVersion}, 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(classificationUsage)
      .groupBy(classificationUsage.promptVersion);

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
