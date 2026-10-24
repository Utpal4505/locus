import { z } from "zod";

export const themeSchema = z.enum(["system", "light", "dark"]);
export type Theme = z.infer<typeof themeSchema>;

export const defaultFeedSchema = z.enum(["unified", "following", "discover"]);
export type DefaultFeed = z.infer<typeof defaultFeedSchema>;

export const feedModeSchema = z.enum(["normal", "tagged_only"]);
export type FeedMode = z.infer<typeof feedModeSchema>;

export const userPreferencesResponseSchema = z.object({
  userId: z.string(),
  theme: themeSchema,
  defaultFeed: defaultFeedSchema,
  feedMode: feedModeSchema.default("normal"),
  hideWatchedVideos: z.boolean(),
  refreshIntervalMinutes: z.number().int().positive().nullable(),
  itemsPerPage: z.number().int().min(10).max(100),
  onboardingCompletedAt: z.union([z.string(), z.date()]).nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type UserPreferencesResponse = z.infer<
  typeof userPreferencesResponseSchema
>;

export const updateUserPreferencesRequestSchema = z.object({
  theme: themeSchema.optional(),
  defaultFeed: defaultFeedSchema.optional(),
  feedMode: feedModeSchema.optional(),
  hideWatchedVideos: z.boolean().optional(),
  refreshIntervalMinutes: z.number().int().positive().nullable().optional(),
  itemsPerPage: z.number().int().min(10).max(100).optional(),
  onboardingCompletedAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type UpdateUserPreferencesRequest = z.infer<
  typeof updateUserPreferencesRequestSchema
>;

