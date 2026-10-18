import { z } from "zod";

export const videoSyncResponseSchema = z.object({
  channelsProcessed: z.number().int().nonnegative(),
  videosSynced: z.number().int().nonnegative(),
  itemsSkipped: z.number().int().nonnegative(),
  limitReached: z.boolean(),
});

export type VideoSyncResponse = z.infer<typeof videoSyncResponseSchema>;

export const videoSyncOptionsSchema = z
  .object({
    maxResultsPerChannel: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(50),
  })
  .optional();

export type VideoSyncOptions = z.infer<typeof videoSyncOptionsSchema>;
