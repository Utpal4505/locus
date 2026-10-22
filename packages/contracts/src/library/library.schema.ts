import { z } from "zod";
import { feedItemSchema } from "../feed/feed.schema";

export const libraryTabSchema = z.enum(["queue", "bookmarks", "history"]);
export type LibraryTab = z.infer<typeof libraryTabSchema>;

export const updateLibraryStateRequestSchema = z.object({
  isWatched: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
  isInQueue: z.boolean().optional(),
  progressSeconds: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});
export type UpdateLibraryStateRequest = z.infer<
  typeof updateLibraryStateRequestSchema
>;

export const libraryItemSchema = feedItemSchema.extend({
  watchedAt: z.union([z.string(), z.date()]).nullable().optional(),
  lastOpenedAt: z.union([z.string(), z.date()]).nullable().optional(),
  libraryUpdatedAt: z.union([z.string(), z.date()]).optional(),
});
export type LibraryItem = z.infer<typeof libraryItemSchema>;

export const libraryListResponseSchema = z.object({
  items: z.array(libraryItemSchema),
  total: z.number().int().nonnegative(),
  tab: libraryTabSchema,
});
export type LibraryListResponse = z.infer<typeof libraryListResponseSchema>;

export const updateLibraryStateResponseSchema = z.object({
  videoId: z.string().uuid(),
  isWatched: z.boolean(),
  isBookmarked: z.boolean(),
  isInQueue: z.boolean(),
  progressSeconds: z.number().int().nonnegative(),
  notes: z.string().nullable().optional(),
  watchedAt: z.union([z.string(), z.date()]).nullable().optional(),
  lastOpenedAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type UpdateLibraryStateResponse = z.infer<
  typeof updateLibraryStateResponseSchema
>;
