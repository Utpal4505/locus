import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const integrationProviderEnum = pgEnum("integration_provider", [
  "youtube",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "connected",
  "expired",
  "revoked",
  "disconnected",
]);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    externalAccountId: text("external_account_id"),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes").notNull(),
    status: integrationStatusEnum("status").notNull().default("connected"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("integrations_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    index("integrations_user_status_idx").on(table.userId, table.status),
    index("integrations_provider_account_idx").on(
      table.provider,
      table.externalAccountId,
    ),
  ],
);

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;
