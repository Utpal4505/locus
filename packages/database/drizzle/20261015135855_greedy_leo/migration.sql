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