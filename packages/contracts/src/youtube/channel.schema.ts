import { z } from "zod";

export const importedChannelSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string(),
  name: z.string(),
  url: z.string().url(),
  description: z.string().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  isFollowed: z.boolean(),
});

export type ImportedChannel = z.infer<typeof importedChannelSchema>;

export const channelListResponseSchema = z.object({
  channels: z.array(importedChannelSchema),
  total: z.number().int().nonnegative(),
});

export type ChannelListResponse = z.infer<typeof channelListResponseSchema>;

export const subscriptionImportResponseSchema = z.object({
  importedCount: z.number().int().nonnegative(),
  totalAvailable: z.number().int().nonnegative(),
});

export type SubscriptionImportResponse = z.infer<
  typeof subscriptionImportResponseSchema
>;

export const followChannelResponseSchema = z.object({
  sourceId: z.string().uuid(),
  channelId: z.string(),
  isFollowed: z.boolean(),
});

export type FollowChannelResponse = z.infer<typeof followChannelResponseSchema>;

export const youtubeStatusResponseSchema = z.object({
  connected: z.boolean(),
  status: z.string().nullable().optional(),
  externalAccountId: z.string().nullable().optional(),
  tokenExpiresAt: z.union([z.string(), z.date()]).nullable().optional(),
  scopes: z.string().nullable().optional(),
});

export type YoutubeStatusResponse = z.infer<typeof youtubeStatusResponseSchema>;
