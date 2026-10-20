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

export const bulkFollowChannelRequestSchema = z.object({
  channelIds: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Channel identifier cannot be empty")
        .max(255, "Channel identifier is too long"),
    )
    .min(1, "At least one channel ID must be provided")
    .max(100, "Cannot follow more than 100 channels in a single batch"),
});

export type BulkFollowChannelRequest = z.infer<
  typeof bulkFollowChannelRequestSchema
>;

export const bulkFollowChannelResponseSchema = z.object({
  followedCount: z.number().int().nonnegative(),
  alreadyFollowedCount: z.number().int().nonnegative(),
  totalRequested: z.number().int().nonnegative(),
  followedChannelIds: z.array(z.string()),
});

export type BulkFollowChannelResponse = z.infer<
  typeof bulkFollowChannelResponseSchema
>;
