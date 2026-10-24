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