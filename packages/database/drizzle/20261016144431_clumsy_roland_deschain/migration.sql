CREATE TYPE "integration_provider" AS ENUM('youtube');--> statement-breakpoint
CREATE TYPE "integration_status" AS ENUM('connected', 'expired', 'revoked', 'disconnected');--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"external_account_id" text,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text NOT NULL,
	"status" "integration_status" DEFAULT 'connected'::"integration_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_user_provider_unique" ON "integrations" ("user_id","provider");--> statement-breakpoint
CREATE INDEX "integrations_user_status_idx" ON "integrations" ("user_id","status");--> statement-breakpoint
CREATE INDEX "integrations_provider_account_idx" ON "integrations" ("provider","external_account_id");--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;