import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { db, eq, userPreferences } from '@locus/database';

export type Theme = 'system' | 'light' | 'dark';
export type DefaultFeed = 'unified' | 'following' | 'discover';
export type FeedMode = 'normal' | 'tagged_only';

export interface UserPreferencesResponse {
  userId: string;
  theme: Theme;
  defaultFeed: DefaultFeed;
  feedMode: FeedMode;
  hideWatchedVideos: boolean;
  refreshIntervalMinutes: number | null;
  itemsPerPage: number;
  onboardingCompletedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface UpdateUserPreferencesRequest {
  theme?: Theme;
  defaultFeed?: DefaultFeed;
  feedMode?: FeedMode;
  hideWatchedVideos?: boolean;
  refreshIntervalMinutes?: number | null;
  itemsPerPage?: number;
}

export function validateUpdatePreferencesInput(
  input: unknown,
): UpdateUserPreferencesRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Request body must be an object.',
    });
  }

  const data = input as Record<string, unknown>;
  const result: UpdateUserPreferencesRequest = {};

  if (data.theme !== undefined) {
    if (
      data.theme !== 'system' &&
      data.theme !== 'light' &&
      data.theme !== 'dark'
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid theme. Expected "system", "light", or "dark".',
      });
    }
    result.theme = data.theme as Theme;
  }

  if (data.defaultFeed !== undefined) {
    if (
      data.defaultFeed !== 'unified' &&
      data.defaultFeed !== 'following' &&
      data.defaultFeed !== 'discover'
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message:
          'Invalid defaultFeed. Expected "unified", "following", or "discover".',
      });
    }
    result.defaultFeed = data.defaultFeed as DefaultFeed;
  }

  if (data.feedMode !== undefined) {
    if (data.feedMode !== 'normal' && data.feedMode !== 'tagged_only') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid feedMode. Expected "normal" or "tagged_only".',
      });
    }
    result.feedMode = data.feedMode as FeedMode;
  }

  if (data.hideWatchedVideos !== undefined) {
    if (typeof data.hideWatchedVideos !== 'boolean') {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid hideWatchedVideos. Expected a boolean.',
      });
    }
    result.hideWatchedVideos = data.hideWatchedVideos;
  }

  if (data.refreshIntervalMinutes !== undefined) {
    if (
      data.refreshIntervalMinutes !== null &&
      (!Number.isInteger(data.refreshIntervalMinutes) ||
        (data.refreshIntervalMinutes as number) <= 0)
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message:
          'Invalid refreshIntervalMinutes. Expected a positive integer or null.',
      });
    }
    result.refreshIntervalMinutes = data.refreshIntervalMinutes as
      | number
      | null;
  }

  if (data.itemsPerPage !== undefined) {
    if (
      typeof data.itemsPerPage !== 'number' ||
      !Number.isInteger(data.itemsPerPage) ||
      data.itemsPerPage < 10 ||
      data.itemsPerPage > 100
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message:
          'Invalid itemsPerPage. Expected an integer between 10 and 100.',
      });
    }
    result.itemsPerPage = data.itemsPerPage;
  }

  return result;
}

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  /**
   * Retrieves the preferences for the authenticated user.
   * If a record does not exist yet, creates and returns the default preferences.
   */
  async getPreferences(userId: string): Promise<UserPreferencesResponse> {
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (existing) {
      return {
        userId: existing.userId,
        theme: existing.theme as Theme,
        defaultFeed: existing.defaultFeed as DefaultFeed,
        feedMode: (existing.feedMode as FeedMode) ?? 'normal',
        hideWatchedVideos: existing.hideWatchedVideos,
        refreshIntervalMinutes: existing.refreshIntervalMinutes,
        itemsPerPage: existing.itemsPerPage,
        onboardingCompletedAt: existing.onboardingCompletedAt,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }

    // Upsert default preferences for new user
    const [created] = await db
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

    return {
      userId: created.userId,
      theme: created.theme as Theme,
      defaultFeed: created.defaultFeed as DefaultFeed,
      feedMode: (created.feedMode as FeedMode) ?? 'normal',
      hideWatchedVideos: created.hideWatchedVideos,
      refreshIntervalMinutes: created.refreshIntervalMinutes,
      itemsPerPage: created.itemsPerPage,
      onboardingCompletedAt: created.onboardingCompletedAt,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  /**
   * Updates preferences for the authenticated user.
   */
  async updatePreferences(
    userId: string,
    rawInput: unknown,
  ): Promise<UserPreferencesResponse> {
    const input = validateUpdatePreferencesInput(rawInput);

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.theme !== undefined) {
      updatePayload.theme = input.theme;
    }
    if (input.defaultFeed !== undefined) {
      updatePayload.defaultFeed = input.defaultFeed;
    }
    if (input.feedMode !== undefined) {
      updatePayload.feedMode = input.feedMode;
    }
    if (input.hideWatchedVideos !== undefined) {
      updatePayload.hideWatchedVideos = input.hideWatchedVideos;
    }
    if (input.refreshIntervalMinutes !== undefined) {
      updatePayload.refreshIntervalMinutes = input.refreshIntervalMinutes;
    }
    if (input.itemsPerPage !== undefined) {
      updatePayload.itemsPerPage = input.itemsPerPage;
    }

    const [updated] = await db
      .insert(userPreferences)
      .values({
        userId,
        theme: input.theme ?? 'system',
        defaultFeed: input.defaultFeed ?? 'unified',
        feedMode: input.feedMode ?? 'normal',
        hideWatchedVideos: input.hideWatchedVideos ?? true,
        refreshIntervalMinutes: input.refreshIntervalMinutes ?? null,
        itemsPerPage: input.itemsPerPage ?? 20,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: updatePayload,
      })
      .returning();

    this.logger.log(`Updated preferences for user ${userId}`);

    return {
      userId: updated.userId,
      theme: updated.theme as Theme,
      defaultFeed: updated.defaultFeed as DefaultFeed,
      feedMode: (updated.feedMode as FeedMode) ?? 'normal',
      hideWatchedVideos: updated.hideWatchedVideos,
      refreshIntervalMinutes: updated.refreshIntervalMinutes,
      itemsPerPage: updated.itemsPerPage,
      onboardingCompletedAt: updated.onboardingCompletedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}

