import { z } from "zod";
import { feedItemLibraryStateSchema } from "../feed/feed.schema";

export const videoLibraryStateSchema = feedItemLibraryStateSchema.extend({
  notes: z.string().nullable().optional(),
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

