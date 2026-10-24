import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { videos } from "./videos.js";

export const taggingStatusEnum = pgEnum("tagging_status", [
  "pending",
  "submitted",
  "completed",
  "failed",
]);

export const classificationBatchStatusEnum = pgEnum(
  "classification_batch_status",
  [
    "created",
    "submitted",
    "in_progress",
    "completed",
    "failed",
    "expired",
    "cancelled",
  ],
);

export const videoTaggingStates = pgTable(
  "video_tagging_states",
  {
    videoId: uuid("video_id")
      .primaryKey()
      .references(() => videos.id, { onDelete: "cascade" }),
    status: taggingStatusEnum("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    modelId: text("model_id"),
    promptVersion: text("prompt_version"),
    schemaVersion: text("schema_version"),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("video_tagging_states_status_idx").on(
      table.status,
      table.lastAttemptedAt,
    ),
  ],
);

export const classificationBatches = pgTable(
  "classification_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    openaiBatchId: text("openai_batch_id"),
    openaiInputFileId: text("openai_input_file_id"),
    openaiOutputFileId: text("openai_output_file_id"),
    openaiErrorFileId: text("openai_error_file_id"),
    status: classificationBatchStatusEnum("status")
      .notNull()
      .default("created"),
    requestCount: integer("request_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    failureCount: integer("failure_count").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalCostUsd: numeric("total_cost_usd", { precision: 12, scale: 6 })
      .notNull()
      .default("0"),
    estimatedCostInr: numeric("estimated_cost_inr", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("classification_batches_openai_id_idx").on(
      table.openaiBatchId,
    ),
    index("classification_batches_status_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const classificationBatchItems = pgTable(
  "classification_batch_items",
  {
    batchId: uuid("batch_id")
      .notNull()
      .references(() => classificationBatches.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    customId: text("custom_id").notNull(),
    status: text("status").notNull().default("submitted"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.batchId, table.videoId] }),
    index("classification_batch_items_custom_id_idx").on(table.customId),
  ],
);

export const classificationUsage = pgTable(
  "classification_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => classificationBatches.id, {
      onDelete: "set null",
    }),
    modelId: text("model_id").notNull(),
    promptVersion: text("prompt_version").notNull(),
    schemaVersion: text("schema_version").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 })
      .notNull()
      .default("0"),
    costInr: numeric("cost_inr", { precision: 12, scale: 4 })
      .notNull()
      .default("0"),
    usdToInrRate: numeric("usd_to_inr_rate", { precision: 8, scale: 4 })
      .notNull()
      .default("86.0000"),
    isCostEstimated: boolean("is_cost_estimated").notNull().default(true),
    status: text("status").notNull(), // 'completed' | 'failed'
    attemptNumber: integer("attempt_number").notNull().default(1),
    durationMs: integer("duration_ms"),
    selectedTopicIds: jsonb("selected_topic_ids")
      .$type<string[]>()
      .default([]),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("classification_usage_video_id_idx").on(table.videoId),
    index("classification_usage_created_at_idx").on(table.createdAt),
    index("classification_usage_batch_id_idx").on(table.batchId),
  ],
);

export type VideoTaggingState = typeof videoTaggingStates.$inferSelect;
export type InsertVideoTaggingState = typeof videoTaggingStates.$inferInsert;
export type ClassificationBatch = typeof classificationBatches.$inferSelect;
export type InsertClassificationBatch =
  typeof classificationBatches.$inferInsert;
export type ClassificationBatchItem =
  typeof classificationBatchItems.$inferSelect;
export type InsertClassificationBatchItem =
  typeof classificationBatchItems.$inferInsert;
export type ClassificationUsageRecord =
  typeof classificationUsage.$inferSelect;
export type InsertClassificationUsageRecord =
  typeof classificationUsage.$inferInsert;

