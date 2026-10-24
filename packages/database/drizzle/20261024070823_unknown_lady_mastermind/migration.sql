CREATE TYPE "feed_mode" AS ENUM('normal', 'tagged_only');--> statement-breakpoint
CREATE TYPE "classification_batch_status" AS ENUM('created', 'submitted', 'in_progress', 'completed', 'failed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "tagging_status" AS ENUM('pending', 'submitted', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "classification_batch_items" (
	"batch_id" uuid,
	"video_id" uuid,
	"custom_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classification_batch_items_pkey" PRIMARY KEY("batch_id","video_id")
);
--> statement-breakpoint
CREATE TABLE "classification_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"openai_batch_id" text,
	"openai_input_file_id" text,
	"openai_output_file_id" text,
	"openai_error_file_id" text,
	"status" "classification_batch_status" DEFAULT 'created'::"classification_batch_status" NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_cost_usd" numeric(12,6) DEFAULT '0' NOT NULL,
	"estimated_cost_inr" numeric(12,4) DEFAULT '0' NOT NULL,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_polled_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classification_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"video_id" uuid NOT NULL,
	"batch_id" uuid,
	"model_id" text NOT NULL,
	"prompt_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(12,6) DEFAULT '0' NOT NULL,
	"cost_inr" numeric(12,4) DEFAULT '0' NOT NULL,
	"usd_to_inr_rate" numeric(8,4) DEFAULT '86.0000' NOT NULL,
	"is_cost_estimated" boolean DEFAULT true NOT NULL,
	"status" text NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"duration_ms" integer,
	"selected_topic_ids" jsonb DEFAULT '[]',
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_tagging_states" (
	"video_id" uuid PRIMARY KEY,
	"status" "tagging_status" DEFAULT 'pending'::"tagging_status" NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"last_error_message" text,
	"model_id" text,
	"prompt_version" text,
	"schema_version" text,
	"last_attempted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "feed_mode" "feed_mode" DEFAULT 'normal'::"feed_mode" NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "topics_is_active_idx" ON "topics" ("is_active");--> statement-breakpoint
CREATE INDEX "classification_batch_items_custom_id_idx" ON "classification_batch_items" ("custom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classification_batches_openai_id_idx" ON "classification_batches" ("openai_batch_id");--> statement-breakpoint
CREATE INDEX "classification_batches_status_idx" ON "classification_batches" ("status","created_at");--> statement-breakpoint
CREATE INDEX "classification_usage_video_id_idx" ON "classification_usage" ("video_id");--> statement-breakpoint
CREATE INDEX "classification_usage_created_at_idx" ON "classification_usage" ("created_at");--> statement-breakpoint
CREATE INDEX "classification_usage_batch_id_idx" ON "classification_usage" ("batch_id");--> statement-breakpoint
CREATE INDEX "video_tagging_states_status_idx" ON "video_tagging_states" ("status","last_attempted_at");--> statement-breakpoint
ALTER TABLE "classification_batch_items" ADD CONSTRAINT "classification_batch_items_LIRLWiNcWVkR_fkey" FOREIGN KEY ("batch_id") REFERENCES "classification_batches"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "classification_batch_items" ADD CONSTRAINT "classification_batch_items_video_id_videos_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "classification_usage" ADD CONSTRAINT "classification_usage_video_id_videos_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "classification_usage" ADD CONSTRAINT "classification_usage_batch_id_classification_batches_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "classification_batches"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "video_tagging_states" ADD CONSTRAINT "video_tagging_states_video_id_videos_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;