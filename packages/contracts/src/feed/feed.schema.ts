import { z } from "zod";

export const feedItemLibraryStateSchema = z.object({
  isWatched: z.boolean(),
  isFavorite: z.boolean(),
  isInQueue: z.boolean(),
  progressSeconds: z.number().int().nonnegative(),
});

export type FeedItemLibraryState = z.infer<typeof feedItemLibraryStateSchema>;

export const feedItemSchema = z.object({
  id: z.string().uuid(),
  youtubeVideoId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  url: z.string(),
  videoUrl: z.string(),
  publishedAt: z.string(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  sourceId: z.string().uuid(),
  channelName: z.string(),
  channelThumbnailUrl: z.string().nullable(),
  library: feedItemLibraryStateSchema.nullable(),
});

export type FeedItem = z.infer<typeof feedItemSchema>;

export const feedResponseSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type FeedResponse = z.infer<typeof feedResponseSchema>;

export const feedStatusSchema = z.enum(["unwatched", "watched", "all"]);
export type FeedStatus = z.infer<typeof feedStatusSchema>;

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: feedStatusSchema.optional(),
});

export type FeedQuery = z.infer<typeof feedQuerySchema>;
