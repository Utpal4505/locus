import { Inject, Injectable } from '@nestjs/common';
import { eq, userPreferences } from '@locus/database';
import { DRIZZLE_DB, type DrizzleDb } from '../database/index.js';

export type UserPreferencesRecord = typeof userPreferences.$inferSelect;
export type InsertUserPreferencesRecord = typeof userPreferences.$inferInsert;

@Injectable()
export class PreferencesRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findByUserId(userId: string): Promise<UserPreferencesRecord | null> {
    const [existing] = await this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return existing ?? null;
  }

  async upsertDefaults(userId: string): Promise<UserPreferencesRecord> {
    const [created] = await this.db
      .insert(userPreferences)
      .values({
        userId,
        theme: 'system',
        defaultFeed: 'unified',
        feedMode: 'normal',
        hideWatchedVideos: true,
        refreshIntervalMinutes: null,
        itemsPerPage: 20,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();

    return created;
  }

  async upsertPreferences(
    userId: string,
    initialValues: Partial<InsertUserPreferencesRecord>,
    updatePayload: Partial<InsertUserPreferencesRecord>,
  ): Promise<UserPreferencesRecord> {
    const [updated] = await this.db
      .insert(userPreferences)
      .values({
        userId,
        theme: initialValues.theme ?? 'system',
        defaultFeed: initialValues.defaultFeed ?? 'unified',
        feedMode: initialValues.feedMode ?? 'normal',
        hideWatchedVideos: initialValues.hideWatchedVideos ?? true,
        refreshIntervalMinutes: initialValues.refreshIntervalMinutes ?? null,
        itemsPerPage: initialValues.itemsPerPage ?? 20,
        onboardingCompletedAt: initialValues.onboardingCompletedAt ?? null,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: updatePayload,
      })
      .returning();

    return updated;
  }
}

