import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const themeEnum = pgEnum("theme", ["system", "light", "dark"]);

export const defaultFeedEnum = pgEnum("default_feed", [
  "unified",
  "following",
  "discover",
]);

export const userPreferences = pgTable(
  "user_preferences",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    theme: themeEnum("theme").notNull().default("system"),
    defaultFeed: defaultFeedEnum("default_feed").notNull().default("unified"),
    hideWatchedVideos: boolean("hide_watched_videos").notNull().default(true),
    refreshIntervalMinutes: integer("refresh_interval_minutes"),
    itemsPerPage: integer("items_per_page").notNull().default(20),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    feedPreferences: jsonb("feed_preferences")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "user_preferences_items_per_page_check",
      sql`${table.itemsPerPage} > 0`,
    ),
    check(
      "user_preferences_refresh_interval_check",
      sql`${table.refreshIntervalMinutes} IS NULL OR ${table.refreshIntervalMinutes} > 0`,
    ),
  ],
);

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;
