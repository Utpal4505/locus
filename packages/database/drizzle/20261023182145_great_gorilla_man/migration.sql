CREATE TYPE "sync_provider" AS ENUM('youtube', 'rss');--> statement-breakpoint
CREATE TYPE "sync_status" AS ENUM('pending', 'running', 'succeeded', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "sync_trigger" AS ENUM('manual', 'scheduled', 'on_open');--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"source_id" uuid,
	"provider" "sync_provider" DEFAULT 'youtube'::"sync_provider" NOT NULL,
	"trigger" "sync_trigger" DEFAULT 'manual'::"sync_trigger" NOT NULL,
	"status" "sync_status" DEFAULT 'pending'::"sync_status" NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"items_found" integer DEFAULT 0 NOT NULL,
	"items_created" integer DEFAULT 0 NOT NULL,
	"items_updated" integer DEFAULT 0 NOT NULL,
	"error_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sync_runs_user_created_idx" ON "sync_runs" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "sync_runs_status_created_idx" ON "sync_runs" ("status","created_at");--> statement-breakpoint
CREATE INDEX "sync_runs_user_status_completed_idx" ON "sync_runs" ("user_id","status","completed_at");--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_source_id_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL;