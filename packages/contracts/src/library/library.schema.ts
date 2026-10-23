import { z } from "zod";
import { feedItemSchema } from "../feed/feed.schema";

export const libraryTabSchema = z.enum(["queue", "favorites", "history", "notes"]);
export type LibraryTab = z.infer<typeof libraryTabSchema>;

export const historyStatusSchema = z.enum(["all", "in_progress", "completed"]);
export type HistoryStatus = z.infer<typeof historyStatusSchema>;

export const libraryNotesQuerySchema = z.object({
  search: z.string().optional(),
  channelId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1),
});
export type LibraryNotesQuery = z.infer<typeof libraryNotesQuerySchema>;

export const libraryNoteItemSchema = z.object({
  id: z.string().uuid(),
  videoId: z.string().uuid(),
  youtubeVideoId: z.string(),
  videoTitle: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  url: z.string(),
  channelId: z.string().uuid(),
  channelName: z.string(),
  channelThumbnailUrl: z.string().nullable().optional(),
  content: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});
export type LibraryNoteItem = z.infer<typeof libraryNoteItemSchema>;

export const libraryNotesResponseSchema = z.object({
  items: z.array(libraryNoteItemSchema),
  total: z.number().int().nonnegative(),
  creators: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
});
export type LibraryNotesResponse = z.infer<typeof libraryNotesResponseSchema>;

export const updateLibraryStateRequestSchema = z.object({
  isWatched: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  isInQueue: z.boolean().optional(),
  progressSeconds: z.number().int().nonnegative().optional(),
  lastOpened: z.boolean().optional(),
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
  isFavorite: z.boolean(),
  isInQueue: z.boolean(),
  progressSeconds: z.number().int().nonnegative(),
  watchedAt: z.union([z.string(), z.date()]).nullable().optional(),
  lastOpenedAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type UpdateLibraryStateResponse = z.infer<
  typeof updateLibraryStateResponseSchema
>;
