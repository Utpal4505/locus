import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { sources } from "./sources.js";

export const syncProviderEnum = pgEnum("sync_provider", [
  "youtube",
  "rss",
]);

export const syncTriggerEnum = pgEnum("sync_trigger", [
  "manual",
  "scheduled",
  "on_open",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "running",
  "succeeded",
  "partial",
  "failed",
]);

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    provider: syncProviderEnum("provider").notNull().default("youtube"),
    trigger: syncTriggerEnum("trigger").notNull().default("manual"),
    status: syncStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    itemsFound: integer("items_found").notNull().default(0),
    itemsCreated: integer("items_created").notNull().default(0),
    itemsUpdated: integer("items_updated").notNull().default(0),
    errorSummary: text("error_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sync_runs_user_created_idx").on(table.userId, table.createdAt),
    index("sync_runs_status_created_idx").on(table.status, table.createdAt),
    index("sync_runs_user_status_completed_idx").on(
      table.userId,
      table.status,
      table.completedAt,
    ),
  ],
);

export type SyncRun = typeof syncRuns.$inferSelect;
export type InsertSyncRun = typeof syncRuns.$inferInsert;

