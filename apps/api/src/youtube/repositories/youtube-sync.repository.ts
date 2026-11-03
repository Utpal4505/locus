import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, syncRuns } from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../../database/index.js';

export type SyncRunRecord = typeof syncRuns.$inferSelect;

export interface LatestSyncRunSummary {
  id: string;
  trigger: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  itemsFound: number | null;
  itemsCreated: number | null;
  errorSummary: string | null;
  createdAt: Date;
}

@Injectable()
export class YoutubeSyncRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findLatestRun(userId: string): Promise<LatestSyncRunSummary | null> {
    const [latestRun] = await this.db
      .select({
        id: syncRuns.id,
        trigger: syncRuns.trigger,
        status: syncRuns.status,
        startedAt: syncRuns.startedAt,
        completedAt: syncRuns.completedAt,
        itemsFound: syncRuns.itemsFound,
        itemsCreated: syncRuns.itemsCreated,
        errorSummary: syncRuns.errorSummary,
        createdAt: syncRuns.createdAt,
      })
      .from(syncRuns)
      .where(eq(syncRuns.userId, userId))
      .orderBy(desc(syncRuns.createdAt))
      .limit(1);

    return latestRun ?? null;
  }

  async findLatestSucceededRun(
    userId: string,
  ): Promise<{ completedAt: Date | null } | null> {
    const [latestSucceeded] = await this.db
      .select({ completedAt: syncRuns.completedAt })
      .from(syncRuns)
      .where(
        and(eq(syncRuns.userId, userId), eq(syncRuns.status, 'succeeded')),
      )
      .orderBy(desc(syncRuns.completedAt))
      .limit(1);

    return latestSucceeded ?? null;
  }

  async createRun(userId: string, trigger: string): Promise<string | null> {
    try {
      const [createdRun] = await this.db
        .insert(syncRuns)
        .values({
          userId,
          provider: 'youtube',
          trigger: trigger as any,
          status: 'running',
          startedAt: new Date(),
        })
        .returning({ id: syncRuns.id });

      return createdRun?.id ?? null;
    } catch {
      return null;
    }
  }

  async updateRunSuccess(
    runId: string,
    data: { completedAt: Date; itemsFound: number; itemsCreated: number },
  ): Promise<void> {
    await this.db
      .update(syncRuns)
      .set({
        status: 'succeeded',
        completedAt: data.completedAt,
        itemsFound: data.itemsFound,
        itemsCreated: data.itemsCreated,
        itemsUpdated: 0,
      })
      .where(eq(syncRuns.id, runId))
      .catch(() => {});
  }

  async updateRunFailure(runId: string, errorSummary: string): Promise<void> {
    await this.db
      .update(syncRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorSummary,
      })
      .where(eq(syncRuns.id, runId))
      .catch(() => {});
  }
}

