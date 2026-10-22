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