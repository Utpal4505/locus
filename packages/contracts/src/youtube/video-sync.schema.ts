import { z } from "zod";

export const syncTriggerEnum = z.enum(["manual", "scheduled", "on_open"]);
export type SyncTrigger = z.infer<typeof syncTriggerEnum>;

export const syncStatusStateEnum = z.enum([
  "idle",
  "syncing",
  "succeeded",
  "failed",
]);
export type SyncStatusState = z.infer<typeof syncStatusStateEnum>;

export const syncStatusResponseSchema = z.object({
  isSyncing: z.boolean(),
  lastSyncedAt: z.string().nullable(),
  lastStatus: syncStatusStateEnum,
  lastError: z.string().nullable().optional(),
  channelsProcessed: z.number().int().nonnegative().optional(),
  videosSynced: z.number().int().nonnegative().optional(),
  trigger: syncTriggerEnum.optional(),
});
export type SyncStatusResponse = z.infer<typeof syncStatusResponseSchema>;

export const videoSyncResponseSchema = z.object({
  channelsProcessed: z.number().int().nonnegative().default(0),
  videosSynced: z.number().int().nonnegative().default(0),
  itemsSkipped: z.number().int().nonnegative().default(0),
  limitReached: z.boolean().default(false),
  skipped: z.boolean().optional(),
  reason: z.string().optional(),
  lastSyncedAt: z.string().nullable().optional(),
});

export type VideoSyncResponse = z.infer<typeof videoSyncResponseSchema>;

export const videoSyncRequestSchema = z
  .object({
    trigger: syncTriggerEnum.optional(),
    force: z.boolean().optional(),
    maxResultsPerChannel: z.coerce.number().int().min(1).max(100).optional(),
  })
  .optional();

export type VideoSyncRequest = z.infer<typeof videoSyncRequestSchema>;

export const videoSyncOptionsSchema = z
  .object({
    maxResultsPerChannel: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional(),
    trigger: syncTriggerEnum.optional(),
    force: z.boolean().optional(),
  })
  .optional();

export type VideoSyncOptions = z.infer<typeof videoSyncOptionsSchema>;
