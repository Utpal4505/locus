import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  classificationBatches,
  count,
  eq,
  feedback,
  gte,
  integrations,
  isNull,
  or,
  session,
  sources,
  sql,
  syncRuns,
  user,
  userPreferences,
  videoLibrary,
  videoNotes,
  videos,
  videoTaggingStates,
} from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../database/index.js';

export interface StorageCounts {
  totalVideos: number;
  totalSources: number;
  totalLibraryItems: number;
  totalNotes: number;
  totalFeedbacks: number;
  openBugs: number;
}

@Injectable()
export class AdminMetricsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getUserAndSessionData() {
    const [allUsers, allSessions, allIntegrations, onboardingRows] = await Promise.all([
      this.db.select().from(user),
      this.db.select().from(session),
      this.db.select().from(integrations),
      this.db
        .select({ count: count() })
        .from(userPreferences)
        .where(sql`${userPreferences.onboardingCompletedAt} IS NOT NULL`),
    ]);

    return {
      allUsers,
      allSessions,
      allIntegrations,
      onboardingCompletedCount: Number(onboardingRows?.[0]?.count ?? 0),
    };
  }

  async getRecentSyncRuns(twentyFourHoursAgo: Date) {
    return this.db
      .select()
      .from(syncRuns)
      .where(gte(syncRuns.createdAt, twentyFourHoursAgo));
  }

  async getStaleChannelsCount(twentyFourHoursAgo: Date): Promise<number> {
    const [staleChannelsRow] = await this.db
      .select({ count: count() })
      .from(sources)
      .where(
        and(
          eq(sources.isActive, true),
          or(
            isNull(sources.lastFetchedAt),
            sql`${sources.lastFetchedAt} < ${twentyFourHoursAgo}`,
          ),
        ),
      );

    return Number(staleChannelsRow?.count ?? 0);
  }

  async getClassificationData() {
    const [taggingStates, batches] = await Promise.all([
      this.db.select().from(videoTaggingStates),
      this.db.select().from(classificationBatches),
    ]);

    return { taggingStates, batches };
  }

  async getStorageCounts(): Promise<StorageCounts> {
    const [
      videosRows,
      sourcesRows,
      libraryRows,
      notesRows,
      feedbackRows,
      openBugsRows,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(videos),
      this.db.select({ count: count() }).from(sources),
      this.db.select({ count: count() }).from(videoLibrary),
      this.db.select({ count: count() }).from(videoNotes),
      this.db.select({ count: count() }).from(feedback),
      this.db
        .select({ count: count() })
        .from(feedback)
        .where(
          and(
            eq(feedback.type, 'bug'),
            or(eq(feedback.status, 'open'), eq(feedback.status, 'under_review')),
          ),
        ),
    ]);

    return {
      totalVideos: Number(videosRows?.[0]?.count ?? 0),
      totalSources: Number(sourcesRows?.[0]?.count ?? 0),
      totalLibraryItems: Number(libraryRows?.[0]?.count ?? 0),
      totalNotes: Number(notesRows?.[0]?.count ?? 0),
      totalFeedbacks: Number(feedbackRows?.[0]?.count ?? 0),
      openBugs: Number(openBugsRows?.[0]?.count ?? 0),
    };
  }
}

