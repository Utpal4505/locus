import { z } from "zod";
import { feedItemLibraryStateSchema } from "../feed/feed.schema";

export const videoLibraryStateSchema = feedItemLibraryStateSchema.extend({
  lastOpenedAt: z.union([z.string(), z.date()]).nullable().optional(),
  watchedAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type VideoLibraryState = z.infer<typeof videoLibraryStateSchema>;

export const videoDetailResponseSchema = z.object({
  id: z.string().uuid(),
  youtubeVideoId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  url: z.string(),
  videoUrl: z.string(),
  publishedAt: z.string().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  sourceId: z.string().uuid(),
  channelName: z.string(),
  channelThumbnailUrl: z.string().nullable(),
  library: videoLibraryStateSchema.nullable(),
});
export type VideoDetailResponse = z.infer<typeof videoDetailResponseSchema>;

export const videoNoteResponseSchema = z.object({
  videoId: z.string().uuid(),
  content: z.string(),
  updatedAt: z.union([z.string(), z.date()]).nullable().optional(),
});
export type VideoNoteResponse = z.infer<typeof videoNoteResponseSchema>;

export const updateVideoNoteRequestSchema = z.object({
  content: z.string(),
});
export type UpdateVideoNoteRequest = z.infer<
  typeof updateVideoNoteRequestSchema
>;
