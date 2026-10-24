-- Migration: 20261015135855_greedy_leo
CREATE TYPE "default_feed" AS ENUM('unified', 'following', 'discover');--> statement-breakpoint
CREATE TYPE "theme" AS ENUM('system', 'light', 'dark');--> statement-breakpoint
CREATE TYPE "source_type" AS ENUM('youtube_channel', 'news_publisher');--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY,
	"theme" "theme" DEFAULT 'system'::"theme" NOT NULL,
	"default_feed" "default_feed" DEFAULT 'unified'::"default_feed" NOT NULL,
	"hide_watched_videos" boolean DEFAULT true NOT NULL,
	"refresh_interval_minutes" integer,
	"items_per_page" integer DEFAULT 20 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"feed_preferences" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_items_per_page_check" CHECK ("items_per_page" > 0),
	CONSTRAINT "user_preferences_refresh_interval_check" CHECK ("refresh_interval_minutes" IS NULL OR "refresh_interval_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "source_subscriptions" (
	"user_id" text,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_subscriptions_pkey" PRIMARY KEY("user_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" "source_type" NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"image_url" text,
	"feed_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"youtube_video_id" text NOT NULL,
	"source_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"published_at" timestamp with time zone,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "videos_duration_seconds_nonnegative" CHECK ("duration_seconds" IS NULL OR "duration_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_topics" (
	"user_id" text,
	"topic_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_topics_pkey" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "video_topics" (
	"video_id" uuid,
	"topic_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_topics_pkey" PRIMARY KEY("video_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "video_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"video_id" uuid NOT NULL,
	"is_watched" boolean DEFAULT false NOT NULL,
	"is_bookmarked" boolean DEFAULT false NOT NULL,
	"is_in_queue" boolean DEFAULT false NOT NULL,
	"progress_seconds" integer DEFAULT 0 NOT NULL,
	"last_opened_at" timestamp with time zone,
	"watched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_library_progress_seconds_nonnegative" CHECK ("progress_seconds" >= 0)
);
--> statement-breakpoint
CREATE INDEX "source_subscriptions_source_user_idx" ON "source_subscriptions" ("source_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_type_external_id_unique" ON "sources" ("type","external_id") WHERE "external_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "sources_type_is_active_idx" ON "sources" ("type","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "videos_youtube_video_id_unique" ON "videos" ("youtube_video_id");--> statement-breakpoint
CREATE INDEX "videos_source_id_published_at_idx" ON "videos" ("source_id","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "topics_slug_unique" ON "topics" ("slug");--> statement-breakpoint
CREATE INDEX "user_topics_topic_user_idx" ON "user_topics" ("topic_id","user_id");--> statement-breakpoint
CREATE INDEX "video_topics_topic_id_idx" ON "video_topics" ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "video_library_user_video_unique" ON "video_library" ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "video_library_user_queue_idx" ON "video_library" ("user_id","is_in_queue","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "video_library_user_bookmark_idx" ON "video_library" ("user_id","is_bookmarked","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "video_library_user_last_opened_idx" ON "video_library" ("user_id","last_opened_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "source_subscriptions" ADD CONSTRAINT "source_subscriptions_source_id_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_source_id_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "user_topics" ADD CONSTRAINT "user_topics_topic_id_topics_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "video_topics" ADD CONSTRAINT "video_topics_video_id_videos_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "video_topics" ADD CONSTRAINT "video_topics_topic_id_topics_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "video_library" ADD CONSTRAINT "video_library_video_id_videos_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;

-- Migration: 20261015141255_wild_starfox
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "source_subscriptions" ADD CONSTRAINT "source_subscriptions_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_topics" ADD CONSTRAINT "user_topics_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "video_library" ADD CONSTRAINT "video_library_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

-- Migration: 20261016144431_clumsy_roland_deschain
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

-- Migration: 20261022145002_fluffy_ezekiel_stane
CREATE TABLE "video_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"video_id" uuid NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "video_notes_user_video_unique" ON "video_notes" ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "video_notes_user_updated_idx" ON "video_notes" ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_video_id_videos_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;

-- Migration: 20261022145534_worried_franklin_richards
ALTER TABLE "video_library" RENAME COLUMN "is_bookmarked" TO "is_favorite";--> statement-breakpoint
ALTER INDEX "video_library_user_bookmark_idx" RENAME TO "video_library_user_favorite_idx";

-- Migration: 20261023182145_great_gorilla_man
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

-- Migration: 20261024070823_unknown_lady_mastermind
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

-- Migration: 20261024204952_ambitious_zuras
CREATE TYPE "feedback_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "feedback_status" AS ENUM('open', 'under_review', 'planned', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "feedback_type" AS ENUM('bug', 'feature_request', 'general');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text,
	"user_email" text,
	"user_name" text,
	"type" "feedback_type" DEFAULT 'bug'::"feedback_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"priority" "feedback_priority" DEFAULT 'medium'::"feedback_priority" NOT NULL,
	"status" "feedback_status" DEFAULT 'open'::"feedback_status" NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "feedback_status_created_idx" ON "feedback" ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feedback_type_status_idx" ON "feedback" ("type","status");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" ("user_id");--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;


