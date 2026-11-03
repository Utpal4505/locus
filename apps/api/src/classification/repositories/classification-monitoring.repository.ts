import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  sql,
  videoTaggingStates,
  classificationBatches,
  classificationUsage,
} from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../../database/index.js';

export interface StatusCountRow {
  status: string;
  count: number;
}

export interface UsageTotalsRow {
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: string;
  totalCostInr: string;
}

export interface CostByDateRow {
  date: string;
  costUsd: string;
  costInr: string;
  tokens: number;
  videoCount: number;
}

export interface RecentBatchRow {
  id: string;
  openaiBatchId: string | null;
  status: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  submittedAt: Date | null;
  completedAt: Date | null;
  totalCostUsd: string | null;
}

export interface FailureReasonRow {
  reason: string;
  count: number;
}

export interface PromptVersionRow {
  version: string;
  count: number;
}

@Injectable()
export class ClassificationMonitoringRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getStatusCounts(): Promise<StatusCountRow[]> {
    return this.db
      .select({
        status: videoTaggingStates.status,
        count: sql<number>`count(*)::int`,
      })
      .from(videoTaggingStates)
      .groupBy(videoTaggingStates.status);
  }

  async getVideosWithZeroTagsCount(): Promise<number> {
    const [zeroTagsRow] = await this.db
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

    return Number(zeroTagsRow?.count ?? 0);
  }

  async getTokenAndCostTotals(): Promise<UsageTotalsRow | null> {
    const [totalsRow] = await this.db
      .select({
        inputTokens: sql<number>`coalesce(sum(${classificationUsage.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${classificationUsage.outputTokens}), 0)::int`,
        totalCostUsd: sql<string>`coalesce(sum(${classificationUsage.costUsd}), 0)::text`,
        totalCostInr: sql<string>`coalesce(sum(${classificationUsage.costInr}), 0)::text`,
      })
      .from(classificationUsage);

    return totalsRow ?? null;
  }

  async getRetriedCount(): Promise<number> {
    const [retriedRow] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(videoTaggingStates)
      .where(sql`${videoTaggingStates.attemptCount} > 1`);

    return Number(retriedRow?.count ?? 0);
  }

  async getCostByDate(limit = 30): Promise<CostByDateRow[]> {
    return this.db
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
      .limit(limit);
  }

  async getRecentBatches(limit = 20): Promise<RecentBatchRow[]> {
    return this.db
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
      .limit(limit);
  }

  async getFailureReasons(limit = 10): Promise<FailureReasonRow[]> {
    return this.db
      .select({
        reason: sql<string>`coalesce(${videoTaggingStates.lastErrorMessage}, ${videoTaggingStates.lastErrorCode}, 'Unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(videoTaggingStates)
      .where(eq(videoTaggingStates.status, 'failed'))
      .groupBy(
        sql`coalesce(${videoTaggingStates.lastErrorMessage}, ${videoTaggingStates.lastErrorCode}, 'Unknown')`,
      )
      .limit(limit);
  }

  async getPromptVersionDistribution(): Promise<PromptVersionRow[]> {
    return this.db
      .select({
        version: sql<string>`coalesce(${classificationUsage.promptVersion}, 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(classificationUsage)
      .groupBy(classificationUsage.promptVersion);
  }
}

