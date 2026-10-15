import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { videos } from "./videos.js";

export const videoLibrary = pgTable(
  "video_library",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    isWatched: boolean("is_watched").notNull().default(false),
    isBookmarked: boolean("is_bookmarked").notNull().default(false),
    isInQueue: boolean("is_in_queue").notNull().default(false),
    progressSeconds: integer("progress_seconds").notNull().default(0),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    watchedAt: timestamp("watched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("video_library_user_video_unique").on(
      table.userId,
      table.videoId,
    ),
    index("video_library_user_queue_idx").on(
      table.userId,
      table.isInQueue,
      table.updatedAt.desc(),
    ),
    index("video_library_user_bookmark_idx").on(
      table.userId,
      table.isBookmarked,
      table.updatedAt.desc(),
    ),
    index("video_library_user_last_opened_idx").on(
      table.userId,
      table.lastOpenedAt.desc(),
    ),
    check(
      "video_library_progress_seconds_nonnegative",
      sql`${table.progressSeconds} >= 0`,
    ),
  ],
);

export type VideoLibraryItem = typeof videoLibrary.$inferSelect;
export type InsertVideoLibraryItem = typeof videoLibrary.$inferInsert;

