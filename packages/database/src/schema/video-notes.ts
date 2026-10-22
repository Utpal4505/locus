import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { videos } from "./videos.js";

export const videoNotes = pgTable(
  "video_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("video_notes_user_video_unique").on(
      table.userId,
      table.videoId,
    ),
    index("video_notes_user_updated_idx").on(
      table.userId,
      table.updatedAt.desc(),
    ),
  ],
);

export type VideoNote = typeof videoNotes.$inferSelect;
export type InsertVideoNote = typeof videoNotes.$inferInsert;
