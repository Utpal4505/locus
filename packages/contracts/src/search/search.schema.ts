import { z } from "zod";

export const globalSearchVideoItemSchema = z.object({
  id: z.string().uuid(),
  youtubeVideoId: z.string(),
  title: z.string(),
  channelName: z.string(),
  thumbnailUrl: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  publishedAt: z.string().nullable(),
});

export const globalSearchNoteItemSchema = z.object({
  id: z.string().uuid(),
  videoId: z.string().uuid(),
  videoTitle: z.string(),
  channelName: z.string(),
  snippet: z.string(),
  updatedAt: z.string(),
});

export const globalSearchChannelItemSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string().nullable(),
  name: z.string(),
  thumbnailUrl: z.string().nullable(),
  isFollowed: z.boolean(),
});

export const globalSearchResponseSchema = z.object({
  videos: z.array(globalSearchVideoItemSchema),
  notes: z.array(globalSearchNoteItemSchema),
  channels: z.array(globalSearchChannelItemSchema),
});

export type GlobalSearchVideoItem = z.infer<typeof globalSearchVideoItemSchema>;
export type GlobalSearchNoteItem = z.infer<typeof globalSearchNoteItemSchema>;
export type GlobalSearchChannelItem = z.infer<typeof globalSearchChannelItemSchema>;
export type GlobalSearchResponse = z.infer<typeof globalSearchResponseSchema>;

