import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const feedbackTypeEnum = pgEnum("feedback_type", [
  "bug",
  "feature_request",
  "general",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "resolved",
  "closed",
]);

export const feedbackPriorityEnum = pgEnum("feedback_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    userEmail: text("user_email"),
    userName: text("user_name"),
    type: feedbackTypeEnum("type").notNull().default("bug"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category"),
    priority: feedbackPriorityEnum("priority").notNull().default("medium"),
    status: feedbackStatusEnum("status").notNull().default("open"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feedback_status_created_idx").on(table.status, table.createdAt.desc()),
    index("feedback_type_status_idx").on(table.type, table.status),
    index("feedback_user_id_idx").on(table.userId),
  ],
);

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;
export type FeedbackType = (typeof feedbackTypeEnum.enumValues)[number];
export type FeedbackStatus = (typeof feedbackStatusEnum.enumValues)[number];
export type FeedbackPriority = (typeof feedbackPriorityEnum.enumValues)[number];

