import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const sourceTypeEnum = pgEnum("source_type", [
  "youtube_channel",
  "news_publisher",
]);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: sourceTypeEnum("type").notNull(),
    externalId: text("external_id"),
    name: text("name").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    feedUrl: text("feed_url"),
    isActive: boolean("is_active").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sources_type_external_id_unique")
      .on(table.type, table.externalId)
      .where(sql`${table.externalId} IS NOT NULL`),
    index("sources_type_is_active_idx").on(table.type, table.isActive),
  ],
);

export const sourceSubscriptions = pgTable(
  "source_subscriptions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.sourceId] }),
    index("source_subscriptions_source_user_idx").on(
      table.sourceId,
      table.userId,
    ),
  ],
);

export type Source = typeof sources.$inferSelect;
export type InsertSource = typeof sources.$inferInsert;
export type SourceSubscription = typeof sourceSubscriptions.$inferSelect;
export type InsertSourceSubscription = typeof sourceSubscriptions.$inferInsert;

